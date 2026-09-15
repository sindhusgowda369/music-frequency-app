from fastapi import FastAPI, UploadFile, File, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

import tempfile
import os
import subprocess
import requests
from urllib.parse import urlparse

from modules.audio_analysis.analyzer import analyze_frequency
from modules.audio_analysis.tuning_analysis.tuning import detect_tuning
from modules.audio_analysis.energy_analysis.energy import analyze_energy
from modules.audio_analysis.mood_analysis.mood import analyze_mood
from modules.audio_analysis.summary import generate_summary


app = FastAPI()


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# FFmpeg
# ============================================================

import shutil

FFMPEG_PATH = shutil.which("ffmpeg")

if not FFMPEG_PATH:
    FFMPEG_PATH = (
        r"C:\Users\sindh\AppData\Local\Microsoft\WinGet\Packages"
        r"\Gyan.FFmpeg.Shared_Microsoft.Winget.Source_8wekyb3d8bbwe"
        r"\ffmpeg-9.0.1-full_build-shared\bin\ffmpeg.exe"
    )
# ============================================================
# FRONTEND
# ============================================================

FRONTEND_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "frontend"
    )
)


# ============================================================
# HOME
# ============================================================

@app.get("/", include_in_schema=False)
def home():
    return FileResponse(
        os.path.join(
            FRONTEND_DIR,
            "index.html"
        )
    )


# ============================================================
# SEARCH SONGS
# ============================================================

@app.get("/search")
def search_songs(
    q: str = Query(..., min_length=1)
):

    url = "https://itunes.apple.com/search"

    params = {
        "term": q,
        "country": "IN",
        "media": "music",
        "entity": "song",
        "limit": 40
    }

    try:

        response = requests.get(
            url,
            params=params,
            timeout=10
        )

        response.raise_for_status()

        data = response.json()

    except requests.RequestException as error:

        raise HTTPException(
            status_code=502,
            detail=f"Music search failed: {error}"
        )


    songs = []


    for item in data.get("results", []):

        songs.append({

            "title":
                item.get("trackName"),

            "artist":
                item.get("artistName"),

            "album":
                item.get("collectionName"),

            "artwork":
                item.get("artworkUrl100"),

            "preview_url":
                item.get("previewUrl"),

            "store_url":
                item.get("trackViewUrl"),

            "duration_ms":
                item.get("trackTimeMillis"),

            "genre":
                item.get("primaryGenreName"),

            "track_id":
                item.get("trackId")
        })


    return {

        "query": q,

        "count":
            len(songs),

        "songs":
            songs
    }


# ============================================================
# ANALYZE UPLOADED AUDIO
# ============================================================

@app.post("/analyze")
async def analyze_song(
    file: UploadFile = File(...)
):

    file_data = await file.read()


    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".wav"
    ) as temp_file:

        temp_file.write(file_data)

        temp_path = temp_file.name


    try:

        analysis = analyze_frequency(
            temp_path
        )

        tuning = detect_tuning(
            temp_path
        )

        energy = analyze_energy(
            temp_path
        )

        mood = analyze_mood(
            temp_path
        )

        summary = generate_summary(
            analysis,
            tuning,
            energy,
            mood
        )


        return {

            "song": {

                "filename":
                    file.filename
            },

            "summary":
                summary,

            "audio_analysis": {

                "strongest_spectral_component_hz":
                    analysis[
                        "strongest_spectral_component_hz"
                    ],

                "spectral_centroid_hz":
                    analysis[
                        "spectral_centroid_hz"
                    ],

                "spectral_bandwidth_hz":
                    analysis[
                        "spectral_bandwidth_hz"
                    ],

                "frequency_range_hz":
                    analysis[
                        "frequency_range_hz"
                    ],

                "frequency_bands":
                    analysis[
                        "frequency_bands"
                    ]
            },

            "tuning_analysis": {

                "estimated_tuning":
                    tuning[
                        "estimated_tuning"
                    ],

                "tuning_offset_cents":
                    tuning.get(
                        "tuning_offset_cents"
                    ),

                "confidence":
                    tuning[
                        "confidence"
                    ]
            },

            "energy_analysis": {

                "rms_energy":
                    energy[
                        "rms_energy"
                    ],

                "energy_level":
                    energy[
                        "energy_level"
                    ]
            },

            "mood_analysis": {

                "estimated_mood":
                    mood[
                        "estimated_mood"
                    ],

                "tempo_bpm":
                    mood[
                        "tempo_bpm"
                    ],

                "energy_value":
                    mood[
                        "energy_value"
                    ],

                "spectral_brightness_hz":
                    mood[
                        "spectral_brightness_hz"
                    ],

                "rhythmic_activity":
                    mood[
                        "rhythmic_activity"
                    ],

                "harmonic_energy":
                    mood[
                        "harmonic_energy"
                    ],

                "percussive_energy":
                    mood[
                        "percussive_energy"
                    ]
            }
        }


    finally:

        if os.path.exists(temp_path):

            os.remove(
                temp_path
            )


# ============================================================
# ANALYZE APPLE MUSIC PREVIEW
# ============================================================

