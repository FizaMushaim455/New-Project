# 🏥 SilentCare Pro: Multi-Modal AI Patient Monitoring
### *Empowering the Voiceless through Computer Vision & Generative AI*

---

## 👨‍💻 Developed By: **Fiza Mushaim**
### 📜 AG Number: **2023-ag-9944**
### 🎓 Subject: **Big Data Analysis (SE-506)**
### 👨‍🏫 Teacher: **Sir Hassan Tariq**

---

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-00B0FF?style=for-the-badge&logo=google&logoColor=white)](https://mediapipe.dev/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

---

## 🌟 Project Overview
**SilentCare Pro** is a cutting-edge Human-Computer Interaction (HCI) platform designed for hospital environments. It bridges the communication gap for patients who are **non-verbal, paralyzed, or in high distress** by using advanced Computer Vision to translate body language into natural speech.

---

## 🚀 Key Features

### 🔹 1. ASL & Gesture-to-Speech
- **Hand Landmarks**: High-precision tracking of 21 hand points.
- **Natural Translation**: Uses **Google Gemini 1.5 Flash** to convert sequences of signs into polite, context-aware sentences.

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
  - `Google Generative AI SDK` (Gemini API)
- **Backend**: Node.js + Socket.IO + SQLite
- **Communication**: Real-time bi-directional events for Nurse-Patient syncing.

---

## ⚙️ Setup & Installation

### 1. Prerequisites
- Node.js (v18 or higher)
- NPM or PNPM

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
VITE_GEMINI_API_KEY=YOUR_GOOGLE_AI_KEY_HERE
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run the Project
**Start the project (Client & Server):**
```bash
npm run dev
```
*The app will be available at `http://localhost:3000`*

---

## 📊 How it Works (The Big Data Aspect)
1. **Data Acquisition**: Captures 60 frames per second from the webcam.
2. **Feature Extraction**: Extracts 478 Face Landmarks and 21 Hand Landmarks.
3. **Logic Throttling**: Processes global tracking every 100ms to ensure 80% lower CPU usage.
4. **LLM Inference**: Sends landmark sequences to Gemini API for intent extraction.
5. **Real-time Streaming**: Broadcasts alerts to the Nurse Station via WebSockets.

---

### 🛡️ Future Roadmap
- [ ] Gaze-based Virtual Gboard for custom typing.
- [ ] Voice whisper amplification.
- [ ] Multi-ward enterprise scalability.

---

© 2026 Developed by Fiza Mushaim. All Rights Reserved.
