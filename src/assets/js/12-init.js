document.addEventListener("DOMContentLoaded", () => {
  // Assign DOM references
  gameboard = document.getElementById("gameboard");
  redScoreEl = document.getElementById("red-score");
  blueScoreEl = document.getElementById("blue-score");
  currentPlayerEl = document.getElementById("current-player");
  errorMessageEl = document.getElementById("error-message");
  sessionEl = document.getElementById("session-time");
  roundEl = document.getElementById("round-time");

  // Ensure all required elements exist
  if (!gameboard || !redScoreEl || !blueScoreEl || !currentPlayerEl) {
    console.error("Missing critical DOM elements. Check your HTML.");
    return;
  }

  // Initialize sounds
  sounds = {
    move: document.getElementById("move-sound"),
    capture: document.getElementById("capture-sound"),
    promotion: document.getElementById("move-promotion001"),
    gameStart: document.getElementById("game-start"),
    gameEnd: document.getElementById("game-end"),
  };

  // Setup UI labels
  const currentPlayerLabel = document.querySelector(".current-player-label");
  if (currentPlayerLabel) {
    currentPlayerLabel.setAttribute("data-player", currentPlayer);
  }

  const savedDepth = localStorage.getItem("aiDepth");
  let loadedDepth = 1;
  if (savedDepth) {
    const parsed = parseInt(savedDepth, 10);
    if ([2, 3, 4, 6].includes(parsed)) {
      loadedDepth = parsed;
    }
  }
  window.aiDepth = loadedDepth;

  // Now update display using window.aiDepth
  const difficultyDisplay = document.getElementById("ai-difficulty-display");
  if (difficultyDisplay) {
    const labels = { 2: "Easy", 3: "Medium", 4: "Hard", 6: "Expert" };
    difficultyDisplay.textContent = labels[window.aiDepth] || "Custom";
  }

  // Sync the <select> dropdown
  const difficultySelect = document.getElementById("ai-difficulty");
  if (difficultySelect) {
    difficultySelect.value = window.aiDepth;
  }

  attachInputHandlers();
  resetGame();

  setupDebugControls();
  localStorage.removeItem("aiDifficulty");

  // Sidebar toggle
  const toggleBtn = document.getElementById("toggle-controls");
  const sidebar = document.querySelector(".controls-sidebar");
  if (toggleBtn && sidebar) {
    const isCollapsed =
      localStorage.getItem("controlsSidebarCollapsed") === "true";
    if (isCollapsed) sidebar.classList.add("collapsed");
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      localStorage.setItem(
        "controlsSidebarCollapsed",
        sidebar.classList.contains("collapsed")
      );
    });
  }
});
