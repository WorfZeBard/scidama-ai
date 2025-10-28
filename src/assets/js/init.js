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

  function playSound(soundName) {
    const sound = window.sounds?.[soundName];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch((e) => console.log("Audio play failed:", e));
    }
  }

  // Setup UI labels
  const currentPlayerLabel = document.querySelector(".current-player-label");
  if (currentPlayerLabel) {
    currentPlayerLabel.setAttribute("data-player", currentPlayer);
  }

  // Initialize game
  initializeBoard();
  resetGame();

  const savedDepth = localStorage.getItem("aiDepth");
  if (savedDepth && [1, 3, 4, 6].includes(parseInt(savedDepth))) {
    aiDepth = parseInt(savedDepth);
    const select = document.getElementById("ai-difficulty");
    if (select) select.value = aiDepth;
  }

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
