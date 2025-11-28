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
        if ((landR + landC) % 2 !== 0) {
          landR += dr;
          landC += dc;
          continue; // skip dark squares
        }
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
      // ✅ Ensure landing square is playable (light)
      if ((landR + landC) % 2 !== 0) continue;
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
  const allMoves = [];
  for (let i = 1; i < turnHistory.length; i++) {
    const turn = turnHistory[i];
    if (turn.moves && turn.moves.length > 0) {
      allMoves.push(...turn.moves);
    }
  }

  let moveCounter = 0;
  allMoves.forEach((entry) => {
    const moveItem = document.createElement("li");
    moveItem.className = `move-item ${entry.player}`;
    let moveText = "";

    if (entry.type === "promotion") {
      moveText = `<strong>${entry.player.toUpperCase()}</strong>: promoted to DAMA!`;
    } else {
      moveCounter++;
      const dispStartRow = 7 - entry.startRow;
      const dispEndRow = 7 - entry.endRow;
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
        moveText = `<strong>${entry.player.toUpperCase()}</strong>: [(${dispStartRow},${
          entry.startCol
        }) [${val1Display}] ${op} (${dispEndRow},${
          entry.endCol
        }) [${val2Display}]] × ${multiplier} = ${baseScore} × ${multiplier} = <span class="result ${
          entry.result >= 0 ? "positive" : "negative"
        }">${finalScore}</span>`;
      } else if (entry.type === "move") {
        moveText = `<strong>${entry.player.toUpperCase()}</strong>: (${
          entry.value
        }) moved from (${dispStartRow},${entry.startCol}) to (${dispEndRow},${
          entry.endCol
        })`;
      } else if (entry.type === "final-tally") {
        moveText = `<strong>${entry.player.toUpperCase()}</strong>: Final tally of remaining pieces = <span class="result ${
          entry.value >= 0 ? "positive" : "negative"
        }">${entry.value.toFixed(2)} (×2 for each DAMA)</span>`;
      }
      moveText = `(${moveCounter}) ${moveText}`;
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

function placeInitialPieces() {
  // Ensure board DOM exists
  if (!gameboard || gameboard.children.length === 0) {
    initializeBoard();
  }

  // Clear existing pieces
  document.querySelectorAll(".piece").forEach((p) => p.remove());

  let setup = debugMode ? DEBUG_SETUP : INITIAL_SETUP;

  // Swap setup if human is blue (PVAI mode)
  if (gameMode === "pvai" && window.humanColor === "blue") {
    const swappedSetup = {};
    for (const [pos, pieceKey] of Object.entries(setup)) {
      const [r, c] = pos.split(",").map(Number);
      // ✅ FLIP BOTH ROW AND COLUMN to preserve light-square parity
      const newPos = `${7 - r},${7 - c}`;
      let newKey = pieceKey;
      if (pieceKey.startsWith("r")) {
        newKey = "b" + pieceKey.slice(1);
      } else if (pieceKey.startsWith("b")) {
        newKey = "r" + pieceKey.slice(1);
      }
      if (!PIECES[newKey]) {
        console.error("Invalid swapped piece key:", newKey, "from", pieceKey);
        continue;
      }
      swappedSetup[newPos] = newKey;
    }
    setup = swappedSetup;
  }

  // Place pieces with validation
  let pieceCount = 0;
  for (const pos in setup) {
    const [row, col] = pos.split(",").map(Number);
    const pieceKey = setup[pos];
    const pieceData = PIECES[pieceKey];
    if (!pieceData) {
      console.warn("Skipping unknown pieceKey:", pieceKey);
      continue;
    }
    const square = document.querySelector(
      `.square[data-row='${row}'][data-col='${col}']`
    );
    if (!square || !square.classList.contains("playable")) {
      console.warn("Invalid square for piece placement:", pos);
      continue;
    }

    const piece = document.createElement("div");
    piece.dataset.pieceKey = pieceKey;
    piece.classList.add("piece", pieceData.color);
    if (pieceData.isKing) piece.classList.add("king");
    piece.draggable = true;
    piece.tabIndex = 0;
    piece.dataset.value = pieceData.value;

    const label = document.createElement("span");
    label.classList.add("piece-number");
    label.textContent = pieceData.value;
    piece.appendChild(label);

    square.appendChild(piece);
    pieceCount++;
  }

  if (pieceCount === 0) {
    console.error("⚠️ No pieces were placed on the board!");
    showErrorMessage("Board setup failed. Please refresh.");
  }

  const initialState = saveBoardState();
  turnHistory = [{ player: null, endState: initialState, moves: [] }];
  currentTurnIndex = 0;
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

function evaluateBoardStateFromPerspective(
  board,
  redScore,
  blueScore,
  forColor
) {
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

  // Return the score of the player we care about (lower is better)
  return forColor === "red" ? totalRed : totalBlue;
}

function resetGame() {
  redScore = 0.0;
  blueScore = 0.0;
  redScoreEl.textContent = "0.00";
  blueScoreEl.textContent = "0.00";
  currentTurnHasCaptured = false;

  // ✅ ALWAYS start with red
  currentPlayer = "red";

  if (gameMode === "pvai") {
    const savedPlayerColor = localStorage.getItem("pvaiPlayerColor") || "red";
    window.humanColor = savedPlayerColor;
    window.aiColor = savedPlayerColor === "red" ? "blue" : "red";

    // Display "Human" if red is human, else "AI"
    const displayPlayer = currentPlayer === window.humanColor ? "Human" : "AI";
    currentPlayerEl.textContent = displayPlayer;
  } else {
    currentPlayerEl.textContent = "red";
  }

  // Sync turn indicator styling
  const currentPlayerLabel = document.querySelector(".current-turn-label");
  if (currentPlayerLabel) {
    currentPlayerLabel.setAttribute("data-player", currentPlayer);
  }

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

  // After placeInitialPieces()
  const boardWrapper = document.querySelector(".board-wrapper");
  if (boardWrapper) {
    if (gameMode === "pvai" && window.humanColor === "blue") {
      boardWrapper.classList.add("rotated");
    } else {
      boardWrapper.classList.remove("rotated");
    }
  }

  if (gameMode === "pvai" && window.aiColor === "red") {
    setTimeout(() => {
      if (!gameOver && currentPlayer === "red") {
        makeAIMove();
      }
    }, 1500);
  }
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
    // Gather remaining pieces
    const redPieces = Array.from(document.querySelectorAll(".piece.red"));
    const bluePieces = Array.from(document.querySelectorAll(".piece.blue"));

    let redRemaining = 0;
    let blueRemaining = 0;
    const redDetails = [];
    const blueDetails = [];

    redPieces.forEach((piece) => {
      const val = parseFloat(piece.dataset.value);
      const isKing = piece.classList.contains("king");
      const multiplier = isKing ? 2 : 1;
      const contribution = val * multiplier;
      redRemaining += contribution;
      redDetails.push(
        `${val}${isKing ? "*" : ""} (${
          isKing ? "DAMA" : "chip"
        }) → ${contribution.toFixed(0)}`
      );
    });

    bluePieces.forEach((piece) => {
      const val = parseFloat(piece.dataset.value);
      const isKing = piece.classList.contains("king");
      const multiplier = isKing ? 2 : 1;
      const contribution = val * multiplier;
      blueRemaining += contribution;
      blueDetails.push(
        `${val}${isKing ? "*" : ""} (${
          isKing ? "DAMA" : "chip"
        }) → ${contribution.toFixed(0)}`
      );
    });

    // Add to running scores
    const finalRed = (redScore + redRemaining).toFixed(2);
    const finalBlue = (blueScore + blueRemaining).toFixed(2);

    // Build two-column breakdown
    const redList = redDetails.length
      ? `<ul><li>${redDetails.join("</li><li>")}</li></ul>`
      : "<em>none</em>";
    const blueList = blueDetails.length
      ? `<ul><li>${blueDetails.join("</li><li>")}</li></ul>`
      : "<em>none</em>";

    let breakdown = `<br><br><strong>Final Piece Tally:</strong>`;
    breakdown += `
      <div class="piece-breakdown">
        <div class="column">
          <h4>Red Remaining</h4>
          ${redList}
          <p><strong>Total added:</strong> ${redRemaining.toFixed(2)}</p>
        </div>
        <div class="column">
          <h4>Blue Remaining</h4>
          ${blueList}
          <p><strong>Total added:</strong> ${blueRemaining.toFixed(2)}</p>
        </div>
      </div>
    `;

    // Final scores and winner
    breakdown += `
      <div class="final-scores">
        <p><strong>Final Scores:</strong><br>
        Red: ${redScore.toFixed(2)} + ${redRemaining.toFixed(
      2
    )} = <strong>${finalRed}</strong><br>
        Blue: ${blueScore.toFixed(2)} + ${blueRemaining.toFixed(
      2
    )} = <strong>${finalBlue}</strong>
        </p>
    `;
    if (parseFloat(finalRed) < parseFloat(finalBlue)) {
      breakdown +=
        "<p><strong>Red wins!</strong><br> (Lower score wins in Sci-Damath)</p>";
    } else if (parseFloat(finalBlue) < parseFloat(finalRed)) {
      breakdown +=
        "<p><strong>Blue wins!</strong><br> (Lower score wins in Sci-Damath)</p>";
    } else {
      breakdown += "<p><strong>It's a draw!</strong></p>";
    }
    breakdown += "</div>";

    finalMessage += breakdown;
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
  ) {
    closeBtn.focus();
  } else {
    newGameBtn.focus();
  }

  const handleEscape = (e) => {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", handleEscape);
    }
  };
  document.addEventListener("keydown", handleEscape);
}

function logMove() {
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
  let multiplier = 1;
  if (isCapturingKing && isCapturedKing) multiplier = 4;
  else if (isCapturingKing || isCapturedKing) multiplier = 2;
  return Number((Math.round(result * multiplier * 100) / 100).toFixed(2));
}

function minimizeAIScore(
  board,
  depth,
  alpha,
  beta,
  isAIturn,
  redScore,
  blueScore,
  aiColor
) {
  if (depth === 0) {
    return evaluateBoardStateFromPerspective(
      board,
      redScore,
      blueScore,
      aiColor
    );
  }

  const color = isAIturn ? aiColor : aiColor === "red" ? "blue" : "red";
  const moves = generateAllMoves(board, color);

  if (moves.length === 0) {
    return evaluateBoardStateFromPerspective(
      board,
      redScore,
      blueScore,
      aiColor
    );
  }

  if (isAIturn) {
    // AI's turn: minimize its own final score
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
        if (color === "red") newRed += gain;
        else newBlue += gain;
      }
      const eval = minimizeAIScore(
        newBoard,
        depth - 1,
        alpha,
        beta,
        false, // opponent's turn next
        newRed,
        newBlue,
        aiColor
      );
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
      if (beta <= alpha) break;
    }
    return minEval;
  } else {
    // Opponent's turn: assume they try to **minimize their own score**, but from AI's perspective,
    // we must consider worst-case (i.e., opponent makes move that leads to **highest AI score**).
    // However, in Sci-Damath, opponent also minimizes their own score — but AI cannot control that.
    // So we assume opponent plays **optimally for themselves**, not adversarially against AI.
    // But for simplicity and safety, we assume worst-case for AI: opponent maximizes AI's score.
    // This is standard in adversarial games.

    // 👉 So: opponent tries to MAXIMIZE AI's final score.
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
        if (color === "red") newRed += gain;
        else newBlue += gain;
      }
      const eval = minimizeAIScore(
        newBoard,
        depth - 1,
        alpha,
        beta,
        true, // AI's turn next
        newRed,
        newBlue,
        aiColor
      );
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
      if (beta <= alpha) break;
    }
    return maxEval;
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
 * Enforces Mayor Dama rules:
 *   - Maximize number of pieces captured in a single turn.
 *   - If tied in number of captures, prefer moves that START with a DAMA (king).
 */
