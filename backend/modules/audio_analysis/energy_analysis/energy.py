import librosa


def analyze_energy(file_path):

    audio, sample_rate = librosa.load(
        file_path,
        sr=None,
        mono=True
    )

    # Calculate RMS energy
    rms = librosa.feature.rms(y=audio)

    average_rms = float(rms.mean())

    # Basic energy classification
    if average_rms < 0.1:
        energy_level = "Low"
    elif average_rms < 0.3:
        energy_level = "Medium"
    else:
        energy_level = "High"

    return {
        "rms_energy": round(average_rms, 4),
        "energy_level": energy_level
    }