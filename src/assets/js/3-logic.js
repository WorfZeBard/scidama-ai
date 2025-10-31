function createLogicalBoard() {
  const board = Array(8)
    .fill()
    .map(() => Array(8).fill(null));
  document.querySelectorAll(".piece").forEach((el) => {
    const sq = el.parentElement;
    const r = parseInt(sq.dataset.row, 10);
    const c = parseInt(sq.dataset.col, 10);
    const color = el.classList.contains("red") ? "red" : "blue";
    const isKing = el.classList.contains("king");
    const value = parseFloat(el.dataset.value);
    if (isNaN(value)) {
      console.error("Piece missing dataset.value:", el);
    }
    board[r][c] = { color, value, isKing };
  });
  return board;
}

function applyLogicalMove(board, move) {
  const newBoard = board.map((row) => [...row]);
  const { startRow, startCol, endRow, endCol, captured = [] } = move;
  newBoard[endRow][endCol] = newBoard[startRow][startCol];
  newBoard[startRow][startCol] = null;
  for (const [r, c] of captured) {
    newBoard[r][c] = null;
  }
  const piece = newBoard[endRow][endCol];
  if (piece && !piece.isKing) {
    if (
      (piece.color === "red" && endRow === 0) ||
      (piece.color === "blue" && endRow === 7)
    ) {
      newBoard[endRow][endCol] = { ...piece, isKing: true };
    }
  }
  return newBoard;
}

function getImmediateCaptures(board, r, c, piece) {
  const captures = [];
  const color = piece.color;
  const isKing = piece.isKing;
  const dirs = DIRECTIONS.king;
  for (const [dr, dc] of dirs) {
    if (isKing) {
      let nr = r + dr;
      let nc = c + dc;
      let enemyR = null,
        enemyC = null;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const target = board[nr][nc];
        if (target) {
          if (target.color === color) break;
          enemyR = nr;
          enemyC = nc;
          break;
        }
        nr += dr;
        nc += dc;
      }
      if (enemyR === null) continue;
      let landR = enemyR + dr;
      let landC = enemyC + dc;
      while (landR >= 0 && landR < 8 && landC >= 0 && landC < 8) {
        if (board[landR][landC]) break;
        captures.push({
          startRow: r,
          startCol: c,
          endRow: landR,
          endCol: landC,
          captured: [[enemyR, enemyC]],
          isCapture: true,
        });
        landR += dr;
        landC += dc;
      }
    } else {
      const midR = r + dr;
      const midC = c + dc;
      const landR = midR + dr;
      const landC = midC + dc;
      if (
        midR < 0 ||
        midR >= 8 ||
        midC < 0 ||
        midC >= 8 ||
        landR < 0 ||
        landR >= 8 ||
        landC < 0 ||
        landC >= 8
      )
        continue;
      const midPiece = board[midR][midC];
      const landPiece = board[landR][landC];
      if (!midPiece || midPiece.color === color || landPiece) continue;
      captures.push({
        startRow: r,
        startCol: c,
        endRow: landR,
        endCol: landC,
        captured: [[midR, midC]],
        isCapture: true,
      });
    }
  }
  return captures;
}

function generateAllCaptureMoves(board, color) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const immediate = getImmediateCaptures(board, r, c, piece);
        moves.push(...immediate);
      }
    }
  }
  return moves;
}

function generateAllNonCaptureMoves(board, color) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== color) continue;
      const dirs = piece.isKing ? DIRECTIONS.king : DIRECTIONS[color];
      for (const [dr, dc] of dirs) {
        let endR = r + dr;
        let endC = c + dc;
        if (piece.isKing) {
          while (endR >= 0 && endR < 8 && endC >= 0 && endC < 8) {
            if (board[endR][endC]) break;
            moves.push({
              startRow: r,
              startCol: c,
              endRow: endR,
              endCol: endC,
              isCapture: false,
            });
            endR += dr;
            endC += dc;
          }
        } else {
          if (
            endR >= 0 &&
            endR < 8 &&
            endC >= 0 &&
            endC < 8 &&
            !board[endR][endC]
          ) {
            moves.push({
              startRow: r,
              startCol: c,
              endRow: endR,
              endCol: endC,
              isCapture: false,
            });
          }
        }
      }
    }
  }
  return moves;
}

function generateAllMoves(board, color) {
  const captures = generateAllCaptureMoves(board, color);
  if (captures.length > 0) return captures;
  return generateAllNonCaptureMoves(board, color);
}

function playerHasAnyValidMove(color) {
  const board = createLogicalBoard();
  return generateAllMoves(board, color).length > 0;
}

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
  setTimeout(() => {
    const initialState = saveBoardState();
    // ✅ Add initial state as turn 0
    turnHistory = [
      {
        player: null,
        startState: null,
        endState: initialState,
      },
    ];
    currentTurnIndex = 0; // now 0 = initial state
    currentTurnStartState = null;
    isTurnActive = false;
    currentHistoryIndex = -1;
    updateTurnHistoryDOM();
  }, 50);
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
  if (redRemaining !== 0) {
    currentTurnMoveIds.push({
      type: "final-tally",
      player: "red",
      value: redRemaining,
    });
  }
  if (blueRemaining !== 0) {
    currentTurnMoveIds.push({
      type: "final-tally",
      player: "blue",
      value: blueRemaining,
    });
  }
  return { red: redScore, blue: blueScore };
}

