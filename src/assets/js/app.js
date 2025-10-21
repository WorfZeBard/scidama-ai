const gameboard = document.getElementById("gameboard");
const redScoreEl = document.getElementById("red-score");
const blueScoreEl = document.getElementById("blue-score");
const currentPlayerEl = document.getElementById("current-player");
const errorMessageEl = document.getElementById("error-message");
let redScore = 0.0;
let blueScore = 0.0;
let currentPlayer = "red";
let selectedPiece = null;
let moveHistoryEntries = []; // Track move history entries for undo/redo
let currentHistoryIndex = -1; // Current position in move history
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
let moveHistoryStates = []; // Full board states for undo/redo
let currentMoveIndex = -1; // Current position in move history
let replayMode = false;
let replayInterval = null;
let gameOver = false;
let piecesTransparent = false;

// src/assets/js/app.js

// Detect game mode from URL
const path = window.location.pathname;
let gameMode = null; // 'pvp', 'pvai', or 'debug'

if (path.includes('/pvp/')) {
  gameMode = 'pvp';
} else if (path.includes('/pvai/')) {
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
    }, 1000);
  }
}

// Simple AI move function with multi-capture capability
function makeAIMove() {
  if (gameOver || currentPlayer !== "blue") return;

  // 🔒 Respect ongoing capture chain
  if (mustCaptureWithPiece && mustCaptureWithPiece.classList.contains("blue")) {
    setTimeout(() => handleMultiCapture(mustCaptureWithPiece), 300);
    return;
  }

  const bluePieces = Array.from(document.querySelectorAll(".piece.blue"));
  let validMoves = [];

  for (const piece of bluePieces) {
    const sq = piece.parentElement;
    const startRow = parseInt(sq.dataset.row, 10);
    const startCol = parseInt(sq.dataset.col, 10);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (isValidMove(piece, startRow, startCol, r, c)) {
          const isCap = isCaptureMove(piece, startRow, startCol, r, c);
          validMoves.push({
            piece,
            startRow,
            startCol,
            endRow: r,
            endCol: c,
            type: isCap ? "capture" : "move"
          });
        }
      }
    }
  }

  const captureMoves = validMoves.filter(m => m.type === "capture");
  const movePool = captureMoves.length > 0 ? captureMoves : validMoves;

  if (movePool.length > 0) {
    const chosenMove = movePool[Math.floor(Math.random() * movePool.length)];
    performMove(
      chosenMove.piece,
      chosenMove.startRow,
      chosenMove.startCol,
      chosenMove.endRow,
      chosenMove.endCol
    );

    if (chosenMove.type === "capture" && !gameOver) {
      if (mustCaptureWithPiece === chosenMove.piece) {
        setTimeout(() => handleMultiCapture(chosenMove.piece), 300);
      }
    }
  } else {
    switchTurn();
  }
}

// Handles chained captures
function handleMultiCapture(piece) {
  if (!piece || gameOver || piece.parentElement === null) return;

  const sq = piece.parentElement;
  const startRow = parseInt(sq.dataset.row, 10);
  const startCol = parseInt(sq.dataset.col, 10);
  let additionalCaptures = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (isValidMove(piece, startRow, startCol, r, c)) {
        if (isCaptureMove(piece, startRow, startCol, r, c)) {
          additionalCaptures.push({ r, c });
        }
      }
    }
  }

  if (additionalCaptures.length > 0) {
    const next = additionalCaptures[Math.floor(Math.random() * additionalCaptures.length)];
    performMove(piece, startRow, startCol, next.r, next.c);
    // performMove() will set mustCaptureWithPiece if chain continues
    if (mustCaptureWithPiece === piece && !gameOver) {
      setTimeout(() => handleMultiCapture(piece), 300);
    }
  }
  // 🚫 Do NOT call switchTurn() here — performMove() handles it
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

// ================== BRAZILIAN + SCIDAMATH LOGIC ==================
function playerHasMandatoryCapture(color) {
  const pieces = document.querySelectorAll(`.piece.${color}`);
  for (const piece of pieces) {
    const sq = piece.parentElement;
    const row = parseInt(sq.dataset.row, 10);
    const col = parseInt(sq.dataset.col, 10);
    if (hasMandatoryCapture(piece, row, col)) return true;
  }
  return false;
}

