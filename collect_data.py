import os
import cv2
import pickle
import numpy as np
import csv
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from pathlib import Path

# Configuration
MODEL_PATH = Path("hand_landmarker.task")
DATA_FILE = Path("data.csv")
SAMPLES_PER_SIGN = 100

class HandTracker:
    def __init__(self):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"MediaPipe task model not found at {MODEL_PATH}")

        base_options = python.BaseOptions(model_asset_path=str(MODEL_PATH))
        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            num_hands=1,
            min_hand_detection_confidence=0.7,
            min_hand_presence_confidence=0.7,
            min_tracking_confidence=0.7,
        )
        self.landmarker = vision.HandLandmarker.create_from_options(options)

    def get_landmarks(self, frame):
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        result = self.landmarker.detect(mp_image)

        if not result.hand_landmarks:
            return None

        landmarks = result.hand_landmarks[0]
        data_x = [lm.x for lm in landmarks]
        data_y = [lm.y for lm in landmarks]

        base_x, base_y = data_x[0], data_y[0]
        norm_x = [x - base_x for x in data_x]
        norm_y = [y - base_y for y in data_y]

        max_dist = max(max(map(abs, norm_x)), max(map(abs, norm_y)))
        if max_dist > 0:
            norm_x = [x / max_dist for x in norm_x]
            norm_y = [y / max_dist for y in norm_y]

        features = []
        for x, y in zip(norm_x, norm_y):
            features.extend([x, y])
        return np.array(features, dtype=np.float32)

def collect_data():
    tracker = HandTracker()
    cap = cv2.VideoCapture(0)
    
    print("\n--- SILENTCARE DATA COLLECTOR ---")
    print("Recommended Signs: 'Help', 'Nurse', 'Water', 'Food', 'Pain', 'Yes', 'No'")
    
    while True:
        label = input("\nEnter Sign Name (or 'quit'): ").strip()
        if label.lower() == 'quit': break
            
        print(f"Collecting '{label}' in 3 seconds...")
        cv2.waitKey(3000)
        
        count = 0
        while count < SAMPLES_PER_SIGN:
            ret, frame = cap.read()
            if not ret: break
            frame = cv2.flip(frame, 1)
            
            landmarks = tracker.get_landmarks(frame)
            if landmarks is not None:
                with open(DATA_FILE, 'a', newline='') as f:
                    csv.writer(f).writerow([label] + landmarks.tolist())
                count += 1
                cv2.rectangle(frame, (0,0), (640, 480), (0, 255, 0), 10)
            
            cv2.putText(frame, f"Captured: {count}/{SAMPLES_PER_SIGN}", (50, 50), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.imshow("Collector", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'): break
                
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    collect_data()
