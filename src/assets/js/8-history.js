function updateTurnHistoryDOM() {
  const historyList = document.getElementById("move-history-content");
  if (!historyList) return;
  historyList.innerHTML = "";

  // Flatten all moves from all turns (skip turn 0 = initial state)
  const allMoves = [];
  for (let i = 1; i < turnHistory.length; i++) {
    const turn = turnHistory[i];
    if (turn.moves && turn.moves.length > 0) {
      allMoves.push(...turn.moves);
    }
  }

  // Render each move
  allMoves.forEach((entry) => {
    const moveItem = document.createElement("li");
    moveItem.className = `move-item ${entry.player}`;
    let moveText = "";
    const moveNumber = index + 1;
    moveText = `(${moveNumber}) ${moveText}`;

    if (entry.type === "capture") {
      const isCapturingKing = entry.isCapturingKing;
      const isCapturedKing = entry.isCapturedKing;
      let multiplier = 1;
      if (isCapturingKing && isCapturedKing) multiplier = 4;
      else if (isCapturingKing || isCapturedKing) multiplier = 2;

      // Format values with * if king
      const val1Display = isCapturingKing
        ? `${entry.capturingValue}*`
        : entry.capturingValue;
      const val2Display = isCapturedKing
        ? `${entry.capturedValue}*`
        : entry.capturedValue;

      // Base score = entry.result / multiplier (reverse engineer)
      const baseScore = (entry.result / multiplier).toFixed(2);
      const finalScore = entry.result.toFixed(2);

      // Format operator with brackets
      const op = `<span class="operator">${entry.operator}</span>`;

      moveText = `<strong>${entry.player.toUpperCase()}</strong>: [(${
        entry.startRow
      },${entry.startCol}) [${val1Display}] ${op} (${entry.endRow},${
        entry.endCol
      }) [${val2Display}]] × ${multiplier} = ${baseScore} × ${multiplier} = <span class="result ${
        entry.result >= 0 ? "positive" : "negative"
      }">${finalScore}</span>`;
    } else if (entry.type === "move") {
      moveText = `<strong>${entry.player.toUpperCase()}</strong>: ${
        entry.piece
      }(${entry.value}) moved to (${entry.endRow},${entry.endCol})`;
    } else if (entry.type === "promotion") {
      moveText = `<strong>${entry.player.toUpperCase()}</strong>: ${
        entry.piece
      } promoted to DAMA!`;
    } else if (entry.type === "final-tally") {
      moveText = `<strong>${entry.player.toUpperCase()}</strong>: Final tally of remaining pieces = <span class="result ${
        entry.value >= 0 ? "positive" : "negative"
      }">${entry.value.toFixed(2)} (×2 for each DAMA)</span>`;
    }

    moveItem.innerHTML = moveText;
    historyList.appendChild(moveItem);
  });

  const scrollableContainer = document.querySelector(
    ".move-history-scrollable"
  );
  if (scrollableContainer) {
    scrollableContainer.scrollTop = scrollableContainer.scrollHeight;
  }
}

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
  const currentPlayerLabel = document.querySelector(".current-player-label");
  if (currentPlayerLabel)
    currentPlayerLabel.setAttribute("data-player", currentPlayer);
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
    if (lastTurn?.player === "blue") {
      stepsBack = 2;
    }
  }

  const targetIndex = currentTurnIndex - stepsBack;
  if (targetIndex < 0) {
    resetGame();
    return;
  }

  // ✅ CRITICAL: Remove the undone turns from turnHistory
  turnHistory = turnHistory.slice(0, targetIndex + 1);
  currentTurnIndex = targetIndex;

  // Restore state
  restoreBoardState(turnHistory[currentTurnIndex].endState);

  // Reset turn-related state
  if (gameMode === "pvai") {
    currentPlayer = "red";
    currentPlayerEl.textContent = "red";
    const label = document.querySelector(".current-player-label");
    if (label) label.setAttribute("data-player", "red");
    roundEl.className = "timer timer-red";
  }

  mustCaptureWithPiece = null;
  selectedPiece = null;
  isTurnActive = false;
  currentTurnStartState = null;

  // ✅ Now update the DOM — it will reflect truncated history
  updateTurnHistoryDOM();
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
  const label = document.querySelector(".current-player-label");
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
