/**
 * Chess Analyzer Pro - Game Analysis Frontend
 */

const API_URL = "http://localhost:5000";

// State
let board = null;
let game = null;
let gameHistory = []; // Array of {fen, move, classification, eval, ...}
let currentMoveIndex = -1; // -1 = starting position
let analysisResult = null;

// Elements
const el = {};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  initElements();
  initChessboard();
  initEventListeners();
  checkServerHealth();
  setInterval(checkServerHealth, 30000);

  // Restore saved state
  restoreState();
});

// State persistence
function saveState() {
  const state = {
    gameHistory: gameHistory,
    currentMoveIndex: currentMoveIndex,
    analysisResult: analysisResult,
    pgnText: el.pgnInput ? el.pgnInput.value : "",
  };
  localStorage.setItem("chessAnalyzerState", JSON.stringify(state));
}

function restoreState() {
  try {
    const saved = localStorage.getItem("chessAnalyzerState");
    if (!saved) return;

    const state = JSON.parse(saved);

    if (state.pgnText && el.pgnInput) {
      el.pgnInput.value = state.pgnText;
    }

    if (state.gameHistory && state.gameHistory.length > 0) {
      gameHistory = state.gameHistory;
      analysisResult = state.analysisResult;
      currentMoveIndex = state.currentMoveIndex || -1;

      // Replay moves to current position
      game.reset();
      for (let i = 0; i <= currentMoveIndex && i < gameHistory.length; i++) {
        if (gameHistory[i]) {
          game.move(gameHistory[i].move);
        }
      }

      board.position(game.fen());
      updateMoveList();

      if (analysisResult) {
        displayReport(analysisResult);
      }

      console.log("State restored:", gameHistory.length, "moves");
    }
  } catch (e) {
    console.log("Could not restore state:", e);
  }
}

function clearState() {
  localStorage.removeItem("chessAnalyzerState");
}

function initElements() {
  // Board navigation
  el.btnStart = document.getElementById("btn-start");
  el.btnPrev = document.getElementById("btn-prev");
  el.btnNext = document.getElementById("btn-next");
  el.btnEnd = document.getElementById("btn-end");
  el.btnFlip = document.getElementById("btn-flip");

  // Evaluation
  el.evalBar = document.getElementById("eval-bar");
  el.evalText = document.getElementById("eval-text");

  // Tabs
  el.tabBtns = document.querySelectorAll(".tab-btn");
  el.tabContents = document.querySelectorAll(".tab-content");

  // Moves tab
  el.pgnInput = document.getElementById("pgn-input");
  el.btnLoadPgn = document.getElementById("btn-load-pgn");
  el.btnAnalyzeGame = document.getElementById("btn-analyze-game");
  el.moveList = document.getElementById("move-list");

  // Engine tab
  el.depthSlider = document.getElementById("depth-slider");
  el.depthValue = document.getElementById("depth-value");
  el.depthDisplay = document.getElementById("depth-display");
  el.linesSlider = document.getElementById("lines-slider");
  el.linesValue = document.getElementById("lines-value");
  el.btnAnalyze = document.getElementById("btn-analyze");
  el.loading = document.getElementById("loading");
  el.analysisLines = document.getElementById("analysis-lines");

  // Coach elements
  el.btnAskCoach = document.getElementById("btn-ask-coach");
  el.coachSuggestion = document.getElementById("coach-suggestion");
  el.coachMove = document.getElementById("coach-move");
  el.btnCloseCoach = document.getElementById("btn-close-coach");
  el.coachExplanation = document.getElementById("coach-explanation");

  // Report tab
  el.reportContent = document.getElementById("report-content");

  // Explanation panel
  el.explanationPanel = document.getElementById("explanation-panel");
  el.btnClosePanel = document.getElementById("btn-close-panel");
  el.expMoveName = document.getElementById("exp-move-name");
  el.expClassification = document.getElementById("exp-classification");
  el.expDescription = document.getElementById("exp-description");
  el.expImpact = document.getElementById("exp-impact");
  el.expBestSection = document.getElementById("exp-best-section");
  el.expBestMove = document.getElementById("exp-best-move");
  el.expBestDescription = document.getElementById("exp-best-description");
  el.expBestImpact = document.getElementById("exp-best-impact");
  el.expReason = document.getElementById("exp-reason");

  // Status
  el.serverBadge = document.getElementById("server-badge");
  el.serverStatus = document.getElementById("server-status");
  el.errorDisplay = document.getElementById("error-display");
}

