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

    if (entry.type === "capture") {
      let multiplier = 1,
        multiplierText = "×1";
      if (entry.isCapturingKing && entry.isCapturedKing) {
        multiplier = 4;
        multiplierText = "×4 (DAMA vs DAMA)";
      } else if (entry.isCapturingKing || entry.isCapturedKing) {
        multiplier = 2;
        multiplierText = "×2 (DAMA involved)";
      }
      const resultClass =
        entry.result > 0 ? "positive" : entry.result < 0 ? "negative" : "zero";
      moveText = `<strong>${entry.player.toUpperCase()}</strong>: ${
        entry.piece
      }(${entry.capturingValue}) <span class="operator">${
        entry.operator
      }</span> (${
        entry.capturedValue
      }) = <span class="result ${resultClass}">${entry.result.toFixed(
        2
      )} (${multiplierText})</span>`;
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
    const valueStr = piece.dataset.value;
    if (valueStr == null || valueStr === "") {
      console.warn("Piece missing dataset.value:", piece);
      return; // skip invalid piece
    }
    const value = parseFloat(valueStr);
    if (isNaN(value)) {
      console.warn("Invalid piece value:", valueStr, piece);
      return;
    }
    const color = piece.classList.contains("red") ? "red" : "blue";
    let pieceKey = null;
    for (const key in PIECES) {
      if (
        PIECES[key].color === color &&
        PIECES[key].value === value // 👈 compare numbers, not strings
      ) {
        pieceKey = key;
        break;
      }
    }
    if (!pieceKey) {
      // Fallback: generate key from value (not ideal, but safe)
      pieceKey =
        color === "red" ? `r${Math.abs(value)}` : `b${Math.abs(value)}`;
    }
    state.pieces.push({
      key: pieceKey,
      row: parseInt(square.dataset.row),
      col: parseInt(square.dataset.col),
      isKing: piece.classList.contains("king"),
      value: valueStr, // store original string to preserve sign/format
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
    const color = pieceData.key.startsWith("r") ? "red" : "blue";
    const piece = document.createElement("div");
    piece.classList.add("piece", color);
    if (pieceData.isKing) piece.classList.add("king");
    piece.dataset.value = pieceData.value;
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
    const lastTurn = turnHistory[currentTurnIndex]; // ✅ currentTurnIndex, not -1
    if (lastTurn?.player === "blue") {
      stepsBack = 2;
    }
  }

  const targetIndex = currentTurnIndex - stepsBack;
  if (targetIndex < 0) {
    resetGame();
    return;
  }

  restoreBoardState(turnHistory[targetIndex].endState);

  if (gameMode === "pvai") {
    currentPlayer = "red";
    currentPlayerEl.textContent = "red";
    const label = document.querySelector(".current-player-label");
    if (label) label.setAttribute("data-player", "red");
    roundEl.className = "timer timer-red";
  }

  currentTurnIndex = targetIndex;
  currentTurnStartState = null;
  isTurnActive = false;
  mustCaptureWithPiece = null;
  selectedPiece = null;

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