function calculateSciDamathScore(capturingPiece, capturedPiece, operator) {
  const capturingValue = parseFloat(capturingPiece.dataset.value);
  const capturedValue = parseFloat(capturedPiece.dataset.value);
  const isCapturingKing = capturingPiece.classList.contains("king");
  const isCapturedKing = capturedPiece.classList.contains("king");
  let result;
  if (operator.trim().includes("÷") || operator.trim() === "/") {
    if (capturedValue === 0) return 0.0;
  }
  switch (operator.trim()) {
    case "+":
      result = capturingValue + capturedValue;
      break;
    case "-":
      result = capturingValue - capturedValue;
      break;
    case "x":
    case "×":
    case "*":
      result = capturingValue * capturedValue;
      break;
    case "÷":
    case "/":
      result = capturingValue / capturedValue;
      break;
    default:
      result = 0;
  }
  let multiplier = 1;
  if (isCapturingKing && isCapturedKing) multiplier = 4;
  else if (isCapturingKing || isCapturedKing) multiplier = 2;
  const finalResult = result * multiplier;
  return Number((Math.round(finalResult * 100) / 100).toFixed(2));
}

function evaluateBoardState(board, redScore, blueScore) {
  let redPieceValue = 0,
    bluePieceValue = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const mult = p.isKing ? 2 : 1;
      if (p.color === "red") redPieceValue += p.value * mult;
      else bluePieceValue += p.value * mult;
    }
  }
  const totalRed = redScore + redPieceValue;
  const totalBlue = blueScore + bluePieceValue;
  return totalBlue - totalRed;
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
  nextMoveId = 0;
  currentTurnMoveIds = [];
  turnHistory = [];
  currentTurnIndex = -1;
  currentTurnStartState = null;
  gameOver = false;
  if (sessionInterval) clearInterval(sessionInterval);
  if (roundInterval) clearInterval(roundInterval);
  timersStarted = false;
  sessionMinutes = 20;
  sessionSeconds = 0;
  roundMinutes = 1;
  roundSeconds = 0;
  updateTimerDisplay();
  currentMoveIndex = -1;
  replayMode = false;
  if (replayInterval) clearInterval(replayInterval);
  if (errorMessageEl) errorMessageEl.hidden = true;
  placeInitialPieces();
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
    finalScores = calculateFinalScores();
    finalRed = finalScores.red.toFixed(2);
    finalBlue = finalScores.blue.toFixed(2);
    let winnerMessage = "";
    if (finalRed < finalBlue) winnerMessage = "Red wins!";
    else if (finalBlue < finalRed) winnerMessage = "Blue wins!";
    else winnerMessage = "It's a draw!";
    finalMessage += `<br><br>Final Scores:<br>Red: ${finalRed}<br>Blue: ${finalBlue}<br><br>${winnerMessage}`;
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
}

function logMove(moveData) {
  if (replayMode) return null;
  return nextMoveId++; // just return ID; no DOM logging
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

  // ✅ Record turn history HERE — only once per full turn
  const lastPlayer = currentPlayer === "blue" ? "red" : "blue";
  const currentState = saveBoardState();
  const turnEntry = {
    player: lastPlayer,
    endState: currentState,
  };
  turnHistory = turnHistory.slice(0, currentTurnIndex + 1);
  turnHistory.push(turnEntry);
  currentTurnIndex++;

  if (gameMode === "pvai" && currentPlayer === "blue") {
    setTimeout(() => makeAIMove(), 750);
  }
}

function performMove(piece, startRow, startCol, endRow, endCol) {
  if (gameOver || replayMode) return;

  const color = piece.classList.contains("red") ? "red" : "blue";
  const pieceKey =
    Array.from(piece.classList).find((cls) => cls.match(/^[rb]\d+$/)) ||
    "piece";
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
    const moveData = {
      type: "capture",
      player: color,
      piece: pieceKey,
      capturingValue: parseFloat(piece.dataset.value),
      operator,
      capturedValue: parseFloat(capturedPiece.dataset.value),
      result: scoreChange,
      isCapturingKing: piece.classList.contains("king"),
      isCapturedKing: capturedPiece.classList.contains("king"),
    };
    currentTurnMoveIds.push(moveData);
    capturedPieces.forEach((p) => p.remove());
  } else {
    playSound("move");
    const moveData = {
      type: "move",
      player: color,
      piece: pieceKey,
      value: pieceValue,
      endRow,
      endCol,
    };
    currentTurnMoveIds.push(moveData);
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
    const moveData = {
      type: "promotion",
      player: color,
      piece: pieceKey,
    };
    currentTurnMoveIds.push(moveData);
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
