import librosa
import numpy as np


def analyze_frequency(file_path):

    audio, sample_rate = librosa.load(
        file_path,
        sr=None,
        mono=True
    )

    # STFT gives a better picture of frequencies across the whole song
    n_fft = 8192
    hop_length = 4096

    spectrum = np.abs(
        librosa.stft(
            audio,
            n_fft=n_fft,
            hop_length=hop_length
        )
    )

    frequencies = librosa.fft_frequencies(
        sr=sample_rate,
        n_fft=n_fft
    )

    # Average frequency energy across the song
    average_spectrum = np.mean(
        spectrum ** 2,
        axis=1
    )

    # Human-audible/music range
    upper_limit = min(
        20000,
        sample_rate / 2
    )

    valid = (
        (frequencies >= 20) &
        (frequencies <= upper_limit)
    )

    valid_frequencies = frequencies[valid]
    valid_energy = average_spectrum[valid]

    # Strongest spectral component
    strongest_index = np.argmax(valid_energy)

    strongest_frequency = valid_frequencies[
        strongest_index
    ]

    # Spectral centroid
    spectral_centroid = librosa.feature.spectral_centroid(
        S=spectrum,
        sr=sample_rate
    )

    # Spectral bandwidth
    spectral_bandwidth = librosa.feature.spectral_bandwidth(
        S=spectrum,
        sr=sample_rate
    )

    # -----------------------------
    # FREQUENCY RANGE
    # -----------------------------

    total_energy = np.sum(valid_energy)

    if total_energy > 0:

        cumulative_energy = np.cumsum(
            valid_energy
        ) / total_energy

        min_index = np.searchsorted(
            cumulative_energy,
            0.01
        )

        max_index = np.searchsorted(
            cumulative_energy,
            0.99
        )

        minimum_frequency = valid_frequencies[
            min_index
        ]

        maximum_frequency = valid_frequencies[
            min(
                max_index,
                len(valid_frequencies) - 1
            )
        ]

    else:
        minimum_frequency = 0
        maximum_frequency = 0

    # -----------------------------
    # BASS / MID / TREBLE
    # -----------------------------

    bass = (
        (valid_frequencies >= 20) &
        (valid_frequencies < 250)
    )

    mid = (
        (valid_frequencies >= 250) &
        (valid_frequencies < 4000)
    )

    treble = (
        (valid_frequencies >= 4000) &
        (valid_frequencies <= upper_limit)
    )

    bass_energy = np.sum(
        valid_energy[bass]
    )

    mid_energy = np.sum(
        valid_energy[mid]
    )

    treble_energy = np.sum(
        valid_energy[treble]
    )

    band_total = (
        bass_energy +
        mid_energy +
        treble_energy
    )

    if band_total > 0:

        bass_percent = (
            bass_energy / band_total
        ) * 100

        mid_percent = (
            mid_energy / band_total
        ) * 100

        treble_percent = (
            treble_energy / band_total
        ) * 100

    else:

        bass_percent = 0
        mid_percent = 0
        treble_percent = 0

    return {

        "strongest_spectral_component_hz":
            round(float(strongest_frequency), 2),

        "spectral_centroid_hz":
            round(
                float(np.mean(spectral_centroid)),
                2
            ),

        "spectral_bandwidth_hz":
            round(
                float(np.mean(spectral_bandwidth)),
                2
            ),

        "frequency_range_hz": {

            "min":
                round(
                    float(minimum_frequency),
                    2
                ),

            "max":
                round(
                    float(maximum_frequency),
                    2
                )
        },

        "frequency_bands": {

            "bass_percent":
                round(float(bass_percent), 2),

            "mid_percent":
                round(float(mid_percent), 2),

            "treble_percent":
                round(float(treble_percent), 2)
        }
    }