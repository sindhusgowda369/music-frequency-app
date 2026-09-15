// ============================================================
// PULSE — MUSIC FREQUENCY APP
// Frontend controller
// ============================================================

const API_BASE = "http://127.0.0.1:8000";


// ============================================================
// GLOBAL STATE
// ============================================================

let currentAudio = new Audio();

let currentSong = null;
let currentResults = [];
let currentIndex = -1;

let likedSongs = JSON.parse(
    localStorage.getItem("pulseLikedSongs") || "[]"
);

let queue = [];

let searchTimer = null;

let selectedMergeA = null;
let selectedMergeB = null;
let mergeMode = "half";


// Cache frequency analysis so the same song is not
// analyzed repeatedly.
const analysisCache = new Map();


// Cache searches to reduce unnecessary API calls.
const searchCache = new Map();


// ============================================================
// DOM ELEMENTS
// ============================================================

const songSearch =
    document.getElementById("songSearch");

const searchButton =
    document.getElementById("searchButton");

const clearSearch =
    document.getElementById("clearSearch");

const searchSection =
    document.getElementById("searchSection");

const searchResults =
    document.getElementById("searchResults");

const searchStatus =
    document.getElementById("searchStatus");

const resultsTitle =
    document.getElementById("resultsTitle");

const resultsCount =
    document.getElementById("resultsCount");


const playerBar =
    document.getElementById("playerBar");

const playerArt =
    document.getElementById("playerArt");

const playerTitle =
    document.getElementById("playerTitle");

const playerArtist =
    document.getElementById("playerArtist");

const playerPlay =
    document.getElementById("playerPlay");

const previousButton =
    document.getElementById("previousButton");

const nextButton =
    document.getElementById("nextButton");

const progressBar =
    document.getElementById("progressBar");

const currentTimeElement =
    document.getElementById("currentTime");

const durationElement =
    document.getElementById("duration");

const volumeControl =
    document.getElementById("volumeControl");

const likeButton =
    document.getElementById("likeButton");

const queueButton =
    document.getElementById("queueButton");

const queueNav =
    document.getElementById("queueNav");

const queuePanel =
    document.getElementById("queuePanel");

const queueList =
    document.getElementById("queueList");

const closeQueue =
    document.getElementById("closeQueue");

const moreButton =
    document.getElementById("moreButton");


const songDetail =
    document.getElementById("songDetail");

const detailArt =
    document.getElementById("detailArt");

const detailTitle =
    document.getElementById("detailTitle");

const detailArtist =
    document.getElementById("detailArtist");

const detailMeta =
    document.getElementById("detailMeta");

const detailPlay =
    document.getElementById("detailPlay");


const artistHeading =
    document.getElementById("artistHeading");

const artistDescription =
    document.getElementById("artistDescription");

const artistSongs =
    document.getElementById("artistSongs");

const relatedSongs =
    document.getElementById("relatedSongs");


const detailTuning =
    document.getElementById("detailTuning");

const detailDominant =
    document.getElementById("detailDominant");

const detailEnergy =
    document.getElementById("detailEnergy");

const frequencyExplanation =
    document.getElementById("frequencyExplanation");

const musicEffectText =
    document.getElementById("musicEffectText");


const audioFile =
    document.getElementById("audioFile");

const analyzeButton =
    document.getElementById("analyzeButton");

const result =
    document.getElementById("result");


const toast =
    document.getElementById("toast");


const mergeModal =
    document.getElementById("mergeModal");

const closeMerge =
    document.getElementById("closeMerge");

const mergeSearchA =
    document.getElementById("mergeSearchA");

const mergeSearchB =
    document.getElementById("mergeSearchB");

const mergeResultsA =
    document.getElementById("mergeResultsA");

const mergeResultsB =
    document.getElementById("mergeResultsB");

const selectedA =
    document.getElementById("selectedA");

const selectedB =
    document.getElementById("selectedB");


// ============================================================
// AUDIO
// ============================================================

currentAudio.volume = 0.8;
currentAudio.preload = "metadata";


// ============================================================
// HELPERS
// ============================================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatTime(seconds) {

    if (!Number.isFinite(seconds)) {
        return "0:00";
    }

    const minutes =
        Math.floor(seconds / 60);

    const secs =
        Math.floor(seconds % 60);

    return `${minutes}:${String(secs).padStart(2, "0")}`;
}


function showToast(message) {

    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.style.display = "block";

    clearTimeout(showToast.timer);

    showToast.timer =
        setTimeout(() => {

            toast.style.display = "none";

        }, 2200);
}


function getSongKey(song) {

    return [
        song?.trackId || "",
        song?.title || "",
        song?.artist || ""
    ].join("|");
}


function isLiked(song) {

    if (!song) {
        return false;
    }

    const key =
        getSongKey(song);

    return likedSongs.some(
        item =>
            getSongKey(item) === key
    );
}


function saveLikedSongs() {

    localStorage.setItem(
        "pulseLikedSongs",
        JSON.stringify(likedSongs)
    );
}


// ============================================================
// RESULTS CLOSE BUTTON
// ============================================================

function createResultsCloseButton() {

    if (!searchSection) {
        return;
    }

    const header =
        searchSection.querySelector(
            ".results-header"
        );

    if (!header) {
        return;
    }

    let button =
        document.getElementById(
            "clearResults"
        );

    if (button) {
        return;
    }

    button =
        document.createElement("button");

    button.id = "clearResults";

    button.type = "button";

    button.innerHTML = "×";

    button.title =
        "Close results";

    button.style.cssText = `
        background: transparent;
        border: none;
        color: #ff6b00;
        font-size: 28px;
        line-height: 1;
        padding: 2px 8px;
        cursor: pointer;
        font-weight: bold;
        margin-left: 12px;
    `;

    button.addEventListener(
        "mouseenter",
        () => {
            button.style.color = "#ff8126";
        }
    );

    button.addEventListener(
        "mouseleave",
        () => {
            button.style.color = "#ff6b00";
        }
    );

    header.appendChild(button);


    button.addEventListener(
        "click",
        clearResultsSection
    );
}