function getAllBestCaptureMoves(board, color) {
  const allCaptureMoves = generateAllCaptureMoves(board, color);
  if (allCaptureMoves.length === 0) return [];

  // Evaluate each move's full capture chain potential
  const moveScores = allCaptureMoves.map((move) => {
    const startingPiece = board[move.startRow][move.startCol];
    const newBoard = applyLogicalMove(board, move);
    const landed = newBoard[move.endRow][move.endCol];

    // ✅ CRITICAL FIX: Use the STARTING piece's king status, not the landed piece's
    const startedAsKing = startingPiece?.isKing || false;

    // Simulate further captures from the new position
    const further = getMaxCaptureCount(
      newBoard,
      move.endRow,
      move.endCol,
      landed,
      new Set([`${move.startRow},${move.startCol}`])
    );

    const totalCaptures = move.captured.length + further;
    return { move, totalCaptures, startedAsKing };
  });

  // Find the maximum number of captures achievable
  const maxCaptures = Math.max(...moveScores.map((s) => s.totalCaptures));

  // Filter to only moves that achieve the maximum capture count
  let bestMoves = moveScores.filter((s) => s.totalCaptures === maxCaptures);

  // 👑 Mayor Dama Rule: If any best move starts with a DAMA, discard non-dama moves
  const hasDamaStarter = bestMoves.some((s) => s.startedAsKing);
  if (hasDamaStarter) {
    bestMoves = bestMoves.filter((s) => s.startedAsKing);
  }

  // Among bestMoves (same capture count), sort by estimated capture score
  bestMoves.sort((a, b) => {
    const pieceA = board[a.move.startRow][a.move.startCol];
    const capturedA = board[a.move.captured[0][0]][a.move.captured[0][1]];
    const opA = DAMATH_LAYOUT[a.move.endRow][a.move.endCol];
    const scoreA = calculateCaptureScoreSimulated(
      pieceA.value,
      capturedA.value,
      pieceA.isKing,
      capturedA.isKing,
      opA
    );

    const pieceB = board[b.move.startRow][b.move.startCol];
    const capturedB = board[b.move.captured[0][0]][b.move.captured[0][1]];
    const opB = DAMATH_LAYOUT[b.move.endRow][b.move.endCol];
    const scoreB = calculateCaptureScoreSimulated(
      pieceB.value,
      capturedB.value,
      pieceB.isKing,
      capturedB.isKing,
      opB
    );

    // AI wants MINIMAL score → lower score is better
    return scoreA - scoreB;
  });

  return bestMoves.map((s) => s.move);
}

