def generate_summary(analysis, tuning, energy, mood):

    bands = analysis["frequency_bands"]

    bass = bands["bass_percent"]
    mid = bands["mid_percent"]
    treble = bands["treble_percent"]

    if mid >= bass and mid >= treble:
        dominant_band = "mid frequencies"
    elif bass >= mid and bass >= treble:
        dominant_band = "bass frequencies"
    else:
        dominant_band = "treble frequencies"

    return {
        "bullets": [
            f"Mood: {mood['estimated_mood']} • Tempo: {mood['tempo_bpm']} BPM",

            f"Sound: Strongest emphasis is in the {dominant_band}; "
            f"frequency range ≈ {analysis['frequency_range_hz']['min']}–"
            f"{analysis['frequency_range_hz']['max']} Hz.",

            f"Tuning: {tuning['estimated_tuning']}. "
            f"This describes tuning, not health or song quality."
        ],

        "frequency_note":
            "Different frequency ranges shape bass, brightness and texture; "
            "no single frequency determines mood or health."
    }