function initChessboard() {
  if (typeof Chess === "undefined" || typeof Chessboard === "undefined") {
    console.error("Libraries not loaded");
    return;
  }

  game = new Chess();

  board = Chessboard("board", {
    draggable: true,
    position: "start",
    pieceTheme: (piece) => "img/chesspieces/wikipedia/" + piece + ".png",
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
  });

  window.addEventListener("resize", () => board.resize());
}

function onDragStart(source, piece) {
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
  const move = game.move({ from: source, to: target, promotion: "q" });
  if (move === null) return "snapback";

  // Handle branching - remove future moves if we're in the middle of a game
  if (currentMoveIndex < gameHistory.length - 1) {
    gameHistory = gameHistory.slice(0, currentMoveIndex + 1);
  }

  // Clear stale analysis since game changed
  analysisResult = null;
  hideExplanation();

  // Add to game history
  gameHistory.push({
    fen: game.fen(),
    move: move.san,
    moveNumber: Math.ceil(game.history().length / 2),
    isWhite: move.color === "w",
  });
  currentMoveIndex = gameHistory.length - 1;

  updateMoveList();
  updateEvalBar(0); // Reset eval
  saveState();
}

function onSnapEnd() {
  board.position(game.fen());
}

function initEventListeners() {
  // Tab switching
  el.tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      el.tabBtns.forEach((b) => b.classList.remove("active"));
      el.tabContents.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    });
  });

  // Move navigation
  el.btnStart.addEventListener("click", () => goToMove(-1));
  el.btnPrev.addEventListener("click", () => goToMove(currentMoveIndex - 1));
  el.btnNext.addEventListener("click", () => goToMove(currentMoveIndex + 1));
  el.btnEnd.addEventListener("click", () => goToMove(gameHistory.length - 1));
  el.btnFlip.addEventListener("click", () => board.flip());

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") goToMove(currentMoveIndex - 1);
    if (e.key === "ArrowRight") goToMove(currentMoveIndex + 1);
    if (e.key === "Home") goToMove(-1);
    if (e.key === "End") goToMove(gameHistory.length - 1);
  });

  // PGN loading
  el.btnLoadPgn.addEventListener("click", loadPgn);
  el.btnAnalyzeGame.addEventListener("click", analyzeFullGame);

  // Engine sliders
  el.depthSlider.addEventListener("input", (e) => {
    el.depthValue.textContent = e.target.value;
    el.depthDisplay.textContent = e.target.value;
  });
  el.linesSlider.addEventListener("input", (e) => {
    el.linesValue.textContent = e.target.value;
  });

  // Position analysis
  el.btnAnalyze.addEventListener("click", analyzePosition);

  // Explanation panel
  if (el.btnClosePanel) {
    el.btnClosePanel.addEventListener("click", hideExplanation);
  }

  // AI Coach
  if (el.btnAskCoach) {
    el.btnAskCoach.addEventListener("click", askCoach);
  }
  if (el.btnCloseCoach) {
    el.btnCloseCoach.addEventListener("click", () => {
      el.coachSuggestion.classList.add("hidden");
    });
  }
}

function goToMove(index) {
  if (index < -1) index = -1;
  if (index >= gameHistory.length) index = gameHistory.length - 1;

  currentMoveIndex = index;

  // Reset to starting position
  game.reset();

  // Replay moves up to current index
  for (let i = 0; i <= currentMoveIndex; i++) {
    if (gameHistory[i]) {
      game.move(gameHistory[i].move);
    }
  }

  board.position(game.fen());
  highlightCurrentMove();

  // Update eval if we have analysis
  if (analysisResult && currentMoveIndex >= 0) {
    const moveData = analysisResult.moves[currentMoveIndex];
    if (moveData) {
      updateEvalBar(moveData.eval);
      displayExplanation(moveData);
    }
  } else {
    updateEvalBar(0);
    hideExplanation();
  }
}