/**
 * Minimax variant that always minimizes the AI's own total score.
 * - AI always minimizes its projected final score.
 * - Opponent is assumed to play optimally to maximize AI's score (adversarial).
 */
function minimizeAIScore(
  board,
  depth,
  alpha,
  beta,
  isAIturn,
  redScore,
  blueScore,
  aiColor
) {
  if (depth === 0) {
    // Evaluate from AI's perspective: return AI's projected total
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
    return aiColor === "red" ? totalRed : totalBlue;
  }

  const color = isAIturn ? aiColor : aiColor === "red" ? "blue" : "red";
  const moves = generateAllMoves(board, color);

  if (moves.length === 0) {
    // Terminal: return AI's total score
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
    return aiColor === "red" ? totalRed : totalBlue;
  }

  if (isAIturn) {
    // AI's turn: MINIMIZE its own score
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
        if (color === "red") newRed += gain;
        else newBlue += gain;
      }
      const eval = minimizeAIScore(
        newBoard,
        depth - 1,
        alpha,
        beta,
        false,
        newRed,
        newBlue,
        aiColor
      );
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
      if (beta <= alpha) break;
    }
    return minEval;
  } else {
    // Opponent's turn: MAXIMIZE AI's score (adversarial assumption)
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
        if (color === "red") newRed += gain;
        else newBlue += gain;
      }
      const eval = minimizeAIScore(
        newBoard,
        depth - 1,
        alpha,
        beta,
        true,
        newRed,
        newBlue,
        aiColor
      );
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
      if (beta <= alpha) break;
    }
    return maxEval;
  }
}

