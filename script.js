// ========= Golf Guesser (script.js) — 18 Holes + Local Leaderboard + Robust Image Loading =========

// DOM
const gameContainer = document.getElementById("game-container");
const guessInput = document.getElementById("guess-input");
const guessButton = document.getElementById("guess-button");
const nextHoleButton = document.getElementById("next-hole-button");
const restartButton = document.getElementById("restart-button");
const messageContainer = document.getElementById("message-container");

const howToPlayButton = document.getElementById("how-to-play-button");
const rulesModal = document.getElementById("rules-modal");
const closeButton = document.querySelector(".close-button");

// Guess history
const guessHistoryEl = document.getElementById("guess-history");

// Round UI stats
const holeNumberSpan = document.getElementById("hole-number");
const totalHolesSpan = document.getElementById("total-holes");
const totalStrokesSpan = document.getElementById("total-strokes");
const holeStrokesSpan = document.getElementById("hole-strokes");
const remainingGuessesSpan = document.getElementById("remaining-guesses");

// End modal
const endModal = document.getElementById("end-modal");
const finalStrokesEl = document.getElementById("final-strokes");
const initialsInput = document.getElementById("initials-input");
const submitScoreButton = document.getElementById("submit-score-button");
const playAgainButton = document.getElementById("play-again-button");
const endError = document.getElementById("end-error");

// Leaderboard
const leaderboardList = document.getElementById("leaderboard-list");
const resetLeaderboardButton = document.getElementById("reset-leaderboard-button");

const LEADERBOARD_KEY = "golf_guesser_leaderboard_v1";

// Modal rules
howToPlayButton.addEventListener("click", () => {
  rulesModal.style.display = "block";
});
closeButton.addEventListener("click", () => {
  rulesModal.style.display = "none";
});
window.addEventListener("click", (event) => {
  if (event.target === rulesModal) rulesModal.style.display = "none";
  if (event.target === endModal) endModal.style.display = "none";
});

// Game config
const TOTAL_HOLES = 18;
const maxGuesses = 7;
const missPenaltyStrokes = maxGuesses + 1; // 8

// Pixelation model: more wrong guesses => clearer
// If start is too pixelated, increase initialPixelBlocks (e.g. 18–24)
const initialPixelBlocks = 25;
const pixelBlockIncrement = 6;

// Data
const images = [
  { path: "images/max2.jpg", answer: "Max Homa" },
  { path: "images/jordan.jpg", answer: "Jordan Spieth" },
  { path: "images/cantlay.jpg", answer: "Patrick Cantlay" },
  { path: "images/scottie.jpg", answer: "Scottie Scheffler" },
  { path: "images/finau.jpg", answer: "Tony Finau" },
  { path: "images/fleetwood.jpg", answer: "Tommy Fleetwood" },
  { path: "images/hovland.jpg", answer: "Viktor Hovland" },
  { path: "images/koepka.jpg", answer: "Brooks Koepka" },
  { path: "images/dj.jpg", answer: "Dustin Johnson" },
  { path: "images/bryson.jpg", answer: "Bryson Dechambeau" },
  { path: "images/hossler.jpg", answer: "Beau Hossler" },
  { path: "images/mitchell.jpg", answer: "Keith Mitchell" },
  { path: "images/bubba.jpg", answer: "Bubba Watson" },
  { path: "images/camsmith.jpg", answer: "Cameron Smith" },
  { path: "images/conners.jpg", answer: "Corey Conners" },
  { path: "images/sahith.jpg", answer: "Sahith Theegala" },
  { path: "images/jt.jpg", answer: "Justin Thomas" },
  { path: "images/mckibbin.jpg", answer: "Tommy Mckibbin" },
  { path: "images/day.jpg", answer: "Jason Day" },
  { path: "images/hatton.jpg", answer: "Tyrell Hatton" },
  { path: "images/adamscott.jpg", answer: "Adam Scott" },
  { path: "images/woods.jpg", answer: "Tiger Woods" },
  { path: "images/mickelson.jpg", answer: "Phil Mickelson" },
  { path: "images/rahm.jpg", answer: "Jon Rahm" },
  { path: "images/camyoung.jpg", answer: "Cameron Young" },
  { path: "images/xander.jpg", answer: "Xander Schauffele" },
  { path: "images/morikawa.jpg", answer: "Collin Morikawa" },
  { path: "images/wolff.jpg", answer: "Matthew Wolff" },
  { path: "images/minwoo.jpg", answer: "Min Woo Lee" },
  { path: "images/hideki.jpg", answer: "Hideki Matsuyama" }
];

