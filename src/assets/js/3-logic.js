function createLogicalBoard() {
  const board = Array(8)
    .fill()
    .map(() => Array(8).fill(null));
  document.querySelectorAll(".piece").forEach((el) => {
    const sq = el.parentElement;
    const r = parseInt(sq.dataset.row, 10);
    const c = parseInt(sq.dataset.col, 10);
    const pieceKey = el.dataset.pieceKey; // ✅ Read key
    const pieceData = PIECES[pieceKey];
    if (!pieceData) {
      console.warn("Unknown piece key:", pieceKey, el);
      return;
    }
    board[r][c] = {
      color: pieceData.color,
      value: pieceData.value,
      isKing: pieceData.isKing,
      key: pieceKey, // optional, but helpful for debugging
    };
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
  allMoves.forEach((entry, index) => {
    const moveItem = document.createElement("li");
    moveItem.className = `move-item ${entry.player}`;
    let moveText = "";

    // 👇 Now you can safely use (index + 1)
    const moveNumber = index + 1;

    if (entry.type === "capture") {
      const isCapturingKing = entry.isCapturingKing;
      const isCapturedKing = entry.isCapturedKing;
      let multiplier = 1;
      if (isCapturingKing && isCapturedKing) multiplier = 4;
      else if (isCapturingKing || isCapturedKing) multiplier = 2;

      const val1Display = isCapturingKing
        ? `${entry.capturingValue}*`
        : entry.capturingValue;
      const val2Display = isCapturedKing
        ? `${entry.capturedValue}*`
        : entry.capturedValue;
      const baseScore = (entry.result / multiplier).toFixed(2);
      const finalScore = entry.result.toFixed(2);

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

    // ✅ Prepend move number like "(1)", "(2)", etc.
    moveText = `(${moveNumber}) ${moveText}`;

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
    piece.dataset.pieceKey = pieceKey; // ✅ NEW
    piece.classList.add("piece", pieceData.color, pieceKey);
    if (pieceData.isKing) piece.classList.add("king");
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
  // ✅ Add initial state as turn 0
  turnHistory = [
    {
      player: null,
      endState: initialState,
      moves: [],
    },
  ];
  currentTurnIndex = 0; // now 0 = initial state
  currentTurnStartState = null;
  isTurnActive = false;
  currentHistoryIndex = -1;
  updateTurnHistoryDOM();
}

function calculateFinalScores() {
  const redPieces = document.querySelectorAll(".piece.red");
  const bluePieces = document.querySelectorAll(".piece.blue");
  let redRemaining = 0,
    blueRemaining = 0;
  redPieces.forEach((piece) => {
    const val = parseFloat(piece.dataset.value);
    const multiplier = piece.classList.contains("king") ? 2 : 1;
    redRemaining += val * multiplier;
  });
  bluePieces.forEach((piece) => {
    const val = parseFloat(piece.dataset.value);
    const multiplier = piece.classList.contains("king") ? 2 : 1;
    blueRemaining += val * multiplier;
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
  let multiplieriplier = 1;
  if (isCapturingKing && isCapturedKing) multiplieriplier = 4;
  else if (isCapturingKing || isCapturedKing) multiplieriplier = 2;
  const finalResult = result * multiplieriplier;
  return Number((Math.round(finalResult * 100) / 100).toFixed(2));
}

function evaluateBoardState(board, redScore, blueScore) {
  let redPieceValue = 0,
    bluePieceValue = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const multiplier = p.isKing ? 2 : 1;
      if (p.color === "red") redPieceValue += p.value * multiplier;
      else bluePieceValue += p.value * multiplier;
    }
  }
  const totalRed = redScore + redPieceValue;
  const totalBlue = blueScore + bluePieceValue;

  // 🎯 Sci-Damath: lower score wins.
  // So from Blue's perspective, we want to MINIMIZE (totalBlue - totalRed)
  // But easier: return totalBlue (since Red is opponent, we assume Red plays optimally too)
  // However, to keep minimax symmetric, return totalBlue - totalRed,
  // and make Blue the MINIMIZING player.
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
  turnHistory = [
    {
      player: null,
      endState: null, // Will be filled after pieces are placed
      moves: [],
    },
  ];
  currentTurnIndex = 0;
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

function playSound(soundName) {
  const sound = window.sounds?.[soundName];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch((e) => console.log("Audio play failed:", e));
  }
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

/**
 * Calculates the Sci-Damath capture score from piece values and operator.
 * @param {number} capturingValue
 * @param {number} capturedValue
 * @param {boolean} isCapturingKing
 * @param {boolean} isCapturedKing
 * @param {string} operator - e.g., '+', 'x', '÷', '-'
 */

function calculateCaptureScoreSimulated(
  capturingValue,
  capturedValue,
  isCapturingKing,
  isCapturedKing,
  operator
) {
  let result;
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
      if (capturedValue === 0) return 0;
      result = capturingValue / capturedValue;
      break;
    default:
      result = 0;
  }
  let multiplieriplier = 1;
  if (isCapturingKing && isCapturedKing) multiplieriplier = 4;
  else if (isCapturingKing || isCapturedKing) multiplieriplier = 2;
  return Number((Math.round(result * multiplieriplier * 100) / 100).toFixed(2));
}

function minimax(
  board,
  depth,
  alpha,
  beta,
  maximizingPlayer,
  redScore,
  blueScore
) {
  if (depth === 0) {
    return evaluateBoardState(board, redScore, blueScore);
  }

  const color = maximizingPlayer ? "red" : "blue";
  const moves = generateAllMoves(board, color);

  if (maximizingPlayer) {
    // Red's turn: tries to MAXIMIZE (blue - red) → i.e., hurt Blue
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = applyLogicalMove(board, move);
      let newRed = redScore;
      let newBlue = blueScore;

      if (move.isCapture) {
        const capturer = board[move.startRow][move.startCol];
        const captured = board[move.captured[0][0]][move.captured[0][1]];
        const op = DAMATH_LAYOUT[move.endRow][move.endCol];
        const gain = calculateCaptureScoreSimulated(
          capturer.value,
          captured.value,
          capturer.isKing,
          captured.isKing,
          op
        );
        newRed += gain;
      }

      const eval = minimax(
        newBoard,
        depth - 1,
        alpha,
        beta,
        false,
        newRed,
        newBlue
      );
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    // Blue's turn: tries to MINIMIZE (blue - red)
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = applyLogicalMove(board, move);
      let newRed = redScore;
      let newBlue = blueScore;

      if (move.isCapture) {
        const capturer = board[move.startRow][move.startCol];
        const captured = board[move.captured[0][0]][move.captured[0][1]];
        const op = DAMATH_LAYOUT[move.endRow][move.endCol];
        const gain = calculateCaptureScoreSimulated(
          capturer.value,
          captured.value,
          capturer.isKing,
          captured.isKing,
          op
        );
        newBlue += gain;
      }

      const eval = minimax(
        newBoard,
        depth - 1,
        alpha,
        beta,
        true,
        newRed,
        newBlue
      );
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function findPieceInDOM(startRow, startCol) {
  const sq = document.querySelector(
    `.square[data-row='${startRow}'][data-col='${startCol}']`
  );
  return sq ? sq.querySelector(".piece") : null;
}

/**
 * Returns the maximum number of captures possible from (r, c) in one turn.
 * Depth-limited to 3 to match "Tatlo" rule.
 */
function getMaxCaptureCount(
  board,
  r,
  c,
  piece,
  visited = new Set(),
  depth = 0
) {
  if (depth >= 3 || !piece) return 0;
  const key = `${r},${c}`;
  if (visited.has(key)) return 0;
  visited.add(key);
  // 👇 Use FULL capture generator (not evaluation-only)
  const immediate = getImmediateCaptures(board, r, c, piece);
  if (immediate.length === 0) return 0;
  let maxChain = 0;
  for (const move of immediate) {
    const newBoard = applyLogicalMove(board, move);
    const landed = newBoard[move.endRow][move.endCol];
    const further = getMaxCaptureCount(
      newBoard,
      move.endRow,
      move.endCol,
      landed,
      new Set(visited), // clone
      depth + 1
    );
    maxChain = Math.max(maxChain, 1 + further);
  }
  return maxChain;
}

/**
 * Returns only the capture moves with the highest total capture potential.
 * Each move is evaluated by simulating the full chain it initiates.
 */
function getAllBestCaptureMoves(board, color) {
  const allCaptureMoves = generateAllCaptureMoves(board, color);
  if (allCaptureMoves.length === 0) return [];

  // Map each move to its total capture count
  const moveScores = allCaptureMoves.map((move) => {
    const newBoard = applyLogicalMove(board, move);
    const landed = newBoard[move.endRow][move.endCol];
    const further = getMaxCaptureCount(
      newBoard,
      move.endRow,
      move.endCol,
      landed,
      new Set([`${move.startRow},${move.startCol}`])
    );
    const totalCaptures = move.captured.length + further; // usually 1 + further
    return { move, totalCaptures, isKing: landed?.isKing };
  });

  // Find max capture count
  const maxCaptures = Math.max(...moveScores.map((s) => s.totalCaptures));

  // Filter moves with max captures
  let bestMoves = moveScores.filter((s) => s.totalCaptures === maxCaptures);

  // If tie, prefer moves that start with a king
  const hasKing = bestMoves.some((s) => s.isKing);
  if (hasKing) {
    bestMoves = bestMoves.filter((s) => s.isKing);
  }

  return bestMoves.map((s) => s.move);
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

  // ✅ Record full turn data including moves
  const lastPlayer = currentPlayer === "blue" ? "red" : "blue";
  const currentState = saveBoardState();
  const turnEntry = {
    player: lastPlayer,
    endState: currentState,
    moves: [...currentTurnMoveIds], // 👈 CRITICAL: persist the moves
  };

  turnHistory = turnHistory.slice(0, currentTurnIndex + 1);
  turnHistory.push(turnEntry);
  currentTurnIndex++;

  // ✅ Clear for next turn
  currentTurnMoveIds = [];

  // ✅ Update history display
  updateTurnHistoryDOM(); // ←←← ADD THIS

  if (gameMode === "pvai" && currentPlayer === "blue") {
    setTimeout(() => makeAIMove(), 750);
  }
}

function performMove(piece, startRow, startCol, endRow, endCol) {
  if (gameOver || replayMode) return;
  const color = piece.classList.contains("red") ? "red" : "blue";
  const pieceKey =
    Array.from(piece.classList).find((cls) => cls.match(/^[rb]\d+(_king)?$/)) ||
    piece.dataset.pieceKey || // fallback to dataset
    "piece";
  const pieceValue = parseFloat(piece.dataset.value);
  const isKing = piece.classList.contains("king");
  const board = createLogicalBoard();

  // ===== Mayor Dama Enforcement =====
  const allMoves = generateAllMoves(board, color);
  const captureMoves = allMoves.filter((m) => m.isCapture);
  let allowedMoves = allMoves;
  if (captureMoves.length > 0) {
    allowedMoves = getAllBestCaptureMoves(board, color);
  }
  const matchingMove = allowedMoves.find(
    (m) =>
      m.startRow === startRow &&
      m.startCol === startCol &&
      m.endRow === endRow &&
      m.endCol === endCol
  );
  if (!matchingMove) {
    showErrorMessage(
      "Invalid move. Mayor Dama rule requires the highest-priority capture."
    );
    return;
  }
  // ===== End Enforcement =====

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
    const moveData = {
      type: "capture",
      player: color,
      piece: pieceKey,
      capturingValue: parseFloat(piece.dataset.value),
      capturedValue: parseFloat(capturedPiece.dataset.value),
      operator,
      result: scoreChange,
      isCapturingKing: piece.classList.contains("king"),
      isCapturedKing: capturedPiece.classList.contains("king"),
      startRow,
      startCol,
      endRow,
      endCol,
    };
    currentTurnMoveIds.push(moveData);
    capturedPieces.forEach((p) => p.remove());
    playSound("capture");
  } else {
    const moveData = {
      type: "move",
      player: color,
      piece: pieceKey,
      value: pieceValue,
      endRow,
      endCol,
    };
    currentTurnMoveIds.push(moveData);
    playSound("move");
  }

  const endSq = document.querySelector(
    `.square[data-row='${endRow}'][data-col='${endCol}']`
  );
  endSq.appendChild(piece);

  // After moving the piece to endSq
  let newPieceKey = pieceKey;

  const wasPromoted =
    (!isKing && color === "red" && endRow === 0) ||
    (color === "blue" && endRow === 7);

  if (wasPromoted) {
    // Promote by updating key and class
    newPieceKey = pieceKey + "_king";
    piece.classList.add("king");
    piece.dataset.pieceKey = newPieceKey;
    const pieceData = PIECES[newPieceKey];
    if (pieceData) {
      piece.dataset.value = pieceData.value; // though same value
    }
    const moveData = {
      type: "promotion",
      player: color,
      piece: pieceKey,
    };
    currentTurnMoveIds.push(moveData);
    playSound("promotion");
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
              // Re-enforce Mayor Dama: pick best among further captures
              const newBoard = createLogicalBoard();
              // Filter continuations from this piece
              const continuations = furtherCaptures.filter(
                (m) => m.startRow === endRow && m.startCol === endCol
              );
              let bestContinuation = null;
              let bestScore = -Infinity;
              for (const move of continuations) {
                const capturer = newBoard[move.startRow][move.startCol];
                const captured =
                  newBoard[move.captured[0][0]][move.captured[0][1]];
                const op = DAMATH_LAYOUT[move.endRow][move.endCol];
                const score = calculateCaptureScoreSimulated(
                  capturer.value,
                  captured.value,
                  capturer.isKing,
                  captured.isKing,
                  op
                );
                if (score > bestScore) {
                  bestScore = score;
                  bestContinuation = move;
                }
              }
              if (bestContinuation) {
                performMove(
                  piece,
                  bestContinuation.startRow,
                  bestContinuation.startCol,
                  bestContinuation.endRow,
                  bestContinuation.endCol
                );
              } else {
                // Fallback (should not happen)
                performMove(
                  piece,
                  furtherCaptures[0].startRow,
                  furtherCaptures[0].startCol,
                  furtherCaptures[0].endRow,
                  furtherCaptures[0].endCol
                );
              }
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

function executeLogicalMove(move) {
  const piece = findPieceInDOM(move.startRow, move.startCol);
  if (!piece) {
    console.error("Piece not found for move:", move);
    return;
  }
  performMove(piece, move.startRow, move.startCol, move.endRow, move.endCol);
}

function getLegalMoves(board, color) {
  const allMoves = generateAllMoves(board, color);
  const captureMoves = allMoves.filter((m) => m.isCapture);
  if (captureMoves.length > 0) {
    return getAllBestCaptureMoves(board, color);
  }
  return allMoves;
}

function makeAIMove() {
  if (gameOver || currentPlayer !== "blue" || replayMode) return;
  const board = createLogicalBoard();
  const color = "blue";

  // Handle forced capture continuation
  if (mustCaptureWithPiece) {
    const sq = mustCaptureWithPiece.parentElement;
    const startRow = parseInt(sq.dataset.row, 10);
    const startCol = parseInt(sq.dataset.col, 10);
    const piece = board[startRow][startCol];
    if (piece && piece.color === color) {
      const captureMoves = getImmediateCaptures(
        board,
        startRow,
        startCol,
        piece
      );
      if (captureMoves.length > 0) {
        // Enforce Mayor Dama even in continuation
        const bestContinuation = getAllBestCaptureMoves(board, "blue").find(
          (m) => m.startRow === startRow && m.startCol === startCol
        );
        executeLogicalMove(bestContinuation || captureMoves[0]);
        return;
      }
    }
  }

  // ✅ Use LEGAL moves (enforces Mayor Dama)
  const moves = getLegalMoves(board, color);
  if (moves.length === 0) {
    switchTurn();
    return;
  }

  let bestMove = null;
  let bestValue = Infinity; // Blue minimizes (blue - red)
  let bestCaptureCount = -1;
  let bestImmediateScore = -Infinity; // higher is better
  let bestPromotion = false;
  let bestCentrality = -1;

  for (const move of moves) {
    const newBoard = applyLogicalMove(board, move);
    const value = minimax(
      newBoard,
      aiDepth - 1,
      -Infinity,
      Infinity,
      false, // Blue is minimizing
      redScore,
      blueScore
    );

    // 🔹 Capture chain length
    const landed = newBoard[move.endRow][move.endCol];
    const captureCount = move.isCapture
      ? 1 +
        getMaxCaptureCount(
          newBoard,
          move.endRow,
          move.endCol,
          landed,
          new Set([`${move.startRow},${move.startCol}`])
        )
      : 0;

    // 🔹 Promotion check
    const promotesNow =
      !board[move.startRow][move.startCol]?.isKing &&
      ((color === "red" && move.endRow === 0) ||
        (color === "blue" && move.endRow === 7));

    // 🔹 Centrality
    const centrality =
      (1 - Math.abs(move.endRow - 3.5) / 4) *
      (1 - Math.abs(move.endCol - 3.5) / 4);

    let immediateScore = 0;
    if (move.isCapture) {
      const capturer = board[move.startRow][move.startCol];
      const captured = board[move.captured[0][0]][move.captured[0][1]];
      const op = DAMATH_LAYOUT[move.endRow][move.endCol];
      immediateScore = calculateCaptureScoreSimulated(
        capturer.value,
        captured.value,
        capturer.isKing,
        captured.isKing,
        op
      );
    }

    // 🔹 Layered tie-breaking: value → captureCount → immediateScore → promotion → centrality
    const isNewBest =
      value < bestValue ||
      (value === bestValue && captureCount > bestCaptureCount) ||
      (value === bestValue &&
        captureCount === bestCaptureCount &&
        immediateScore > bestImmediateScore) ||
      (value === bestValue &&
        captureCount === bestCaptureCount &&
        immediateScore === bestImmediateScore &&
        promotesNow &&
        !bestPromotion) ||
      (value === bestValue &&
        captureCount === bestCaptureCount &&
        immediateScore === bestImmediateScore &&
        promotesNow === bestPromotion &&
        centrality > bestCentrality);

    if (isNewBest) {
      bestValue = value;
      bestCaptureCount = captureCount;
      bestImmediateScore = immediateScore;
      bestPromotion = promotesNow;
      bestCentrality = centrality;
      bestMove = move;
    }
  }

  executeLogicalMove(bestMove || moves[0]);
}

function showErrorMessage(message) {
  if (!errorMessageEl) return;
  errorMessageEl.textContent = message;
  errorMessageEl.hidden = false;
  setTimeout(() => (errorMessageEl.hidden = true), 5000);
}

function getBestCaptureMove(board, color) {
  let bestMove = null;
  let bestCaptureCount = -1;
  let bestIsKing = false;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== color) continue;
      const count = getMaxCaptureCount(board, r, c, piece);
      if (count === 0) continue;

      const isKing = piece.isKing;
      if (
        count > bestCaptureCount ||
        (count === bestCaptureCount && isKing && !bestIsKing)
      ) {
        bestCaptureCount = count;
        bestIsKing = isKing;
        // Get one actual move from this start
        const moves = getImmediateCaptures(board, r, c, piece);
        if (moves.length > 0) bestMove = moves[0];
      }
    }
  }
  return bestMove;
}
