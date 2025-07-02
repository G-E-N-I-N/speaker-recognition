from flask import Blueprint, render_template, request, jsonify
import numpy as np
import os
import pickle

from app.routes.function import feature_extraction

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/api/recognize', methods=['POST'])
def recognize():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    audio_name = request.form['name']

    features = feature_extraction(audio_file)

    CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
    MODEL_PATH = os.path.join(CURRENT_DIR, '..', 'model', 'stacking_model.pkl')
    MODEL_PATH = os.path.abspath(MODEL_PATH)
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    LE_PATH = os.path.join(CURRENT_DIR, '..', 'model', 'le.pkl')
    LE_PATH = os.path.abspath(LE_PATH)
    with open(LE_PATH, "rb") as f:
        le = pickle.load(f)
    SCALER_PATH = os.path.join(CURRENT_DIR, '..', 'model', 'scaler.pkl')
    SCALER_PATH = os.path.abspath(SCALER_PATH)
    with open(SCALER_PATH, "rb") as f:
        scaler = pickle.load(f)
    new_scaled = scaler.transform(features)
    prediction = model.predict_proba(new_scaled)[0]
    seuil = 0.80
    nom_locuteur = "inconnu"
    if np.max(prediction) >= seuil:
        pred_class = np.argmax(prediction)
        nom_locuteur = le.inverse_transform([pred_class])[0]
    
    return jsonify({'speaker': f"Locuteur : {nom_locuteur}    Confiance : {np.max(prediction):.2f}"}), 200

@main.route('/api/cli', methods=['POST'])
def cli():
    data = request.get_json()
    features = data.get("features", [])
    
    if not isinstance(features, list) or len(features) != 22:
        return jsonify({"error": "Input must be a list of 22 features."}), 400

    
    with open("../model/stacking_model.pkl", "rb") as f:
        model = pickle.load(f)
    with open("../model/le.pkl", "rb") as f:
        le = pickle.load(f)
    with open("../model/scaler.pkl", "rb") as f:
        scaler = pickle.load(f)
    new_scaled = scaler.transform(features)
    prediction = model.predict_proba(new_scaled)[0]
    seuil = 0.80
    nom_locuteur = "inconnu"
    if np.max(prediction) >= seuil:
        pred_class = np.argmax(prediction)
        nom_locuteur = le.inverse_transform([pred_class])[0]
    
    return jsonify({'speaker': f"Locuteur : {nom_locuteur}    Confiance : {np.max(prediction):.2f}"}), 200