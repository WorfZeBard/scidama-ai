function makeKing(piece) {
  piece.classList.add("king", "promote");
  setTimeout(() => piece.classList.remove("promote"), 600);
}

function playSound(soundName) {
  const sound = window.sounds?.[soundName];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch((e) => console.log("Audio play failed:", e));
  }
}

function performMove(piece, startRow, startCol, endRow, endCol) {
  if (gameOver || replayMode) return;
  const color = piece.classList.contains("red") ? "red" : "blue";
  const pieceKey = Array.from(piece.classList).find((cls) => cls.match(/^[rb]\d+$/)) || "piece";
  const pieceValue = parseFloat(piece.dataset.value);
  const isKing = piece.classList.contains("king");

  const board = createLogicalBoard();
  const allMoves = generateAllMoves(board, color);
  const matchingMove = allMoves.find(
    (m) =>
      m.startRow === startRow &&
      m.startCol === startCol &&
      m.endRow === endRow &&
      m.endCol === endCol
  );
  if (!matchingMove) return;

  let capturedPieces = [];
  if (matchingMove.isCapture) {
    capturedPieces = matchingMove.captured
      .map(([r, c]) => {
        const sq = document.querySelector(
          `.square[data-row='${r}'][data-col='${c}']`
        );
        return sq ? sq.querySelector(".piece") : null;
      })
      .filter((p) => p);
  }

  let scoreChange = 0;
  if (capturedPieces.length > 0) {
    const capturedPiece = capturedPieces[0];
    const operator = DAMATH_LAYOUT[endRow][endCol];
    scoreChange = calculateSciDamathScore(piece, capturedPiece, operator);
    if (color === "red") redScore += scoreChange;
    else blueScore += scoreChange;
    redScoreEl.textContent = redScore.toFixed(2);
    blueScoreEl.textContent = blueScore.toFixed(2);
    playSound("capture");
    logMove({
      type: "capture",
      player: color,
      piece: pieceKey,
      capturingValue: parseFloat(piece.dataset.value),
      operator,
      capturedValue: parseFloat(capturedPiece.dataset.value),
      result: scoreChange,
      isCapturingKing: piece.classList.contains("king"),
      isCapturedKing: capturedPiece.classList.contains("king"),
    });
    capturedPieces.forEach((p) => p.remove());
  } else {
    playSound("move");
    logMove({
      type: "move",
      player: color,
      piece: pieceKey,
      value: pieceValue,
      endRow,
      endCol,
    });
  }

  const endSq = document.querySelector(
    `.square[data-row='${endRow}'][data-col='${endCol}']`
  );
  endSq.appendChild(piece);

  let wasPromoted = false;
  if (!isKing) {
    if (
      (color === "red" && endRow === 0) ||
      (color === "blue" && endRow === 7)
    ) {
      makeKing(piece);
      wasPromoted = true;
    }
  }
  if (wasPromoted) {
    playSound("promotion");
    logMove({ type: "promotion", player: color, piece: pieceKey });
  }

  let turnEnded = false;
  if (wasPromoted) {
    mustCaptureWithPiece = null;
    switchTurn();
    turnEnded = true;
  } else if (capturedPieces.length > 0) {
    setTimeout(() => {
      const newBoard = createLogicalBoard();
      const landedPiece = newBoard[endRow][endCol];
      if (landedPiece && landedPiece.color === color) {
        const furtherCaptures = getImmediateCaptures(
          newBoard,
          endRow,
          endCol,
          landedPiece
        );
        if (furtherCaptures.length > 0) {
          mustCaptureWithPiece = piece;
          if (gameMode === "pvai" && color === "blue") {
            setTimeout(() => {
              performMove(
                piece,
                furtherCaptures[0].startRow,
                furtherCaptures[0].startCol,
                furtherCaptures[0].endRow,
                furtherCaptures[0].endCol
              );
            }, 500);
          }
        } else {
          mustCaptureWithPiece = null;
          switchTurn();
          turnEnded = true;
        }
      } else {
        mustCaptureWithPiece = null;
        switchTurn();
        turnEnded = true;
      }
    }, 0);
  } else {
    mustCaptureWithPiece = null;
    switchTurn();
    turnEnded = true;
  }

  const currentState = saveBoardState();
  if (currentTurnStartState === null) currentTurnStartState = currentState;
  if (turnEnded) {
    const turnEntry = {
      player: color,
      startState: currentTurnStartState,
      endState: currentState,
    };
    turnHistory = turnHistory.slice(0, currentTurnIndex + 1);
    turnHistory.push(turnEntry);
    currentTurnIndex++;
    currentTurnStartState = null;
  }

  if (!replayMode) highlightMoveSquares(startRow, startCol, endRow, endCol);
  clearValidMoves();

  if (!timersStarted) {
    timersStarted = true;
    startSessionTimer();
    startRoundTimer();
    playSound("gameStart");
  }

  setTimeout(() => checkGameOver(), 100);
}

