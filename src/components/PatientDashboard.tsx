import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, GestureRecognizer, FaceLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, Volume2, Trash2, Send, Hand, User, Activity, HelpCircle, Bell } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const GESTURE_MAP: Record<string, string> = {
  'Closed_Fist': 'Help',
  'Victory': 'Bathroom',
  'ILoveYou': 'Pain',
  'Thumb_Up': 'Yes',
  'Thumb_Down': 'No',
  'Call_Nurse': 'Nurse',
};

const GESTURE_ICONS: Record<string, string> = {
  'Help': '✊',
  'Bathroom': '✌️',
  'Pain': '🤟',
  'Yes': '👍',
  'No': '👎',
  'Nurse': '🤙',
};

const LOCAL_QUICK_TRANSLATIONS: Record<string, { en: string; urgency: string }> = {
  'Help': { en: 'I need assistance immediately.', urgency: 'medium' },
  'Nurse': { en: 'Please call the nurse.', urgency: 'medium' },
  'Bathroom': { en: 'I need to go to the bathroom.', urgency: 'medium' },
  'Pain': { en: 'I am in pain.', urgency: 'high' },
  'URGENT SOS': { en: 'EMERGENCY! I need immediate help!', urgency: 'high' },
  'Yes': { en: 'Yes.', urgency: 'low' },
  'No': { en: 'No.', urgency: 'low' },
};

interface PatientDashboardProps {
  user: { name: string; room: string; role: 'patient' | 'nurse' };
  onLogout: () => void;
  onShowGuide: () => void;
}

