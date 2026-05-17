# 🏥 SilentCare Pro: Multi-Modal AI Patient Monitoring
### *Empowering the Voiceless through Computer Vision & Generative AI*

---

## 👨‍💻 Developed By: **Fiza Mushaim**
### 📜 AG Number: **2023-ag-9944**
### 🎓 Subject: **Big Data Analysis (SE-506)**
### 👨‍🏫 Teacher: **Sir Hassan Tariq**

---

## 🌟 Project Overview
**SilentCare Pro** is a cutting-edge Human-Computer Interaction (HCI) platform designed for hospital environments. It bridges the communication gap for patients who are **non-verbal, paralyzed, or in high distress** by using advanced Computer Vision to translate body language into natural speech.

---

## 🚀 Key Features

### 🔹 1. ASL & Gesture-to-Speech
- **Hand Landmarks**: High-precision tracking of 21 hand points.
- **Natural Translation**: Uses our **custom-trained ASL model** to convert sequences of signs into polite, context-aware sentences.

### 🔹 2. Gaze-Dwell Interaction (For Quadriplegic Patients)
- **Eye Tracking**: Monitors Iris center points to detect where a patient is looking.
- **Virtual Keyboard**: Allows patients with 0% limb movement to select "Water," "Food," or "Help" just by staring at on-screen icons for 2 seconds.

### 🔹 3. Emotional AI & Distress Monitoring
- **Facial Blendshapes**: Monitors 478 face points to detect pain, grimaces, or SOS blink patterns (3 rapid blinks).
- **Auto-Alert**: Bypasses manual signs to alert nurses immediately if high distress is detected.

### 🔹 4. Bilingual Support (Urdu & English)
- **Voice Synthesis**: Speaks out requests in both **English and Urdu** using text-to-speech with natural regional accents.

### 🔹 5. Premium Nurse Command Center
- **Ward Live Map**: Real-time room status tracking.
- **Urgency Strobes**: High-priority red pulsing alerts for critical needs.

---

## 🛠️ Technical Stack
- **Frontend**: React + Vite + TypeScript (Sleek Obsidian HUD)
- **Styling**: Tailwind CSS + Glassmorphism UI
- **AI Core**: 
  - `MediaPipe` (Hand Gesture & Face Landmarker)
- **Backend**: Node.js + Socket.IO + SQLite
- **Communication**: Real-time bi-directional events for Nurse-Patient syncing.

---

## 🧠 Machine Learning Workflow (Custom-Trained)

SilentCare Pro now uses a **Local Python Inference Server** instead of cloud APIs. This ensures 100% privacy and zero latency.

### 1. Collect Clinical Gestures
Record hand snapshots for hospital-specific needs (e.g., Water, Pain, Nurse).
```bash
python collect_data.py
```

### 2. Train the "SilentCare Brain"
Build your local Random Forest model based on the collected data.
```bash
python train_model.py
```

### 3. Launch the Platform
1. **Start ML Server**: `python ml_server.py` (Port 5001)
2. **Start Web App**: `npm run dev` (Port 3000)

---

## 💎 Features & Capabilities

-   **Custom ML Core**: Uses a local Random Forest classifier (No Gemini API Key needed).
-   **Local Translation**: Rule-based intent extraction replaces cloud LLMs.
-   **Privacy-First**: No data ever leaves the local network.
-   **Multi-Modal**: Gaze tracking and Distress monitoring remain integrated.

---

### 🛡️ Future Roadmap
- [ ] Gaze-based Virtual Gboard for custom typing.
- [ ] Voice whisper amplification.
- [ ] Multi-ward enterprise scalability.

---

© 2026 Developed by Fiza Mushaim. All Rights Reserved.