// Optional aliases
const aliases = new Map([
  ["john rahm", "jon rahm"],
]);

// Canvas + image
const ctx = gameContainer.getContext("2d");
const image = new Image();

const CANVAS_SIZE = 500;
gameContainer.width = CANVAS_SIZE;
gameContainer.height = CANVAS_SIZE;

// Round state
let holeNumber = 1;
let totalStrokes = 0;

let isImageLoaded = false;
let holeEnded = false;
let currentImageIndex = 0;

let submitsThisHole = 0;       // total submits this hole
let wrongGuessesThisHole = 0;  // controls pixel reveal
let guessedSet = new Set();

// 18-hole deck (no repeats within a round)
let holeDeck = [];
let deckPos = 0;

// Events
guessButton.addEventListener("click", handleGuess);
nextHoleButton.addEventListener("click", goToNextHole);
restartButton.addEventListener("click", restartRound);

guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleGuess();
  }
});

// End modal events
submitScoreButton.addEventListener("click", submitScore);
playAgainButton.addEventListener("click", () => {
  endModal.style.display = "none";
  restartRound();
});

// Leaderboard reset
resetLeaderboardButton.addEventListener("click", () => {
  localStorage.removeItem(LEADERBOARD_KEY);
  renderLeaderboard();
});

// Helpers
function normalize(str) {
  return str.toLowerCase().trim().replace(/\s+/g, " ");
}

function displayMessage(message) {
  messageContainer.textContent = message;
}

function clearGuessHistory() {
  guessHistoryEl.innerHTML = "";
  guessedSet = new Set();
}

function addGuessToHistory(guessRaw, isCorrect) {
  const div = document.createElement("div");
  div.className = isCorrect ? "guess-item correct" : "guess-item wrong";

  const icon = document.createElement("span");
  icon.className = "guess-icon";
  icon.textContent = isCorrect ? "✅" : "❌";

  const text = document.createElement("span");
  text.className = "guess-text";
  text.textContent = guessRaw;

  div.appendChild(icon);
  div.appendChild(text);
  guessHistoryEl.appendChild(div);

  guessHistoryEl.scrollTop = guessHistoryEl.scrollHeight;
}

function updateTopBar() {
  holeNumberSpan.textContent = String(holeNumber);
  totalHolesSpan.textContent = String(TOTAL_HOLES);
  totalStrokesSpan.textContent = String(totalStrokes);
  holeStrokesSpan.textContent = String(holeEnded ? getHoleStrokes() : 0);

  const remaining = Math.max(0, maxGuesses - wrongGuessesThisHole);
  remainingGuessesSpan.textContent = String(remaining);
}

function getHoleStrokes() {
  if (!holeEnded) return 0;
  if (wrongGuessesThisHole >= maxGuesses) return missPenaltyStrokes;
  return submitsThisHole;
}

function setHoleUIState({ canGuess, canNext }) {
  guessButton.disabled = !canGuess;
  guessInput.disabled = !canGuess;
  nextHoleButton.disabled = !canNext;
  restartButton.disabled = false;
}

/**
 * Pick a fallback image index that hasn't been tried yet.
 * Returns null if no options remain.
 */
