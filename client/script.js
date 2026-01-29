document.addEventListener("DOMContentLoaded", () => {
  const moveInput = document.getElementById("move-input");
  const analyzeBtn = document.getElementById("analyze-btn");
  const historyList = document.getElementById("move-history");
  const historySection = document.getElementById("history-section");
  const resultSection = document.getElementById("result-section");
  const analysisResult = document.getElementById("analysis-result");
  const serverStatus = document.getElementById("server-status");

  let history = [];

  // Check server health
  fetch("http://localhost:5000/health")
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "ok") {
        serverStatus.textContent = "Server: Online";
        serverStatus.className = "status-online";
      } else {
        serverStatus.textContent = "Server: Offline";
        serverStatus.className = "status-offline";
      }
    })
    .catch(() => {
      serverStatus.textContent = "Server: Offline";
      serverStatus.className = "status-offline";
    });

  analyzeBtn.addEventListener("click", handleAnalyze);

  function handleAnalyze() {
    const move = moveInput.value.trim();
    if (!move) return;

    // Update history
    history.push(move);
    updateHistoryUI();

    // Placeholder analysis
    analysisResult.textContent = `Analysis for move '${move}': This is a placeholder result.`;
    resultSection.classList.remove("hidden");

    // Clear input
    moveInput.value = "";
  }

  function updateHistoryUI() {
    if (history.length > 0) {
      historySection.classList.remove("hidden");
    }
    historyList.innerHTML = history.map((m) => `<li>${m}</li>`).join("");
  }
});
