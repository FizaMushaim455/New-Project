import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, GestureRecognizer, FaceLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, Volume2, Trash2, Send, Hand, User, Activity } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const GESTURE_MAP: Record<string, string> = {
  'Closed_Fist': 'Help',
  'Open_Palm': 'Water',
  'Victory': 'Bathroom',
  'ILoveYou': 'Pain',
  'Thumb_Up': 'Yes',
  'Thumb_Down': 'No',
  'Call_Nurse': 'Nurse',
};

const GESTURE_ICONS: Record<string, string> = {
  'Help': '✊',
  'Water': '✋',
  'Bathroom': '✌️',
  'Pain': '🤟',
  'Yes': '👍',
  'No': '👎',
  'Nurse': '🤙',
};

interface PatientDashboardProps {
  user: { name: string; room: string; role: 'patient' | 'nurse' };
  onLogout: () => void;
}

export default function PatientDashboard({ user, onLogout }: PatientDashboardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [recognizer, setRecognizer] = useState<GestureRecognizer | null>(null);
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  
  const [currentGesture, setCurrentGesture] = useState<string>('None');
  const [gestureBuffer, setGestureBuffer] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalMessage, setFinalMessage] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const lastGestureRef = useRef<string>('None');
  const gestureFramesRef = useRef<number>(0);
  const lastAddedTimeRef = useRef<number>(0);
  const animationRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastBlinkTimeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);
  const lastIndexYRef = useRef<number>(0);
  const tapVelocityRef = useRef<number>(0);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  
  const [isBlinking, setIsBlinking] = useState(false);
  const [blinkCount, setBlinkCount] = useState(0);
  const [distressScore, setDistressScore] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [monitoringMode, setMonitoringMode] = useState<'both' | 'signs' | 'eye'>('both');
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  
  const gestureBufferRef = useRef<string[]>([]);
  const isProcessingRef = useRef<boolean>(false);
  const handleTranslateRef = useRef<() => void>(() => {});

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    gestureBufferRef.current = gestureBuffer;
  }, [gestureBuffer]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    handleTranslateRef.current = handleTranslate;
  });

  // Update refs when state changes
  useEffect(() => {
    recognizerRef.current = recognizer;
    faceLandmarkerRef.current = faceLandmarker;
  }, [recognizer, faceLandmarker]);

  // Initialize MediaPipe
  useEffect(() => {
    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
        );
        const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numHands: 1
        });
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: 'GPU'
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1
        });

        setRecognizer(gestureRecognizer);
        setFaceLandmarker(faceLandmarker);
        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to load MediaPipe Tasks:", error);
      }
    }
    init();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Start Webcam
  const startWebcam = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play();
        setIsWebcamActive(true);
        animationRef.current = requestAnimationFrame(predictWebcam);
      };
    } catch (error) {
      console.error("Error accessing webcam:", error);
      alert("Could not access webcam. Please allow permissions.");
    }
  };

  // Prediction Loop
  const predictWebcam = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const currentRecognizer = recognizerRef.current;
    const currentFaceLandmarker = faceLandmarkerRef.current;

    if (!video || !canvas || !currentRecognizer || !currentFaceLandmarker) {
      animationRef.current = requestAnimationFrame(predictWebcam);
      return;
    }

    // Match canvas size to video size
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const startTimeMs = performance.now();
      
    // --- PERFORMANCE THROTTLE: Run AI every 100ms (10fps for AI is enough) ---
    const nowMs = Date.now();
    if (nowMs - lastVideoTimeRef.current < 100) {
      animationRef.current = requestAnimationFrame(predictWebcam);
      return;
    }
    lastVideoTimeRef.current = nowMs;

    try {
      let results: any = null;
      let faceResults: any = null;

      // --- Selective Model Running (Based on Mode) ---
      if (monitoringMode === 'both' || monitoringMode === 'signs') {
        results = currentRecognizer.recognizeForVideo(video, startTimeMs);
      }
      
      if (monitoringMode === 'both' || monitoringMode === 'eye') {
        faceResults = currentFaceLandmarker.detectForVideo(video, startTimeMs);
      }

      let isOkGesture = false;
      let isShakaGesture = false;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const drawingUtils = new DrawingUtils(ctx);
        
        // --- DRAW HAND LANDMARKS ---
        if (results && results.landmarks && results.landmarks.length > 0) {
          for (const landmarks of results.landmarks) {
            drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, {
              color: '#00FF00',
              lineWidth: 4
            });
            drawingUtils.drawLandmarks(landmarks, {
              color: '#FF0000',
              lineWidth: 2,
              radius: 4
            });
          }
          
          // Custom gesture detection logic
          const lm = results.landmarks[0];
          
          // OK Gesture (Thumb and index touching, others extended)
          const dist4_8 = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
          const dist4_12 = Math.hypot(lm[4].x - lm[12].x, lm[4].y - lm[12].y);
          const dist4_16 = Math.hypot(lm[4].x - lm[16].x, lm[4].y - lm[16].y);
          
          if (dist4_8 < 0.05 && dist4_12 > 0.1 && dist4_16 > 0.1) {
            isOkGesture = true;
          }
          
          // Shaka Gesture (Nurse Call)
          const dist8_0 = Math.hypot(lm[8].x - lm[0].x, lm[8].y - lm[0].y);
          const dist5_0 = Math.hypot(lm[5].x - lm[0].x, lm[5].y - lm[0].y);
          const dist12_0 = Math.hypot(lm[12].x - lm[0].x, lm[12].y - lm[0].y);
          const dist9_0 = Math.hypot(lm[9].x - lm[0].x, lm[9].y - lm[0].y);
          const dist16_0 = Math.hypot(lm[16].x - lm[0].x, lm[16].y - lm[0].y);
          const dist13_0 = Math.hypot(lm[13].x - lm[0].x, lm[13].y - lm[0].y);
          const dist20_0 = Math.hypot(lm[20].x - lm[0].x, lm[20].y - lm[0].y);
          const dist17_0 = Math.hypot(lm[17].x - lm[0].x, lm[17].y - lm[0].y);
          const dist4_17 = Math.hypot(lm[4].x - lm[17].x, lm[4].y - lm[17].y);

          const isIndexFolded = dist8_0 < dist5_0;
          const isMiddleFolded = dist12_0 < dist9_0;
          const isRingFolded = dist16_0 < dist13_0;
          const isPinkyExtended = dist20_0 > dist17_0 * 1.2;
          const isThumbExtended = dist4_17 > 0.15;

          if (isIndexFolded && isMiddleFolded && isRingFolded && isPinkyExtended && isThumbExtended) {
            isShakaGesture = true;
          }

          // --- POINT & CLICK LOGIC (HCI OVERHAUL) ---
          const indexTip = lm[8];
          const currentY = indexTip.y;
          const currentX = indexTip.x;
          
          // 1. Detect if hand is in a "Pointing" pose (Index extended, others folded)
          const isPointing = !isIndexFolded && isMiddleFolded && isRingFolded;
          
          // 2. Cursor/Hover Logic (Map normalized 0-1 to buttons)
          // Buttons are roughly: Water(TL), Food(TR), Help(BL), Family(BR)
          let newHover: string | null = null;
          if (isPointing) {
            if (currentX < 0.4 && currentY < 0.4) newHover = 'Water';
            else if (currentX > 0.6 && currentY < 0.4) newHover = 'Food';
            else if (currentX < 0.4 && currentY > 0.6) newHover = 'Help';
            else if (currentX > 0.6 && currentY > 0.6) newHover = 'Family';
          }
          setHoveredButton(newHover);

          // 3. De-conflicted Tap Logic (Only tap if pointing)
          const deltaY = currentY - lastIndexYRef.current;
          const now = Date.now();
          
          if (isPointing && deltaY > 0.03 && (now - lastTapTimeRef.current > 300)) {
            addLog("👆 CLICK!");
            setTapCount(prev => prev + 1);
            lastTapTimeRef.current = now;
            
            if (newHover) {
              setGestureBuffer(prev => [...prev, newHover as string]);
            }
          }
          lastIndexYRef.current = currentY;
        }

        // --- DRAW FACE LANDMARKS ---
        if (faceResults && faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
          for (const landmarks of faceResults.faceLandmarks) {
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
              color: '#C0C0C070',
              lineWidth: 1
            });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: '#00FF00' });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: '#00FF00' });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, { color: '#E0E0E0' });
          }

          // --- PROCESS BLINK & EMOTIONS ---
          if (faceResults.faceBlendshapes && faceResults.faceBlendshapes.length > 0) {
            const blendshapes = faceResults.faceBlendshapes[0].categories;
            
            const blinkL = blendshapes.find(b => b.categoryName === 'eyeBlinkLeft')?.score || 0;
            const blinkR = blendshapes.find(b => b.categoryName === 'eyeBlinkRight')?.score || 0;
            const browDownL = blendshapes.find(b => b.categoryName === 'browDownLeft')?.score || 0;
            const browDownR = blendshapes.find(b => b.categoryName === 'browDownRight')?.score || 0;
            const mouthStretchL = blendshapes.find(b => b.categoryName === 'mouthStretchLeft')?.score || 0;
            const mouthStretchR = blendshapes.find(b => b.categoryName === 'mouthStretchRight')?.score || 0;

            // Blink Logic (Dual eyes for 150ms+)
            const avgBlink = (blinkL + blinkR) / 2;
            if (avgBlink > 0.5) {
              if (!isBlinking) {
                setIsBlinking(true);
                addLog("👁️ BLINK");
                setBlinkCount(prev => prev + 1);
                // Auto-reset blink count after 2 seconds
                setTimeout(() => setBlinkCount(0), 2000);
              }
            } else {
              setIsBlinking(false);
            }

            // SOS Blink Logic: 3 blinks within 2 seconds
            if (blinkCount >= 3) {
              handleSOSBlink();
              setBlinkCount(0);
            }

            // Distress Logic: Brow down + Mouth stretch
            const distress = (browDownL + browDownR + mouthStretchL + mouthStretchR) / 4;
            setDistressScore(distress * 100);
            if (distress > 0.7) {
              triggerAutoDistressAlert(distress);
            }
          }
        }
        ctx.restore();
      }

      // Process gesture
      if (results && results.gestures && results.gestures.length > 0) {
        const gestureName = results.gestures[0][0].categoryName;
        const score = results.gestures[0][0].score;
        
        let detectedGesture = 'None';
        if (isOkGesture) {
          detectedGesture = 'OK_Gesture';
        } else if (isShakaGesture) {
          detectedGesture = 'Call_Nurse';
        } else if (score > 0.5 && gestureName !== 'None') {
          detectedGesture = gestureName;
        }
        
        if (detectedGesture === 'OK_Gesture') {
          setCurrentGesture('OK_Gesture');
          
          if (!isProcessingRef.current && gestureBufferRef.current.length > 0) {
            if ('OK_Gesture' === lastGestureRef.current) {
              gestureFramesRef.current += 1;
            } else {
              lastGestureRef.current = 'OK_Gesture';
              gestureFramesRef.current = 1;
            }

            if (gestureFramesRef.current > 15) {
              handleTranslateRef.current();
              gestureFramesRef.current = 0;
            }
          }
        } else if (detectedGesture !== 'None') {
          setCurrentGesture(detectedGesture);
          
          // Debounce logic to add to buffer
          if (detectedGesture === lastGestureRef.current) {
            gestureFramesRef.current += 1;
          } else {
            lastGestureRef.current = detectedGesture;
            gestureFramesRef.current = 1;
          }

          const now = Date.now();
          // Require 10 frames of consistent gesture and 1.5s cooldown between adding the same gesture
          if (gestureFramesRef.current > 10 && (now - lastAddedTimeRef.current > 1500)) {
            const meaning = GESTURE_MAP[detectedGesture];
            if (meaning) {
              setGestureBuffer(prev => [...prev, meaning]);
              lastAddedTimeRef.current = now;
              gestureFramesRef.current = 0; // Reset
            }
          }
        } else {
          setCurrentGesture('None');
          lastGestureRef.current = 'None';
          gestureFramesRef.current = 0;
        }
      } else {
        setCurrentGesture('None');
        lastGestureRef.current = 'None';
        gestureFramesRef.current = 0;
      }
    } catch (error) {
      console.error("Recognition error:", error);
    }

    animationRef.current = requestAnimationFrame(predictWebcam);
  };

  // Call Gemini API with Fallback Logic
  const handleTranslate = async () => {
    const currentBuffer = gestureBufferRef.current;
    if (currentBuffer.length === 0) return;
    
    setIsProcessing(true);
    setFinalMessage(null);
    setUrgency(null);

    // List of models available on your system to try in order
    const modelFallback = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-pro-latest'];
    let success = false;

    for (const modelId of modelFallback) {
      if (success) break;

      try {
        console.log(`Attempting translation with: ${modelId}`);
        const ai = new GoogleGenAI({ 
          apiKey: import.meta.env.VITE_GEMINI_API_KEY,
          apiVersion: 'v1beta'
        });

        const response = await ai.models.generateContent({
          model: modelId,
          contents: `You are assisting a gesture-to-text communication app for patients in Pakistan who may speak Urdu or English.
Input:
- recognized_gestures: ${JSON.stringify(currentBuffer)}

Task:
1. Infer the message and rewrite it as a natural sentence in BOTH English and Urdu.
2. Determine urgency (low, medium, high).`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                final_text: {
                  type: Type.STRING,
                  description: "The English sentence."
                },
                urdu_text: {
                  type: Type.STRING,
                  description: "The Urdu translation."
                },
                urgency: {
                  type: Type.STRING,
                  description: "Urgency level."
                }
              },
              required: ['final_text', 'urdu_text', 'urgency']
            }
          }
        });

        const text = response.text;
        if (text) {
          const result = JSON.parse(text);
          setFinalMessage(`${result.final_text} | ${result.urdu_text}`);
          setUrgency(result.urgency);
          speakText(result.final_text);
          
          if (socket) {
            socket.emit('send_message', {
              patientName: user.name,
              room: user.room,
              text: result.final_text,
              urgency: result.urgency,
              resolved: false
            });
          }
          success = true;
          console.log(`✅ Success with ${modelId}`);
        }
      } catch (error: any) {
        console.warn(`⚠️ Error with ${modelId}:`, error.message);
        // If we are on the last model and still failing, show error to user
        if (modelId === modelFallback[modelFallback.length - 1]) {
          setFinalMessage("Service is currently overloaded. Please wait a moment and try again.");
        }
        // Continue to next model in loop...
      }
    }

    setIsProcessing(false);
    if (success) setGestureBuffer([]); // Clear only on success
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const clearBuffer = () => {
    setGestureBuffer([]);
    setFinalMessage(null);
    setUrgency(null);
  };

  const addLog = (msg: string) => {
    setSystemLogs(prev => [msg, ...prev].slice(0, 3));
  };

  // --- NEW MULTI-MODAL LOGIC ---
  
  const handleSOSBlink = () => {
    if (isProcessingRef.current) return;
    addLog("🆘 SOS PATTERN DETECTED");
    setGestureBuffer(["URGENT SOS"]);
    handleTranslate();
  };

  const triggerAutoDistressAlert = (score: number) => {
    if (isProcessingRef.current) return;
    const now = Date.now();
    // 5-second cooldown for auto-alerts
    if (now - lastAddedTimeRef.current < 5000) return;
    
    console.log("🚨 Auto Distress Alert Triggered:", score);
    setFinalMessage("System detected patient distress.");
    setUrgency("high");
    
    if (socket) {
      socket.emit('send_message', {
        patientName: user.name,
        room: user.room,
        text: "AUTO-ALERT: Patient showing signs of physical distress/pain.",
        urgency: "high",
        resolved: false
      });
    }
    lastAddedTimeRef.current = now;
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
              <p className="text-[10px] text-cyan-500 font-mono uppercase tracking-widest">Patient Terminal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-950 px-4 py-2 rounded-full border border-zinc-800 uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-cyan-500" />
              {user.name} <span className="text-zinc-600">|</span> RM {user.room}
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

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Camera & Instructions */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          
          {/* Camera View */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden relative group shadow-2xl">
            <div className="aspect-video bg-zinc-950 relative">
              {!isLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 z-10 bg-zinc-950">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-cyan-500" />
                  <p className="font-mono text-xs uppercase tracking-widest">Initializing AI Model...</p>
                </div>
              )}
              
              {!isWebcamActive && isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-zinc-950/80 backdrop-blur-sm">
                  <button
                    onClick={startWebcam}
                    className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 px-8 py-4 rounded-xl font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all transform hover:scale-105 flex items-center gap-3"
                  >
                    <Hand className="w-5 h-5" />
                    Start Camera
                  </button>
                </div>
              )}

              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover mirror opacity-80"
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover mirror pointer-events-none"
              />
              
              {/* Virtual Selection Buttons (HCI Overlay) */}
              {isWebcamActive && monitoringMode !== 'eye' && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className={`absolute top-4 left-4 w-28 h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center bg-zinc-950/40 backdrop-blur-sm ${hoveredButton === 'Water' ? 'border-cyan-400 scale-110 shadow-[0_0_20px_rgba(6,182,212,0.5)]' : 'border-zinc-800'}`}>
                    <span className="text-2xl mb-1">💧</span>
                    <span className="text-[9px] font-mono font-bold text-zinc-100 uppercase tracking-widest">Water</span>
                  </div>
                  <div className={`absolute top-4 right-4 w-28 h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center bg-zinc-950/40 backdrop-blur-sm ${hoveredButton === 'Food' ? 'border-cyan-400 scale-110 shadow-[0_0_20px_rgba(6,182,212,0.5)]' : 'border-zinc-800'}`}>
                    <span className="text-2xl mb-1">🍎</span>
                    <span className="text-[9px] font-mono font-bold text-zinc-100 uppercase tracking-widest">Food</span>
                  </div>
                  <div className={`absolute bottom-4 left-4 w-28 h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center bg-zinc-950/40 backdrop-blur-sm ${hoveredButton === 'Help' ? 'border-red-500 scale-110 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'border-zinc-800'}`}>
                    <span className="text-2xl mb-1">🆘</span>
                    <span className="text-[9px] font-mono font-bold text-zinc-100 uppercase tracking-widest">Help</span>
                  </div>
                  <div className={`absolute bottom-4 right-4 w-28 h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center bg-zinc-950/40 backdrop-blur-sm ${hoveredButton === 'Family' ? 'border-purple-400 scale-110 shadow-[0_0_20px_rgba(168,85,247,0.5)]' : 'border-zinc-800'}`}>
                    <span className="text-2xl mb-1">👨‍👩‍👧</span>
                    <span className="text-[9px] font-mono font-bold text-zinc-100 uppercase tracking-widest">Family</span>
                  </div>
                </div>
              )}

              {/* Current Gesture Overlay */}
              {isWebcamActive && (
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <div className="bg-zinc-950/80 backdrop-blur-md text-zinc-100 px-4 py-2 rounded-xl font-mono text-sm border border-zinc-800 flex items-center gap-3 shadow-2xl">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                    {currentGesture !== 'None' ? (
                      <span className="flex items-center gap-2">
                        <span className="text-xl">{GESTURE_ICONS[GESTURE_MAP[currentGesture]] || '✋'}</span>
                        {GESTURE_MAP[currentGesture] || currentGesture.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-xs uppercase tracking-widest">Awaiting Input...</span>
                    )}
                  </div>
                  
                  {/* Eye & Tap Indicators */}
                  <div className="flex gap-2">
                    <div className={`px-3 py-1.5 rounded-lg border font-mono text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all ${isBlinking ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400' : 'bg-zinc-950/80 border-zinc-800 text-zinc-500'}`}>
                      {isBlinking ? '👁️ Blink Detected' : '👁️ Eyes Open'}
                    </div>
                    {blinkCount > 0 && (
                      <div className="px-3 py-1.5 rounded-lg bg-orange-500/20 border border-orange-400 text-orange-400 font-mono text-[10px] uppercase tracking-wider animate-bounce">
                        Blink Pattern: {blinkCount}/3
                      </div>
                    )}
                    {tapCount > 0 && (
                      <div className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-400 text-purple-400 font-mono text-[10px] uppercase tracking-wider animate-pulse">
                        👆 Tap: {tapCount}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Distress Meter Overlay */}
              {isWebcamActive && (
                <div className="absolute right-4 bottom-4 w-40">
                  <div className="bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-zinc-800 shadow-2xl">
                    <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2 flex justify-between">
                      Distress Level <span>{Math.round(distressScore)}%</span>
                    </p>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${distressScore > 70 ? 'bg-red-500' : distressScore > 40 ? 'bg-amber-500' : 'bg-cyan-500'}`}
                        style={{ width: `${distressScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Diagnostic System Logs */}
              {isWebcamActive && systemLogs.length > 0 && (
                <div className="absolute left-4 bottom-4 flex flex-col gap-1 pointer-events-none">
                  {systemLogs.map((log, i) => (
                    <div key={i} className="bg-cyan-500/90 text-zinc-950 px-3 py-1 rounded-md text-[9px] font-bold font-mono tracking-tighter animate-in slide-in-from-left-2 fade-in duration-300">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-mono text-xs text-zinc-500 uppercase tracking-widest">Active Monitoring Mode</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setMonitoringMode('signs')}
                className={`py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest border transition-all ${monitoringMode === 'signs' ? 'bg-cyan-500 border-cyan-400 text-zinc-950 font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}
              >
                Signs Only
              </button>
              <button 
                onClick={() => setMonitoringMode('eye')}
                className={`py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest border transition-all ${monitoringMode === 'eye' ? 'bg-cyan-500 border-cyan-400 text-zinc-950 font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}
              >
                Eye Only
              </button>
              <button 
                onClick={() => setMonitoringMode('both')}
                className={`py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest border transition-all ${monitoringMode === 'both' ? 'bg-cyan-500 border-cyan-400 text-zinc-950 font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}
              >
                Full Monitor
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex-1 shadow-xl">
            <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-5">Available Gestures</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(GESTURE_MAP).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.1)] group">
                  <span className="text-2xl drop-shadow-sm group-hover:scale-110 transition-transform">{GESTURE_ICONS[value]}</span>
                  <span className="font-medium text-zinc-300 text-sm">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center gap-4 text-cyan-400 shadow-sm">
              <span className="text-2xl drop-shadow-sm">👌</span>
              <div className="font-medium text-sm">
                <p>Make an OK gesture to send the message</p>
                {isProcessing && <p className="text-cyan-300 flex items-center gap-2 mt-1 text-xs font-mono uppercase tracking-widest"><Loader2 className="w-3 h-3 animate-spin" /> Processing...</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Translation & Output */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          
          {/* Gesture Buffer */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex-1 flex flex-col shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-mono text-xs text-zinc-500 uppercase tracking-widest">Current Sequence</h2>
              <button 
                onClick={clearBuffer}
                disabled={gestureBuffer.length === 0}
                className="text-zinc-500 hover:text-red-400 disabled:opacity-50 transition-colors p-1.5 hover:bg-zinc-800 rounded-lg"
                title="Clear sequence"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 bg-zinc-950 rounded-xl border border-zinc-800 p-5 mb-4 min-h-[140px] flex flex-wrap content-start gap-2 shadow-inner">
              {gestureBuffer.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 text-xs font-mono uppercase tracking-widest gap-2">
                  <Hand className="w-6 h-6 opacity-20" />
                  Awaiting Gestures
                </div>
              ) : (
                gestureBuffer.map((gesture, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 shadow-sm px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-200 animate-in fade-in zoom-in duration-200">
                    <span className="text-base">{GESTURE_ICONS[gesture]}</span>
                    {gesture}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Final Output */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 relative overflow-hidden min-h-[220px] flex flex-col justify-center shadow-xl">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-mono text-xs text-zinc-500 uppercase tracking-widest">AI Translation</h2>
                {urgency && (
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md uppercase tracking-widest shadow-sm ${
                    urgency === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                    urgency === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {urgency} Priority
                  </span>
                )}
              </div>
              
              {finalMessage ? (
                <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">
                  <p className="text-2xl font-display font-medium text-zinc-100 leading-tight tracking-tight">
                    "{finalMessage}"
                  </p>
                  <button 
                    onClick={() => speakText(finalMessage)}
                    className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-mono text-xs uppercase tracking-widest transition-all bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 px-4 py-2.5 rounded-lg w-fit"
                  >
                    <Volume2 className="w-4 h-4" />
                    Play Audio
                  </button>
                </div>
              ) : (
                <div className="text-center text-zinc-600 flex flex-col items-center gap-3">
                  <div className="p-3 bg-zinc-950 rounded-full border border-zinc-800">
                    <Volume2 className="w-6 h-6 opacity-40" />
                  </div>
                  <p className="font-mono text-xs uppercase tracking-widest">Output Pending</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
