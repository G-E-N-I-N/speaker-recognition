from flask import Flask, request, jsonify
import pickle
import numpy as np

# Load model
with open("model.pkl", "rb") as f:
    model = pickle.load(f)

app = Flask(__name__)

@app.route("/")
def home():
    return "Speaker Recognition Model is Up!"

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    features = data.get("features", [])
    
    if not isinstance(features, list) or len(features) != 22:
        return jsonify({"error": "Input must be a list of 22 features."}), 400

    features_array = np.array(features).reshape(1, -1)
    prediction = model.predict(features_array)
    return jsonify({"prediction": prediction.tolist()})


if __name__ == "__main__":
    app.run(debug=True)
