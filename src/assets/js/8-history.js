function saveBoardState() {
  const state = {
    redScore,
    blueScore,
    currentPlayer,
    mustCaptureWithPiece: mustCaptureWithPiece
      ? {
          row: parseInt(mustCaptureWithPiece.parentElement.dataset.row),
          col: parseInt(mustCaptureWithPiece.parentElement.dataset.col),
        }
      : null,
    pieces: [],
  };
  document.querySelectorAll(".piece").forEach((piece) => {
    const square = piece.parentElement;
    const pieceKey = piece.dataset.pieceKey;
    if (!pieceKey || !PIECES[pieceKey]) {
      console.warn("Piece missing valid data-piece-key:", piece);
      return;
    }
    state.pieces.push({
      key: pieceKey,
      row: parseInt(square.dataset.row),
      col: parseInt(square.dataset.col),
      isKing: piece.classList.contains("king"),
      value: piece.dataset.value,
    });
  });
  return state;
}

function restoreBoardState(state) {
  document.querySelectorAll(".piece").forEach((p) => p.remove());
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
    piece.dataset.pieceKey = pieceData.key; // ✅
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
  redScore = state.redScore;
  blueScore = state.blueScore;
  currentPlayer = state.currentPlayer;
  redScoreEl.textContent = redScore.toFixed(2);
  blueScoreEl.textContent = blueScore.toFixed(2);
  currentPlayerEl.textContent = currentPlayer;
  const currentPlayerLabel = document.querySelector(".current-turn-label");
  if (currentPlayerLabel) {
    currentPlayerLabel.setAttribute("data-player", currentPlayer);
  }
  mustCaptureWithPiece = null;
  if (state.mustCaptureWithPiece) {
    const { row, col } = state.mustCaptureWithPiece;
    const square = document.querySelector(
      `.square[data-row='${row}'][data-col='${col}']`
    );
    if (square) mustCaptureWithPiece = square.querySelector(".piece");
  }
  clearValidMoves();
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
    }, 750);
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
