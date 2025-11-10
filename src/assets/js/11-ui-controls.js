function togglePieceTransparency() {
  piecesTransparent = !piecesTransparent;
  const toggleBtn = document.getElementById("toggle-transparency");
  const pieces = document.querySelectorAll(".piece");
  if (piecesTransparent) {
    pieces.forEach((p) => p.classList.add("transparent"));
    toggleBtn.textContent = "Hide Symbols";
    toggleBtn.classList.add("active");
  } else {
    pieces.forEach((p) => p.classList.remove("transparent"));
    toggleBtn.textContent = "Show Symbols";
    toggleBtn.classList.remove("active");
  }
}

function setupDebugControls() {
  const toggle = document.getElementById("debug-toggle");
  const reset = document.getElementById("reset-board");
  const endGameBtn = document.getElementById("end-game");
  const surrenderBtn = document.getElementById("surrender");
  const agreeBtn = document.getElementById("agree-finish");
  const undoBtn = document.getElementById("undo");
  const redoBtn = document.getElementById("redo");
  const replayBtn = document.getElementById("replay");
  const stopReplayBtn = document.getElementById("stop-replay");
  const transparencyBtn = document.getElementById("toggle-transparency");
  const backToMenuBtn = document.getElementById("back-to-menu");
  const darkModeBtn = document.getElementById("toggle-dark-mode");
  const difficultySelect = document.getElementById("ai-difficulty");
  const rotateBtn = document.getElementById("rotate-board-180");
  const boardWrapper = document.querySelector(".board-wrapper");
  const howToPlayBtn = document.getElementById("how-to-play");
  if (howToPlayBtn) {
    howToPlayBtn.addEventListener("click", () => {
      const modal = document.getElementById("how-to-play-modal");
      if (modal) modal.hidden = false;
    });
  }

  // Universal modal close
  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.closest(".modal").hidden = true;
    });
  });

  if (rotateBtn && boardWrapper) {
    rotateBtn.addEventListener("click", () => {
      boardWrapper.classList.toggle("rotated");
      // Optional: update button text
      rotateBtn.textContent = boardWrapper.classList.contains("rotated")
        ? "Unrotate Board"
        : "Rotate Board";
    });
  }

  if (difficultySelect) {
    difficultySelect.addEventListener("change", (e) => {
      const newDepth = parseInt(e.target.value, 10);
      window.aiDepth = newDepth; // ✅ set global
      localStorage.setItem("aiDepth", String(newDepth)); // ✅ store as string

      const difficultyDisplay = document.getElementById(
        "ai-difficulty-display"
      );
      if (difficultyDisplay) {
        const labels = { 2: "Easy", 3: "Medium", 4: "Hard", 6: "Expert" };
        difficultyDisplay.textContent = labels[newDepth] || "Custom";
      }

      // Also sync the <select> element itself (optional but good)
      difficultySelect.value = newDepth;
    });
  }

  if (toggle) {
    toggle.addEventListener("click", () => {
      debugMode = !debugMode;
      toggle.textContent = `Debug Mode: ${debugMode ? "ON" : "OFF"}`;
      toggle.classList.toggle("debug-on", debugMode);
      resetGame();
    });
  }
  if (reset) {
    reset.addEventListener("click", () =>
      showConfirmationModal(
        "Are you sure you want to reset the board?",
        resetGame
      )
    );
  }
  if (endGameBtn) {
    endGameBtn.addEventListener("click", () =>
      showConfirmationModal("End the game manually?", () =>
        endGame("Game ended manually")
      )
    );
  }
  if (surrenderBtn) {
    surrenderBtn.addEventListener("click", () => {
      if (gameOver) return;
      showConfirmationModal(
        `Are you sure you want to surrender as ${currentPlayer}?`,
        () => {
          surrenderRequested = currentPlayer;
          checkGameOver();
        }
      );
    });
  }
  if (agreeBtn) {
    agreeBtn.addEventListener("click", () => {
      if (gameOver) return;
      showConfirmationModal("Do both players agree to end the game?", () => {
        endGame("Game ended by mutual agreement.");
      });
    });
  }
  if (undoBtn) undoBtn.addEventListener("click", undoMove);
  if (redoBtn) redoBtn.addEventListener("click", redoMove);
  if (replayBtn)
    replayBtn.addEventListener("click", () =>
      showConfirmationModal("Start replay from beginning?", () =>
        startReplay(1000)
      )
    );
  if (stopReplayBtn) stopReplayBtn.addEventListener("click", stopReplay);
  if (transparencyBtn)
    transparencyBtn.addEventListener("click", togglePieceTransparency);
  if (backToMenuBtn) {
    backToMenuBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showConfirmationModal(
        "Return to main menu? Current game will be lost.",
        () => {
          const currentDir = window.location.href.substring(
            0,
            window.location.href.lastIndexOf("/")
          );
          const menuPath = currentDir.split("src")[0] + "src/index.html";
          window.location.href = menuPath;
        }
      );
    });
  }
  if (darkModeBtn) {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    let isDark =
      savedTheme === "dark" || (savedTheme !== "light" && systemPrefersDark);
    function applyTheme(dark) {
      if (dark) document.body.setAttribute("data-theme", "dark");
      else document.body.removeAttribute("data-theme");
    }
    function updateButtonLabel() {
      darkModeBtn.textContent = isDark ? "Light Mode" : "Dark Mode";
    }
    applyTheme(isDark);
    updateButtonLabel();
    darkModeBtn.addEventListener("click", () => {
      isDark = !isDark;
      applyTheme(isDark);
      updateButtonLabel();
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }
}

function showConfirmationModal(message, onConfirm) {
  const modal = document.getElementById("confirmation-modal");
  const messageEl = document.getElementById("confirmation-message");
  const yesBtn = document.getElementById("confirm-yes");
  const noBtn = document.getElementById("confirm-no");
  if (!modal || !messageEl || !yesBtn || !noBtn) {
    if (confirm(message)) onConfirm();
    return;
  }
  messageEl.textContent = message;
  modal.hidden = false;
  const close = () => {
    modal.hidden = true;
    yesBtn.onclick = null;
    noBtn.onclick = null;
  };
  yesBtn.onclick = () => {
    close();
    if (onConfirm) onConfirm();
  };
  noBtn.onclick = close;
  yesBtn.focus();
}
