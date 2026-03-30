import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Activity, Bell, CheckCircle2, Clock, AlertTriangle, User, Hand } from 'lucide-react';

interface Message {
  id: string;
  patientName: string;
  room: string;
  text: string;
  urgency: 'low' | 'medium' | 'high';
  timestamp: string;
  resolved: boolean;
}

interface NurseDashboardProps {
  user: { name: string; room: string; role: 'patient' | 'nurse' };
  onLogout: () => void;
}

export default function NurseDashboard({ user, onLogout }: NurseDashboardProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('initial_messages', (initialMessages: Message[]) => {
      setMessages(initialMessages);
    });

    newSocket.on('new_message', (message: Message) => {
      setMessages((prev) => [message, ...prev]);
      
      // Play sound alert for high urgency
      if (message.urgency === 'high') {
        const audio = new Audio('/alert.mp3'); // Assuming we have an alert sound, or fallback to beep
        audio.play().catch(e => console.log("Audio play blocked", e));
      }
    });

    newSocket.on('message_resolved', (id: string) => {
      setMessages((prev) => 
        prev.map(msg => msg.id === id ? { ...msg, resolved: true } : msg)
      );
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const resolveMessage = (id: string) => {
    if (socket) {
      socket.emit('resolve_message', id);
    }
  };

  const activeMessages = messages.filter(m => !m.resolved);
  const resolvedMessages = messages.filter(m => m.resolved);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-500/10 text-red-400 border-red-500/20 ring-1 ring-red-500/30';
      case 'medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20 ring-1 ring-amber-500/30';
      case 'low': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 ring-1 ring-emerald-500/30';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700 ring-1 ring-zinc-700';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'medium': return <Bell className="w-3.5 h-3.5" />;
      case 'low': return <Activity className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-50">
      {/* Header */}
      <header className="bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Hand className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-white tracking-tight">SilentCare</h1>
              <p className="text-[10px] text-cyan-500 font-mono uppercase tracking-widest">Nurse Station</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-950 px-4 py-2 rounded-full border border-zinc-800 uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-cyan-500" />
              {user.name}
            </div>
            <button
              onClick={onLogout}
              className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-2 rounded-lg hover:bg-zinc-800 uppercase tracking-widest"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Alerts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold text-zinc-100 flex items-center gap-3 tracking-tight">
              <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
                <Bell className="w-5 h-5 text-cyan-400" />
              </div>
              Active Alerts
              <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs py-1 px-3 rounded-full font-mono font-bold shadow-sm">
                {activeMessages.length}
              </span>
            </h2>
          </div>

          {activeMessages.length === 0 ? (
            <div className="bg-zinc-900 rounded-2xl border border-dashed border-zinc-800 p-16 text-center shadow-xl">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-xl font-display font-bold text-zinc-100">All clear</h3>
              <p className="text-zinc-500 mt-2 font-mono text-xs uppercase tracking-widest">No active patient requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`bg-zinc-900 rounded-2xl shadow-xl border-l-4 p-6 transition-all hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden group ${
                    msg.urgency === 'high' ? 'border-l-red-500 border-y-zinc-800 border-r-zinc-800 animate-pulse-red' : 
                    msg.urgency === 'medium' ? 'border-l-amber-500 border-y-zinc-800 border-r-zinc-800' : 'border-l-emerald-500 border-y-zinc-800 border-r-zinc-800'
                  }`}
                >
                  {/* Visual Strobe Overlay for High Urgency */}
                  {msg.urgency === 'high' && (
                    <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
                  )}
                  {/* Subtle gradient background based on urgency */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity pointer-events-none ${
                    msg.urgency === 'high' ? 'bg-gradient-to-r from-red-500 to-transparent' : 
                    msg.urgency === 'medium' ? 'bg-gradient-to-r from-amber-500 to-transparent' : 'bg-gradient-to-r from-emerald-500 to-transparent'
                  }`} />

                  <div className="flex justify-between items-start gap-4 relative z-10">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="text-xl font-display font-bold text-zinc-100 tracking-tight">RM {msg.room}</span>
                        <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-md uppercase tracking-widest">
                          <User className="w-3.5 h-3.5 text-zinc-500" /> {msg.patientName}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 uppercase tracking-widest ${getUrgencyColor(msg.urgency)}`}>
                          {getUrgencyIcon(msg.urgency)}
                          {msg.urgency}
                        </span>
                      </div>
                      <p className="text-zinc-300 text-xl font-medium mb-5 leading-snug">"{msg.text}"</p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 uppercase tracking-widest">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {msg.text.includes('AUTO-ALERT') && (
                          <div className="text-[10px] font-mono text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20 uppercase tracking-widest animate-pulse">
                            Triggered by: Emotional AI
                          </div>
                        )}
                        {msg.text.includes('SOS') && (
                          <div className="text-[10px] font-mono text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded border border-orange-400/20 uppercase tracking-widest">
                            Triggered by: SOS Blink
                          </div>
                        )}
                        {msg.text.includes('Tap') && (
                          <div className="text-[10px] font-mono text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/20 uppercase tracking-widest">
                            Triggered by: Air Tap
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => resolveMessage(msg.id)}
                      className="shrink-0 bg-zinc-950 hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-400 border border-zinc-800 hover:border-emerald-500/30 px-5 py-2.5 rounded-xl font-mono text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resolved History */}
          <div className="bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 p-6">
            <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan-500" />
              Ward Live Status
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {['101', '102', '103', '104', '105', '106'].map((room) => {
                const isActive = activeMessages.some(m => m.room === room);
                const hasCritical = activeMessages.some(m => m.room === room && m.urgency === 'high');
                return (
                  <div 
                    key={room}
                    className={`h-12 rounded-lg border font-mono text-xs flex items-center justify-center transition-all ${
                      hasCritical ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' :
                      isActive ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' :
                      'bg-zinc-950 border-zinc-800 text-zinc-600'
                    }`}
                  >
                    RM {room}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 pt-6 border-t border-zinc-800/50">
              <h2 className="text-xs font-mono text-zinc-500 flex items-center gap-2 uppercase tracking-widest mb-4">
                <CheckCircle2 className="w-4 h-4 text-zinc-600" />
                Recently Resolved
              </h2>
              <div className="divide-y divide-zinc-800/50 max-h-[300px] overflow-y-auto">
                {resolvedMessages.length === 0 ? (
                  <div className="py-4 text-center text-zinc-700 font-mono text-[10px] uppercase">
                    None
                  </div>
                ) : (
                  resolvedMessages.slice(0, 10).map((msg) => (
                    <div key={msg.id} className="py-3">
                      <div className="flex justify-between items-start mb-1 text-[10px]">
                        <span className="font-bold text-zinc-400">RM {msg.room}</span>
                        <span className="text-zinc-600 font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-zinc-500 text-[11px] line-clamp-1 italic">"{msg.text}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        
      </main>
      
      <style>{`
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .animate-pulse-red {
          animation: pulse-red 2s infinite;
        }
      `}</style>
    </div>
  );
}