function displayExplanation(moveData) {
  if (!moveData.explanation) {
    hideExplanation();
    return;
  }

  const exp = moveData.explanation;

  // Show panel
  el.explanationPanel.classList.remove("hidden");

  // Move name and classification
  el.expMoveName.textContent = moveData.move;
  el.expClassification.textContent = moveData.classification;
  el.expClassification.className =
    "explanation-badge " + moveData.classification;

  // Your move explanation (start with template)
  el.expDescription.textContent =
    exp.description || "No description available.";
  el.expImpact.textContent = exp.impact || "";

  // Best move (if different)
  if (moveData.bestMoveExplanation && moveData.bestMove !== moveData.move) {
    el.expBestSection.classList.remove("hidden");
    el.expBestMove.textContent = moveData.bestMove;
    el.expBestDescription.textContent =
      moveData.bestMoveExplanation.description || "";
    el.expBestImpact.textContent = moveData.bestMoveExplanation.impact || "";
  } else {
    el.expBestSection.classList.add("hidden");
  }

  // Classification reason
  el.expReason.textContent = exp.classificationReason || "";

  // Fetch AI explanation (async)
  fetchGeminiExplanation(moveData);
}

async function fetchGeminiExplanation(moveData) {
  try {
    // Get FEN for current position (before this move)
    const tempGame = new Chess();
    for (let i = 0; i < currentMoveIndex; i++) {
      if (gameHistory[i]) {
        tempGame.move(gameHistory[i].move);
      }
    }
    const fen = tempGame.fen();

    const res = await fetch(`${API_URL}/api/explain-move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fen: fen,
        move: moveData.move,
        isWhite: moveData.isWhite,
        classification: moveData.classification,
        bestMove: moveData.bestMove,
        cpLoss: moveData.cpLoss || 0,
      }),
    });

    const data = await res.json();

    if (data.success && data.explanation) {
      // Update with AI explanation
      el.expDescription.innerHTML = formatAIExplanation(data.explanation);
      el.expImpact.textContent = "";
      el.expBestSection.classList.add("hidden");
      el.expReason.innerHTML = `<span style="color: var(--accent); font-size: 10px;">✨ AI Coach</span>`;
    }
  } catch (e) {
    console.log("Gemini fallback to template:", e);
  }
}

function formatAIExplanation(text) {
  // Clean and format AI response
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function hideExplanation() {
  if (el.explanationPanel) {
    el.explanationPanel.classList.add("hidden");
  }
}

function highlightCurrentMove() {
  document
    .querySelectorAll(".move-cell")
    .forEach((c) => c.classList.remove("active"));
  const activeCell = document.querySelector(
    `.move-cell[data-index="${currentMoveIndex}"]`,
  );
  if (activeCell) {
    activeCell.classList.add("active");
    activeCell.scrollIntoView({ block: "nearest" });
  }
}

function loadPgn() {
  const input = el.pgnInput.value.trim();
  if (!input) {
    showError("Please paste PGN or moves");
    return;
  }

  // Reset
  game.reset();
  gameHistory = [];
  currentMoveIndex = -1;
  analysisResult = null;

  // Try to parse as PGN first
  try {
    // Remove PGN headers and comments
    let movesText = input
      .replace(/\[.*?\]/g, "") // Remove [headers]
      .replace(/\{.*?\}/g, "") // Remove {comments}
      .replace(/\(.*?\)/g, "") // Remove (variations)
      .replace(/\d+\.\.\./g, "") // Remove move numbers with ...
      .replace(/\d+\./g, " ") // Remove move numbers
      .replace(/1-0|0-1|1\/2-1\/2|\*/g, "") // Remove result
      .trim();

    const moves = movesText.split(/\s+/).filter((m) => m.length > 0);

    for (const move of moves) {
      try {
        const result = game.move(move);
        if (result) {
          gameHistory.push({
            fen: game.fen(),
            move: result.san,
            moveNumber: Math.ceil(game.history().length / 2),
            isWhite: result.color === "w",
          });
        }
      } catch (e) {
        console.warn("Invalid move:", move);
      }
    }

    if (gameHistory.length === 0) {
      showError("Could not parse any moves");
      return;
    }

    currentMoveIndex = gameHistory.length - 1;
    board.position(game.fen());
    updateMoveList();
    hideError();
    saveState(); // Persist to localStorage
  } catch (e) {
    showError("Failed to parse PGN: " + e.message);
  }
}

function updateMoveList() {
  el.moveList.innerHTML = "";

  let currentNumber = 0;
  for (let i = 0; i < gameHistory.length; i++) {
    const move = gameHistory[i];

    // Add move number
    if (move.isWhite) {
      currentNumber = move.moveNumber;
      const numEl = document.createElement("div");
      numEl.className = "move-num";
      numEl.textContent = currentNumber + ".";
      el.moveList.appendChild(numEl);
    }

    // Add move cell
    const cell = document.createElement("div");
    cell.className = "move-cell";
    cell.dataset.index = i;
    cell.textContent = move.move;

    if (move.classification) {
      cell.classList.add(move.classification);
    }

    if (i === currentMoveIndex) {
      cell.classList.add("active");
    }

    cell.addEventListener("click", () => goToMove(i));
    el.moveList.appendChild(cell);

    // Add placeholder for black if white move is last
    if (move.isWhite && i === gameHistory.length - 1) {
      const placeholder = document.createElement("div");
      placeholder.className = "move-cell";
      placeholder.textContent = "...";
      placeholder.style.opacity = "0.3";
      el.moveList.appendChild(placeholder);
    }
  }
}

async function analyzeFullGame() {
  if (gameHistory.length === 0) {
    showError("Load a game first");
    return;
  }

  const moves = gameHistory.map((m) => m.move);
  const depth = parseInt(el.depthSlider.value);

  el.btnAnalyzeGame.disabled = true;
  el.btnAnalyzeGame.textContent = "Analyzing...";
  el.loading.classList.remove("hidden");
  hideError();

  try {
    const response = await fetch(`${API_URL}/api/analyze-game`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moves, depth }),
    });

    const data = await response.json();

    if (data.success) {
      analysisResult = data;

      // Update gameHistory with classifications
      for (let i = 0; i < data.moves.length; i++) {
        if (gameHistory[i]) {
          gameHistory[i].classification = data.moves[i].classification;
          gameHistory[i].eval = data.moves[i].eval;
          gameHistory[i].cpLoss = data.moves[i].cpLoss;
        }
      }

      updateMoveList();
      displayReport(data);

      // Switch to report tab
      el.tabBtns.forEach((b) => b.classList.remove("active"));
      el.tabContents.forEach((c) => c.classList.remove("active"));
      document.querySelector('[data-tab="report"]').classList.add("active");
      document.getElementById("tab-report").classList.add("active");

      saveState(); // Persist analysis results
    } else {
      showError(data.error || "Analysis failed");
    }
  } catch (e) {
    showError("Connection failed: " + e.message);
  } finally {
    el.btnAnalyzeGame.disabled = false;
    el.btnAnalyzeGame.textContent = "Analyze Game";
    el.loading.classList.add("hidden");
  }
}

function displayReport(data) {
  const { accuracy, summary } = data;

  el.reportContent.innerHTML = `
        <div class="accuracy-display">
            <div class="accuracy-item">
                <div class="accuracy-label">White</div>
                <div class="accuracy-value white">${accuracy.white}%</div>
            </div>
            <div class="accuracy-item">
                <div class="accuracy-label">Black</div>
                <div class="accuracy-value black">${accuracy.black}%</div>
            </div>
        </div>
        
        <table class="classification-table">
            <thead>
                <tr>
                    <th>Classification</th>
                    <th>White</th>
                    <th>Black</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="class-best">Best</td>
                    <td>${summary.white.best}</td>
                    <td>${summary.black.best}</td>
                </tr>
                <tr>
                    <td class="class-excellent">Excellent</td>
                    <td>${summary.white.excellent}</td>
                    <td>${summary.black.excellent}</td>
                </tr>
                <tr>
                    <td class="class-good">Good</td>
                    <td>${summary.white.good}</td>
                    <td>${summary.black.good}</td>
                </tr>
                <tr>
                    <td class="class-inaccuracy">Inaccuracy</td>
                    <td>${summary.white.inaccuracy}</td>
                    <td>${summary.black.inaccuracy}</td>
                </tr>
                <tr>
                    <td class="class-mistake">Mistake</td>
                    <td>${summary.white.mistake}</td>
                    <td>${summary.black.mistake}</td>
                </tr>
                <tr>
                    <td class="class-blunder">Blunder</td>
                    <td>${summary.white.blunder}</td>
                    <td>${summary.black.blunder}</td>
                </tr>
            </tbody>
        </table>
    `;
}

async function analyzePosition() {
  const fen = game.fen();
  const depth = parseInt(el.depthSlider.value);
  const multipv = parseInt(el.linesSlider.value);

  el.loading.classList.remove("hidden");
  el.analysisLines.innerHTML = "";
  el.btnAnalyze.disabled = true;
  hideError();

  try {
    const res = await fetch(`${API_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fen, depth, multipv }),
    });

    const data = await res.json();

    if (data.success) {
      displayAnalysisLines(data.lines);
      updateEvalBar(data.lines[0].score);
    } else {
      showError(data.error || "Analysis failed");
    }
  } catch (e) {
    showError("Connection failed");
  } finally {
    el.loading.classList.add("hidden");
    el.btnAnalyze.disabled = false;
  }
}