function clearResultsSection() {

    if (searchResults) {
        searchResults.innerHTML = "";
    }

    if (searchSection) {
        searchSection.style.display = "none";
    }

    if (searchStatus) {
        searchStatus.textContent = "";
    }

    if (resultsCount) {
        resultsCount.textContent = "";
    }

    currentResults = [];
    currentIndex = -1;

    // IMPORTANT:
    // Do NOT stop current music.

    if (songSearch) {
        songSearch.focus();
    }
}


// ============================================================
// SEARCH
// ============================================================

async function searchSongs(
    query = null,
    options = {}
) {

    const {
        scroll = true,
        title = null
    } = options;


    const q = (
        query !== null
            ? query
            : songSearch.value
    ).trim();


    if (!q) {

        if (searchStatus) {
            searchStatus.textContent =
                "Type a song, artist or movie to search.";
        }

        return;
    }


    songSearch.value = q;


    if (clearSearch) {
        clearSearch.style.display =
            "block";

        clearSearch.style.color =
            "#ff6b00";
    }


    searchSection.style.display =
        "block";


    createResultsCloseButton();


    searchStatus.textContent =
        "Searching...";


    searchResults.innerHTML =
        `<div class="loading">Finding music...</div>`;


    try {

        let data;


        // Use cached result when available.
        if (searchCache.has(q.toLowerCase())) {

            data =
                searchCache.get(
                    q.toLowerCase()
                );

        } else {

            const response =
                await fetch(
                    `${API_BASE}/search?q=${encodeURIComponent(q)}`
                );


            if (!response.ok) {

                throw new Error(
                    `Search failed: ${response.status}`
                );
            }


            data =
                await response.json();


            searchCache.set(
                q.toLowerCase(),
                data
            );
        }


        currentResults =
            data.songs || [];

        currentIndex = -1;


        resultsTitle.textContent =
            title || `Results for "${q}"`;


        resultsCount.textContent =
            `${currentResults.length} songs`;


        renderSearchResults(
            currentResults
        );


        searchStatus.textContent =
            currentResults.length
                ? "Search complete."
                : "No songs found.";


        if (scroll) {

            setTimeout(() => {

                searchSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }, 50);
        }


    } catch (error) {

        console.error(error);


        searchResults.innerHTML = `
            <div class="empty">
                Unable to connect to the backend.
                Make sure FastAPI is running.
            </div>
        `;


        searchStatus.textContent =
            "Search failed.";
    }
}


// ============================================================
// RENDER SEARCH RESULTS
// ============================================================

function renderSearchResults(songs) {

    if (!songs.length) {

        searchResults.innerHTML = `
            <div class="empty">
                No results found.
            </div>
        `;

        return;
    }


    searchResults.innerHTML =
        songs.map(
            (song, index) => {

                const liked =
                    isLiked(song);


                return `
                    <div
                        class="song-card"
                        data-index="${index}"
                    >

                        <img
                            class="song-art"
                            src="${escapeHTML(song.artwork || "")}"
                            alt=""
                            onerror="this.style.visibility='hidden'"
                        >


                        <div class="song-info">

                            <div class="song-title">
                                ${escapeHTML(
                                    song.title ||
                                    "Unknown"
                                )}
                            </div>


                            <div class="song-artist">
                                ${escapeHTML(
                                    song.artist ||
                                    "Unknown artist"
                                )}
                            </div>


                            <div class="song-album">

                                ${escapeHTML(
                                    song.album || ""
                                )}

                                ${
                                    song.genre
                                        ? ` • ${escapeHTML(song.genre)}`
                                        : ""
                                }

                            </div>

                        </div>


                        <div class="song-actions">

                            <button
                                class="icon-button play-song-button"
                                data-action="play"
                                data-index="${index}"
                                title="Play"
                            >
                                ▶
                            </button>


                            <button
                                class="icon-button"
                                data-action="like"
                                data-index="${index}"
                                title="Like"
                            >
                                ${
                                    liked
                                        ? "♥"
                                        : "♡"
                                }
                            </button>


                            <button
                                class="icon-button more-song"
                                data-action="more"
                                data-index="${index}"
                                title="More"
                            >
                                ⋯
                            </button>

                        </div>

                    </div>
                `;
            }
        ).join("");
}


// ============================================================
// SEARCH RESULT CLICK
// ============================================================

searchResults.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "button[data-action]"
            );

        const card =
            event.target.closest(
                ".song-card"
            );


        if (!card) {
            return;
        }


        const index =
            Number(card.dataset.index);


        const song =
            currentResults[index];


        if (!song) {
            return;
        }


        if (button) {

            const action =
                button.dataset.action;


            if (action === "play") {

                playSong(
                    song,
                    index
                );
            }


            if (action === "like") {

                toggleLike(song);

                renderSearchResults(
                    currentResults
                );
            }


            if (action === "more") {

                openSongMenu(
                    song,
                    index
                );
            }


            return;
        }


        openSongDetail(
            song,
            index
        );
    }
);


// ============================================================
// SEARCH BUTTON
// ============================================================

searchButton.addEventListener(
    "click",
    () => {
        searchSongs();
    }
);


// ============================================================
// ENTER SEARCH
// ============================================================