function switchTurn() {
  currentTurnHasCaptured = false;
  mustCaptureWithPiece = null;
  currentPlayer = currentPlayer === "red" ? "blue" : "red";
  currentPlayerEl.textContent = currentPlayer;
  const currentPlayerLabel = document.querySelector(".current-turn-label");
  if (currentPlayerLabel) {
    currentPlayerLabel.setAttribute("data-player", currentPlayer);
  }
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

  let displayPlayer = currentPlayer;
  if (gameMode === "pvai") {
    displayPlayer = currentPlayer === window.humanColor ? "Human" : "AI";
  }
  currentPlayerEl.textContent = displayPlayer;

  if (gameMode === "pvai" && currentPlayer === window.aiColor) {
    setTimeout(() => makeAIMove(), 1500);
  }
}

function makeAIMove() {
  if (gameOver || currentPlayer !== window.aiColor || replayMode) {
    return;
  }
  const board = createLogicalBoard();
  const color = window.aiColor;
  const aiDepth = window.aiDepth || 2;

  // Get legal moves (enforce Mayor Dama)
  const moves = getLegalMoves(board, color);
  if (moves.length === 0) {
    switchTurn();
    return;
  }

  let bestMove = null;
  let bestValue = Infinity; // We always minimize AI's score

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
      if (color === "red") newRed += gain;
      else newBlue += gain;
    }

    const value = minimizeAIScore(
      newBoard,
      aiDepth - 1,
      -Infinity,
      Infinity,
      false, // opponent's turn next
      newRed,
      newBlue,
      color // AI's color
    );

    if (value < bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }

  let finalMove = bestMove;
  if (!finalMove && moves.length > 0) {
    // No "best move" found → choose randomly among legal moves
    const randomIndex = Math.floor(Math.random() * moves.length);
    finalMove = moves[randomIndex];
  }

  executeLogicalMove(finalMove);
}

