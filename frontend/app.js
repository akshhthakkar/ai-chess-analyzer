/**
 * AI Chess Analyzer - Frontend Application
 * =========================================
 * Handles board interaction, API communication, and UI updates.
 */

// Configuration
const API_URL = "http://localhost:5000";
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// State
let board = null;
let game = null;

// DOM Elements
const elements = {
  board: null,
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
  results: null,
  analysisLines: null,
  evalBar: null,
  evalText: null,
  turnDisplay: null,
  serverStatus: null,
  errorDisplay: null,
};

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing AI Chess Analyzer...");
  try {
    initElements();
    initChessboard();
    initEventListeners();
    checkServerHealth();
    console.log("Initialization complete!");
  } catch (error) {
    console.error("Initialization error:", error);
    alert("Error initializing: " + error.message);
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
  elements.results = document.getElementById("results");
  elements.analysisLines = document.getElementById("analysis-lines");
  elements.evalBar = document.getElementById("eval-bar");
  elements.evalText = document.getElementById("eval-text");
  elements.turnDisplay = document.getElementById("turn-display");
  elements.serverStatus = document.getElementById("server-status");
  elements.errorDisplay = document.getElementById("error-display");
  console.log("DOM elements cached");
}

/**
 * Initialize the chessboard with drag-and-drop
 */
function initChessboard() {
  // Check if Chess is available
  if (typeof Chess === "undefined") {
    throw new Error("Chess.js library not loaded");
  }

  // Check if Chessboard is available
  if (typeof Chessboard === "undefined") {
    throw new Error("Chessboard.js library not loaded");
  }

  // Initialize chess.js for game logic
  game = new Chess();
  console.log("Chess.js initialized");

  // Piece theme function - returns URL for each piece (local images)
  const pieceTheme = function (piece) {
    return "img/chesspieces/wikipedia/" + piece + ".png";
  };

  // Chessboard.js configuration
  const config = {
    draggable: true,
    position: "start",
    pieceTheme: pieceTheme,
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
  };

  board = Chessboard("board", config);
  console.log("Chessboard.js initialized");

  // Make board responsive
  window.addEventListener("resize", () => board.resize());

  updateFenInput();
  updateTurnIndicator();
}

/**
 * Called when a piece drag starts
 * @returns {boolean} Whether the drag should be allowed
 */
function onDragStart(source, piece, position, orientation) {
  // Don't allow moves if game is over
  if (game.game_over()) return false;

  // Only allow moving pieces of the current turn
  if (
    (game.turn() === "w" && piece.search(/^b/) !== -1) ||
    (game.turn() === "b" && piece.search(/^w/) !== -1)
  ) {
    return false;
  }

  return true;
}

/**
 * Called when a piece is dropped
 * @returns {string} 'snapback' if the move is invalid
 */
function onDrop(source, target) {
  // Attempt the move
  const move = game.move({
    from: source,
    to: target,
    promotion: "q", // Always promote to queen for simplicity
  });

  // If invalid, snap back
  if (move === null) return "snapback";

  updateFenInput();
  updateTurnIndicator();
}

/**
 * Called after the piece snap animation completes
 */
function onSnapEnd() {
  board.position(game.fen());
}

/**
 * Set up event listeners for controls
 */
function initEventListeners() {
  // Sliders
  elements.depthSlider.addEventListener("input", (e) => {
    elements.depthValue.textContent = e.target.value;
  });

  elements.linesSlider.addEventListener("input", (e) => {
    elements.linesValue.textContent = e.target.value;
  });

  // Board control buttons
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

  // FEN load button
  elements.btnLoadFen.addEventListener("click", loadFenFromInput);

  // FEN input Enter key
  elements.fenInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") loadFenFromInput();
  });

  // Analyze button
  elements.btnAnalyze.addEventListener("click", analyzePosition);

  console.log("Event listeners attached");
}

/**
 * Load position from FEN input field
 */
function loadFenFromInput() {
  const fen = elements.fenInput.value.trim();

  if (!fen) {
    showError("Please enter a FEN position");
    return;
  }

  // Try to load the FEN - chess.js will validate it
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

  // Update board display
  board.position(game.fen());
  updateTurnIndicator();
  clearResults();
  hideError();
}

/**
 * Update FEN input field with current position
 */