songSearch.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            event.preventDefault();

            clearTimeout(searchTimer);

            searchSongs();
        }
    }
);


// ============================================================
// LIVE SEARCH
// ============================================================

songSearch.addEventListener(
    "input",
    () => {

        const value =
            songSearch.value.trim();


        if (clearSearch) {

            clearSearch.style.display =
                value
                    ? "block"
                    : "none";

            clearSearch.style.color =
                "#ff6b00";
        }


        clearTimeout(
            searchTimer
        );


        if (value.length < 2) {
            return;
        }


        searchTimer =
            setTimeout(
                () => {

                    searchSongs(
                        value,
                        {
                            scroll: false
                        }
                    );

                },
                1000
            );
    }
);


// ============================================================
// SEARCH CLEAR ×
// ============================================================

clearSearch.addEventListener(
    "click",
    clearResultsSection
);


// ============================================================
// PLAY SONG
// ============================================================

async function playSong(
    song,
    index = -1
) {

    if (
        !song ||
        !song.preview_url
    ) {

        showToast(
            "No playable preview is available for this song."
        );

        return;
    }


    // Same song = play/pause.
    if (
        currentSong &&
        getSongKey(currentSong) ===
            getSongKey(song)
    ) {

        if (currentAudio.paused) {

            try {

                await currentAudio.play();

            } catch (error) {

                console.error(error);
            }

        } else {

            currentAudio.pause();
        }


        updatePlayerButton();

        return;
    }


    // Stop previous song FIRST.
    currentAudio.pause();

    currentAudio.currentTime = 0;


    currentSong = song;

    currentIndex = index;


    currentAudio.src =
        song.preview_url;


    updatePlayerUI();


    try {

        await currentAudio.play();

    } catch (error) {

        console.error(error);

        showToast(
            "Playback was blocked. Press Play again."
        );
    }


    updatePlayerButton();


    // IMPORTANT:
    // Playing a song does NOT add it to Queue.
    // Queue contains only songs the user explicitly adds.
}


// ============================================================
// PLAYER UI
// ============================================================

function updatePlayerUI() {

    if (!currentSong) {
        return;
    }


    playerBar.style.display =
        "flex";


    playerArt.src =
        currentSong.artwork || "";


    playerTitle.textContent =
        currentSong.title ||
        "Unknown";


    playerArtist.textContent =
        currentSong.artist ||
        "Unknown artist";


    updateLikeButton();

    updatePlayerButton();


    currentTimeElement.textContent =
        "0:00";

    durationElement.textContent =
        "0:00";


    progressBar.value = 0;


    // Do NOT automatically load recommendations
    // every time the player changes.
    // This prevents unnecessary API requests.
}


// ============================================================
// PLAYER BUTTON
// ============================================================

function updatePlayerButton() {

    if (!currentSong) {

        playerPlay.textContent =
            "▶";

        return;
    }


    playerPlay.textContent =
        currentAudio.paused
            ? "▶"
            : "Ⅱ";
}


// ============================================================
// PLAYER PLAY / PAUSE
// ============================================================

playerPlay.addEventListener(
    "click",
    async () => {

        if (!currentSong) {
            return;
        }


        if (currentAudio.paused) {

            try {

                await currentAudio.play();

            } catch (error) {

                console.error(error);
            }

        } else {

            currentAudio.pause();
        }


        updatePlayerButton();
    }
);


// ============================================================
// AUDIO EVENTS
// ============================================================

currentAudio.addEventListener(
    "loadedmetadata",
    () => {

        durationElement.textContent =
            formatTime(
                currentAudio.duration
            );


        progressBar.max =
            currentAudio.duration || 100;
    }
);


currentAudio.addEventListener(
    "timeupdate",
    () => {

        if (
            !Number.isFinite(
                currentAudio.duration
            )
        ) {
            return;
        }


        progressBar.max =
            currentAudio.duration;


        progressBar.value =
            currentAudio.currentTime;


        currentTimeElement.textContent =
            formatTime(
                currentAudio.currentTime
            );


        durationElement.textContent =
            formatTime(
                currentAudio.duration
            );
    }
);


currentAudio.addEventListener(
    "play",
    () => {

        updatePlayerButton();
    }
);


currentAudio.addEventListener(
    "pause",
    () => {

        updatePlayerButton();
    }
);


currentAudio.addEventListener(
    "ended",
    () => {

        updatePlayerButton();

        playNext();
    }
);


currentAudio.addEventListener(
    "error",
    () => {

        showToast(
            "This preview could not be played."
        );

        updatePlayerButton();
    }
);


// ============================================================
// PROGRESS
// ============================================================

progressBar.addEventListener(
    "input",
    () => {

        if (
            !Number.isFinite(
                currentAudio.duration
            )
        ) {
            return;
        }


        currentAudio.currentTime =
            Number(
                progressBar.value
            );
    }
);


// ============================================================
// VOLUME
// ============================================================

volumeControl.addEventListener(
    "input",
    () => {

        currentAudio.volume =
            Number(
                volumeControl.value
            );
    }
);


// ============================================================
// NEXT
// ============================================================

nextButton.addEventListener(
    "click",
    () => {

        playNext();
    }
);


// ============================================================
// PREVIOUS
// ============================================================

previousButton.addEventListener(
    "click",
    () => {

        if (!currentSong) {
            return;
        }


        if (
            currentAudio.currentTime > 3
        ) {

            currentAudio.currentTime = 0;

            return;
        }


        if (
            currentIndex > 0 &&
            currentResults.length
        ) {

            const previous =
                currentResults[
                    currentIndex - 1
                ];


            playSong(
                previous,
                currentIndex - 1
            );

            return;
        }


        showToast(
            "No previous song."
        );
    }
);