function appendMoveToHistoryDOM(entry) {
  const historyList = document.getElementById("move-history-content");
  if (!historyList) return;

  const moveItem = document.createElement("li");
  moveItem.className = `move-item ${entry.player}`;

  let moveText = "";

  if (entry.type === "promotion") {
    // Not a move — do NOT increment counter
    moveText = `<strong>${entry.player.toUpperCase()}</strong>: promoted to DAMA!`;
    // Optional: mark for clarity
    moveItem.setAttribute("data-type", "annotation");
  } else {
    // Real move — increment counter
    actualMoveCount++;
    const moveNumber = actualMoveCount;

    const dispStartRow = 7 - entry.startRow;
    const dispEndRow = 7 - entry.endRow;

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
      moveText = `<strong>${entry.player.toUpperCase()}</strong>: [(${dispStartRow},${
        entry.startCol
      }) [${val1Display}] ${op} (${dispEndRow},${
        entry.endCol
      }) [${val2Display}]] × ${multiplier} = ${baseScore} × ${multiplier} = <span class="result ${
        entry.result >= 0 ? "positive" : "negative"
      }">${finalScore}</span>`;
    } else if (entry.type === "move") {
      moveText = `<strong>${entry.player.toUpperCase()}</strong>: (${
        entry.value
      }) moved from (${dispStartRow},${entry.startCol}) to (${dispEndRow},${
        entry.endCol
      })`;
    }
    moveText = `(${moveNumber}) ${moveText}`;
    moveItem.setAttribute("data-type", "move"); // 👈 or omit, but promotion has annotation
  }

  moveItem.innerHTML = moveText;
  historyList.appendChild(moveItem);

  const container = document.querySelector(".move-history-scrollable");
  if (container) container.scrollTop = container.scrollHeight;
}