function hasMandatoryCapture(piece, startRow, startCol) {
  const color = piece.classList.contains("red") ? "red" : "blue";
  const isKing = piece.classList.contains("king");
  if (isKing) {
    const directions = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];
    for (const [dRow, dCol] of directions) {
      let r = startRow + dRow;
      let c = startCol + dCol;
      let opponentFound = false;
      while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
        const sq = document.querySelector(
          `.square[data-row='${r}'][data-col='${c}']`
        );
        const p = sq?.querySelector(".piece");
        if (p) {
          if (p.classList.contains(color)) break;
          if (opponentFound) break;
          opponentFound = true;
          const landR = r + dRow;
          const landC = c + dCol;
          if (landR >= 0 && landR <= 7 && landC >= 0 && landC <= 7) {
            const landSq = document.querySelector(
              `.square[data-row='${landR}'][data-col='${landC}']`
            );
            if (!landSq.querySelector(".piece")) return true;
          }
          break;
        }
        r += dRow;
        c += dCol;
      }
    }
  } else {
    const directions = [
      [-2, -2],
      [-2, 2],
      [2, -2],
      [2, 2],
    ];
    for (const [dRow, dCol] of directions) {
      const midRow = startRow + dRow / 2;
      const midCol = startCol + dCol / 2;
      const endRow = startRow + dRow;
      const endCol = startCol + dCol;
      if (endRow < 0 || endRow > 7 || endCol < 0 || endCol > 7) continue;
      if (midRow < 0 || midRow > 7 || midCol < 0 || midCol > 7) continue;
      const midSq = document.querySelector(
        `.square[data-row='${midRow}'][data-col='${midCol}']`
      );
      const endSq = document.querySelector(
        `.square[data-row='${endRow}'][data-col='${endCol}']`
      );
      const midPiece = midSq?.querySelector(".piece");
      const endPiece = endSq?.querySelector(".piece");
      if (midPiece && !midPiece.classList.contains(color) && !endPiece) {
        return true;
      }
    }
  }
  return false;
}

function isDiagonalPathClear(startRow, startCol, endRow, endCol, color) {
  const dRow = endRow > startRow ? 1 : -1;
  const dCol = endCol > startCol ? 1 : -1;
  let r = startRow + dRow;
  let c = startCol + dCol;
  while (r !== endRow || c !== endCol) {
    const sq = document.querySelector(
      `.square[data-row='${r}'][data-col='${c}']`
    );
    if (sq?.querySelector(".piece")) return false;
    r += dRow;
    c += dCol;
  }
  return true;
}

function isCaptureMove(piece, startRow, startCol, endRow, endCol) {
  const color = piece.classList.contains("red") ? "red" : "blue";
  const isKing = piece.classList.contains("king");
  if (isKing) {
    if (Math.abs(endRow - startRow) !== Math.abs(endCol - startCol))
      return false;
    const dRow = endRow > startRow ? 1 : -1;
    const dCol = endCol > startCol ? 1 : -1;
    let r = startRow + dRow;
    let c = startCol + dCol;
    let captured = false;
    while (r !== endRow || c !== endCol) {
      const sq = document.querySelector(
        `.square[data-row='${r}'][data-col='${c}']`
      );
      const p = sq?.querySelector(".piece");
      if (p) {
        if (captured || p.classList.contains(color)) return false;
        captured = true;
      }
      r += dRow;
      c += dCol;
    }
    return captured;
  } else {
    if (Math.abs(endRow - startRow) !== 2 || Math.abs(endCol - startCol) !== 2)
      return false;
    const endSq = document.querySelector(
      `.square[data-row='${endRow}'][data-col='${endCol}']`
    );
    if (endSq?.querySelector(".piece")) return false;
    const midRow = (startRow + endRow) / 2;
    const midCol = (startCol + endCol) / 2;
    const midSq = document.querySelector(
      `.square[data-row='${midRow}'][data-col='${midCol}']`
    );
    const midPiece = midSq?.querySelector(".piece");
    return midPiece && !midPiece.classList.contains(color);
  }
}

function isValidMove(piece, startRow, startCol, endRow, endCol) {
  const target = document.querySelector(
    `.square[data-row='${endRow}'][data-col='${endCol}']`
  );
  if (
    !target ||
    !target.classList.contains("playable") ||
    target.querySelector(".piece")
  )
    return false;
  const color = piece.classList.contains("red") ? "red" : "blue";
  const isKing = piece.classList.contains("king");
  const rowDiff = endRow - startRow;
  const colDiff = endCol - startCol;
  if (playerHasMandatoryCapture(color)) {
    return isCaptureMove(piece, startRow, startCol, endRow, endCol);
  }
  if (isKing) {
    if (Math.abs(rowDiff) !== Math.abs(colDiff) || rowDiff === 0) return false;
    return isDiagonalPathClear(startRow, startCol, endRow, endCol, color);
  } else {
    if (Math.abs(rowDiff) !== 1 || Math.abs(colDiff) !== 1) return false;
    if (color === "red" && rowDiff >= 0) return false;
    if (color === "blue" && rowDiff <= 0) return false;
    return true;
  }
}

