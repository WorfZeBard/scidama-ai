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
  console.log("Game Over:", reason);
  if (!isSurrender)
    console.log("Final Scores - Red:", finalRed, "Blue:", finalBlue);
}