export default function PatientDashboard({ user, onLogout, onShowGuide }: PatientDashboardProps) {
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
  const [showSOSOverlay, setShowSOSOverlay] = useState(false);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  
  const [isBlinking, setIsBlinking] = useState(false);
  const [blinkCount, setBlinkCount] = useState(0);
  const [distressScore, setDistressScore] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [monitoringMode, setMonitoringMode] = useState<'both' | 'signs' | 'eye'>('both');
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [gazeButton, setGazeButton] = useState<string | null>(null);
  const [gazeProgress, setGazeProgress] = useState(0);
  const [debugInfo, setDebugInfo] = useState({ face: false, hand: false, blinkScore: 0 });
  
  const gestureBufferRef = useRef<string[]>([]);
  const gazeStartTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const blinkCountRef = useRef<number>(0);
  const lastBlinkMsgTimeRef = useRef<number>(0);
  const handleTranslateRef = useRef<(overrideBuffer?: string[]) => void>(() => {});
  const monitoringModeRef = useRef<'both' | 'signs' | 'eye'>(monitoringMode);

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
    handleTranslateRef.current = (buffer) => handleTranslate(buffer);
  });

  // Update refs when state changes
  useEffect(() => {
    recognizerRef.current = recognizer;
    faceLandmarkerRef.current = faceLandmarker;
    monitoringModeRef.current = monitoringMode;
  }, [recognizer, faceLandmarker, monitoringMode]);

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
            delegate: 'CPU'
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

      let faceDetected = false;
      let handDetected = false;
      let currentBlinkScore = 0;

      const currentMode = monitoringModeRef.current;

      if (currentMode === 'both' || currentMode === 'signs') {
        results = currentRecognizer.recognizeForVideo(video, startTimeMs);
        if (results && results.landmarks && results.landmarks.length > 0) handDetected = true;
      }
      
      if (currentMode === 'both' || currentMode === 'eye') {
        faceResults = currentFaceLandmarker.detectForVideo(video, startTimeMs);
        if (faceResults && faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) faceDetected = true;
        
        if (faceResults && faceResults.faceBlendshapes && faceResults.faceBlendshapes.length > 0) {
          const shapes = faceResults.faceBlendshapes[0].categories;
          const bL = shapes.find(b => b.categoryName === 'eyeBlinkLeft')?.score || 0;
          const bR = shapes.find(b => b.categoryName === 'eyeBlinkRight')?.score || 0;
          currentBlinkScore = (bL + bR) / 2;
        }
      }
      
      // Update Debug Info (throttle for performance)
      if (nowMs % 200 < 100) {
        setDebugInfo({ face: faceDetected, hand: handDetected, blinkScore: currentBlinkScore });
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
          const currentX = 1 - indexTip.x; // FLIP FOR MIRRORED UI
          
          // 1. Detect if hand is in a "Pointing" pose (Index extended, others folded)
          const isPointing = !isIndexFolded && isMiddleFolded && isRingFolded;
          
          // 2. Cursor/Hover Logic (Map normalized 0-1 to buttons)
          // Buttons are roughly: Water(TL), Food(TR), Help(BL), Family(BR)
          let newHover: string | null = null;
          if (isPointing) {
            if (currentX < 0.4 && currentY > 0.6) newHover = 'Help';
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
            // EXPLICIT: ONLY DRAW OUTLINES (NO TESSELLATION)
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: '#00FFFF', lineWidth: 1.5 });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: '#00FFFF', lineWidth: 1.5 });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, { color: '#00FFFF', lineWidth: 1 });
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

            // Max Sensitivity Blink Logic (0.12 threshold)
            const avgBlink = (blinkL + blinkR) / 2;
            if (avgBlink > 0.5) {
              if (!isBlinking) {
                setIsBlinking(true);
                addLog("👁️ BLINK");
                
                blinkCountRef.current += 1;
                setBlinkCount(blinkCountRef.current);
                lastBlinkMsgTimeRef.current = Date.now();
                
                // --- STEP 1: Check for Confirmation (2 blinks) ---
                if (blinkCountRef.current === 2 && gestureBufferRef.current.length > 0) {
                  addLog("👁️ CONFIRM BLINK");
                  handleTranslateRef.current();
                  blinkCountRef.current = 0;
                  setBlinkCount(0);
                }
                
                // --- STEP 2: Check for SOS (3 blinks) ---
                if (blinkCountRef.current >= 3) {
                  handleSOSBlink();
                  blinkCountRef.current = 0;
                  setBlinkCount(0);
                }
              }
            } else {
              setIsBlinking(false);
              // Auto-reset if inactive for 2.5 seconds
              const timeSinceBlink = Date.now() - lastBlinkMsgTimeRef.current;
              if (timeSinceBlink > 1500 && blinkCountRef.current > 0) {
                blinkCountRef.current = 0;
                setBlinkCount(0);
              }
            }

            // Distress Logic: Brow down + Mouth stretch
            const distress = (browDownL + browDownR + mouthStretchL + mouthStretchR) / 4;
            setDistressScore(distress * 100);
            if (distress > 0.7) {
              triggerAutoDistressAlert(distress);
            }
            // --- GAZE DWELL LOGIC (FOR PARALYZED PATIENTS) ---
            if (faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
              const irisL = faceResults.faceLandmarks[0][468]; // Left Iris Center
              const irisR = faceResults.faceLandmarks[0][473]; // Right Iris Center
              const gazeX = 1 - ((irisL.x + irisR.x) / 2); // FLIP FOR MIRRORED UI
              const gazeY = (irisL.y + irisR.y) / 2;

              let currentGaze: string | null = null;
              // Map areas: Top Left(Water), Top Right(Food), Mid Left(Help), Mid Right(Nurse)
              if (gazeY > 0.6) {
                if (gazeX > 0.3 && gazeX < 0.7) currentGaze = 'Confirm';
                else if (gazeX < 0.3) currentGaze = 'Help';
                else if (gazeX > 0.7) currentGaze = 'Nurse';
              }

              if (currentGaze && currentGaze === gazeButton) {
                const elapsed = Date.now() - gazeStartTimeRef.current;
                const progress = Math.min((elapsed / 800) * 100, 100); // Super-Gaze: 800ms
                setGazeProgress(progress);
                if (progress >= 100) {
                  addLog(`👁️ GAZE: ${currentGaze}`);
                  if (currentGaze === 'Confirm') {
                    if (gestureBufferRef.current.length > 0) {
                      handleTranslateRef.current();
                    } else {
                      addLog("⚠️ BUFFER EMPTY");
                    }
                  } else {
                    setGestureBuffer(prev => [...prev, currentGaze as string]);
                  }
                  gazeStartTimeRef.current = Date.now() + 5000; // Cooldown
                  setGazeProgress(0);
                }
              } else {
                setGazeButton(currentGaze);
                setGazeProgress(0);
                gazeStartTimeRef.current = Date.now();
              }
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

            if (gestureFramesRef.current > 10) { // Super-Fast OK: 0.6s
              speakText("Sending confirmed request.");
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
          // AUTO-SEND: If consistent for 25 frames (~1.5s), send immediately
          if (gestureFramesRef.current > 25) {
            const meaning = GESTURE_MAP[detectedGesture];
            if (meaning && !isProcessingRef.current) {
              speakText(`Sending ${meaning} request.`);
              handleTranslateRef.current([meaning]);
              gestureFramesRef.current = 0;
              lastAddedTimeRef.current = now;
            }
          }
          
          // Require 10 frames of consistent gesture and 1.5s cooldown between adding the same gesture
          if (gestureFramesRef.current > 10 && (now - lastAddedTimeRef.current > 1500)) {
            const meaning = GESTURE_MAP[detectedGesture];
            if (meaning) {
              setGestureBuffer(prev => [...prev, meaning]);
              lastAddedTimeRef.current = now;
              // No reset here, wait for auto-send or manual confirm
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
  const handleTranslate = async (overrideBuffer?: string[]) => {
    const currentBuffer = overrideBuffer || gestureBufferRef.current;
    if (currentBuffer.length === 0) return;
    
    setIsProcessing(true);
    setFinalMessage(null);
    setUrgency(null);

    // --- STEP 1: LOCAL FAST-PATH (Instant Response) ---
    const bufferKey = currentBuffer.join('+');
    if (LOCAL_QUICK_TRANSLATIONS[bufferKey]) {
      const result = LOCAL_QUICK_TRANSLATIONS[bufferKey];
      console.log("⚡ Fast-Path Triggered:", bufferKey);
      setFinalMessage(result.en);
      setUrgency(result.urgency);
      
      speakText(result.en, false);
      if (socket) {
        socket.emit('send_message', {
          patientName: user.name,
          room: user.room,
          text: result.en,
          urgency: result.urgency,
          resolved: false
        });
      }
      setIsProcessing(false);
      setGestureBuffer([]);
      return; 
    }

    // --- STEP 2: CLOUD AI (For Complex Patterns) ---
    const modelToUse = 'gemini-1.5-flash';
    
    try {
      console.log(`Cloud AI translation: ${modelToUse}`);
      const ai = new GoogleGenAI({ 
        // @ts-ignore
        apiKey: import.meta.env.VITE_GEMINI_API_KEY,
        apiVersion: 'v1beta'
      });

      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: `Input Sequence: ${JSON.stringify(currentBuffer)}\nTranslate to a natural English sentence. Result in JSON {final_text, urgency}.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              final_text: { type: Type.STRING },
              urgency: { type: Type.STRING }
            },
            required: ['final_text', 'urgency']
          }
        }
      });

      const text = response.text;
      if (text) {
        const result = JSON.parse(text);
        setFinalMessage(result.final_text);
        setUrgency(result.urgency);
        
        speakText(result.final_text, false);
        
        if (socket) {
          socket.emit('send_message', {
            patientName: user.name,
            room: user.room,
            text: result.final_text,
            urgency: result.urgency,
            resolved: false
          });
        }
        setGestureBuffer([]);
      }
    } catch (error: any) {
      console.warn(`Translation Error:`, error.message);
      setFinalMessage("System communication error. Please try again.");
    }

    setIsProcessing(false);
  };

  const speakText = (text: string, isUrdu: boolean = false) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      if (isUrdu) {
        utterance.lang = 'ur-PK'; // Urdu (Pakistan)
        utterance.pitch = 0.9;
        utterance.rate = 0.9;
      }
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
    // SOS SHOULD NEVER BE BLOCKED BY PROCESSING
    addLog("🆘 SOS PATTERN DETECTED");
    const sosBuffer = ["URGENT SOS"];
    setGestureBuffer(sosBuffer);
    
    // Immediate Visual Feedback for Patient
    setShowSOSOverlay(true);
    setTimeout(() => setShowSOSOverlay(false), 3000);

    // Immediate Translation & Socket Emission
    handleTranslate(sosBuffer);
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
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-950 px-4 py-2 rounded-full border border-zinc-800 uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-cyan-500" />
              {user.name} <span className="text-zinc-600">|</span> RM {user.room}
            </div>
            <button
              onClick={onShowGuide}
              title="System Guide"
              className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-cyan-400 px-3 py-2 rounded-lg hover:bg-zinc-800 border border-zinc-800 hover:border-cyan-500/30 transition-all uppercase tracking-widest"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Guide</span>
            </button>
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
              
              {/* Gaze HUD Overlay (Interactive Elements Only) */}
              {isWebcamActive && (
                <>
                  {/* Top Gaze Buttons Removed for Simplicity */}

                  {/* Central Status HUD - Ultra Minimalist Corner */}
                  <div className="absolute top-6 left-6 flex items-center gap-2">
                    <div className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 shadow-2xl transition-all opacity-80 hover:opacity-100">
                      <div className={`w-1.5 h-1.5 rounded-full ${currentGesture !== 'None' ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-700'}`} />
                      <span className="font-mono text-[9px] font-bold text-white/50 uppercase tracking-[0.2em]">
                        {currentGesture !== 'None' ? (
                          <span className="flex items-center gap-2">
                             {GESTURE_MAP[currentGesture] || currentGesture.replace('_', ' ')}
                          </span>
                        ) : 'STANDBY'}
                      </span>
                    </div>
                  </div>

                  {/* --- LIVE DEBUG HUD --- */}
                  <div className="absolute top-6 right-6 flex flex-col gap-2 z-30 pointer-events-none">
                    <div className="bg-black/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 shadow-2xl flex flex-col gap-2 min-w-[140px] animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Face AI</span>
                        <div className={`w-2 h-2 rounded-full ${debugInfo.face ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`} />
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Hand AI</span>
                        <div className={`w-2 h-2 rounded-full ${debugInfo.hand ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`} />
                      </div>
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[8px] font-mono text-white/30 uppercase">Blink Intensity</span>
                          <span className="text-[10px] font-mono font-bold text-cyan-400">{debugInfo.blinkScore.toFixed(2)}</span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-400 transition-all duration-100" style={{ width: `${Math.min(debugInfo.blinkScore * 100, 100)}%` }} />
                        </div>
                        <div className={`text-[7px] font-mono mt-1 ${debugInfo.blinkScore > 0.5 ? 'text-cyan-400 font-bold' : 'text-white/20'}`}>
                          THRESHOLD: 0.50
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Gaze Button - Confirm (Sleek Floating Pill) */}
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
                    <div className={`px-8 py-3 rounded-full border-2 backdrop-blur-2xl transition-all flex items-center gap-3 overflow-hidden ${gazeButton === 'Confirm' ? 'bg-emerald-500/40 border-emerald-400 scale-110 shadow-[0_0_50px_rgba(16,185,129,0.5)] opacity-100' : 'bg-black/20 border-white/5 opacity-40 hover:opacity-100'}`}>
                      <span className="text-xl">✅</span>
                      <span className="text-[10px] font-mono font-black text-white uppercase tracking-[0.2em]">Confirm & Send</span>
                      {gazeButton === 'Confirm' && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500/20">
                           <div className="h-full bg-emerald-400 transition-all duration-[2000ms] ease-linear" style={{ width: `${gazeProgress}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Minimalist Floating Status Bar */}
                  <div className="absolute bottom-4 inset-x-8 h-12 rounded-full bg-black/40 backdrop-blur-2xl border border-white/5 flex items-center justify-between px-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] pointer-events-none">
                    <div className="flex items-center gap-6">
                      <div className={`flex items-center gap-2 text-[8px] font-mono uppercase tracking-[0.2em] transition-all ${isBlinking ? 'text-cyan-400' : 'text-white/30'}`}>
                        <div className={`w-1 h-1 rounded-full ${isBlinking ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,1)]' : 'bg-white/10'}`} />
                        Blink
                      </div>
                      <div className={`flex items-center gap-2 text-[8px] font-mono uppercase tracking-[0.2em] transition-all ${monitoringMode !== 'eye' ? 'text-violet-400' : 'text-white/30'}`}>
                        <div className={`w-1 h-1 rounded-full ${monitoringMode !== 'eye' ? 'bg-violet-400 shadow-[0_0_8px_rgba(124,111,224,1)]' : 'bg-white/10'}`} />
                        Hands
                      </div>
                    </div>
                    
                    {/* System Log Ticker */}
                    <div className="flex-1 flex justify-center overflow-hidden h-full items-center px-4">
                      <p className="text-[8px] font-mono text-white/40 uppercase tracking-widest whitespace-nowrap">
                        {systemLogs[0] || 'System Ready • Monitoring Passive'}
                      </p>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                         <span className="text-[8px] font-mono text-white/50">{Math.round(distressScore)}% Distress</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Minimalist Control Toggles */}
          <div className="bg-black/20 backdrop-blur-xl rounded-full p-1.5 border border-white/5 flex items-center justify-between w-full shadow-lg">
             <div className="flex gap-1 ml-1">
                {['signs', 'eye', 'both'].map((mode) => (
                  <button 
                    key={mode}
                    onClick={() => setMonitoringMode(mode as any)}
                    className={`px-4 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-widest transition-all ${monitoringMode === mode ? 'bg-white/10 text-white shadow-inner font-bold' : 'text-white/40 hover:text-white/60'}`}
                  >
                    {mode}
                  </button>
                ))}
             </div>
             <div className="flex gap-4 mr-4 text-white/20 font-mono text-[9px] uppercase tracking-tighter">
                {blinkCount > 0 && <span>Blink Ptn: {blinkCount}/3</span>}
                {tapCount > 0 && <span>Air Taps: {tapCount}</span>}
             </div>
          </div>

          {/* Real-time Hand Sign Reference Bar (Sleek Icons) */}
          <div className="flex flex-wrap gap-2 mt-4 px-1 justify-center">
            {Object.entries(GESTURE_MAP).map(([gestureName, meaning]) => (
              <div key={gestureName} className="bg-black/30 backdrop-blur-xl rounded-2xl px-4 py-2 border border-white/5 flex items-center gap-3 group hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-all cursor-default">
                <span className="text-lg filter drop-shadow-md group-hover:scale-110 transition-transform">
                  {GESTURE_ICONS[meaning]}
                </span>
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono font-black text-white/50 uppercase tracking-widest leading-none group-hover:text-cyan-400">
                    {meaning}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Sleek Command Guide */}
          <div className="bg-black/20 backdrop-blur-xl rounded-3xl border border-white/5 p-6 flex-1 shadow-2xl relative overflow-hidden mt-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full" />
            <h2 className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em] mb-6">Hands-Free Guide</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl transition-transform group-hover:scale-110">✅</div>
                <div>
                  <p className="text-[11px] font-bold text-white/80">Confirm & Send</p>
                  <p className="text-[9px] text-white/40 italic">Stare at the green check OR blink twice rapidly.</p>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xl transition-transform group-hover:scale-110">👌</div>
                <div>
                  <p className="text-[11px] font-bold text-white/80">Confirm (Gesture)</p>
                  <p className="text-[9px] text-white/40">Hold OK gesture for 1s to send.</p>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xl transition-transform group-hover:scale-110">👁️</div>
                <div>
                  <p className="text-[11px] font-bold text-white/80">Gaze Dwell</p>
                  <p className="text-[9px] text-white/40">Stare at "Nurse" or "Help" at the bottom to add them.</p>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-xl transition-transform group-hover:scale-110">🆘</div>
                <div>
                  <p className="text-[11px] font-bold text-white/80">Emergency SOS</p>
                  <p className="text-[9px] text-white/40 italic">Blink 3 times rapidly for immediate alert.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Output & Sequence */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          
          {/* Sleek Sequence Buffer */}
          <div className="bg-black/20 backdrop-blur-xl rounded-3xl border border-white/5 p-6 flex-1 flex flex-col shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em]">Active Sequence</h2>
              <button 
                onClick={clearBuffer}
                disabled={gestureBuffer.length === 0}
                className="text-white/20 hover:text-red-400 disabled:opacity-0 transition-all p-2 hover:bg-white/5 rounded-full"
                title="Clear sequence"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="flex-1 min-h-[120px] flex flex-wrap content-start gap-2">
              {gestureBuffer.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-[9px] font-mono text-white/10 uppercase tracking-widest gap-3">
                  <Activity className="w-8 h-8 opacity-10 animate-pulse" />
                  Listening for input
                </div>
              ) : (
                gestureBuffer.map((gesture, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-2 rounded-2xl text-[11px] font-medium text-white/70 animate-in fade-in zoom-in slide-in-from-top-2 duration-300">
                    <span className="opacity-80">{GESTURE_ICONS[gesture]}</span>
                    {gesture}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Translation Output */}
          <div className="bg-black/20 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-10 relative overflow-hidden min-h-[260px] flex flex-col justify-center shadow-2xl">
            {/* Visual glow effects */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-400/10 blur-[100px] rounded-full animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-violet-400/10 blur-[100px] rounded-full animate-pulse" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[10px] font-mono text-white/20 uppercase tracking-[0.4em]">Gemini AI Core</h2>
                {urgency && (
                   <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] shadow-lg ${
                    urgency === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 
                    urgency === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {urgency}
                  </div>
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

      {/* Emergency SOS Overlay */}
      {showSOSOverlay && (
        <div className="fixed inset-0 z-[100] bg-red-600/60 backdrop-blur-3xl flex flex-col items-center justify-center animate-pulse duration-500">
           <div className="bg-red-950 p-12 rounded-[3.5rem] border-4 border-red-500 shadow-[0_0_100px_rgba(239,68,68,0.7)] flex flex-col items-center gap-8 animate-in zoom-in duration-300">
              <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center animate-bounce">
                <Bell className="w-16 h-16 text-white" />
              </div>
              <div className="text-center">
                 <h2 className="text-5xl font-display font-black text-white uppercase tracking-tighter mb-2">URGENT SOS SENT</h2>
                 <p className="text-xl font-mono text-red-200 uppercase tracking-widest">Medical assistance is on the way</p>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
        @keyframes pulse-fast {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .pulse-fast {
          animation: pulse-fast 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .font-display {
          font-family: 'Inter', system-ui, sans-serif;
        }
        .backdrop-blur-xl {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
      `}</style>
    </div>
  );
}
