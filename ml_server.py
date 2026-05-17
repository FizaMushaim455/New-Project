import socketio
import eventlet
import pickle
import numpy as np
from pathlib import Path

# Configuration
MODEL_PATH = Path("asl_model.p")
sio = socketio.Server(cors_allowed_origins="*")
app = socketio.WSGIApp(sio)

# Load the trained model
model = None
if MODEL_PATH.exists():
    try:
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)['model']
        print(f"✅ ML Server: Loaded model from {MODEL_PATH}")
    except Exception as e:
        print(f"❌ ML Server: Error loading model: {e}")
else:
    print("⚠️ ML Server: No model found. Run train_model.py first!")

@sio.event
def connect(sid, environ):
    print('Client connected:', sid)

@sio.on('predict_gesture')
def handle_prediction(sid, data):
    """
    Receives landmark data from React and returns a prediction.
    data: list of 42 normalized landmark values
    """
    global model
    if model is None:
        # Reload if it was missing before
        if MODEL_PATH.exists():
            with open(MODEL_PATH, 'rb') as f:
                model = pickle.load(f)['model']
        else:
            sio.emit('prediction_result', {'gesture': 'No Model Trained'}, to=sid)
            return

    try:
        landmarks = np.array(data).reshape(1, -1)
        prediction = model.predict(landmarks)
        gesture = str(prediction[0])
        sio.emit('prediction_result', {'gesture': gesture}, to=sid)
    except Exception as e:
        print(f"Error during prediction: {e}")
        sio.emit('prediction_result', {'gesture': 'Error'}, to=sid)

if __name__ == '__main__':
    print("🚀 SilentCare ML Inference Server starting on port 5001...")
    eventlet.wsgi.server(eventlet.listen(('', 5001)), app)
