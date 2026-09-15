import librosa
import numpy as np


def analyze_mood(file_path):

    # Load audio
    audio, sample_rate = librosa.load(
        file_path,
        sr=None,
        mono=True
    )

    # -------------------------
    # 1. TEMPO
    # -------------------------

    tempo, _ = librosa.beat.beat_track(
        y=audio,
        sr=sample_rate
    )

    tempo = float(
        np.asarray(tempo).flatten()[0]
    )

    # -------------------------
    # 2. ENERGY
    # -------------------------

    rms = librosa.feature.rms(
        y=audio
    )

    average_rms = float(
        np.mean(rms)
    )

    # -------------------------
    # 3. SPECTRAL BRIGHTNESS
    # -------------------------

    spectral_centroid = librosa.feature.spectral_centroid(
        y=audio,
        sr=sample_rate
    )

    brightness = float(
        np.mean(spectral_centroid)
    )

    # -------------------------
    # 4. RHYTHMIC ACTIVITY
    # -------------------------

    onset_strength = librosa.onset.onset_strength(
        y=audio,
        sr=sample_rate
    )

    rhythmic_activity = float(
        np.mean(onset_strength)
    )

    # -------------------------
    # 5. HARMONIC CONTENT
    # -------------------------

    harmonic, percussive = librosa.effects.hpss(
        audio
    )

    harmonic_energy = float(
        np.mean(
            np.abs(harmonic)
        )
    )

    percussive_energy = float(
        np.mean(
            np.abs(percussive)
        )
    )

    # -------------------------
    # MOOD ESTIMATION
    # -------------------------

    if (
        tempo >= 120
        and average_rms >= 0.08
        and brightness >= 2000
    ):
        mood = "Energetic"

    elif (
        tempo >= 100
        and average_rms >= 0.06
        and brightness >= 1500
    ):
        mood = "Happy"

    elif (
        tempo < 80
        and average_rms < 0.12
        and brightness < 1800
    ):
        mood = "Calm"

    elif (
        tempo < 100
        and average_rms < 0.15
        and harmonic_energy >= percussive_energy
    ):
        mood = "Melancholic"

    else:
        mood = "Neutral"

    return {

        "estimated_mood": mood,

        "tempo_bpm": round(
            tempo,
            2
        ),

        "energy_value": round(
            average_rms,
            4
        ),

        "spectral_brightness_hz": round(
            brightness,
            2
        ),

        "rhythmic_activity": round(
            rhythmic_activity,
            4
        ),

        "harmonic_energy": round(
            harmonic_energy,
            4
        ),

        "percussive_energy": round(
            percussive_energy,
            4
        )
    }