function findCapturedPieces(startRow, startCol, endRow, endCol, color) {
  const captured = [];
  if (Math.abs(endRow - startRow) !== Math.abs(endCol - startCol))
    return captured;
  const dRow = endRow > startRow ? 1 : -1;
  const dCol = endCol > startCol ? 1 : -1;
  let r = startRow + dRow;
  let c = startCol + dCol;
  while (r !== endRow || c !== endCol) {
    const sq = document.querySelector(
      `.square[data-row='${r}'][data-col='${c}']`
    );
    const p = sq?.querySelector(".piece");
    if (p && !p.classList.contains(color)) captured.push(p);
    r += dRow;
    c += dCol;
  }
  return captured;
}

function checkForChainCapture(piece, row, col) {
  return hasMandatoryCapture(piece, row, col);
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
        ${entry.piece}(${entry.value}) moved to (${entry.endRow},${
        entry.endCol
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
  const pieceValue = parseInt(piece.dataset.value, 10);
  let capturedPieces = [];
  const isKing = piece.classList.contains("king");
  if (isKing) {
    capturedPieces = findCapturedPieces(
      startRow,
      startCol,
      endRow,
      endCol,
      color
    );
  } else {
    if (
      Math.abs(endRow - startRow) === 2 &&
      Math.abs(endCol - startCol) === 2
    ) {
      const midRow = (startRow + endRow) / 2;
      const midCol = (startCol + endCol) / 2;
      if (midRow < 0 || midRow > 7 || midCol < 0 || midCol > 7) {
        console.warn("Invalid mid position:", midRow, midCol);
        return;
      }
      const midSquare = document.querySelector(
        `.square[data-row='${midRow}'][data-col='${midCol}']`
      );
      const midPiece = midSquare?.querySelector(".piece");
      if (midPiece && !midPiece.classList.contains(color)) {
        capturedPieces.push(midPiece);
      }
    }
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
      capturingValue: parseInt(piece.dataset.value, 10),
      operator: operator,
      capturedValue: parseInt(capturedPiece.dataset.value, 10),
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
  const startSq = piece.parentElement;
  const endSq = document.querySelector(
    `.square[data-row='${endRow}'][data-col='${endCol}']`
  );
  endSq.appendChild(piece);
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
  // 🚫 Promotion ends the turn immediately — no chain capture allowed
  if (wasPromoted) {
    mustCaptureWithPiece = null;
    switchTurn();
  }
  // 🔁 Otherwise, allow chain capture only if a capture occurred AND chain is possible
  else if (
    capturedPieces.length > 0 &&
    checkForChainCapture(piece, endRow, endCol)
  ) {
    mustCaptureWithPiece = piece;
  }
  // 🛑 No promotion and no chain? End turn.
  else {
    mustCaptureWithPiece = null;
    switchTurn();
  }
  moveHistoryStates = moveHistoryStates.slice(0, currentMoveIndex + 1);
  const currentState = saveBoardState();
  moveHistoryStates.push(currentState);
  currentMoveIndex++;
  if (!replayMode) {
    highlightMoveSquares(startRow, startCol, endRow, endCol);
  }
  clearValidMoves();
  if (!timersStarted) {
    timersStarted = true;
    startSessionTimer();
    startRoundTimer();
    playSound("gameStart");
  }
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
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.querySelector(
        `.square[data-row='${r}'][data-col='${c}']`
      );
      if (
        sq &&
        sq.classList.contains("playable") &&
        isValidMove(piece, startRow, startCol, r, c)
      ) {
        sq.classList.add("valid-move");
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
    if (isValidMove(selectedPiece, startRow, startCol, endRow, endCol)) {
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
  if (isValidMove(selectedPiece, startRow, startCol, endRow, endCol)) {
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
        endGame("Time's up! (20-minute session limit)");
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
        const loser = currentPlayer;
        const winner = loser === "red" ? "Blue" : "Red";
        endGame(`${winner} wins! (${loser} ran out of round time)`);
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
    currentMoveIndex = 0;
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
  moveHistoryStates = [];
  currentMoveIndex = -1;
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
  const darkModeBtn = document.getElementById("toggle-dark-mode"); // ✅ ADDED

  if (toggle) {
    toggle.addEventListener("click", () => {
      debugMode = !debugMode;
      toggle.textContent = `Debug Mode: ${debugMode ? "ON" : "OFF"}`;
      toggle.classList.toggle("debug-on", debugMode);
      resetGame();
    });
  }
  if (reset) reset.addEventListener("click", resetGame);
  if (endGameBtn) {
    endGameBtn.addEventListener("click", () => {
      if (sessionInterval) clearInterval(sessionInterval);
      if (roundInterval) clearInterval(roundInterval);
      endGame("Game ended manually");
    });
  }
  if (surrenderBtn) {
    surrenderBtn.addEventListener("click", () => {
      if (
        !gameOver &&
        confirm(`Are you sure you want to surrender as ${currentPlayer}?`)
      ) {
        surrenderRequested = currentPlayer;
        checkGameOver();
      }
    });
  }
  if (agreeBtn) {
    agreeBtn.addEventListener("click", () => {
      if (!gameOver && confirm("Do both players agree to end the game?")) {
        endGame("Game ended by mutual agreement.");
      }
    });
  }
  if (undoBtn) undoBtn.addEventListener("click", undoMove);
  if (redoBtn) redoBtn.addEventListener("click", redoMove);
  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      if (confirm("Start replay from beginning?")) {
        startReplay(1000);
      }
    });
  }
  if (stopReplayBtn) stopReplayBtn.addEventListener("click", stopReplay);
  if (transparencyBtn) {
    transparencyBtn.addEventListener("click", togglePieceTransparency);
  }
  if (backToMenuBtn) {
    backToMenuBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("Return to main menu? Current game will be lost.")) {
        // Get current file's directory
        const currentDir = window.location.href.substring(
          0,
          window.location.href.lastIndexOf("/")
        );

        // Go up to project root and then into src/
        const menuPath = currentDir.split("src")[0] + "src/index.html";

        window.location.href = menuPath;
      }
    });
  }

  // ✅ DARK MODE LOGIC MOVED HERE
  if (darkModeBtn) {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    let isDark =
      savedTheme === "dark" || (savedTheme !== "light" && systemPrefersDark);

    function applyTheme(dark) {
      if (dark) {
        document.body.setAttribute("data-theme", "dark");
      } else {
        document.body.removeAttribute("data-theme");
      }
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

  if (currentPlayerPieces === 0) {
    const winner = currentPlayer === "red" ? "Blue" : "Red";
    endGame(`${winner} wins! (Opponent has no chips)`);
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

function playerHasAnyValidMove(color) {
  const pieces = document.querySelectorAll(`.piece.${color}`);
  for (const piece of pieces) {
    const sq = piece.parentElement;
    const row = parseInt(sq.dataset.row, 10);
    const col = parseInt(sq.dataset.col, 10);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const targetSq = document.querySelector(
          `.square[data-row='${r}'][data-col='${c}']`
        );
        if (targetSq && targetSq.classList.contains("playable")) {
          if (isValidMove(piece, row, col, r, c)) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function endGame(reason, isSurrender = false) {
  if (gameOver) return;
  gameOver = true;

  if (sessionInterval) clearInterval(sessionInterval);
  if (roundInterval) clearInterval(roundInterval);
  playSound("gameEnd");

  if (isSurrender) {
    // ✅ For surrender: show ONLY the reason (no scores)
    alert(`GAME OVER\n${reason}`);
    console.log("Game Over:", reason);
    return;
  }

  // ✅ Only calculate scores for non-surrender endings
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

  const finalMessage =
    `GAME OVER
` +
    `${reason}
` +
    `Final Scores:
` +
    `Red: ${finalRed}
` +
    `Blue: ${finalBlue}
` +
    `${winnerMessage}`;

  alert(finalMessage);
  console.log("Game Over:", reason);
  console.log("Final Scores - Red:", finalRed, "Blue:", finalBlue);
}

function undoMove() {
  if (gameOver || replayMode || currentMoveIndex <= 0) return;
  currentMoveIndex--;
  restoreBoardState(moveHistoryStates[currentMoveIndex]);
  currentHistoryIndex = currentMoveIndex - 1;
  if (currentHistoryIndex < -1) currentHistoryIndex = -1;
  updateMoveHistoryDOM();
}

function redoMove() {
  if (
    gameOver ||
    replayMode ||
    currentMoveIndex >= moveHistoryStates.length - 1
  ) {
    return;
  }
  currentMoveIndex++;
  restoreBoardState(moveHistoryStates[currentMoveIndex]);
  currentHistoryIndex = currentMoveIndex - 1;
  updateMoveHistoryDOM();
}

function startReplay(speed = 1000) {
  if (moveHistoryStates.length === 0) return;
  replayMode = true;
  let replayIndex = 0;
  clearMoveHighlights();
  replayInterval = setInterval(() => {
    if (replayIndex >= moveHistoryStates.length) {
      stopReplay();
      return;
    }
    restoreBoardState(moveHistoryStates[replayIndex]);
    replayIndex++;
  }, speed);
}

function stopReplay() {
  if (replayInterval) clearInterval(replayInterval);
  replayMode = false;
  if (currentMoveIndex >= 0 && currentMoveIndex < moveHistoryStates.length) {
    restoreBoardState(moveHistoryStates[currentMoveIndex]);
  }
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

  // Setup controls after board exists
  setupDebugControls();
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
    isValidMove,
    playerHasMandatoryCapture,
  };
}
