import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import Database from "better-sqlite3";
import path from "path";
import "dotenv/config";

interface Message {
  id: string;
  patientName: string;
  room: string;
  text: string;
  urgency: "low" | "medium" | "high";
  timestamp: string;
  resolved: boolean;
}

// ─── Database Setup ───────────────────────────────────────────────────────────

const db = new Database(path.resolve("silentcare.db"));

// Create messages table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id          TEXT PRIMARY KEY,
    patientName TEXT NOT NULL,
    room        TEXT NOT NULL,
    text        TEXT NOT NULL,
    urgency     TEXT NOT NULL DEFAULT 'low',
    timestamp   TEXT NOT NULL,
    resolved    INTEGER NOT NULL DEFAULT 0
  )
`);

// Prepared statements (faster than inline SQL on every call)
const insertMessage = db.prepare(`
  INSERT INTO messages (id, patientName, room, text, urgency, timestamp, resolved)
  VALUES (@id, @patientName, @room, @text, @urgency, @timestamp, @resolved)
`);

const markResolved = db.prepare(`
  UPDATE messages SET resolved = 1 WHERE id = ?
`);

const getLast100 = db.prepare(`
  SELECT * FROM messages ORDER BY timestamp DESC LIMIT 100
`);

// ─── Helper ───────────────────────────────────────────────────────────────────

function rowToMessage(row: any): Message {
  return {
    ...row,
    resolved: row.resolved === 1, // SQLite stores booleans as 0/1
  };
}

// ─── Server ───────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Send full persisted message history to whoever just connected
    const history = (getLast100.all() as any[]).map(rowToMessage);
    socket.emit("initial_messages", history);

    // Patient sends a gesture-translated message
    // Payload shape from PatientDashboard: { patientName, room, text, urgency }
    socket.on("send_message", (data) => {
      const message: Message = {
        id: Date.now().toString(),
        patientName: data.patientName ?? "Unknown Patient",
        room: data.room ?? "Unknown Room",
        text: data.text ?? "",
        urgency: data.urgency ?? "low",
        timestamp: new Date().toISOString(),
        resolved: false,
      };

      // Persist to SQLite — survives server restarts
      insertMessage.run({ ...message, resolved: 0 });

      // Broadcast to all connected clients (nurses see it instantly)
      io.emit("new_message", message);

      console.log(
        `[${message.timestamp}] Room ${message.room} — ${message.patientName} (${message.urgency}): "${message.text}"`
      );
    });

    // Nurse marks a message as resolved
    socket.on("resolve_message", (id: string) => {
      markResolved.run(id);
      io.emit("message_resolved", id);
      console.log(`Message resolved: ${id}`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    const { count } = db
      .prepare("SELECT COUNT(*) as count FROM messages")
      .get() as any;
    res.json({ status: "ok", totalMessages: count });
  });

  // REST endpoint for message history (useful for future pages)
  app.get("/api/messages", (_req, res) => {
    const rows = (getLast100.all() as any[]).map(rowToMessage);
    res.json(rows);
  });

  // Vite dev server in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`SilentCare server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});