function updateFenInput() {
  elements.fenInput.value = game.fen();
}

/**
 * Update the turn indicator
 */
function updateTurnIndicator() {
  const turn = game.turn();
  elements.turnDisplay.textContent = turn === "w" ? "White" : "Black";
  elements.turnDisplay.className = turn === "w" ? "turn-white" : "turn-black";
}

/**
 * Check if the backend server is running
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
      elements.serverStatus.className = "status-online";
      console.log("Server is online");
    } else {
      throw new Error("Server unhealthy");
    }
  } catch (error) {
    console.error("Server health check failed:", error);
    elements.serverStatus.textContent = "Offline";
    elements.serverStatus.className = "status-offline";
  }
}

/**
 * Analyze the current position
 */
async function analyzePosition() {
  const fen = game.fen();
  const depth = parseInt(elements.depthSlider.value);
  const multipv = parseInt(elements.linesSlider.value);

  console.log("Analyzing position:", fen, "depth:", depth, "lines:", multipv);

  // Show loading, hide results
  elements.loading.classList.remove("hidden");
  elements.results.classList.add("hidden");
  elements.btnAnalyze.disabled = true;
  hideError();

  try {
    const response = await fetch(`${API_URL}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fen, depth, multipv }),
    });

    const data = await response.json();
    console.log("Analysis response:", data);

    if (data.success) {
      displayResults(data.lines);
    } else {
      showError(data.error || "Analysis failed");
    }
  } catch (error) {
    console.error("Analysis error:", error);
    showError(`Connection failed: ${error.message}`);
  } finally {
    elements.loading.classList.add("hidden");
    elements.btnAnalyze.disabled = false;
  }
}

/**
 * Display analysis results
 * @param {Array} lines - Analysis lines from the API
 */
function displayResults(lines) {
  if (!lines || lines.length === 0) {
    showError("No analysis lines returned");
    return;
  }

  // Clear previous results
  elements.analysisLines.innerHTML = "";

  // Display each line
  lines.forEach((line, index) => {
    const lineEl = createAnalysisLine(line, index + 1);
    elements.analysisLines.appendChild(lineEl);
  });

  // Update evaluation bar with first line's score
  updateEvalBar(lines[0].score);

  // Show results section
  elements.results.classList.remove("hidden");
}

/**
 * Create HTML element for a single analysis line
 * @param {Object} line - Analysis line data
 * @param {number} num - Line number (1-indexed)
 * @returns {HTMLElement}
 */
function createAnalysisLine(line, num) {
  const div = document.createElement("div");
  div.className = "analysis-line";

  // Determine positivity class
  const score = line.score || 0;
  if (score > 50) {
    div.classList.add("positive");
  } else if (score < -50) {
    div.classList.add("negative");
  } else {
    div.classList.add("neutral");
  }

  // Format moves display
  const movesText = line.moves ? line.moves.join(" ") : "No moves";

  // Score styling
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

/**
 * Update the visual evaluation bar
 * @param {number} score - Score in centipawns
 */
function updateEvalBar(score) {
  // Cap score at ±1000 centipawns (±10 pawns) for display
  const cappedScore = Math.max(-1000, Math.min(1000, score || 0));

  // Convert to percentage (0% = -10, 50% = 0, 100% = +10)
  const percentage = 50 + cappedScore / 20;

  elements.evalBar.style.width = `${percentage}%`;

  // Update text
  const displayScore = ((score || 0) / 100).toFixed(2);
  elements.evalText.textContent =
    score >= 0 ? `+${displayScore}` : displayScore;

  // Color the text
  if (score > 50) {
    elements.evalText.style.color = "#28a745";
  } else if (score < -50) {
    elements.evalText.style.color = "#dc3545";
  } else {
    elements.evalText.style.color = "#4a5568";
  }
}

/**
 * Clear all analysis results
 */
function clearResults() {
  elements.results.classList.add("hidden");
  elements.analysisLines.innerHTML = "";
  elements.evalBar.style.width = "50%";
  elements.evalText.textContent = "0.00";
  elements.evalText.style.color = "#4a5568";
}

/**
 * Show an error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  elements.errorDisplay.textContent = message;
  elements.errorDisplay.classList.remove("hidden");
}

/**
 * Hide the error display
 */
function hideError() {
  elements.errorDisplay.classList.add("hidden");
}
