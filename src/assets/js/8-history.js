function restoreBoardState(state) {
  // Clear all existing pieces from the board
  document.querySelectorAll(".piece").forEach((p) => p.remove());

  // Restore pieces from saved state
  state.pieces.forEach((pieceData) => {
    const square = document.querySelector(
      `.square[data-row='${pieceData.row}'][data-col='${pieceData.col}']`
    );
    if (!square) return;

    const pieceDataConfig = PIECES[pieceData.key];
    if (!pieceDataConfig) {
      console.warn("Unknown piece key in restore:", pieceData.key);
      return;
    }

    const piece = document.createElement("div");
    piece.classList.add("piece", pieceDataConfig.color);
    piece.dataset.pieceKey = pieceData.key;
    piece.dataset.value = pieceData.value;
    if (pieceData.isKing) piece.classList.add("king");
    piece.draggable = true;
    piece.tabIndex = 0;

    const numberLabel = document.createElement("span");
    numberLabel.classList.add("piece-number");
    numberLabel.textContent = pieceData.value;
    piece.appendChild(numberLabel);

    square.appendChild(piece);
  });

  // Restore scores
  redScore = state.redScore;
  blueScore = state.blueScore;
  redScoreEl.textContent = redScore.toFixed(2);
  blueScoreEl.textContent = blueScore.toFixed(2);

  // Restore current player
  currentPlayer = state.currentPlayer;
  let displayPlayerText = currentPlayer;
  if (gameMode === "pvai") {
    displayPlayerText = currentPlayer === window.aiColor ? "AI" : "Human";
  }
  currentPlayerEl.textContent = displayPlayerText;

  const currentPlayerLabel = document.querySelector(".current-turn-label");
  if (currentPlayerLabel) {
    currentPlayerLabel.setAttribute("data-player", currentPlayer);
  }

  // Restore mustCaptureWithPiece
  mustCaptureWithPiece = null;
  if (state.mustCaptureWithPiece) {
    const { row, col } = state.mustCaptureWithPiece;
    const square = document.querySelector(
      `.square[data-row='${row}'][data-col='${col}']`
    );
    if (square) mustCaptureWithPiece = square.querySelector(".piece");
  }

  // ✅ RESTORE BOARD ROTATION STATE (for PvP mode)
  const boardWrapper = document.querySelector(".board-wrapper");
  if (boardWrapper) {
    if (state.boardRotated) {
      boardWrapper.classList.add("rotated");
    } else {
      boardWrapper.classList.remove("rotated");
    }
  }

  // Clear UI indicators
  clearValidMoves();

  // Restart round timer (unless in replay)
  if (!replayMode) {
    if (roundInterval) clearInterval(roundInterval);
    roundMinutes = 1;
    roundSeconds = 0;
    roundEl.className = "timer";
    roundEl.classList.add(currentPlayer === "red" ? "timer-red" : "timer-blue");
    startRoundTimer();
  }
}

function undoMove() {
  if (gameOver || replayMode) return;
  if (currentTurnIndex <= 0) {
    showErrorMessage("No moves to undo.");
    return;
  }
  // Since we're going back, the current turn hasn't captured yet
  currentTurnHasCaptured = false;

  let stepsBack = 1;
  if (gameMode === "pvai") {
    const lastTurn = turnHistory[currentTurnIndex];
    if (lastTurn?.player === window.aiColor) {
      // Only step back 2 if there's a prior human move to return to
      if (currentTurnIndex >= 2) {
        stepsBack = 2;
      } else {
        // AI made the first move → undo just that one
        stepsBack = 1;
      }
    }
  }

  const targetIndex = currentTurnIndex - stepsBack;
  if (targetIndex < 0) {
    // Should not happen with above guard, but safety fallback
    resetGame();
    return;
  }

  // Truncate history
  turnHistory = turnHistory.slice(0, targetIndex + 1);
  currentTurnIndex = targetIndex;

  // Restore full board state
  restoreBoardState(turnHistory[currentTurnIndex].endState);

  // Reset transient state
  mustCaptureWithPiece = null;
  selectedPiece = null;
  isTurnActive = false;
  currentTurnStartState = null;

  // Sync UI based on restored player
  let displayPlayerText = currentPlayer;
  if (gameMode === "pvai") {
    displayPlayerText = currentPlayer === window.aiColor ? "AI" : "Human";
  }
  currentPlayerEl.textContent = displayPlayerText;
  const currentPlayerLabel = document.querySelector(".current-turn-label");
  if (currentPlayerLabel) {
    currentPlayerLabel.setAttribute("data-player", currentPlayer);
  }

  // Restart round timer
  if (roundInterval) clearInterval(roundInterval);
  roundMinutes = 1;
  roundSeconds = 0;
  roundEl.className = "timer";
  roundEl.classList.add(currentPlayer === "red" ? "timer-red" : "timer-blue");
  startRoundTimer();

  // Update move history display
  updateTurnHistoryDOM();

  // If it's now AI's turn (e.g., after undoing a human response), let AI play
  if (gameMode === "pvai" && currentPlayer === window.aiColor && !gameOver) {
    setTimeout(() => {
      if (!gameOver && currentPlayer === window.aiColor) {
        makeAIMove();
      }
    }, 1500);
  }
}

function redoMove() {
  if (gameOver || replayMode || currentTurnIndex >= turnHistory.length - 1)
    return;

  currentTurnIndex++;
  const entry = turnHistory[currentTurnIndex];
  restoreBoardState(entry.endState);

  // Restore move index
  if (entry.moveIds?.length > 0) {
    const lastId = entry.moveIds[entry.moveIds.length - 1];
    currentHistoryIndex = turnHistoryEntries.findIndex((m) => m.id === lastId);
  } else {
    currentHistoryIndex = -1;
  }

  currentPlayer = entry.endState.currentPlayer;
  currentPlayerEl.textContent = currentPlayer;
  const label = document.querySelector(".current-turn-label");
  if (label) label.setAttribute("data-player", currentPlayer);
  roundEl.className = "timer";
  roundEl.classList.add(currentPlayer === "red" ? "timer-red" : "timer-blue");

  updateTurnHistoryDOM();
}

function startReplay(delay) {
  // Optional: implement if needed
}
function stopReplay() {
  if (replayInterval) clearInterval(replayInterval);
  replayMode = false;
}
