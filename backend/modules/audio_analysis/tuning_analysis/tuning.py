import librosa
import numpy as np


def detect_tuning(file_path):

    audio, sample_rate = librosa.load(
        file_path,
        sr=None,
        mono=True
    )

    # Detect pitches
    pitches, magnitudes = librosa.piptrack(
        y=audio,
        sr=sample_rate
    )

    detected_pitches = []

    for i in range(pitches.shape[1]):
        index = np.argmax(magnitudes[:, i])
        pitch = pitches[index, i]

        if pitch > 0:
            detected_pitches.append(pitch)

    if not detected_pitches:
        return {
            "estimated_tuning": "Unable to detect",
            "confidence": 0
        }

    frequencies = np.array(detected_pitches)

    # Estimate tuning offset using the nearest semitone.
    # This avoids incorrectly comparing every note directly
    # with 432 Hz or 440 Hz.
    midi_notes = 69 + 12 * np.log2(frequencies / 440.0)

    nearest_notes = np.round(midi_notes)

    tuning_offsets = (
        midi_notes - nearest_notes
    ) * 100

    # Remove extreme/outlier estimates
    tuning_offsets = tuning_offsets[
        np.abs(tuning_offsets) < 50
    ]

    if len(tuning_offsets) == 0:
        return {
            "estimated_tuning": "Unable to detect",
            "confidence": 0
        }

    median_offset = float(
        np.median(tuning_offsets)
    )

    # A=440 is the reference.
    # A=432 is approximately -31.77 cents.
    distance_from_440 = abs(median_offset)
    distance_from_432 = abs(
        median_offset + 31.77
    )

    if distance_from_432 < distance_from_440:
        tuning = "Closer to A=432 Hz"
        distance = distance_from_432
    else:
        tuning = "Closer to A=440 Hz"
        distance = distance_from_440

    confidence = 1 / (1 + distance / 10)

    return {
        "estimated_tuning": tuning,
        "tuning_offset_cents": round(
            median_offset,
            2
        ),
        "confidence": round(
            float(confidence),
            3
        )
    }