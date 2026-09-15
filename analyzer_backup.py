import librosa
import numpy as np


def analyze_frequency(file_path):
    # Load the audio file
    audio, sample_rate = librosa.load(file_path, sr=None, mono=True)

    # Calculate the frequency spectrum
    spectrum = np.abs(np.fft.rfft(audio))
    frequencies = np.fft.rfftfreq(
        len(audio),
        1 / sample_rate
    )

    # Find the strongest frequency
    strongest_frequency = frequencies[np.argmax(spectrum)]

    return strongest_frequency


if __name__ == "__main__":
    print("Analyzer is ready for audio files.")