function performMove(piece, startRow, startCol, endRow, endCol) {
  if (gameOver || replayMode) return;
  const color = piece.classList.contains("red") ? "red" : "blue";
  const pieceKey =
    Array.from(piece.classList).find((cls) => cls.match(/^[rb]\d+(_king)?$/)) ||
    piece.dataset.pieceKey ||
    "piece";
  const pieceValue = parseFloat(piece.dataset.value);
  const isKing = piece.classList.contains("king");
  const board = createLogicalBoard();

  // ===== MOVE VALIDATION (with forced capture handling) =====
  let allowedMoves = [];
  if (mustCaptureWithPiece) {
    // 🔒 Mid-chain: ONLY allow further captures from this piece
    const currentPiece = board[startRow][startCol];
    if (!currentPiece || currentPiece.color !== color) {
      showErrorMessage("Invalid piece for continuation.");
      return;
    }
    allowedMoves = getImmediateCaptures(
      board,
      startRow,
      startCol,
      currentPiece
    );
  } else {
    // 🌍 Start of turn: full Mayor Dama enforcement
    const allMoves = generateAllMoves(board, color);
    const captureMoves = allMoves.filter((m) => m.isCapture);
    if (captureMoves.length > 0) {
      allowedMoves = getAllBestCaptureMoves(board, color);
    } else {
      allowedMoves = allMoves;
    }
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
      mustCaptureWithPiece
        ? "Invalid move. You must continue capturing with the same piece."
        : "Invalid move. Mayor Dama rule requires the highest-priority capture."
    );
    return;
  }
  // ===== End Validation =====

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
    playSound("capture");
    currentTurnMoveIds.push(moveData);
    appendMoveToHistoryDOM(moveData);
    capturedPieces.forEach((p) => p.remove());
  } else {
    const moveData = {
      type: "move",
      player: color,
      piece: pieceKey,
      value: pieceValue,
      startRow,
      startCol,
      endRow,
      endCol,
    };
    playSound("move");
    currentTurnMoveIds.push(moveData);
    appendMoveToHistoryDOM(moveData);
  }

  const endSq = document.querySelector(
    `.square[data-row='${endRow}'][data-col='${endCol}']`
  );
  endSq.appendChild(piece);

  // Check for promotion
  const wasPromoted =
    (!isKing && color === "red" && endRow === 0) ||
    (!isKing && color === "blue" && endRow === 7);
  if (wasPromoted) {
    const newPieceKey = pieceKey + "_king";
    piece.classList.add("king");
    piece.dataset.pieceKey = newPieceKey;
    const moveData = { type: "promotion", player: color, piece: pieceKey };
    playSound("promotion");
    currentTurnMoveIds.push(moveData);
    appendMoveToHistoryDOM(moveData);
  }

  // ✅ CRITICAL: Only allow continuation if THIS MOVE was a capture
  const newBoard = createLogicalBoard();
  const landedPiece = newBoard[endRow][endCol];
  let furtherCaptures = [];

  // 👇 Only check for further captures if this turn has already captured
  if (capturedPieces.length > 0 && landedPiece && landedPiece.color === color) {
    furtherCaptures = getImmediateCaptures(
      newBoard,
      endRow,
      endCol,
      landedPiece
    ).filter((move) => (move.endRow + move.endCol) % 2 === 0); // ✅ Only light squares
  }

  if (furtherCaptures.length > 0) {
    mustCaptureWithPiece = piece;
    if (gameMode === "pvai" && color === window.aiColor) {
      // ✅ Enhanced AI continuation: maximize captures, then minimize score
      let bestNext = null;
      let bestChain = -1;
      let bestScore = Infinity;

      const currentPieceLogical = newBoard[endRow][endCol];

      for (const move of furtherCaptures) {
        // Simulate this jump
        const testBoard = applyLogicalMove(newBoard, move);
        const landed = testBoard[move.endRow][move.endCol];

        // 1. Evaluate remaining chain length
        const chainLength =
          1 +
          getMaxCaptureCount(
            testBoard,
            move.endRow,
            move.endCol,
            landed,
            new Set()
          );

        // 2. Evaluate Sci-Damath score of THIS jump
        const capturedLogical =
          newBoard[move.captured[0][0]][move.captured[0][1]];
        const op = DAMATH_LAYOUT[move.endRow][move.endCol];
        const jumpScore = calculateCaptureScoreSimulated(
          currentPieceLogical.value,
          capturedLogical.value,
          currentPieceLogical.isKing,
          capturedLogical.isKing,
          op
        );

        // 3. Compare: prioritize longer chains, then lower score
        if (
          chainLength > bestChain ||
          (chainLength === bestChain && jumpScore < bestScore)
        ) {
          bestChain = chainLength;
          bestScore = jumpScore;
          bestNext = move;
        }
      }

      const next = bestNext || furtherCaptures[0];
      if (next) {
        setTimeout(() => {
          if (!gameOver) {
            performMove(
              piece,
              next.startRow,
              next.startCol,
              next.endRow,
              next.endCol
            );
          }
        }, 600);
        return;
      }
    }
    // Human: wait for input — do nothing
  }

  // ✅ Always end turn if no valid continuation
  mustCaptureWithPiece = null;
  switchTurn();

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