function displayAnalysisLines(lines) {
  el.analysisLines.innerHTML = "";

  lines.forEach((line, i) => {
    const div = document.createElement("div");
    div.className = "analysis-line";

    const score = line.score || 0;
    if (score > 50) div.classList.add("positive");
    else if (score < -50) div.classList.add("negative");

    const moves = line.moves ? line.moves.join(" ") : "";

    let scoreClass = "";
    if (score > 50) scoreClass = "score-positive";
    else if (score < -50) scoreClass = "score-negative";

    div.innerHTML = `
            <div class="line-rank">${i + 1}</div>
            <div class="line-content">
                <div class="line-moves">${moves}</div>
            </div>
            <div class="line-score ${scoreClass}">${line.scoreText || "0.00"}</div>
        `;

    el.analysisLines.appendChild(div);
  });
}

function updateEvalBar(score) {
  const capped = Math.max(-1000, Math.min(1000, score || 0));
  const pct = 50 + capped / 20;

  el.evalBar.style.width = pct + "%";

  const display = ((score || 0) / 100).toFixed(2);
  el.evalText.textContent = score >= 0 ? "+" + display : display;

  el.evalText.className = "eval-score";
  if (score > 50) el.evalText.classList.add("positive");
  else if (score < -50) el.evalText.classList.add("negative");
}

