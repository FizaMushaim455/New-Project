import pandas as pd
import numpy as np
import pickle
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from pathlib import Path

# Configuration
DATA_FILE = Path("data.csv")
MODEL_FILE = Path("asl_model.p")

def train_model():
    if not DATA_FILE.exists():
        print(f"Error: {DATA_FILE} not found. Run collect_data.py first!")
        return

    print("Loading data...")
    df = pd.read_csv(DATA_FILE, header=None)
    X = df.iloc[:, 1:].values
    y = df.iloc[:, 0].values
    
    print(f"Dataset size: {len(X)} samples")
    print(f"Unique signs: {len(np.unique(y))}")

    x_train, x_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, shuffle=True, stratify=y
    )

    print("Training SilentCare Intelligence Model...")
    model = RandomForestClassifier(n_estimators=100, max_depth=20)
    model.fit(x_train, y_train)

    score = accuracy_score(y_test, model.predict(x_test))
    print(f"Model Accuracy: {score * 100:.2f}%")

    with open(MODEL_FILE, 'wb') as f:
        pickle.dump({'model': model}, f)
        
    print(f"Training complete! Model saved to {MODEL_FILE}")

if __name__ == "__main__":
    train_model()