// ============================================================
// PLAY NEXT
// ============================================================

function playNext() {

    if (!currentResults.length) {

        showToast(
            "No next song."
        );

        return;
    }


    if (
        currentIndex >= 0 &&
        currentIndex <
            currentResults.length - 1
    ) {

        const next =
            currentResults[
                currentIndex + 1
            ];


        playSong(
            next,
            currentIndex + 1
        );

        return;
    }


    showToast(
        "End of search results."
    );
}


// ============================================================
// LIKE SYSTEM
// ============================================================

likeButton.addEventListener(
    "click",
    () => {

        if (!currentSong) {
            return;
        }


        toggleLike(
            currentSong
        );


        updateLikeButton();


        if (
            searchSection.style.display !==
            "none"
        ) {

            renderSearchResults(
                currentResults
            );
        }


        if (
            resultsTitle.textContent ===
            "Liked Songs"
        ) {

            renderLikedSongs();
        }
    }
);


function toggleLike(song) {

    const key =
        getSongKey(song);


    const index =
        likedSongs.findIndex(
            item =>
                getSongKey(item) ===
                key
        );


    if (index >= 0) {

        likedSongs.splice(
            index,
            1
        );


        showToast(
            "Removed from liked songs."
        );

    } else {

        likedSongs.push(song);


        showToast(
            "Added to liked songs."
        );
    }


    saveLikedSongs();

    updateLikeButton();
}


function updateLikeButton() {

    if (!currentSong) {

        likeButton.textContent =
            "♡";

        return;
    }


    likeButton.textContent =
        isLiked(currentSong)
            ? "♥"
            : "♡";
}


// ============================================================
// QUEUE
// ============================================================

// Queue is ONLY user-added.
// Playing a song does not add it.

function addToQueue(song) {

    if (!song) {
        return;
    }


    const key =
        getSongKey(song);


    if (
        queue.some(
            item =>
                getSongKey(item) ===
                key
        )
    ) {

        showToast(
            "Song is already in your queue."
        );

        return;
    }


    queue.push(song);


    renderQueue();


    showToast(
        "Added to queue."
    );
}


function removeFromQueue(index) {

    if (
        index < 0 ||
        index >= queue.length
    ) {
        return;
    }


    queue.splice(
        index,
        1
    );


    renderQueue();
}


function renderQueue() {

    if (!queue.length) {

        queueList.innerHTML = `
            <div
                class="empty"
                style="padding:15px;"
            >
                Your queue is empty.
            </div>
        `;

        return;
    }


    queueList.innerHTML =
        queue.map(
            (song, index) => {

                return `
                    <div
                        class="queue-item"
                        data-queue-index="${index}"
                    >

                        <img
                            src="${escapeHTML(
                                song.artwork || ""
                            )}"
                            alt=""
                        >


                        <div style="flex:1;min-width:0;">

                            <strong>
                                ${escapeHTML(
                                    song.title ||
                                    "Unknown"
                                )}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    song.artist || ""
                                )}
                            </span>

                        </div>


                        <button
                            class="queue-remove"
                            data-remove-index="${index}"
                            title="Remove"
                            style="
                                background:transparent;
                                border:none;
                                color:#ff6b00;
                                font-size:20px;
                                cursor:pointer;
                                padding:4px 7px;
                            "
                        >
                            ×
                        </button>

                    </div>
                `;
            }
        ).join("");
}


queueList.addEventListener(
    "click",
    event => {

        const removeButton =
            event.target.closest(
                ".queue-remove"
            );


        if (removeButton) {

            event.stopPropagation();


            removeFromQueue(
                Number(
                    removeButton.dataset
                        .removeIndex
                )
            );

            return;
        }


        const item =
            event.target.closest(
                ".queue-item"
            );


        if (!item) {
            return;
        }


        const index =
            Number(
                item.dataset.queueIndex
            );


        const song =
            queue[index];


        if (song) {

            playSong(song);
        }
    }
);


// ============================================================
// QUEUE PANEL
// ============================================================

queueButton.addEventListener(
    "click",
    () => {

        queuePanel.style.display =
            queuePanel.style.display ===
            "block"
                ? "none"
                : "block";


        renderQueue();
    }
);


queueNav.addEventListener(
    "click",
    () => {

        queuePanel.style.display =
            "block";


        renderQueue();
    }
);


closeQueue.addEventListener(
    "click",
    () => {

        queuePanel.style.display =
            "none";
    }
);


// ============================================================
// MORE MENU
// ============================================================

moreButton.addEventListener(
    "click",
    () => {

        if (!currentSong) {
            return;
        }


        openSongMenu(
            currentSong,
            currentIndex
        );
    }
);


function openSongMenu(
    song,
    index
) {

    const shouldLike =
        isLiked(song)
            ? "Remove from Liked Songs"
            : "Add to Liked Songs";


    const choice =
        prompt(
            `PULSE — ${song.title}\n\n` +
            `1. ${shouldLike}\n` +
            `2. Add to Queue\n` +
            `3. Open Song Details\n` +
            `4. Merge Songs`
        );


    if (choice === "1") {

        toggleLike(song);

        renderSearchResults(
            currentResults
        );

    } else if (choice === "2") {

        addToQueue(song);

    } else if (choice === "3") {

        openSongDetail(
            song,
            index
        );

    } else if (choice === "4") {

        openMergeModal(song);
    }
}


// ============================================================
// SONG DETAIL
// ============================================================