@app.get("/analyze-preview")
def analyze_preview(
    preview_url: str = Query(...)
):

    # --------------------------------------------------------
    # Basic URL safety check
    # --------------------------------------------------------

    parsed_url = urlparse(
        preview_url
    )


    allowed_hosts = {

        "audio-ssl.itunes.apple.com",

        "itunes.apple.com",

        "audio.itunes.apple.com"
    }


    hostname = (
        parsed_url.hostname or ""
    ).lower()


    if hostname not in allowed_hosts:

        raise HTTPException(
            status_code=400,
            detail=(
                "Preview URL is not an approved "
                "Apple audio URL."
            )
        )


    # --------------------------------------------------------
    # Check FFmpeg
    # --------------------------------------------------------

    if not os.path.exists(
        FFMPEG_PATH
    ):

        raise HTTPException(
            status_code=500,
            detail=(
                "FFmpeg was not found at "
                "the configured path."
            )
        )


    raw_path = None
    wav_path = None


    try:

        # ----------------------------------------------------
        # Download Apple preview
        # ----------------------------------------------------

        response = requests.get(

            preview_url,

            headers={
                "User-Agent":
                    "Mozilla/5.0"
            },

            timeout=20
        )


        response.raise_for_status()


        # ----------------------------------------------------
        # Save original M4A/AAC file
        # ----------------------------------------------------

        with tempfile.NamedTemporaryFile(

            delete=False,

            suffix=".m4a"

        ) as raw_file:

            raw_file.write(
                response.content
            )

            raw_path = raw_file.name


        # ----------------------------------------------------
        # Create temporary WAV path
        # ----------------------------------------------------

        with tempfile.NamedTemporaryFile(

            delete=False,

            suffix=".wav"

        ) as wav_file:

            wav_path = wav_file.name


        # ----------------------------------------------------
        # Convert M4A/AAC -> WAV using FFmpeg
        # ----------------------------------------------------

        ffmpeg_command = [

            FFMPEG_PATH,

            "-y",

            "-i",
            raw_path,

            "-vn",

            "-ac",
            "1",

            "-ar",
            "22050",

            wav_path
        ]


        result = subprocess.run(

            ffmpeg_command,

            stdout=subprocess.PIPE,

            stderr=subprocess.PIPE,

            text=True,

            timeout=30
        )


        if result.returncode != 0:

            raise HTTPException(

                status_code=500,

                detail=(
                    "FFmpeg could not decode "
                    "the Apple preview."
                )
            )


        # ----------------------------------------------------
        # Analyze converted WAV
        # ----------------------------------------------------

        analysis = analyze_frequency(
            wav_path
        )

        tuning = detect_tuning(
            wav_path
        )

        energy = analyze_energy(
            wav_path
        )

        mood = analyze_mood(
            wav_path
        )

        summary = generate_summary(

            analysis,

            tuning,

            energy,

            mood
        )


        # ----------------------------------------------------
        # Return analysis
        # ----------------------------------------------------

        return {

            "source":
                "Apple Music preview",

            "note": (
                "Analysis is based on the available "
                "Apple preview audio, not necessarily "
                "the complete song."
            ),

            "summary":
                summary,

            "audio_analysis": {

                "strongest_spectral_component_hz":
                    analysis[
                        "strongest_spectral_component_hz"
                    ],

                "spectral_centroid_hz":
                    analysis[
                        "spectral_centroid_hz"
                    ],

                "spectral_bandwidth_hz":
                    analysis[
                        "spectral_bandwidth_hz"
                    ],

                "frequency_range_hz":
                    analysis[
                        "frequency_range_hz"
                    ],

                "frequency_bands":
                    analysis[
                        "frequency_bands"
                    ]
            },

            "tuning_analysis": {

                "estimated_tuning":
                    tuning[
                        "estimated_tuning"
                    ],

                "tuning_offset_cents":
                    tuning.get(
                        "tuning_offset_cents"
                    ),

                "confidence":
                    tuning[
                        "confidence"
                    ]
            },

            "energy_analysis": {

                "rms_energy":
                    energy[
                        "rms_energy"
                    ],

                "energy_level":
                    energy[
                        "energy_level"
                    ]
            },

            "mood_analysis": {

                "estimated_mood":
                    mood[
                        "estimated_mood"
                    ],

                "tempo_bpm":
                    mood[
                        "tempo_bpm"
                    ],

                "energy_value":
                    mood[
                        "energy_value"
                    ],

                "spectral_brightness_hz":
                    mood[
                        "spectral_brightness_hz"
                    ],

                "rhythmic_activity":
                    mood[
                        "rhythmic_activity"
                    ],

                "harmonic_energy":
                    mood[
                        "harmonic_energy"
                    ],

                "percussive_energy":
                    mood[
                        "percussive_energy"
                    ]
            }
        }


    except requests.RequestException as error:

        raise HTTPException(

            status_code=502,

            detail=(
                f"Could not download "
                f"Apple preview: {error}"
            )
        )


    except subprocess.TimeoutExpired:

        raise HTTPException(

            status_code=500,

            detail=(
                "FFmpeg took too long "
                "to convert the preview."
            )
        )


    except HTTPException:

        raise


    except Exception as error:

        print(
            "Preview analysis error:",
            repr(error)
        )

        raise HTTPException(

            status_code=500,

            detail=(
                f"Preview analysis failed: "
                f"{error}"
            )
        )


    finally:

        # ----------------------------------------------------
        # Cleanup temporary files
        # ----------------------------------------------------

        if raw_path and os.path.exists(
            raw_path
        ):

            os.remove(
                raw_path
            )


        if wav_path and os.path.exists(
            wav_path
        ):

            os.remove(
                wav_path
            )


# ============================================================
# SERVE FRONTEND FILES
# ============================================================
#
# IMPORTANT:
# This must stay AFTER the API routes.
#
# It allows:
# /app.js
# /index.html
# /other frontend files
#
# to be served by FastAPI.
# ============================================================

app.mount(
    "/",
    StaticFiles(
        directory=FRONTEND_DIR,
        html=True
    ),
    name="frontend"
)