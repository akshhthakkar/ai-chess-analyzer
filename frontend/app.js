/**
 * AI Chess Analyzer - Frontend Application
 * Dark Theme Edition
 */

// Configuration
const API_URL = "http://localhost:5000";
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// State
let board = null;
let game = null;

// DOM Elements
const elements = {
  fenInput: null,
  depthSlider: null,
  depthValue: null,
  linesSlider: null,
  linesValue: null,
  btnAnalyze: null,
  btnStart: null,
  btnClear: null,
  btnFlip: null,
  btnLoadFen: null,
  loading: null,
  analysisLines: null,
  evalBar: null,
  evalText: null,
  turnBadge: null,
  turnDisplay: null,
  serverBadge: null,
  serverStatus: null,
  errorDisplay: null,
};

/**
 * Initialize the application
 */
document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing AI Chess Analyzer...");
  try {
    initElements();
    initChessboard();
    initEventListeners();
    checkServerHealth();
    setInterval(checkServerHealth, 30000); // Check every 30s
    console.log("Initialization complete!");
  } catch (error) {
    console.error("Initialization error:", error);
  }
});

/**
 * Cache DOM elements
 */
function initElements() {
  elements.fenInput = document.getElementById("fen-input");
  elements.depthSlider = document.getElementById("depth-slider");
  elements.depthValue = document.getElementById("depth-value");
  elements.linesSlider = document.getElementById("lines-slider");
  elements.linesValue = document.getElementById("lines-value");
  elements.btnAnalyze = document.getElementById("btn-analyze");
  elements.btnStart = document.getElementById("btn-start");
  elements.btnClear = document.getElementById("btn-clear");
  elements.btnFlip = document.getElementById("btn-flip");
  elements.btnLoadFen = document.getElementById("btn-load-fen");
  elements.loading = document.getElementById("loading");
  elements.analysisLines = document.getElementById("analysis-lines");
  elements.evalBar = document.getElementById("eval-bar");
  elements.evalText = document.getElementById("eval-text");
  elements.turnBadge = document.getElementById("turn-badge");
  elements.turnDisplay = document.getElementById("turn-display");
  elements.serverBadge = document.getElementById("server-badge");
  elements.serverStatus = document.getElementById("server-status");
  elements.errorDisplay = document.getElementById("error-display");
}

/**
 * Initialize the chessboard
 */
function initChessboard() {
  if (typeof Chess === "undefined") {
    throw new Error("Chess.js library not loaded");
  }
  if (typeof Chessboard === "undefined") {
    throw new Error("Chessboard.js library not loaded");
  }

  game = new Chess();

  const pieceTheme = function (piece) {
    return "img/chesspieces/wikipedia/" + piece + ".png";
  };

  const config = {
    draggable: true,
    position: "start",
    pieceTheme: pieceTheme,
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
  };

  board = Chessboard("board", config);
  window.addEventListener("resize", () => board.resize());

  updateFenInput();
  updateTurnIndicator();
}

function onDragStart(source, piece, position, orientation) {
  if (game.game_over()) return false;
  if (
    (game.turn() === "w" && piece.search(/^b/) !== -1) ||
    (game.turn() === "b" && piece.search(/^w/) !== -1)
  ) {
    return false;
  }
  return true;
}

function onDrop(source, target) {
  const move = game.move({
    from: source,
    to: target,
    promotion: "q",
  });

  if (move === null) return "snapback";

  updateFenInput();
  updateTurnIndicator();
}

function onSnapEnd() {
  board.position(game.fen());
}

/**
 * Event listeners
 */
function initEventListeners() {
  elements.depthSlider.addEventListener("input", (e) => {
    elements.depthValue.textContent = e.target.value;
  });

  elements.linesSlider.addEventListener("input", (e) => {
    elements.linesValue.textContent = e.target.value;
  });

  elements.btnStart.addEventListener("click", () => {
    game.reset();
    board.start();
    updateFenInput();
    updateTurnIndicator();
    clearResults();
  });

  elements.btnClear.addEventListener("click", () => {
    game.clear();
    board.clear();
    updateFenInput();
    updateTurnIndicator();
    clearResults();
  });

  elements.btnFlip.addEventListener("click", () => {
    board.flip();
  });

  elements.btnLoadFen.addEventListener("click", loadFenFromInput);
  elements.fenInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") loadFenFromInput();
  });

  elements.btnAnalyze.addEventListener("click", analyzePosition);
}

