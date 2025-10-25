const gameboard = document.getElementById("gameboard");
const redScoreEl = document.getElementById("red-score");
const blueScoreEl = document.getElementById("blue-score");
const currentPlayerEl = document.getElementById("current-player");
const errorMessageEl = document.getElementById("error-message");
let redScore = 0.0;
let blueScore = 0.0;
let currentPlayer = "red";
let selectedPiece = null;
let moveHistoryEntries = [];
let turnHistory = []; // Each entry: { player, startState, endState, moveCount }
let currentHistoryIndex = -1;
let currentTurnIndex = -1; // Index of last completed turn
let currentTurnStartState = null; // State at start of current (incomplete) turn
let isTurnActive = false;
let moveHistory = []; // For repetition detection
let surrenderRequested = null; // "red", "blue", or null
let sessionMinutes = 20;
let sessionSeconds = 0;
let roundMinutes = 1;
let roundSeconds = 0;
let sessionInterval;
let roundInterval;
let timersStarted = false;
let mustCaptureWithPiece = null;
let replayMode = false;
let replayInterval = null;
let gameOver = false;
let piecesTransparent = false;
let aiDepth = 1; // Default depth
const savedDifficulty = localStorage.getItem('aiDifficulty');
if (savedDifficulty && [1, 3, 4, 6].includes(parseInt(savedDifficulty))) {
  aiDepth = parseInt(savedDifficulty);
}
// src/assets/js/app.js
// Detect game mode from URL
const path = window.location.pathname;
let gameMode = 'pvp'; // default
if (path.includes('/pvai/')) {
  gameMode = 'pvai';
} else if (path.includes('/debug_mode/')) {
  gameMode = 'debug';
  window.debugMode = true; // Enable debug setup
}
// Rest of your game logic stays the same
// Only branch when needed:
if (gameMode === 'pvai' && currentPlayer === 'blue') {
  makeAIMove(); // AI logic only in pvai
}
// Support external debug mode flag
if (typeof window.debugMode === 'undefined') {
  window.debugMode = false;
}
let debugMode = window.debugMode;
// ================== INITIAL SETUP (LIGHT SQUARES) ==================
let INITIAL_SETUP = {
  "0,0": "b1",
  "0,2": "b2",
  "0,4": "b3",
  "0,6": "b4",
  "1,1": "b5",
  "1,3": "b6",
  "1,5": "b7",
  "1,7": "b8",
  "2,0": "b9",
  "2,2": "b10",
  "2,4": "b11",
  "2,6": "b12",
  "5,1": "r1",
  "5,3": "r2",
  "5,5": "r3",
  "5,7": "r4",
  "6,0": "r5",
  "6,2": "r6",
  "6,4": "r7",
  "6,6": "r8",
  "7,1": "r9",
  "7,3": "r10",
  "7,5": "r11",
  "7,7": "r12",
};
let DEBUG_SETUP = {
  "0,0": "r2",
  "7,7": "r6",
  "2,4": "b1",
  "4,4": "b2",
  "2,2": "b3",
  "4,2": "b4",
};
const sessionEl = document.getElementById("session-time");
const roundEl = document.getElementById("round-time");
// ================== UNIFIED GAME LOGIC (DOM-FREE) ==================
const DIRECTIONS = {
  red: [[-1, -1], [-1, 1]],
  blue: [[1, -1], [1, 1]],
  king: [[-1, -1], [-1, 1], [1, -1], [1, 1]]
};
// Convert DOM board to logical state
function createLogicalBoard() {
  const board = Array(8).fill().map(() => Array(8).fill(null));
  document.querySelectorAll('.piece').forEach(el => {
    const sq = el.parentElement;
    const r = parseInt(sq.dataset.row, 10);
    const c = parseInt(sq.dataset.col, 10);
    const color = el.classList.contains('red') ? 'red' : 'blue';
    const isKing = el.classList.contains('king');
    const value = parseFloat(el.dataset.value);
    board[r][c] = { color, value, isKing };
  });
  return board;
}
// Apply move to logical board (returns new board)
function applyLogicalMove(board, move) {
  const newBoard = board.map(row => [...row]);
  const { startRow, startCol, endRow, endCol, captured = [] } = move;
  // Move piece
  newBoard[endRow][endCol] = newBoard[startRow][startCol];
  newBoard[startRow][startCol] = null;
  // Remove captured pieces
  for (const [r, c] of captured) {
    newBoard[r][c] = null;
  }
  // Promote if needed
  const piece = newBoard[endRow][endCol];
  if (piece && !piece.isKing) {
    if ((piece.color === 'red' && endRow === 0) || (piece.color === 'blue' && endRow === 7)) {
      newBoard[endRow][endCol] = { ...piece, isKing: true };
    }
  }
  return newBoard;
}
// Generate all capture moves for a player
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
// Generate all non-capture moves
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
          // 👑 KING: slide any distance
          while (endR >= 0 && endR < 8 && endC >= 0 && endC < 8) {
            if (board[endR][endC]) break;
            moves.push({ startRow: r, startCol: c, endRow: endR, endCol: endC, isCapture: false });
            endR += dr;
            endC += dc;
          }
        } else {
          // 🔒 NON-KING: single step only
          if (endR >= 0 && endR < 8 && endC >= 0 && endC < 8 && !board[endR][endC]) {
            moves.push({ startRow: r, startCol: c, endRow: endR, endCol: endC, isCapture: false });
          }
        }
      }
    }
  }
  return moves;
}
// Main move generator
function generateAllMoves(board, color) {
  const captures = generateAllCaptureMoves(board, color);
  if (captures.length > 0) {
    return captures;
  }
  return generateAllNonCaptureMoves(board, color);
}
// Evaluate board for minimax
function evaluateBoardState(board, redScore, blueScore) {
  let redPieceValue = 0;
  let bluePieceValue = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const mult = p.isKing ? 2 : 1;
      if (p.color === 'red') redPieceValue += p.value * mult;
      else bluePieceValue += p.value * mult;
    }
  }
  const totalRed = redScore + redPieceValue;
  const totalBlue = blueScore + bluePieceValue;
  return totalBlue - totalRed; // Blue wants this LOW
}
// Minimax with alpha-beta
function minimax(board, depth, alpha, beta, maximizingPlayer, redScore, blueScore) {
  if (depth === 0) {
    return evaluateBoardState(board, redScore, blueScore);
  }
  const color = maximizingPlayer ? 'blue' : 'red';
  const moves = generateAllMoves(board, color);
  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = applyLogicalMove(board, move);
      const eval = minimax(newBoard, depth - 1, alpha, beta, false, redScore, blueScore);
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = applyLogicalMove(board, move);
      const eval = minimax(newBoard, depth - 1, alpha, beta, true, redScore, blueScore);
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}
// Map logical move back to DOM piece
function findPieceInDOM(startRow, startCol) {
  const sq = document.querySelector(`.square[data-row='${startRow}'][data-col='${startCol}']`);
  return sq ? sq.querySelector('.piece') : null;
}
// Execute logical move in DOM
function executeLogicalMove(move) {
  const piece = findPieceInDOM(move.startRow, move.startCol);
  if (!piece) {
    console.error("Piece not found for move:", move);
    return;
  }
  performMove(piece, move.startRow, move.startCol, move.endRow, move.endCol);
}
// ================== PIECES ==================
const PIECES = {
  r1: { color: "red", value: -9 },
  r2: { color: "red", value: 6 },
  r3: { color: "red", value: -1 },
  r4: { color: "red", value: 4 },
  r5: { color: "red", value: 0 },
  r6: { color: "red", value: -3 },
  r7: { color: "red", value: 10 },
  r8: { color: "red", value: -7 },
  r9: { color: "red", value: -11 },
  r10: { color: "red", value: 8 },
  r11: { color: "red", value: -5 },
  r12: { color: "red", value: 2 },
  b1: { color: "blue", value: 2 },
  b2: { color: "blue", value: -5 },
  b3: { color: "blue", value: 8 },
  b4: { color: "blue", value: -11 },
  b5: { color: "blue", value: -7 },
  b6: { color: "blue", value: 10 },
  b7: { color: "blue", value: -3 },
  b8: { color: "blue", value: 0 },
  b9: { color: "blue", value: 4 },
  b10: { color: "blue", value: -1 },
  b11: { color: "blue", value: 6 },
  b12: { color: "blue", value: -9 },
};
// ================== DAMATH LAYOUT ==================
const DAMATH_LAYOUT = [
  ["x", "", "÷", "", "-", "", "+", ""],
  ["", "÷", "", "x", "", "+", "", "-"],
  ["-", "", "+", "", "x", "", "÷", ""],
  ["", "+", "", "-", "", "÷", "", "x"],
  ["x", "", "÷", "", "-", "", "+", ""],
  ["", "÷", "", "x", "", "+", "", "-"],
  ["-", "", "+", "", "x", "", "÷", ""],
  ["", "+", "", "-", "", "÷", "", "x"],
];
// ================== SOUND EFFECTS ==================
const sounds = {
  move: document.getElementById("move-sound"),
  capture: document.getElementById("capture-sound"),
  promotion: document.getElementById("move-promotion001"),
  gameStart: document.getElementById("game-start"),
  gameEnd: document.getElementById("game-end"),
};
function playSound(soundName) {
  const sound = sounds[soundName];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch((e) => console.log("Audio play failed:", e));
  }
}
// ================== GAME STATUS MESSAGES ==================
function showErrorMessage(message) {
  if (!errorMessageEl) return;
  errorMessageEl.textContent = message;
  errorMessageEl.hidden = false;
  setTimeout(() => {
    errorMessageEl.hidden = true;
  }, 5000);
}
// ================== BOARD RENDERING (PURE FUNCTION) ==================
function createBoardDOM(showPieces = false, setup = null) {
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      const isLight = (row + col) % 2 === 0;
      square.classList.add("square", isLight ? "light" : "dark");
      if (isLight) square.classList.add("playable");
      square.dataset.row = row;
      square.dataset.col = col;
      const symbol = document.createElement("span");
      symbol.classList.add("symbol");
      symbol.textContent = DAMATH_LAYOUT[row][col];
      symbol.setAttribute("aria-hidden", "true");
      square.appendChild(symbol);
      if (showPieces && setup && setup[`${row},${col}`]) {
        const pieceKey = setup[`${row},${col}`];
        const pieceData = PIECES[pieceKey];
        if (pieceData) {
          const piece = document.createElement("div");
          piece.classList.add("piece", pieceData.color);
          piece.dataset.value = pieceData.value;
          const label = document.createElement("span");
          label.classList.add("piece-number");
          label.textContent = pieceData.value;
          piece.appendChild(label);
        }
      }
      fragment.appendChild(square);
    }
  }
  return fragment;
}
// ================== BOARD GENERATION ==================
function initializeBoard() {
  try {
    gameboard.innerHTML = "";
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement("div");
        const isLight = (row + col) % 2 === 0;
        square.classList.add("square", isLight ? "light" : "dark");
        square.dataset.row = row;
        square.dataset.col = col;
        if (isLight) square.classList.add("playable");
        const symbol = document.createElement("span");
        symbol.classList.add("symbol");
        symbol.textContent = DAMATH_LAYOUT[row][col];
        symbol.setAttribute("aria-hidden", "true");
        square.appendChild(symbol);
        gameboard.appendChild(square);
      }
    }
    placeInitialPieces();
  } catch (error) {
    showErrorMessage("Failed to initialize board: " + error.message);
    console.error("Board initialization error:", error);
  }
}
// ================== UTIL FUNCTIONS ==================
function getMathSymbol(row, col) {
  return DAMATH_LAYOUT[row][col];
}
function highlightMoveSquares(startRow, startCol, endRow, endCol) {
  clearMoveHighlights();
  const fromSquare = document.querySelector(
    `.square[data-row='${startRow}'][data-col='${startCol}']`
  );
  const toSquare = document.querySelector(
    `.square[data-row='${endRow}'][data-col='${endCol}']`
  );
  if (fromSquare) fromSquare.classList.add("move-from");
  if (toSquare) toSquare.classList.add("move-to");
  setTimeout(clearMoveHighlights, 2000);
}
function switchTurn() {
  mustCaptureWithPiece = null; // 👈 Prevent lockup
  currentPlayer = currentPlayer === "red" ? "blue" : "red";
  currentPlayerEl.textContent = currentPlayer;
  const currentPlayerLabel = document.querySelector(".current-player-label");
  if (currentPlayerLabel) {
    currentPlayerLabel.setAttribute("data-player", currentPlayer);
  }
  if (roundInterval) clearInterval(roundInterval);
  roundMinutes = 1;
  roundSeconds = 0;
  roundEl.className = "timer";
  roundEl.classList.add(currentPlayer === "red" ? "timer-red" : "timer-blue");
  startRoundTimer();
  // AI move logic
  if (gameMode === "pvai" && currentPlayer === "blue") {
    setTimeout(() => {
      makeAIMove();
    }, 750);
  }
}
// ================== MINIMAX AI WITH ALPHA-BETA PRUNING ==================
function makeAIMove() {
  if (gameOver || currentPlayer !== "blue" || replayMode) return;
  const board = createLogicalBoard();
  const color = "blue";
  // Handle forced capture chain
  if (mustCaptureWithPiece) {
    const sq = mustCaptureWithPiece.parentElement;
    const startRow = parseInt(sq.dataset.row, 10);
    const startCol = parseInt(sq.dataset.col, 10);
    const piece = board[startRow][startCol];
    if (piece && piece.color === color) {
      const captureMoves = getImmediateCaptures(board, startRow, startCol, piece); // ✅ NEW
      if (captureMoves.length > 0) {
        const chosen = captureMoves[0]; // or pick best
        executeLogicalMove(chosen);
        return;
      }
    }
  }
  const moves = generateAllMoves(board, color);
  if (moves.length === 0) {
    switchTurn();
    return;
  }
  if (aiDepth === 1) {
    const chosen = moves[0]; // already prioritizes captures
    executeLogicalMove(chosen);
    return;
  }
  // Blue is minimizing: we want the move with the LOWEST evaluation
  let bestMove = moves[0];
  let bestValue = Infinity; // ← was -Infinity
  for (const move of moves) {
    const newBoard = applyLogicalMove(board, move);
    // After Blue moves, it's Red's turn → maximizingPlayer = true
    const value = minimax(newBoard, aiDepth - 1, -Infinity, Infinity, true, redScore, blueScore);
    if (value < bestValue) { // ← minimize
      bestValue = value;
      bestMove = move;
    }
  }
  executeLogicalMove(bestMove);
}
// Returns only 1-step capture moves from (r, c)
// Returns only ONE jump (not full chains) — suitable for step-by-step execution
function getImmediateCaptures(board, r, c, piece) {
  const captures = [];
  const color = piece.color;
  const isKing = piece.isKing;
  const dirs = DIRECTIONS.king; // All 4 diagonal directions
  for (const [dr, dc] of dirs) {
    if (isKing) {
      // 👑 INTERNATIONAL-STYLE FLYING KING
      // Step 1: Find the FIRST enemy piece in this direction
      let nr = r + dr;
      let nc = c + dc;
      let enemyR = null, enemyC = null;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const target = board[nr][nc];
        if (target) {
          if (target.color === color) break; // blocked by own piece
          enemyR = nr;
          enemyC = nc;
          break; // found first enemy → stop scanning
        }
        nr += dr;
        nc += dc;
      }
      if (enemyR === null) continue; // no enemy found
      // Step 2: Allow landing on ANY empty square BEYOND the enemy
      let landR = enemyR + dr;
      let landC = enemyC + dc;
      while (landR >= 0 && landR < 8 && landC >= 0 && landC < 8) {
        if (board[landR][landC]) break; // blocked by another piece
        // Valid capture: jump over enemy and land here
        captures.push({
          startRow: r,
          startCol: c,
          endRow: landR,
          endCol: landC,
          captured: [[enemyR, enemyC]],
          isCapture: true
        });
        // Continue to next possible landing square (flying king)
        landR += dr;
        landC += dc;
      }
    } else {
      // 🔒 NON-KING: Sci-Damath rule — 2-square jump in ANY direction (including backward)
      const midR = r + dr;
      const midC = c + dc;
      const landR = midR + dr;
      const landC = midC + dc;
      // Bounds check
      if (
        midR < 0 || midR >= 8 || midC < 0 || midC >= 8 ||
        landR < 0 || landR >= 8 || landC < 0 || landC >= 8
      ) continue;
      const midPiece = board[midR][midC];
      const landPiece = board[landR][landC];
      // Must have enemy in middle and empty landing
      if (!midPiece || midPiece.color === color || landPiece) continue;
      captures.push({
        startRow: r,
        startCol: c,
        endRow: landR,
        endCol: landC,
        captured: [[midR, midC]],
        isCapture: true
      });
    }
  }
  return captures;
}
function calculateFinalScores() {
  const redPieces = document.querySelectorAll(".piece.red");
  const bluePieces = document.querySelectorAll(".piece.blue");
  let redRemaining = 0;
  redPieces.forEach((piece) => {
    const val = parseFloat(piece.dataset.value);
    const mult = piece.classList.contains("king") ? 2 : 1;
    redRemaining += val * mult;
  });
  let blueRemaining = 0;
  bluePieces.forEach((piece) => {
    const val = parseFloat(piece.dataset.value);
    const mult = piece.classList.contains("king") ? 2 : 1;
    blueRemaining += val * mult;
  });
  redScore += redRemaining;
  blueScore += blueRemaining;
  if (redRemaining !== 0) {
    logMove({
      type: "final-tally",
      player: "red",
      value: redRemaining,
    });
  }
  if (blueRemaining !== 0) {
    logMove({
      type: "final-tally",
      player: "blue",
      value: blueRemaining,
    });
  }
  return { red: redScore, blue: blueScore };
}
function saveBoardState() {
  const state = {
    redScore: redScore,
    blueScore: blueScore,
    currentPlayer: currentPlayer,
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
    const value = piece.dataset.value;
    const color = piece.classList.contains("red") ? "red" : "blue";
    let pieceKey = null;
    for (const key in PIECES) {
      if (
        PIECES[key].color === color &&
        PIECES[key].value.toString() === value
      ) {
        pieceKey = key;
        break;
      }
    }
    if (!pieceKey) {
      pieceKey =
        color === "red" ? `r${Math.abs(value)}` : `b${Math.abs(value)}`;
    }
    state.pieces.push({
      key: pieceKey,
      row: parseInt(square.dataset.row),
      col: parseInt(square.dataset.col),
      isKing: piece.classList.contains("king"),
      value: value,
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
  if (currentPlayerLabel) {
    currentPlayerLabel.setAttribute("data-player", currentPlayer);
  }
  mustCaptureWithPiece = null;
  if (state.mustCaptureWithPiece) {
    const { row, col } = state.mustCaptureWithPiece;
    const square = document.querySelector(
      `.square[data-row='${row}'][data-col='${col}']`
    );
    if (square) {
      mustCaptureWithPiece = square.querySelector(".piece");
    }
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
// ================== DEPED SCORING ==================
function calculateSciDamathScore(capturingPiece, capturedPiece, operator) {
  const capturingValue = parseFloat(capturingPiece.dataset.value);
  const capturedValue = parseFloat(capturedPiece.dataset.value);
  const isCapturingKing = capturingPiece.classList.contains("king");
  const isCapturedKing = capturedPiece.classList.contains("king");
  let result;
  if (operator.trim().includes("÷") || operator.trim() === "/") {
    if (capturedValue === 0) {
      console.warn("Sci-Damath: Division by zero! Score = 0.00");
      return 0.0;
    }
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
      console.error("Unknown operator:", operator);
      result = 0;
  }
  let multiplier = 1;
  if (isCapturingKing && isCapturedKing) {
    multiplier = 4;
  } else if (isCapturingKing || isCapturedKing) {
    multiplier = 2;
  }
  const finalResult = result * multiplier;
  const rounded = Math.round(finalResult * 100) / 100;
  return Number(rounded.toFixed(2));
}
// ================== MOVE HISTORY ==================
function logMove(moveData) {
  if (replayMode) return;
  const moveEntry = {
    type: moveData.type,
    player: moveData.player,
    piece: moveData.piece,
    capturingValue: moveData.capturingValue,
    operator: moveData.operator,
    capturedValue: moveData.capturedValue,
    result: moveData.result,
    value: moveData.value,
    endRow: moveData.endRow,
    endCol: moveData.endCol,
  };
  moveHistoryEntries = moveHistoryEntries.slice(0, currentHistoryIndex + 1);
  moveHistoryEntries.push(moveEntry);
  currentHistoryIndex++;
  updateMoveHistoryDOM();
}
function updateMoveHistoryDOM() {
  const historyList = document.getElementById("move-history-content");
  if (!historyList) return;
  historyList.innerHTML = "";
  for (let i = 0; i <= currentHistoryIndex; i++) {
    const entry = moveHistoryEntries[i];
    const moveItem = document.createElement("li");
    moveItem.className = `move-item ${entry.player}`;
    let moveText = "";
    if (entry.type === "capture") {
      let multiplier = 1;
      let multiplierText = "×1";
      if (entry.isCapturingKing && entry.isCapturedKing) {
        multiplier = 4;
        multiplierText = "×4 (DAMA vs DAMA)";
      } else if (entry.isCapturingKing || entry.isCapturedKing) {
        multiplier = 2;
        multiplierText = "×2 (DAMA involved)";
      }
      const resultClass =
        entry.result > 0 ? "positive" : entry.result < 0 ? "negative" : "zero";
      moveText = `
    <strong>${entry.player.toUpperCase()}</strong>: 
    ${entry.piece}(${entry.capturingValue}) 
    <span class="operator">${entry.operator}</span> 
    (${entry.capturedValue}) = 
    <span class="result ${resultClass}">
      ${entry.result.toFixed(2)} (${multiplierText})
    </span>
  `;
    } else if (entry.type === "move") {
      moveText = `
        <strong>${entry.player.toUpperCase()}</strong>: 
        ${entry.piece}(${entry.value}) moved to (${entry.endRow},${entry.endCol
        })
      `;
    } else if (entry.type === "promotion") {
      moveText = `
        <strong>${entry.player.toUpperCase()}</strong>: 
        ${entry.piece} promoted to DAMA!
      `;
    } else if (entry.type === "final-tally") {
      moveText = `
    <strong>${entry.player.toUpperCase()}</strong>: 
    Final tally of remaining pieces = 
    <span class="result ${entry.value >= 0 ? "positive" : "negative"}">
      ${entry.value.toFixed(2)} (×2 for each DAMA)
    </span>
  `;
    }
    moveItem.innerHTML = moveText;
    historyList.appendChild(moveItem);
  }
  const scrollableContainer = document.querySelector(
    ".move-history-scrollable"
  );
  if (scrollableContainer) {
    scrollableContainer.scrollTop = scrollableContainer.scrollHeight;
  }
}
// ================== PERFORM MOVE ==================
function performMove(piece, startRow, startCol, endRow, endCol) {
  if (gameOver || replayMode) return;

  const color = piece.classList.contains("red") ? "red" : "blue";
  const pieceKey =
    Array.from(piece.classList).find((cls) => cls.match(/^[rb]\d+$/)) ||
    "piece";
  const pieceValue = parseFloat(piece.dataset.value);
  const isKing = piece.classList.contains("king");

  // === Use unified logical move validation ===
  const board = createLogicalBoard();
  const allMoves = generateAllMoves(board, color);
  const matchingMove = allMoves.find(m =>
    m.startRow === startRow &&
    m.startCol === startCol &&
    m.endRow === endRow &&
    m.endCol === endCol
  );
  if (!matchingMove) {
    console.warn("Invalid move attempted:", { startRow, startCol, endRow, endCol });
    return;
  }

  let capturedPieces = [];
  if (matchingMove.isCapture) {
    capturedPieces = matchingMove.captured.map(([r, c]) => {
      const sq = document.querySelector(`.square[data-row='${r}'][data-col='${c}']`);
      return sq ? sq.querySelector('.piece') : null;
    }).filter(p => p);
  }

  let scoreChange = 0;
  if (capturedPieces.length > 0) {
    const capturedPiece = capturedPieces[0];
    if (!capturedPiece) {
      console.error("Captured piece is undefined!");
      return;
    }
    const operator = getMathSymbol(endRow, endCol);
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
      operator: operator,
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
      endRow: endRow,
      endCol: endCol,
    });
  }

  // === MOVE THE PIECE IN DOM ===
  const endSq = document.querySelector(
    `.square[data-row='${endRow}'][data-col='${endCol}']`
  );
  endSq.appendChild(piece);

  // === KING PROMOTION ===
  let wasPromoted = false;
  if (!isKing) {
    if (color === "red" && endRow === 0) {
      makeKing(piece);
      wasPromoted = true;
    }
    if (color === "blue" && endRow === 7) {
      makeKing(piece);
      wasPromoted = true;
    }
  }
  if (wasPromoted) {
    playSound("promotion");
    logMove({
      type: "promotion",
      player: color,
      piece: pieceKey,
    });
  }

  // === TURN & CHAIN CAPTURE LOGIC ===
  let turnEnded = false;
  if (wasPromoted) {
    // Promotion ends the turn immediately
    mustCaptureWithPiece = null;
    switchTurn();
    turnEnded = true;
  } else if (capturedPieces.length > 0) {
    // Check for further captures
    setTimeout(() => {
      const newBoard = createLogicalBoard();
      const landedPiece = newBoard[endRow][endCol];
      if (landedPiece && landedPiece.color === color) {
        const furtherCaptures = getImmediateCaptures(newBoard, endRow, endCol, landedPiece);
        if (furtherCaptures.length > 0) {
          mustCaptureWithPiece = piece;
          // AI auto-continues chain
          if (gameMode === 'pvai' && color === 'blue') {
            const nextMove = furtherCaptures[0];
            setTimeout(() => {
              performMove(piece, nextMove.startRow, nextMove.startCol, nextMove.endRow, nextMove.endCol);
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

  // === TURN-BASED STATE TRACKING FOR UNDO ===
  const currentState = saveBoardState();

  // Initialize turn start state if this is the first move of a turn
  if (currentTurnStartState === null) {
    currentTurnStartState = currentState;
  }

  // Save turn when it ends
  if (turnEnded) {
    // Push a turn entry: { player, startState, endState }
    const turnEntry = {
      player: color,
      startState: currentTurnStartState,
      endState: currentState
    };

    // Maintain turn history (replace future if redo was used)
    currentTurnStartState = currentState;
    turnHistory = turnHistory.slice(0, currentTurnIndex + 1);
    turnHistory.push(turnEntry);
    currentTurnIndex++;
    currentTurnStartState = null;

    // Reset for next turn
    currentTurnStartState = null;
  }

  // === VISUAL FEEDBACK ===
  if (!replayMode) {
    highlightMoveSquares(startRow, startCol, endRow, endCol);
  }
  clearValidMoves();

  // === START TIMERS IF NOT YET STARTED ===
  if (!timersStarted) {
    timersStarted = true;
    startSessionTimer();
    startRoundTimer();
    playSound("gameStart");
  }

  // === CHECK GAME OVER CONDITIONS ===
  setTimeout(() => checkGameOver(), 100);
}

// ================== KING PROMOTION (NO IMAGE) ==================
function makeKing(piece) {
  piece.classList.add("king");
  piece.classList.add("promote");
  setTimeout(() => piece.classList.remove("promote"), 600);
}
// ================== DEBUG KINGS ==================
function makeDebugKings() {
  const positions = ["0,0", "7,7"];
  positions.forEach((pos) => {
    const [row, col] = pos.split(",").map(Number);
    const sq = document.querySelector(
      `.square[data-row='${row}'][data-col='${col}']`
    );
    const piece = sq?.querySelector(".piece.red");
    if (piece && !piece.classList.contains("king")) makeKing(piece);
  });
}
// ================== VALID MOVES ==================
function showValidMoves(piece, startRow, startCol) {
  clearValidMoves();
  const board = createLogicalBoard();
  const allMoves = generateAllMoves(board, currentPlayer);
  const validEnds = new Set();
  for (const m of allMoves) {
    if (m.startRow === startRow && m.startCol === startCol) {
      validEnds.add(`${m.endRow},${m.endCol}`);
    }
  }
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (validEnds.has(`${r},${c}`)) {
        const sq = document.querySelector(`.square[data-row='${r}'][data-col='${c}']`);
        if (sq) sq.classList.add("valid-move");
      }
    }
  }
}
function clearValidMoves() {
  document.querySelectorAll(".square.valid-move").forEach((sq) => {
    sq.classList.remove("valid-move");
  });
  document.querySelectorAll(".square.piece-dragging").forEach((sq) => {
    sq.classList.remove("piece-dragging");
  });
}
// ================== INPUT HANDLERS ==================
gameboard.addEventListener("click", (e) => {
  // Prevent player interaction during AI turn in PvAI mode
  if (gameMode === 'pvai' && currentPlayer === 'blue') {
    return;
  }
  const piece = e.target.closest(".piece");
  const square = e.target.closest(".square");
  if (!square || !square.classList.contains("playable")) return;
  if (piece && piece.classList.contains(currentPlayer)) {
    document.querySelectorAll(".square.piece-selected").forEach((sq) => {
      sq.classList.remove("piece-selected");
    });
    selectedPiece = piece;
    const pieceSquare = piece.parentElement;
    const startRow = parseInt(pieceSquare.dataset.row, 10);
    const startCol = parseInt(pieceSquare.dataset.col, 10);
    showValidMoves(piece, startRow, startCol);
    return;
  }
  if (selectedPiece && square) {
    const startSq = selectedPiece.parentElement;
    const startRow = parseInt(startSq.dataset.row, 10);
    const startCol = parseInt(startSq.dataset.col, 10);
    const endRow = parseInt(square.dataset.row, 10);
    const endCol = parseInt(square.dataset.col, 10);
    const board = createLogicalBoard();
    const allMoves = generateAllMoves(board, currentPlayer);
    const isValid = allMoves.some(m =>
      m.startRow === startRow &&
      m.startCol === startCol &&
      m.endRow === endRow &&
      m.endCol === endCol
    );
    if (isValid) {
      performMove(selectedPiece, startRow, startCol, endRow, endCol);
    }
    selectedPiece = null;
    clearValidMoves();
  }
});
gameboard.addEventListener("dragstart", (e) => {
  // Prevent player interaction during AI turn in PvAI mode
  if (gameMode === 'pvai' && currentPlayer === 'blue') {
    e.preventDefault();
    return;
  }
  const piece = e.target.closest(".piece");
  if (!piece || !piece.classList.contains(currentPlayer)) {
    e.preventDefault();
    return;
  }
  const originalSquare = piece.parentElement;
  originalSquare.classList.add("piece-dragging");
  e.dataTransfer.setDragImage(
    piece,
    piece.offsetWidth / 2,
    piece.offsetHeight / 2
  );
  selectedPiece = piece;
  const pieceSquare = piece.parentElement;
  pieceSquare.classList.add("piece-dragging");
  const startRow = parseInt(pieceSquare.dataset.row, 10);
  const startCol = parseInt(pieceSquare.dataset.col, 10);
  showValidMoves(piece, startRow, startCol);
});
function cleanupDrag() {
  document.querySelectorAll(".square.piece-dragging").forEach((sq) => {
    sq.classList.remove("piece-dragging");
  });
}
gameboard.addEventListener("dragend", (e) => {
  if (selectedPiece) {
    selectedPiece.parentElement.classList.remove("piece-dragging");
    selectedPiece = null;
    clearValidMoves();
    cleanupDrag();
  }
});
gameboard.addEventListener("dragover", (e) => {
  e.preventDefault();
});
gameboard.addEventListener("drop", (e) => {
  e.preventDefault();
  // Prevent player interaction during AI turn in PvAI mode
  if (gameMode === 'pvai' && currentPlayer === 'blue') {
    cleanupDrag();
    return;
  }
  const square = e.target.closest(".square");
  if (!square || !square.classList.contains("playable") || !selectedPiece) {
    cleanupDrag();
    return;
  }
  const startSq = selectedPiece.parentElement;
  const startRow = parseInt(startSq.dataset.row, 10);
  const startCol = parseInt(startSq.dataset.col, 10);
  const endRow = parseInt(square.dataset.row, 10);
  const endCol = parseInt(square.dataset.col, 10);
  const board = createLogicalBoard();
  const allMoves = generateAllMoves(board, currentPlayer);
  const isValid = allMoves.some(m =>
    m.startRow === startRow &&
    m.startCol === startCol &&
    m.endRow === endRow &&
    m.endCol === endCol
  );
  if (isValid) {
    performMove(selectedPiece, startRow, startCol, endRow, endCol);
  }
  if (selectedPiece) {
    selectedPiece.parentElement.classList.remove("piece-dragging");
    selectedPiece = null;
  }
  clearValidMoves();
});
// ================== TIMERS ==================
function startSessionTimer() {
  if (sessionInterval) clearInterval(sessionInterval);
  sessionInterval = setInterval(() => {
    if (sessionSeconds === 0) {
      if (sessionMinutes === 0) {
        clearInterval(sessionInterval);
        clearInterval(roundInterval);
        endGame("Session time expired.");
        return;
      }
      sessionMinutes--;
      sessionSeconds = 59;
    } else {
      sessionSeconds--;
    }
    updateTimerDisplay();
  }, 1000);
}
function startRoundTimer() {
  if (roundInterval) clearInterval(roundInterval);
  roundInterval = setInterval(() => {
    if (roundSeconds === 0) {
      if (roundMinutes === 0 && roundSeconds === 0) {
        clearInterval(roundInterval);
        clearInterval(sessionInterval);
        endGame("Round time expired.");
        return;
      }
      roundMinutes--;
      roundSeconds = 59;
    } else roundSeconds--;
    updateTimerDisplay();
  }, 1000);
}
function updateTimerDisplay() {
  sessionEl.textContent = `${String(sessionMinutes).padStart(2, "0")}:${String(
    sessionSeconds
  ).padStart(2, "0")}`;
  roundEl.textContent = `${String(roundMinutes).padStart(2, "0")}:${String(
    roundSeconds
  ).padStart(2, "0")}`;
  roundEl.classList.toggle(
    "timer-warning",
    roundMinutes === 0 && roundSeconds <= 10
  );
}
// ================== DEBUG & INIT ==================
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
    moveHistoryStates = [initialState];
    turnHistory = [];
    currentTurnIndex = -1;
    currentTurnStartState = null;
    isTurnActive = false;
    currentHistoryIndex = -1;
    updateMoveHistoryDOM();
  }, 50);
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
    reset.addEventListener("click", () => {
      showConfirmationModal("Are you sure you want to reset the board? Current game progress will be lost.", () => {
        resetGame();
      });
    });
  }
  if (endGameBtn) {
    endGameBtn.addEventListener("click", () => {
      showConfirmationModal("End the game manually?", () => {
        endGame("Game ended manually");
      });
    });
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
      showConfirmationModal(
        "Do both players agree to end the game?",
        () => {
          endGame("Game ended by mutual agreement.");
        }
      );
    });
  }
  if (undoBtn) undoBtn.addEventListener("click", undoMove);
  if (redoBtn) redoBtn.addEventListener("click", redoMove);
  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      showConfirmationModal("Start replay from beginning?", () => {
        startReplay(1000);
      });
    });
  }
  if (stopReplayBtn) stopReplayBtn.addEventListener("click", stopReplay);
  if (transparencyBtn) {
    transparencyBtn.addEventListener("click", togglePieceTransparency);
  }
  if (backToMenuBtn) {
    backToMenuBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showConfirmationModal("Return to main menu? Current game will be lost.", () => {
        const currentDir = window.location.href.substring(0, window.location.href.lastIndexOf("/"));
        const menuPath = currentDir.split("src")[0] + "src/index.html";
        window.location.href = menuPath;
      });
    });
  }
  // Dark mode logic (unchanged)
  if (darkModeBtn) {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    let isDark = savedTheme === "dark" || (savedTheme !== "light" && systemPrefersDark);
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
// ================== GAME OVER FLAG CONDITIONS ==================
function checkGameOver() {
  if (gameOver) return true;
  // ✅ HANDLE SURRENDER FIRST (no score calculation)
  if (surrenderRequested) {
    const winner = surrenderRequested === "red" ? "Blue" : "Red";
    endGame(`${winner} wins! (${surrenderRequested} surrendered)`, true); // 👈 true = isSurrender
    return true;
  }
  const redPieces = document.querySelectorAll(".piece.red").length;
  const bluePieces = document.querySelectorAll(".piece.blue").length;
  const currentPlayerPieces = currentPlayer === "red" ? redPieces : bluePieces;
  if (redPieces === 0 || bluePieces === 0) {
    // Game ends when either player has no pieces
    // But winner is determined by FINAL SCORE, not piece count
    endGame("Game ended: One player has no remaining pieces.");
    return true;
  }
  if (!playerHasAnyValidMove(currentPlayer)) {
    const winner = currentPlayer === "red" ? "Blue" : "Red";
    endGame(`${winner} wins! (Opponent has no valid moves)`);
    return true;
  }
  if (currentPlayerPieces === 1 && moveHistory.length >= 6) {
    const lastThree = moveHistory.slice(-3);
    const prevThree = moveHistory.slice(-6, -3);
    if (JSON.stringify(lastThree) === JSON.stringify(prevThree)) {
      endGame("Draw! (3-move repetition with single chip)");
      return true;
    }
  }
  return false;
}
function showConfirmationModal(message, onConfirm) {
  const modal = document.getElementById("confirmation-modal");
  const messageEl = document.getElementById("confirmation-message");
  const yesBtn = document.getElementById("confirm-yes");
  const noBtn = document.getElementById("confirm-no");
  if (!modal || !messageEl || !yesBtn || !noBtn) {
    console.error("Confirmation modal elements are missing from HTML!");
    // Fallback to confirm() if modal isn't ready
    if (confirm(message)) {
      onConfirm();
    }
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
  let finalMessage = "" + reason.replace(/\n/g, "<br>");
  if (!isSurrender) {
    const finalScores = calculateFinalScores();
    const finalRed = finalScores.red.toFixed(2);
    const finalBlue = finalScores.blue.toFixed(2);
    let winnerMessage = "";
    const redScore = parseFloat(finalRed);
    const blueScore = parseFloat(finalBlue);
    if (redScore < blueScore) {
      winnerMessage = "Red wins!";
    } else if (blueScore < redScore) {
      winnerMessage = "Blue wins!";
    } else {
      winnerMessage = "It's a draw!";
    }
    finalMessage += `<br><br>Final Scores:<br>Red: ${finalRed}<br>Blue: ${finalBlue}<br>${winnerMessage}`;
  }
  messageEl.innerHTML = finalMessage; // ✅ Use innerHTML
  modal.hidden = false;
  const closeModal = () => {
    modal.hidden = true;
  };
  const startNewGame = () => {
    closeModal();
    resetGame();
  };
  newGameBtn.onclick = startNewGame;
  closeBtn.onclick = closeModal;
  if (isSurrender || reason.includes("manually") || reason.includes("agreement")) {
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
  console.log("Game Over:", reason);
  if (!isSurrender) {
    console.log("Final Scores - Red:", finalRed, "Blue:", finalBlue);
  }
}

// ================== ✅ UPDATED UNDO FUNCTION ==================
function undoMove() {
  if (gameOver || replayMode) return;

  // Adjust index based on game mode
  if (gameMode === 'pvai') {
    if (currentTurnIndex >= 1) {
      currentTurnIndex -= 2;
    } else {
      currentTurnIndex = -1;
    }
  } else {
    currentTurnIndex--;
  }

  if (currentTurnIndex < -1) currentTurnIndex = -1;

  let targetState = null;
  if (currentTurnIndex >= 0) {
    const entry = turnHistory[currentTurnIndex];
    if (entry && entry.startState) {
      targetState = entry.startState;
    } else {
      console.error("Invalid turn history entry:", entry);
      resetGame();
      return;
    }
  } else {
    // Use initial state
    if (moveHistoryStates.length > 0 && moveHistoryStates[0]) {
      targetState = moveHistoryStates[0];
    } else {
      console.warn("No initial state found. Resetting.");
      resetGame();
      return;
    }
  }

  // Restore board
  restoreBoardState(targetState);

  // 🔥 CRITICAL: Reset in-progress turn tracking
  currentTurnStartState = targetState; // The current state is now the start of a new potential turn
  isTurnActive = false;
  mustCaptureWithPiece = null;
  selectedPiece = null;

  // Sync move history display
  currentHistoryIndex = currentTurnIndex;
  updateMoveHistoryDOM();
}

function redoMove() {
  if (gameOver || replayMode || currentTurnIndex >= turnHistory.length - 1) return;

  currentTurnIndex++;
  const turnEntry = turnHistory[currentTurnIndex];
  restoreBoardState(turnEntry.endState);

  currentHistoryIndex = currentTurnIndex;
  updateMoveHistoryDOM();
}

function togglePieceTransparency() {
  piecesTransparent = !piecesTransparent;
  const toggleBtn = document.getElementById("toggle-transparency");
  const pieces = document.querySelectorAll(".piece");
  if (piecesTransparent) {
    pieces.forEach((piece) => piece.classList.add("transparent"));
    toggleBtn.textContent = "Hide Symbols";
    toggleBtn.classList.add("active");
  } else {
    pieces.forEach((piece) => piece.classList.remove("transparent"));
    toggleBtn.textContent = "Show Symbols";
    toggleBtn.classList.remove("active");
  }
}
function clearMoveHighlights() {
  document
    .querySelectorAll(".square.move-from, .square.move-to")
    .forEach((sq) => {
      sq.classList.remove("move-from", "move-to");
    });
}
function initializeGame() {
  // ✅ 1. FIRST: Create the empty board structure
  initializeBoard(); // This populates #gameboard with .square elements
  // ✅ 2. THEN: Set up UI state
  const currentPlayerLabel = document.querySelector(".current-player-label");
  if (currentPlayerLabel) {
    currentPlayerLabel.setAttribute("data-player", currentPlayer);
  }
  // ✅ 3. FINALLY: Reset game state (which places pieces on existing board)
  resetGame();
  const savedDepth = localStorage.getItem("aiDepth");
  if (savedDepth && [1, 2, 3, 4].includes(parseInt(savedDepth))) {
    aiDepth = parseInt(savedDepth);
    document.getElementById("ai-difficulty").value = aiDepth;
  }
  // Setup controls after board exists
  setupDebugControls();
  localStorage.removeItem('aiDifficulty'); // Optional: reset next time
}
// Create a virtual board state from DOM
function createVirtualBoard() {
  const board = Array(8).fill().map(() => Array(8).fill(null));
  document.querySelectorAll('.piece').forEach(piece => {
    const sq = piece.parentElement;
    const row = parseInt(sq.dataset.row);
    const col = parseInt(sq.dataset.col);
    board[row][col] = {
      color: piece.classList.contains('red') ? 'red' : 'blue',
      value: parseFloat(piece.dataset.value),
      isKing: piece.classList.contains('king')
    };
  });
  return board;
}
// ================== INITIALIZATION ==================
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    // ✅ ENSURE FULL DOM READY
    if (gameboard) {
      const currentPlayerLabel = document.querySelector(
        ".current-player-label"
      );
      if (currentPlayerLabel) {
        currentPlayerLabel.setAttribute("data-player", currentPlayer);
      }
      initializeGame();
    } else {
      console.warn("Gameboard not found.");
    }
  }, 0);
});
// =============== TOGGLE CONTROLS SIDEBAR ===============
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggle-controls");
  const sidebar = document.querySelector(".controls-sidebar");
  if (!toggleBtn || !sidebar) return;
  const isCollapsed =
    localStorage.getItem("controlsSidebarCollapsed") === "true";
  if (isCollapsed) sidebar.classList.add("collapsed");
  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    const isNowCollapsed = sidebar.classList.contains("collapsed");
    toggleBtn.setAttribute("aria-expanded", !isNowCollapsed);
    localStorage.setItem("controlsSidebarCollapsed", isNowCollapsed);
  });
});
// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    calculateSciDamathScore,
    playerHasMandatoryCapture,
  };
}