function openSongDetail(
    song,
    index = -1,
    scroll = true
) {

    if (!song) {
        return;
    }


    songDetail.style.display =
        "block";


    detailArt.src =
        song.artwork || "";


    detailTitle.textContent =
        song.title ||
        "Unknown";


    detailArtist.textContent =
        song.artist ||
        "Unknown artist";


    detailMeta.innerHTML = `

        ${
            song.album
                ? `
                    <span class="meta-pill">
                        Album:
                        ${escapeHTML(song.album)}
                    </span>
                  `
                : ""
        }


        ${
            song.genre
                ? `
                    <span class="meta-pill">
                        ${escapeHTML(song.genre)}
                    </span>
                  `
                : ""
        }


        ${
            song.duration_ms
                ? `
                    <span class="meta-pill">
                        ${formatTime(
                            song.duration_ms / 1000
                        )}
                    </span>
                  `
                : ""
        }

    `;


    detailPlay.onclick =
        () => {

            playSong(
                song,
                index
            );
        };


    artistHeading.textContent =
        song.artist ||
        "Artist";


    artistDescription.textContent =
        `Explore more music by ${
            song.artist ||
            "this artist"
        }.`;


    // Load recommendations only when
    // the detail page is opened.
    renderArtistRecommendations(
        song
    );


    renderRelatedSongs(
        song
    );


    // Show loading state immediately.
    detailTuning.textContent =
        "Analyzing...";

    detailDominant.textContent =
        "Analyzing...";

    detailEnergy.textContent =
        "Analyzing...";


    frequencyExplanation.textContent =
        "Analyzing the available Apple preview audio. The result describes the preview, not necessarily the complete song.";


    musicEffectText.textContent =
        "The analysis estimates acoustic properties such as tuning, spectral content, energy and tempo. These may contribute to perceived arousal, mood or attention, but do not determine a person's psychological response.";


    // Start actual preview analysis.
    analyzePreviewForSong(
        song
    );


    if (scroll) {

        setTimeout(() => {

            songDetail.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }, 50);
    }
}


// ============================================================
// AUTOMATIC PREVIEW FREQUENCY ANALYSIS
// ============================================================

