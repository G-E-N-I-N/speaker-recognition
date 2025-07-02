import librosa
import numpy as np

def feature_extraction(audio_path):
    y, sr = librosa.load(audio_path, sr=None)

    # --- Suppression du silence ---
    y_trimmed, _ = librosa.effects.trim(y)

    # --- Normalisation de la durée ---
    target_duration = 2.0  # secondes
    y_fixed = librosa.util.fix_length(data=y_trimmed, size=int(sr * target_duration))

    # --- MFCC ---
    mfccs = librosa.feature.mfcc(y=y_fixed, sr=sr, n_mfcc=13)
    mfcc_mean = np.mean(mfccs, axis=1)

    # --- Pitch (F0) ---
    f0, _, _ = librosa.pyin(y_fixed, fmin=50, fmax=500)
    pitch_features = [
        np.nanmean(f0), np.nanstd(f0),
        np.nanmin(f0), np.nanmax(f0)
    ]

    # --- Formants (approx via LPC) ---
    def lpc_formants(y, sr, order=12):
        y = y * np.hamming(len(y))
        a = librosa.lpc(y=y, order=order)
        rts = np.roots(a)
        rts = [r for r in rts if np.imag(r) >= 0.01]
        angz = np.arctan2(np.imag(rts), np.real(rts))
        freqs = sorted(angz * (sr / (2 * np.pi)))
        return freqs[:3]  # F1, F2, F3


    formants = lpc_formants(y_fixed, sr)
    while len(formants) < 3:
        formants.append(0.0)

    # --- RMS énergie ---
    rms = librosa.feature.rms(y=y_fixed)[0]
    rms_features = [np.mean(rms), np.std(rms)]

    # --- Fusion des descripteurs ---
    features = np.concatenate([mfcc_mean, pitch_features, formants, rms_features])
    return features.reshape(1, -1)