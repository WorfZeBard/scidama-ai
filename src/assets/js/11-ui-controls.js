function placeInitialPieces() {
  document.querySelectorAll(".piece").forEach((p) => p.remove());
  const setup = debugMode ? DEBUG_SETUP : INITIAL_SETUP;
  for (const pos in setup) {
    const [row, col] = pos.split(",").map(Number);
    const pieceKey = setup[pos];
    const pieceData = PIECES[pieceKey];
    if (!pieceData) continue;
    const square = document.querySelector(
      `.square[data-row='${row}'][data-col='${col}']`
    );
    if (!square || !square.classList.contains("playable")) continue;
    const piece = document.createElement("div");
    piece.classList.add("piece", pieceData.color);
    piece.setAttribute("tabindex", "0");
    piece.draggable = true;
    piece.dataset.value = pieceData.value;
    const label = document.createElement("span");
    label.classList.add("piece-number");
    label.textContent = pieceData.value;
    piece.appendChild(label);
    square.appendChild(piece);
  }
  const initialState = saveBoardState();
  moveHistoryStates = [initialState];
  turnHistory = [];
  currentTurnIndex = -1;
  currentTurnStartState = null;
  isTurnActive = false;
  currentHistoryIndex = -1;
  updateMoveHistoryDOM();
}

function resetGame() {
  redScore = 0.0;
  blueScore = 0.0;
  redScoreEl.textContent = "0.00";
  blueScoreEl.textContent = "0.00";
  currentPlayer = "red";
  currentPlayerEl.textContent = "red";
  mustCaptureWithPiece = null;
  selectedPiece = null;
  gameOver = false;
  if (sessionInterval) clearInterval(sessionInterval);
  if (roundInterval) clearInterval(roundInterval);
  timersStarted = false;
  sessionMinutes = 20;
  sessionSeconds = 0;
  roundMinutes = 1;
  roundSeconds = 0;
  updateTimerDisplay();
  moveHistoryEntries = [];
  currentHistoryIndex = -1;
  replayMode = false;
  if (replayInterval) clearInterval(replayInterval);
  if (errorMessageEl) errorMessageEl.hidden = true;
  placeInitialPieces();
}

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

  if (difficultySelect) {
    difficultySelect.addEventListener("change", (e) => {
      aiDepth = parseInt(e.target.value);
      localStorage.setItem("aiDepth", aiDepth);
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

function endGame(reason, isSurrender = false) {
  if (gameOver) return;
  gameOver = true;
  if (sessionInterval) clearInterval(sessionInterval);
  if (roundInterval) clearInterval(roundInterval);
  playSound("gameEnd");
  const modal = document.getElementById("game-over-modal");
  const messageEl = document.getElementById("game-over-message");
  const newGameBtn = document.getElementById("new-game-btn");
  const closeBtn = document.getElementById("close-modal");
  let finalMessage = reason.replace(/\n/g, "<br>");
  if (!isSurrender) {
    const finalScores = calculateFinalScores();
    const finalRed = finalScores.red.toFixed(2);
    const finalBlue = finalScores.blue.toFixed(2);
    let winnerMessage = "";
    if (finalRed < finalBlue) winnerMessage = "Red wins!";
    else if (finalBlue < finalRed) winnerMessage = "Blue wins!";
    else winnerMessage = "It's a draw!";
    finalMessage += `<br><br>Final Scores:<br>Red: ${finalRed}<br>Blue: ${finalBlue}<br>${winnerMessage}`;
  }
  messageEl.innerHTML = finalMessage;
  modal.hidden = false;
  const closeModal = () => (modal.hidden = true);
  const startNewGame = () => {
    closeModal();
    resetGame();
  };
  newGameBtn.onclick = startNewGame;
  closeBtn.onclick = closeModal;
  if (
    isSurrender ||
    reason.includes("manually") ||
    reason.includes("agreement")
  )
    closeBtn.focus();
  else newGameBtn.focus();
  const handleEscape = (e) => {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", handleEscape);
    }
  };
  document.addEventListener("keydown", handleEscape);
  console.log("Game Over:", reason);
  if (!isSurrender)
    console.log("Final Scores - Red:", finalRed, "Blue:", finalBlue);
}