async function checkServerHealth() {
  try {
    const res = await fetch(`${API_URL}/health`);
    const data = await res.json();

    if (data.status === "ok") {
      el.serverStatus.textContent = "Online";
      el.serverBadge.className = "status-indicator online";
    } else {
      throw new Error();
    }
  } catch {
    el.serverStatus.textContent = "Offline";
    el.serverBadge.className = "status-indicator";
  }
}

function showError(msg) {
  el.errorDisplay.textContent = msg;
  el.errorDisplay.classList.remove("hidden");
}

function hideError() {
  el.errorDisplay.classList.add("hidden");
}

async function askCoach() {
  if (game.game_over()) {
    showError("Game is over!");
    return;
  }

  el.btnAskCoach.disabled = true;
  el.btnAskCoach.innerHTML = '<span class="btn-icon">🔄</span> Analyzing...';
  el.coachSuggestion.classList.add("hidden");

  try {
    const fen = game.fen();

    const response = await fetch(`${API_URL}/api/suggest-move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fen: fen }),
    });

    const data = await response.json();

    if (data.success) {
      el.coachSuggestion.classList.remove("hidden");
      el.coachMove.textContent = data.suggestion;
      el.coachExplanation.innerHTML = formatAIExplanation(data.explanation);
    } else {
      showError(data.error || "Coach failed to help");
    }
  } catch (e) {
    showError("Could not ask coach: " + e.message);
  } finally {
    el.btnAskCoach.disabled = false;
    el.btnAskCoach.innerHTML =
      '<span class="btn-icon">✨</span> Analyze Position';
  }
}