function switchTurn() {
  mustCaptureWithPiece = null;
  currentPlayer = currentPlayer === "red" ? "blue" : "red";
  currentPlayerEl.textContent = currentPlayer;
  const currentPlayerLabel = document.querySelector(".current-player-label");
  if (currentPlayerLabel)
    currentPlayerLabel.setAttribute("data-player", currentPlayer);
  if (roundInterval) clearInterval(roundInterval);
  roundMinutes = 1;
  roundSeconds = 0;
  roundEl.className = "timer";
  roundEl.classList.add(currentPlayer === "red" ? "timer-red" : "timer-blue");
  startRoundTimer();
  if (gameMode === "pvai" && currentPlayer === "blue") {
    setTimeout(() => makeAIMove(), 750);
  }
}

function calculateFinalScores() {
  const redPieces = document.querySelectorAll(".piece.red");
  const bluePieces = document.querySelectorAll(".piece.blue");
  let redRemaining = 0,
    blueRemaining = 0;
  redPieces.forEach((piece) => {
    const val = parseFloat(piece.dataset.value);
    const mult = piece.classList.contains("king") ? 2 : 1;
    redRemaining += val * mult;
  });
  bluePieces.forEach((piece) => {
    const val = parseFloat(piece.dataset.value);
    const mult = piece.classList.contains("king") ? 2 : 1;
    blueRemaining += val * mult;
  });
  redScore += redRemaining;
  blueScore += blueRemaining;
  if (redRemaining !== 0)
    logMove({ type: "final-tally", player: "red", value: redRemaining });
  if (blueRemaining !== 0)
    logMove({ type: "final-tally", player: "blue", value: blueRemaining });
  return { red: redScore, blue: blueScore };
}

function checkGameOver() {
  if (gameOver) return true;
  if (surrenderRequested) {
    const winner = surrenderRequested === "red" ? "Blue" : "Red";
    endGame(`${winner} wins! (${surrenderRequested} surrendered)`, true);
    return true;
  }
  const redPieces = document.querySelectorAll(".piece.red").length;
  const bluePieces = document.querySelectorAll(".piece.blue").length;
  if (redPieces === 0 || bluePieces === 0) {
    endGame("Game ended: One player has no remaining pieces.");
    return true;
  }
  if (!playerHasAnyValidMove(currentPlayer)) {
    const winner = currentPlayer === "red" ? "Blue" : "Red";
    endGame(`${winner} wins! (Opponent has no valid moves)`);
    return true;
  }
  if (
    (currentPlayer === "red" ? redPieces : bluePieces) === 1 &&
    moveHistory.length >= 6
  ) {
    const lastThree = moveHistory.slice(-3);
    const prevThree = moveHistory.slice(-6, -3);
    if (JSON.stringify(lastThree) === JSON.stringify(prevThree)) {
      endGame("Draw! (3-move repetition with single chip)");
      return true;
    }
  }
  return false;
}