async function analyzePreviewForSong(song) {

    if (
        !song ||
        !song.preview_url
    ) {

        detailTuning.textContent =
            "Unavailable";

        detailDominant.textContent =
            "Unavailable";

        detailEnergy.textContent =
            "Unavailable";


        frequencyExplanation.textContent =
            "This song does not have an available preview that can be analyzed.";

        return;
    }


    const key =
        getSongKey(song);


    // Use cached analysis.
    if (
        analysisCache.has(key)
    ) {

        renderSongFrequency(
            analysisCache.get(key)
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/analyze-preview?preview_url=${encodeURIComponent(song.preview_url)}`
            );


        if (!response.ok) {

            const text =
                await response.text();


            throw new Error(
                text ||
                `Analysis failed: ${response.status}`
            );
        }


        const data =
            await response.json();


        analysisCache.set(
            key,
            data
        );


        // Make sure the user hasn't
        // opened another song while
        // this analysis was running.
        if (
            currentSong &&
            getSongKey(currentSong) ===
                key
        ) {

            renderSongFrequency(
                data
            );
        }


    } catch (error) {

        console.error(
            "Preview analysis error:",
            error
        );


        if (
            currentSong &&
            getSongKey(currentSong) ===
                key
        ) {

            detailTuning.textContent =
                "Unavailable";

            detailDominant.textContent =
                "Unavailable";

            detailEnergy.textContent =
                "Unavailable";


            frequencyExplanation.textContent =
                "The available preview could not be analyzed. Try another song or use the upload analyzer below.";

            musicEffectText.textContent =
                "No reliable song-specific effect estimate is available without successful audio analysis.";
        }
    }
}


// ============================================================
// RENDER SONG FREQUENCY
// ============================================================

function renderSongFrequency(
    data
) {

    const tuning =
        data.tuning_analysis ||
        {};

    const audio =
        data.audio_analysis ||
        {};

    const energy =
        data.energy_analysis ||
        {};

    const mood =
        data.mood_analysis ||
        {};


    detailTuning.textContent =
        tuning.estimated_tuning ||
        "—";


    detailDominant.textContent =
        audio.strongest_spectral_component_hz !==
        undefined

            ? `${Number(
                audio.strongest_spectral_component_hz
            ).toFixed(1)} Hz`

            : "—";


    detailEnergy.textContent =
        energy.energy_level ||
        "—";


    const tuningValue =
        tuning.estimated_tuning ||
        "not clearly determined";


    const dominant =
        audio.strongest_spectral_component_hz;


    const tempo =
        mood.tempo_bpm;


    const moodValue =
        mood.estimated_mood ||
        "mixed";


    const energyValue =
        energy.energy_level ||
        "moderate";


    frequencyExplanation.textContent =
        `Preview analysis: estimated tuning is ${tuningValue}${
            dominant !== undefined
                ? `, with a strongest spectral component around ${Number(dominant).toFixed(1)} Hz`
                : ""
        }. This is an acoustic description of the available preview, not a claim that the song has one single frequency.`;


    musicEffectText.textContent =
        `The preview is estimated as ${moodValue.toLowerCase()} with ${energyValue.toLowerCase()} energy${
            tempo !== undefined
                ? ` and a tempo around ${Number(tempo).toFixed(1)} BPM`
                : ""
        }. These musical properties may influence perceived arousal, mood or attention, depending on the listener and context.`;
}


// ============================================================
// ARTIST RECOMMENDATIONS
// ============================================================

async function renderArtistRecommendations(
    song
) {

    artistSongs.innerHTML =
        `<div class="loading">Loading artist songs...</div>`;


    if (!song.artist) {

        artistSongs.innerHTML = "";

        return;
    }


    try {

        const cacheKey =
            `artist:${song.artist.toLowerCase()}`;


        let data;


        if (
            searchCache.has(cacheKey)
        ) {

            data =
                searchCache.get(
                    cacheKey
                );

        } else {

            const response =
                await fetch(
                    `${API_BASE}/search?q=${encodeURIComponent(song.artist)}`
                );


            if (!response.ok) {

                throw new Error(
                    "Artist search failed"
                );
            }


            data =
                await response.json();


            searchCache.set(
                cacheKey,
                data
            );
        }


        const songs =
            (data.songs || [])
                .filter(
                    item =>
                        getSongKey(item) !==
                        getSongKey(song)
                )
                .slice(0, 8);


        renderRecommendationCards(
            artistSongs,
            songs
        );


    } catch (error) {

        console.error(error);


        artistSongs.innerHTML =
            `<div class="empty">
                Unable to load artist songs.
            </div>`;
    }
}


// ============================================================
// RELATED SONGS
// ============================================================

async function renderRelatedSongs(
    song
) {

    relatedSongs.innerHTML =
        `<div class="loading">
            Finding related music...
         </div>`;


    const query =
        song.genre ||
        "music";


    try {

        const cacheKey =
            `related:${query.toLowerCase()}`;


        let data;


        if (
            searchCache.has(cacheKey)
        ) {

            data =
                searchCache.get(
                    cacheKey
                );

        } else {

            const response =
                await fetch(
                    `${API_BASE}/search?q=${encodeURIComponent(query)}`
                );


            if (!response.ok) {

                throw new Error(
                    "Related search failed"
                );
            }


            data =
                await response.json();


            searchCache.set(
                cacheKey,
                data
            );
        }


        const songs =
            (data.songs || [])
                .filter(
                    item =>
                        getSongKey(item) !==
                        getSongKey(song)
                )
                .slice(0, 8);


        renderRecommendationCards(
            relatedSongs,
            songs
        );


    } catch (error) {

        console.error(error);


        relatedSongs.innerHTML =
            `<div class="empty">
                Unable to load related music.
            </div>`;
    }
}


// ============================================================
// RECOMMENDATION CARDS
// ============================================================

function renderRecommendationCards(
    container,
    songs
) {

    if (!songs.length) {

        container.innerHTML =
            `<div class="empty">
                No recommendations found.
             </div>`;

        return;
    }


    container.innerHTML =
        songs.map(
            (song, index) => {

                return `
                    <div
                        class="recommendation-card"
                        data-rec-index="${index}"
                    >

                        <img
                            src="${escapeHTML(
                                song.artwork || ""
                            )}"
                            alt=""
                        >


                        <strong>
                            ${escapeHTML(
                                song.title ||
                                "Unknown"
                            )}
                        </strong>


                        <span>
                            ${escapeHTML(
                                song.artist || ""
                            )}
                        </span>

                    </div>
                `;
            }
        ).join("");


    container._songs =
        songs;
}


function recommendationClickHandler(
    event
) {

    const card =
        event.target.closest(
            ".recommendation-card"
        );


    if (!card) {
        return;
    }


    const container =
        card.parentElement;


    const songs =
        container._songs || [];


    const index =
        Number(
            card.dataset.recIndex
        );


    const song =
        songs[index];


    if (song) {

        playSong(song);
    }
}


artistSongs.addEventListener(
    "click",
    recommendationClickHandler
);


relatedSongs.addEventListener(
    "click",
    recommendationClickHandler
);


// ============================================================
// DETAIL TABS
// ============================================================

document
    .querySelectorAll(".detail-tab")
    .forEach(
        tab => {

            tab.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".detail-tab"
                        )
                        .forEach(
                            item =>
                                item.classList
                                    .remove(
                                        "active"
                                    )
                        );


                    document
                        .querySelectorAll(
                            ".detail-panel"
                        )
                        .forEach(
                            panel =>
                                panel.classList
                                    .remove(
                                        "active"
                                    )
                        );


                    tab.classList.add(
                        "active"
                    );


                    const panel =
                        document.getElementById(
                            tab.dataset.tab
                        );


                    if (panel) {

                        panel.classList.add(
                            "active"
                        );
                    }
                }
            );
        }
    );


// ============================================================
// CATEGORY CARDS
// ============================================================

document
    .querySelectorAll(
        ".card[data-category]"
    )
    .forEach(
        card => {

            card.addEventListener(
                "click",
                () => {

                    const query =
                        card.dataset.query;


                    const label =
                        card.querySelector("h3")
                            ?.textContent ||
                        query;


                    searchSongs(
                        query,
                        {
                            title:
                                `${label} Music`,
                            scroll: true
                        }
                    );
                }
            );
        }
    );


// ============================================================
// SIDEBAR SCROLL
// ============================================================

// Makes the fixed sidebar itself scrollable
// when the screen is not tall enough.

const sidebar =
    document.querySelector(
        ".sidebar"
    );


if (sidebar) {

    sidebar.style.overflowY =
        "auto";

    sidebar.style.overflowX =
        "hidden";

    sidebar.style.maxHeight =
        "100vh";
}


// ============================================================
// SIDEBAR DISCOVER / ANALYZE
// ============================================================

document
    .querySelectorAll(
        "[data-scroll]"
    )
    .forEach(
        item => {

            item.addEventListener(
                "click",
                () => {

                    const target =
                        document.getElementById(
                            item.dataset.scroll
                        );


                    if (!target) {
                        return;
                    }


                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            );
        }
    );


// ============================================================
// SIDEBAR NAVIGATION
// ============================================================

document
    .querySelectorAll(
        "[data-nav]"
    )
    .forEach(
        item => {

            item.addEventListener(
                "click",
                () => {

                    const nav =
                        item.dataset.nav;


                    if (nav === "search") {

                        songSearch.focus();


                        window.scrollTo({
                            top: 0,
                            behavior: "smooth"
                        });
                    }


                    if (nav === "home") {

                        window.scrollTo({
                            top: 0,
                            behavior: "smooth"
                        });
                    }


                    if (nav === "liked") {

                        renderLikedSongs();


                        searchSection.style.display =
                            "block";


                        searchSection.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                    }
                }
            );
        }
    );


// ============================================================
// LIKED SONGS
// ============================================================

function renderLikedSongs() {

    currentResults = [
        ...likedSongs
    ];

    currentIndex = -1;


    resultsTitle.textContent =
        "Liked Songs";


    resultsCount.textContent =
        `${currentResults.length} songs`;


    searchSection.style.display =
        "block";


    createResultsCloseButton();


    renderSearchResults(
        currentResults
    );


    // No extra status text under search.
    searchStatus.textContent = "";
}


// ============================================================
// ANALYZER
// ============================================================

analyzeButton.addEventListener(
    "click",
    analyzeSong
);


async function analyzeSong() {

    const file =
        audioFile.files[0];


    if (!file) {

        showToast(
            "Please choose an audio file first."
        );

        return;
    }


    analyzeButton.disabled =
        true;


    analyzeButton.textContent =
        "Analyzing...";


    result.innerHTML =
        `<p style="color:#888;">
            Analyzing your audio...
         </p>`;


    const formData =
        new FormData();


    formData.append(
        "file",
        file
    );


    try {

        const response =
            await fetch(
                `${API_BASE}/analyze`,
                {
                    method: "POST",
                    body: formData
                }
            );


        if (!response.ok) {

            throw new Error(
                `Analysis failed: ${response.status}`
            );
        }


        const data =
            await response.json();


        renderAnalysisResult(
            data
        );


    } catch (error) {

        console.error(error);


        result.innerHTML = `
            <div class="info-box">

                <h3>
                    Analysis failed
                </h3>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>
        `;

    } finally {

        analyzeButton.disabled =
            false;


        analyzeButton.textContent =
            "Analyze Song";
    }
}


// ============================================================
// RENDER UPLOADED AUDIO ANALYSIS
// ============================================================

function renderAnalysisResult(
    data
) {

    const tuning =
        data.tuning_analysis || {};

    const audio =
        data.audio_analysis || {};

    const energy =
        data.energy_analysis || {};

    const mood =
        data.mood_analysis || {};

    const summary =
        data.summary || "";


    result.innerHTML = `

        <div class="info-box">

            <h3>
                ${escapeHTML(
                    data.song?.filename ||
                    "Audio Analysis"
                )}
            </h3>


            ${
                summary
                    ? `
                        <p
                            style="margin-top:10px;"
                        >
                            ${escapeHTML(
                                summary
                            )}
                        </p>
                      `
                    : ""
            }

        </div>


        <div class="frequency-grid">


            <div class="frequency-stat">

                <span>
                    Estimated Tuning
                </span>

                <strong>
                    ${escapeHTML(
                        tuning.estimated_tuning ||
                        "—"
                    )}
                </strong>

            </div>


            <div class="frequency-stat">

                <span>
                    Dominant Spectral Component
                </span>

                <strong>

                    ${
                        audio
                            .strongest_spectral_component_hz
                            !== undefined

                            ? `${Number(
                                audio
                                    .strongest_spectral_component_hz
                              ).toFixed(1)} Hz`

                            : "—"
                    }

                </strong>

            </div>


            <div class="frequency-stat">

                <span>
                    Energy
                </span>

                <strong>
                    ${escapeHTML(
                        energy.energy_level ||
                        "—"
                    )}
                </strong>

            </div>


            <div class="frequency-stat">

                <span>
                    Mood
                </span>

                <strong>
                    ${escapeHTML(
                        mood.estimated_mood ||
                        "—"
                    )}
                </strong>

            </div>


            <div class="frequency-stat">

                <span>
                    Tempo
                </span>

                <strong>

                    ${
                        mood.tempo_bpm !== undefined

                            ? `${Number(
                                mood.tempo_bpm
                              ).toFixed(1)} BPM`

                            : "—"
                    }

                </strong>

            </div>


            <div class="frequency-stat">

                <span>
                    Spectral Brightness
                </span>

                <strong>

                    ${
                        mood
                            .spectral_brightness_hz
                            !== undefined

                            ? `${Number(
                                mood
                                    .spectral_brightness_hz
                              ).toFixed(1)} Hz`

                            : "—"
                    }

                </strong>

            </div>


        </div>


        <div class="info-box">

            <h3>
                Frequency Range
            </h3>

            <p>

                ${
                    audio.frequency_range_hz
                        ? escapeHTML(
                            JSON.stringify(
                                audio.frequency_range_hz
                            )
                          )
                        : "—"
                }

            </p>

        </div>


        <div class="info-box">

            <h3>
                What this may influence
            </h3>

            <p>

                This analysis describes acoustic
                properties such as frequency,
                tuning, energy and tempo.
                These properties may contribute
                to perceived arousal, mood or
                attention, but they do not determine
                a person's psychological response.

            </p>

        </div>

    `;


    detailTuning.textContent =
        tuning.estimated_tuning ||
        "—";


    detailDominant.textContent =
        audio
            .strongest_spectral_component_hz
            !== undefined

            ? `${Number(
                audio
                    .strongest_spectral_component_hz
              ).toFixed(1)} Hz`

            : "—";


    detailEnergy.textContent =
        energy.energy_level ||
        "—";
}


// ============================================================
// MERGE MODAL
// ============================================================

function openMergeModal(
    song = null
) {

    mergeModal.style.display =
        "flex";


    // Make merge close button orange.
    if (closeMerge) {

        closeMerge.style.color =
            "#ff6b00";

        closeMerge.style.borderColor =
            "#ff6b00";

        closeMerge.style.background =
            "#222";

        closeMerge.style.fontSize =
            "24px";

        closeMerge.style.fontWeight =
            "bold";
    }


    if (song) {

        selectedMergeA =
            song;


        selectedA.textContent =
            `Selected: ${song.title} — ${song.artist}`;
    }
}


function closeMergeWindow() {

    mergeModal.style.display =
        "none";
}


closeMerge.addEventListener(
    "click",
    closeMergeWindow
);


mergeModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            mergeModal
        ) {

            closeMergeWindow();
        }
    }
);


// ============================================================
// MERGE OPTIONS
// ============================================================

document
    .querySelectorAll(
        ".merge-option"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".merge-option"
                        )
                        .forEach(
                            item =>
                                item.classList
                                    .remove(
                                        "active"
                                    )
                        );


                    button.classList.add(
                        "active"
                    );


                    mergeMode =
                        button.dataset.mode;


                    showToast(
                        `Merge mode ${button.textContent.trim()} selected.`
                    );
                }
            );
        }
    );


// ============================================================
// MERGE SEARCH
// ============================================================

mergeSearchA.addEventListener(
    "input",
    debounceMergeSearch(
        mergeSearchA,
        mergeResultsA,
        "A"
    )
);


mergeSearchB.addEventListener(
    "input",
    debounceMergeSearch(
        mergeSearchB,
        mergeResultsB,
        "B"
    )
);


function debounceMergeSearch(
    input,
    container,
    target
) {

    let timer;


    return () => {

        clearTimeout(timer);


        const value =
            input.value.trim();


        if (value.length < 2) {

            container.innerHTML = "";

            return;
        }


        timer =
            setTimeout(
                () => {

                    searchMergeSongs(
                        value,
                        container,
                        target
                    );

                },
                1000
            );
    };
}


// ============================================================
// MERGE SEARCH RESULTS
// ============================================================

async function searchMergeSongs(
    query,
    container,
    target
) {

    container.innerHTML =
        `<div class="loading">
            Searching...
         </div>`;


    try {

        const response =
            await fetch(
                `${API_BASE}/search?q=${encodeURIComponent(query)}`
            );


        if (!response.ok) {

            throw new Error(
                "Merge search failed"
            );
        }


        const data =
            await response.json();


        const songs =
            (data.songs || [])
                .slice(0, 6);


        container.innerHTML =
            songs.map(
                (song, index) => {

                    return `
                        <div
                            class="merge-result"
                            data-target="${target}"
                            data-index="${index}"
                        >

                            <img
                                src="${escapeHTML(
                                    song.artwork || ""
                                )}"
                                alt=""
                            >


                            <div>

                                <strong>
                                    ${escapeHTML(
                                        song.title || ""
                                    )}
                                </strong>


                                <span>
                                    ${escapeHTML(
                                        song.artist || ""
                                    )}
                                </span>

                            </div>

                        </div>
                    `;
                }
            ).join("");


        container._songs =
            songs;


    } catch (error) {

        console.error(error);


        container.innerHTML =
            `<div class="empty">
                Search failed.
             </div>`;
    }
}


// ============================================================
// MERGE SONG SELECTION
// ============================================================

mergeResultsA.addEventListener(
    "click",
    event => {

        selectMergeSong(
            event,
            mergeResultsA,
            "A"
        );
    }
);


mergeResultsB.addEventListener(
    "click",
    event => {

        selectMergeSong(
            event,
            mergeResultsB,
            "B"
        );
    }
);


function selectMergeSong(
    event,
    container,
    target
) {

    const item =
        event.target.closest(
            ".merge-result"
        );


    if (!item) {
        return;
    }


    const songs =
        container._songs || [];


    const index =
        Number(
            item.dataset.index
        );


    const song =
        songs[index];


    if (!song) {
        return;
    }


    if (target === "A") {

        selectedMergeA =
            song;


        selectedA.textContent =
            `Selected: ${song.title} — ${song.artist}`;

    } else {

        selectedMergeB =
            song;


        selectedB.textContent =
            `Selected: ${song.title} — ${song.artist}`;
    }
}


// ============================================================
// INITIAL STATE
// ============================================================

if (playerBar) {

    playerBar.style.display =
        "none";
}


if (queuePanel) {

    queuePanel.style.display =
        "none";
}


renderQueue();

createResultsCloseButton();


// ============================================================
// KEYBOARD SHORTCUT
// ============================================================

document.addEventListener(
    "keydown",
    event => {

        const tag =
            document.activeElement?.tagName;


        if (
            event.code === "Space" &&
            tag !== "INPUT" &&
            tag !== "TEXTAREA"
        ) {

            event.preventDefault();


            if (currentSong) {

                if (
                    currentAudio.paused
                ) {

                    currentAudio.play();

                } else {

                    currentAudio.pause();
                }
            }
        }


        // Escape closes merge and queue.
        if (event.key === "Escape") {

            if (
                mergeModal &&
                mergeModal.style.display ===
                    "flex"
            ) {

                closeMergeWindow();
            }


            if (queuePanel) {

                queuePanel.style.display =
                    "none";
            }
        }
    }
);


// ============================================================
// STARTUP
// ============================================================

console.log(
    "PULSE Music App frontend loaded."
);

console.log(
    "Backend:",
    API_BASE
);