/**
 * Load FEN from input
 */
function loadFenFromInput() {
  const fen = elements.fenInput.value.trim();

  if (!fen) {
    showError("Please enter a FEN position");
    return;
  }

  try {
    const loaded = game.load(fen);
    if (loaded === false) {
      showError("Invalid FEN position");
      return;
    }
  } catch (e) {
    showError("Invalid FEN: " + e.message);
    return;
  }

  board.position(game.fen());
  updateTurnIndicator();
  clearResults();
  hideError();
}

function updateFenInput() {
  elements.fenInput.value = game.fen();
}

function updateTurnIndicator() {
  const turn = game.turn();
  const isWhite = turn === "w";
  elements.turnDisplay.textContent = isWhite
    ? "White to move"
    : "Black to move";
  elements.turnBadge.className = isWhite ? "turn-badge" : "turn-badge black";
}

/**
 * Server health check
 */
async function checkServerHealth() {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: "GET",
      mode: "cors",
    });
    const data = await response.json();

    if (data.status === "ok") {
      elements.serverStatus.textContent = "Online";
      elements.serverBadge.className = "server-badge online";
    } else {
      throw new Error("Unhealthy");
    }
  } catch (error) {
    elements.serverStatus.textContent = "Offline";
    elements.serverBadge.className = "server-badge offline";
  }
}

/**
 * Analyze position
 */
async function analyzePosition() {
  const fen = game.fen();
  const depth = parseInt(elements.depthSlider.value);
  const multipv = parseInt(elements.linesSlider.value);

  elements.loading.classList.remove("hidden");
  elements.analysisLines.innerHTML = "";
  elements.btnAnalyze.disabled = true;
  hideError();

  try {
    const response = await fetch(`${API_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fen, depth, multipv }),
    });

    const data = await response.json();

    if (data.success) {
      displayResults(data.lines);
    } else {
      showError(data.error || "Analysis failed");
    }
  } catch (error) {
    showError(`Connection failed: ${error.message}`);
  } finally {
    elements.loading.classList.add("hidden");
    elements.btnAnalyze.disabled = false;
  }
}

/**
 * Display results
 */
function displayResults(lines) {
  if (!lines || lines.length === 0) {
    showError("No analysis lines returned");
    return;
  }

  elements.analysisLines.innerHTML = "";

  lines.forEach((line, index) => {
    const lineEl = createAnalysisLine(line, index + 1);
    elements.analysisLines.appendChild(lineEl);
  });

  updateEvalBar(lines[0].score);
}

function createAnalysisLine(line, num) {
  const div = document.createElement("div");
  div.className = "analysis-line";

  const score = line.score || 0;
  if (score > 50) div.classList.add("positive");
  else if (score < -50) div.classList.add("negative");
  else div.classList.add("neutral");

  const movesText = line.moves ? line.moves.join(" ") : "No moves";

  let scoreClass = "score-neutral";
  if (score > 50) scoreClass = "score-positive";
  else if (score < -50) scoreClass = "score-negative";

  div.innerHTML = `
        <div class="line-info">
            <div class="line-number">Line ${num}</div>
            <div class="line-moves">${movesText}</div>
        </div>
        <div class="line-score ${scoreClass}">${line.scoreText || "0.00"}</div>
    `;

  return div;
}

function updateEvalBar(score) {
  const cappedScore = Math.max(-1000, Math.min(1000, score || 0));
  const percentage = 50 + cappedScore / 20;

  elements.evalBar.style.width = `${percentage}%`;

  const displayScore = ((score || 0) / 100).toFixed(2);
  elements.evalText.textContent =
    score >= 0 ? `+${displayScore}` : displayScore;

  // Update score color class
  elements.evalText.className = "eval-score";
  if (score > 50) elements.evalText.classList.add("positive");
  else if (score < -50) elements.evalText.classList.add("negative");
}

function clearResults() {
  elements.analysisLines.innerHTML = "";
  elements.evalBar.style.width = "50%";
  elements.evalText.textContent = "0.00";
  elements.evalText.className = "eval-score";
}

function showError(message) {
  elements.errorDisplay.textContent = message;
  elements.errorDisplay.classList.remove("hidden");
}

function hideError() {
  elements.errorDisplay.classList.add("hidden");
}