function pickFallbackIndex(excludeSet) {
  const options = [];
  for (let i = 0; i < images.length; i++) {
    if (!excludeSet.has(i)) options.push(i);
  }
  if (options.length === 0) return null;
  return options[Math.floor(Math.random() * options.length)];
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function buildDeck() {
  const indices = Array.from({ length: images.length }, (_, i) => i);
  shuffle(indices);

  if (indices.length >= TOTAL_HOLES) return indices.slice(0, TOTAL_HOLES);

  // If fewer than 18 images exist, repeat shuffled indices until enough
  const deck = [];
  while (deck.length < TOTAL_HOLES) {
    shuffle(indices);
    deck.push(...indices);
  }
  return deck.slice(0, TOTAL_HOLES);
}

// Draw cover crop (used for reveal)
function drawCover(img, canvas, context, smoothing) {
  const cw = canvas.width;
  const ch = canvas.height;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;

  const scale = Math.max(cw / iw, ch / ih);
  const sw = cw / scale;
  const sh = ch / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;

  context.imageSmoothingEnabled = smoothing;
  context.clearRect(0, 0, cw, ch);
  context.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
}

// Pixelate: more wrong guesses => clearer
function pixelate() {
  const cw = gameContainer.width;
  const ch = gameContainer.height;

  const blocksAcross = initialPixelBlocks + wrongGuessesThisHole * pixelBlockIncrement;
  const tinyW = Math.max(1, Math.min(cw, blocksAcross));
  const tinyH = Math.max(1, Math.min(ch, Math.round((blocksAcross * ch) / cw)));

  const off = document.createElement("canvas");
  off.width = tinyW;
  off.height = tinyH;
  const offCtx = off.getContext("2d");

  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;

  const scale = Math.max(tinyW / iw, tinyH / ih);
  const sw = tinyW / scale;
  const sh = tinyH / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;

  offCtx.imageSmoothingEnabled = true;
  offCtx.clearRect(0, 0, tinyW, tinyH);
  offCtx.drawImage(image, sx, sy, sw, sh, 0, 0, tinyW, tinyH);

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(off, 0, 0, tinyW, tinyH, 0, 0, cw, ch);
}

function revealImage() {
  drawCover(image, gameContainer, ctx, true);
}

/**
 * Robust hole loader:
 * - Uses the deck index if possible
 * - If the image fails to load (404, typo, case mismatch), it retries with a fallback image
 * - After multiple failures, shows a clear error message
 */
function loadHole() {
  isImageLoaded = false;
  holeEnded = false;

  submitsThisHole = 0;
  wrongGuessesThisHole = 0;
  clearGuessHistory();

  displayMessage("Loading...");
  setHoleUIState({ canGuess: false, canNext: false });
  updateTopBar();

  // Safety: ensure deck exists and position is valid
  if (!holeDeck || holeDeck.length === 0) {
    holeDeck = buildDeck();
    deckPos = 0;
  }
  if (deckPos < 0) deckPos = 0;
  if (deckPos >= holeDeck.length) deckPos = holeDeck.length - 1;

  const tried = new Set();
  let attemptsLeft = Math.min(6, images.length); // prevent infinite retry loops

  function tryLoadIndex(idx) {
    if (idx == null) {
      displayMessage("Couldn’t load any images. Check your /images folder and filenames.");
      return;
    }

    currentImageIndex = idx;
    tried.add(idx);

    // Set handlers BEFORE setting src
    image.onload = () => {
      isImageLoaded = true;
      displayMessage("");
      setHoleUIState({ canGuess: true, canNext: false });
      pixelate();
      updateTopBar();
      guessInput.focus();
    };

    image.onerror = () => {
      attemptsLeft -= 1;
      console.warn("Image failed to load:", images[currentImageIndex].path);

      if (attemptsLeft <= 0) {
        displayMessage("Image failed to load. Check filenames/paths in your /images folder (case matters on web hosts).");
        return;
      }

      displayMessage("That hole’s photo failed to load — skipping to a new one...");

      // If the deck entry was bad, advance deckPos so you don't keep landing on it
      // (Only do this if we're currently attempting the deck's chosen image)
      if (holeDeck[deckPos] === currentImageIndex && deckPos < holeDeck.length - 1) {
        deckPos += 1;
      }

      const fallback = pickFallbackIndex(tried);
      tryLoadIndex(fallback);
    };

    image.src = images[currentImageIndex].path;
  }

  const primary = holeDeck[deckPos];
  if (typeof primary !== "number") {
    tryLoadIndex(pickFallbackIndex(tried));
  } else {
    tryLoadIndex(primary);
  }
}

function endHole(win) {
  holeEnded = true;

  const correctAnswer = images[currentImageIndex].answer;
  const strokes = win ? submitsThisHole : missPenaltyStrokes;
  totalStrokes += strokes;

  holeStrokesSpan.textContent = String(strokes);
  totalStrokesSpan.textContent = String(totalStrokes);

  if (win) {
    displayMessage(`🏌️ Nice! "${correctAnswer}" — Strokes: ${strokes}.`);
  } else {
    displayMessage(`⛳ Missed it! Answer: "${correctAnswer}" — Strokes: ${strokes}.`);
  }

  revealImage();
  setHoleUIState({ canGuess: false, canNext: true });
  updateTopBar();

  nextHoleButton.textContent = (holeNumber === TOTAL_HOLES) ? "Finish Round" : "Next Hole";
}

function handleGuess() {
  if (!isImageLoaded || holeEnded) return;

  const guessRaw = guessInput.value.trim();
  if (!guessRaw) {
    displayMessage("Please enter a name.");
    guessInput.focus();
    return;
  }

  const guessNorm = normalize(guessRaw);
  const guessFinal = aliases.get(guessNorm) ?? guessNorm;

  // Prevent duplicate guesses
  if (guessedSet.has(guessFinal)) {
    displayMessage("You already guessed that one — try a different golfer.");
    guessInput.select();
    guessInput.focus();
    return;
  }
  guessedSet.add(guessFinal);

  const correctAnswer = images[currentImageIndex].answer;
  const correctNorm = normalize(correctAnswer);

  submitsThisHole += 1;

  if (guessFinal === correctNorm) {
    addGuessToHistory(guessRaw, true);
    endHole(true);
  } else {
    addGuessToHistory(guessRaw, false);
    wrongGuessesThisHole += 1;

    const remaining = maxGuesses - wrongGuessesThisHole;
    remainingGuessesSpan.textContent = String(Math.max(0, remaining));

    if (remaining <= 0) {
      endHole(false);
    } else {
      pixelate();
      displayMessage(`❌ Try again. Remaining guesses: ${remaining}`);
      updateTopBar();
    }
  }

  guessInput.value = "";
  guessInput.focus();
}
guessInput.addEventListener("focus", () => {
  setTimeout(() => {
    try {
      guessInput.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch { }
  }, 150);
});


function goToNextHole() {
  if (!holeEnded) return;

  if (holeNumber === TOTAL_HOLES) {
    showEndModal();
    return;
  }

  holeNumber += 1;
  deckPos += 1;
  loadHole();
}

function restartRound() {
  holeNumber = 1;
  totalStrokes = 0;

  holeDeck = buildDeck();
  deckPos = 0;

  nextHoleButton.textContent = "Next Hole";
  displayMessage("");
  updateTopBar();
  loadHole();
}

function showEndModal() {
  finalStrokesEl.textContent = String(totalStrokes);
  initialsInput.value = "";
  endError.textContent = "";
  endModal.style.display = "block";
  initialsInput.focus();
}

// Leaderboard logic
function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLeaderboard(entries) {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

function renderLeaderboard() {
  const entries = loadLeaderboard()
    .sort((a, b) => a.strokes - b.strokes)
    .slice(0, 10);

  leaderboardList.innerHTML = "";

  if (entries.length === 0) {
    leaderboardList.innerHTML = `<div class="lb-row"><div class="lb-rank">—</div><div class="lb-name">No scores yet</div><div class="lb-score">—</div></div>`;
    return;
  }

  entries.forEach((e, idx) => {
    const row = document.createElement("div");
    row.className = "lb-row";

    const rank = document.createElement("div");
    rank.className = "lb-rank";
    rank.textContent = `#${idx + 1}`;

    const name = document.createElement("div");
    name.className = "lb-name";
    name.textContent = `${e.initials} • ${e.date}`;

    const score = document.createElement("div");
    score.className = "lb-score";
    score.textContent = `${e.strokes} strokes`;

    row.appendChild(rank);
    row.appendChild(name);
    row.appendChild(score);
    leaderboardList.appendChild(row);
  });
}

function submitScore() {
  const initialsRaw = initialsInput.value.trim().toUpperCase();
  const initials = initialsRaw.replace(/[^A-Z0-9]/g, "").slice(0, 3);

  if (initials.length < 1) {
    endError.textContent = "Enter 1–3 letters/numbers for initials.";
    initialsInput.focus();
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const entries = loadLeaderboard();
  entries.push({ initials, strokes: totalStrokes, date });
  entries.sort((a, b) => a.strokes - b.strokes);

  saveLeaderboard(entries.slice(0, 50)); // keep some history
  renderLeaderboard();

  endModal.style.display = "none";
  restartRound();
}

// Init
renderLeaderboard();
restartRound();
