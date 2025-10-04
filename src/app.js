const gameboard = document.getElementById("gameboard");
const redScoreEl = document.getElementById("red-score");
const blueScoreEl = document.getElementById("blue-score");
const currentPlayerEl = document.getElementById("current-player");

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
let debugMode = false;
let mustCaptureWithPiece = null;

let moveHistoryStates = []; // Full board states for undo/redo
let currentMoveIndex = -1;  // Current position in move history

let replayMode = false;
let replayInterval = null;
let gameOver = false;

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

// ================== BOARD GENERATION ==================
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
    square.appendChild(symbol);
    gameboard.appendChild(square);
  }
}

// ================== UTIL FUNCTIONS ==================
function getMathSymbol(row, col) {
  return DAMATH_LAYOUT[row][col];
}

function highlightSquareSymbol(row, col) {
  document
    .querySelectorAll(".symbol")
    .forEach((sym) => sym.classList.remove("highlight"));
  const square = document.querySelector(
    `.square[data-row='${row}'][data-col='${col}']`
  );
  square?.querySelector(".symbol")?.classList.add("highlight");
}

function switchTurn() {
  currentPlayer = currentPlayer === "red" ? "blue" : "red";
  currentPlayerEl.textContent = currentPlayer;

  if (roundInterval) clearInterval(roundInterval);
  roundMinutes = 1;
  roundSeconds = 0;

  roundEl.className = "timer";
  roundEl.classList.add(currentPlayer === "red" ? "timer-red" : "timer-blue");
  startRoundTimer();
}

function calculateFinalScores() {
  // Get all remaining pieces
  const redPieces = document.querySelectorAll(".piece.red");
  const bluePieces = document.querySelectorAll(".piece.blue");

  // Sum their values
  let redRemaining = 0;
  redPieces.forEach((piece) => {
    redRemaining += parseFloat(piece.dataset.value) || 0;
  });

  let blueRemaining = 0;
  bluePieces.forEach((piece) => {
    blueRemaining += parseFloat(piece.dataset.value) || 0;
  });

  // Add to current scores
  redScore += redRemaining;
  blueScore += blueRemaining;

  // Update UI with 2 decimal places (DepEd compliant)
  redScoreEl.textContent = redScore.toFixed(2);
  blueScoreEl.textContent = blueScore.toFixed(2);

  // Log final scores
  console.log(
    `Final Scores - Red: ${redScore.toFixed(2)}, Blue: ${blueScore.toFixed(2)}`
  );
  console.log(`Red remaining pieces value: ${redRemaining.toFixed(2)}`);
  console.log(`Blue remaining pieces value: ${blueRemaining.toFixed(2)}`);

  return { red: redScore, blue: blueScore };
}

// Save current board state
function saveBoardState() {
  const state = {
    redScore: redScore,
    blueScore: blueScore,
    currentPlayer: currentPlayer,
    mustCaptureWithPiece: mustCaptureWithPiece ? 
      { row: parseInt(mustCaptureWithPiece.parentElement.dataset.row), 
        col: parseInt(mustCaptureWithPiece.parentElement.dataset.col) } : null,
    pieces: []
  };

  // Save all pieces
  document.querySelectorAll('.piece').forEach(piece => {
    const square = piece.parentElement;
    // Get the piece key from data-value or reconstruct it
    const value = piece.dataset.value;
    const color = piece.classList.contains('red') ? 'red' : 'blue';
    
    // Find the original piece key from PIECES object
    let pieceKey = null;
    for (const key in PIECES) {
      if (PIECES[key].color === color && PIECES[key].value.toString() === value) {
        pieceKey = key;
        break;
      }
    }
    // Fallback if not found
    if (!pieceKey) {
      pieceKey = color === 'red' ? `r${Math.abs(value)}` : `b${Math.abs(value)}`;
    }

    state.pieces.push({
      key: pieceKey,
      row: parseInt(square.dataset.row),
      col: parseInt(square.dataset.col),
      isKing: piece.classList.contains('king'),
      value: value
    });
  });

  return state;
}

// Restore board state
function restoreBoardState(state) {
  // Clear board
  document.querySelectorAll('.piece').forEach(p => p.remove());
  
  // Restore pieces
  state.pieces.forEach(pieceData => {
    const square = document.querySelector(`.square[data-row='${pieceData.row}'][data-col='${pieceData.col}']`);
    if (!square) return;

    // Extract color from piece key (e.g., "r7" → "red", "b3" → "blue")
    const color = pieceData.key.startsWith('r') ? 'red' : 'blue';
    
    const piece = document.createElement('div');
    piece.classList.add('piece', color);
    if (pieceData.isKing) piece.classList.add('king');
    piece.dataset.value = pieceData.value;
    piece.draggable = true;
    piece.tabIndex = 0;

    const numberLabel = document.createElement('span');
    numberLabel.classList.add('piece-number');
    numberLabel.textContent = pieceData.value;
    piece.appendChild(numberLabel);
    square.appendChild(piece);
  });

  // Restore game state
  redScore = state.redScore;
  blueScore = state.blueScore;
  currentPlayer = state.currentPlayer;
  redScoreEl.textContent = redScore.toFixed(2);
  blueScoreEl.textContent = blueScore.toFixed(2);
  currentPlayerEl.textContent = currentPlayer;

  // Restore mustCaptureWithPiece
  mustCaptureWithPiece = null;
  if (state.mustCaptureWithPiece) {
    const { row, col } = state.mustCaptureWithPiece;
    const square = document.querySelector(`.square[data-row='${row}'][data-col='${col}']`);
    if (square) {
      mustCaptureWithPiece = square.querySelector('.piece');
    }
  }

  // Update UI
  clearValidMoves();
  if (!replayMode) {
    if (roundInterval) clearInterval(roundInterval);
    roundMinutes = 1;
    roundSeconds = 0;
    roundEl.className = 'timer';
    roundEl.classList.add(currentPlayer === 'red' ? 'timer-red' : 'timer-blue');
    startRoundTimer();
  }
}

// ================== DEPED SCORING ==================
function calculateSciDamathScore(capturingValue, operator, capturedValue) {
  let result;

  // Handle division by zero
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

  // DepEd rounding: 2 decimal places, standard rounding
  const rounded = Math.round(result * 100) / 100;
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
    // Regular pieces: ALL 4 directions for captures (Sci-Damath rule)
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
    // Regular pieces: ANY diagonal capture (forward/backward)
    if (Math.abs(endRow - startRow) !== 2 || Math.abs(endCol - startCol) !== 2)
      return false;
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

  // Global mandatory capture rule
  if (playerHasMandatoryCapture(color)) {
    return isCaptureMove(piece, startRow, startCol, endRow, endCol);
  }

  // Non-capture moves: forward only for regular pieces
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
  if (replayMode) return; // Don't log during replay

  // Create move entry
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

  // Truncate future entries if we're in the middle of history
  moveHistoryEntries = moveHistoryEntries.slice(0, currentHistoryIndex + 1);

  // Add new entry
  moveHistoryEntries.push(moveEntry);
  currentHistoryIndex++;

  // Update DOM
  updateMoveHistoryDOM();
}

// New function to update move history DOM based on current index
function updateMoveHistoryDOM() {
  const historyList = document.getElementById("move-history-content");
  if (!historyList) return;

  // Clear current history
  historyList.innerHTML = "";

  // Add entries up to current index
  for (let i = 0; i <= currentHistoryIndex; i++) {
    const entry = moveHistoryEntries[i];
    const moveItem = document.createElement("li");
    moveItem.className = `move-item ${entry.player}`;

    let moveText = "";
    if (entry.type === "capture") {
      moveText = `
        <strong>${entry.player.toUpperCase()}</strong>: 
        ${entry.piece}(${entry.capturingValue}) 
        <span class="operator">${entry.operator}</span> 
        (${entry.capturedValue}) = 
        <span class="result ${entry.result >= 0 ? "positive" : "negative"}">
          ${entry.result.toFixed(2)}
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
    }

    moveItem.innerHTML = moveText;
    historyList.appendChild(moveItem);
  }

  // Auto-scroll to bottom
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

  // === CAPTURE DETECTION ===
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
      const midPiece = document.querySelector(
        `.square[data-row='${midRow}'][data-col='${midCol}'] .piece`
      );
      if (midPiece) capturedPieces.push(midPiece);
    }
  }

  let scoreChange = 0;
  let operator = "";
  let capturedValue = 0;

  if (capturedPieces.length > 0) {
    operator = getMathSymbol(endRow, endCol);
    capturedValue = parseInt(capturedPieces[0].dataset.value, 10);
    scoreChange = calculateSciDamathScore(pieceValue, operator, capturedValue);

    if (color === "red") redScore += scoreChange;
    else blueScore += scoreChange;

    redScoreEl.textContent = redScore.toFixed(2);
    blueScoreEl.textContent = blueScore.toFixed(2);

    // ✅ LOG CAPTURE MOVE
    logMove({
      type: "capture",
      player: color,
      piece: pieceKey,
      capturingValue: pieceValue,
      operator: operator,
      capturedValue: capturedValue,
      result: scoreChange,
    });

    capturedPieces.forEach((p) => p.remove());
  } else {
    // ✅ LOG REGULAR MOVE
    logMove({
      type: "move",
      player: color,
      piece: pieceKey,
      value: pieceValue,
      endRow: endRow,
      endCol: endCol,
    });
  }

  // === MOVE THE PIECE ===
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
    // ✅ LOG PROMOTION
    logMove({
      type: "promotion",
      player: color,
      piece: pieceKey,
    });
  }

  // === CHAIN CAPTURE LOGIC ===
  if (
    capturedPieces.length > 0 &&
    checkForChainCapture(piece, endRow, endCol)
  ) {
    mustCaptureWithPiece = piece;
  } else {
    mustCaptureWithPiece = null;
    switchTurn();
  }

  // === SAVE BOARD STATE FOR UNDO/REDO (SIMPLE VERSION) ===
  moveHistoryStates = moveHistoryStates.slice(0, currentMoveIndex + 1);
  const currentState = saveBoardState();
  moveHistoryStates.push(currentState);
  currentMoveIndex++;

  // === VISUAL FEEDBACK ===
  highlightSquareSymbol(endRow, endCol);
  clearValidMoves();

  if (!timersStarted) {
    timersStarted = true;
    startSessionTimer();
    startRoundTimer();
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
  document
    .querySelectorAll(".square.valid-move")
    .forEach((sq) => sq.classList.remove("valid-move"));
}

// ================== INPUT HANDLERS ==================
gameboard.addEventListener("click", (e) => {
  const piece = e.target.closest(".piece");
  const square = e.target.closest(".square");

  if (!square || !square.classList.contains("playable")) return;
  if (mustCaptureWithPiece && piece !== mustCaptureWithPiece) return;

  if (piece && piece.classList.contains(currentPlayer)) {
    if (selectedPiece) selectedPiece.classList.remove("selected");
    selectedPiece = piece;
    selectedPiece.classList.add("selected");

    const startSq = piece.parentElement;
    const startRow = parseInt(startSq.dataset.row, 10);
    const startCol = parseInt(startSq.dataset.col, 10);
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
    } else if (playerHasMandatoryCapture(currentPlayer)) {
      square.classList.add("invalid-move");
      setTimeout(() => square.classList.remove("invalid-move"), 300);
    }

    if (selectedPiece) selectedPiece.classList.remove("selected");
    selectedPiece = null;
  }
});

gameboard.addEventListener("dragstart", (e) => {
  const piece = e.target.closest(".piece");
  if (!piece || !piece.classList.contains(currentPlayer)) e.preventDefault();
  else selectedPiece = piece;
});

gameboard.addEventListener("dragover", (e) => e.preventDefault());

gameboard.addEventListener("drop", (e) => {
  e.preventDefault();
  const square = e.target.closest(".square");
  if (!square || !square.classList.contains("playable") || !selectedPiece)
    return;
  if (mustCaptureWithPiece && selectedPiece !== mustCaptureWithPiece) {
    selectedPiece = null;
    return;
  }

  const startSq = selectedPiece.parentElement;
  const startRow = parseInt(startSq.dataset.row, 10);
  const startCol = parseInt(startSq.dataset.col, 10);
  const endRow = parseInt(square.dataset.row, 10);
  const endCol = parseInt(square.dataset.col, 10);

  if (isValidMove(selectedPiece, startRow, startCol, endRow, endCol)) {
    performMove(selectedPiece, startRow, startCol, endRow, endCol);
  } else if (playerHasMandatoryCapture(currentPlayer)) {
    square.classList.add("invalid-move");
    setTimeout(() => square.classList.remove("invalid-move"), 300);
  }

  if (selectedPiece) selectedPiece.classList.remove("selected");
  selectedPiece = null;
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
      if (roundMinutes === 0) {
        clearInterval(roundInterval);
        alert(`Time's up for ${currentPlayer}!`);
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

  // Initialize simple state system
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

  // Reset unified state system
  gameStates = [];
  currentStateIndex = -1;
  replayMode = false;
  if (replayInterval) clearInterval(replayInterval);

  placeInitialPieces();
}

function setupDebugControls() {
  const toggle = document.getElementById("debug-toggle");
  const reset = document.getElementById("reset-board");

  toggle?.addEventListener("click", () => {
    debugMode = !debugMode;
    toggle.textContent = `Debug Mode: ${debugMode ? "ON" : "OFF"}`;
    toggle.style.background = debugMode ? "#51cf66" : "#ff6b6b";
    resetGame();
  });

  reset?.addEventListener("click", resetGame);

  const endGameBtn = document.getElementById("end-game");
  if (endGameBtn) {
    endGameBtn.addEventListener("click", () => {
      if (sessionInterval) clearInterval(sessionInterval);
      if (roundInterval) clearInterval(roundInterval);

      const finalScores = calculateFinalScores();

      let winner = "It's a tie!";
      if (finalScores.red > finalScores.blue) winner = "Red wins!";
      else if (finalScores.blue > finalScores.red) winner = "Blue wins!";

      alert(
        `Game ended!\n\nFinal Scores:\nRed: ${finalScores.red.toFixed(
          2
        )}\nBlue: ${finalScores.blue.toFixed(2)}\n\n${winner}`
      );
    });
  }

  // Surrender button
  const surrenderBtn = document.getElementById("surrender");
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

  // Mutual agreement button
  const agreeBtn = document.getElementById("agree-finish");
  if (agreeBtn) {
    agreeBtn.addEventListener("click", () => {
      if (!gameOver && confirm("Do both players agree to end the game?")) {
        endGame("Game ended by mutual agreement.");
      }
    });
  }
  // Undo/Redo/Replay buttons
  const undoBtn = document.getElementById("undo");
  const redoBtn = document.getElementById("redo");
  const replayBtn = document.getElementById("replay");
  const stopReplayBtn = document.getElementById("stop-replay");

  if (undoBtn) {
    undoBtn.addEventListener("click", undoMove);
  }
  if (redoBtn) {
    redoBtn.addEventListener("click", redoMove);
  }
  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      if (confirm("Start replay from beginning?")) {
        startReplay(1000); // 1 second per move
      }
    });
  }
  if (stopReplayBtn) {
    stopReplayBtn.addEventListener("click", stopReplay);
  }
}

// ================== GAME OVER FLAG CONDITIONS ==================
function checkGameOver() {
  if (gameOver) return true;

  const redPieces = document.querySelectorAll(".piece.red").length;
  const bluePieces = document.querySelectorAll(".piece.blue").length;
  const currentPlayerPieces = currentPlayer === "red" ? redPieces : bluePieces;

  // Condition 1: Current player has no chips
  if (currentPlayerPieces === 0) {
    const winner = currentPlayer === "red" ? "Blue" : "Red";
    endGame(`${winner} wins! (Opponent has no chips)`);
    return true;
  }

  // Condition 2: Current player has no possible moves
  if (!playerHasAnyValidMove(currentPlayer)) {
    const winner = currentPlayer === "red" ? "Blue" : "Red";
    endGame(`${winner} wins! (Opponent has no valid moves)`);
    return true;
  }

  // Condition 3: Single chip + move repetition (3 repetitions for practicality)
  if (currentPlayerPieces === 1 && moveHistory.length >= 6) {
    const lastThree = moveHistory.slice(-3);
    const prevThree = moveHistory.slice(-6, -3);
    if (JSON.stringify(lastThree) === JSON.stringify(prevThree)) {
      endGame("Draw! (3-move repetition with single chip)");
      return true;
    }
  }

  // Condition 5: Surrender
  if (surrenderRequested) {
    const winner = surrenderRequested === "red" ? "Blue" : "Red";
    endGame(`${winner} wins! (${surrenderRequested} surrendered)`);
    return true;
  }

  // Condition 6: Mutual agreement (handled by direct endGame() call)
  // Condition 4: 20-minute timeout (handled by session timer)

  return false;
}

// Helper: Check if player has ANY valid move
function playerHasAnyValidMove(color) {
  const pieces = document.querySelectorAll(`.piece.${color}`);
  for (const piece of pieces) {
    const sq = piece.parentElement;
    const row = parseInt(sq.dataset.row, 10);
    const col = parseInt(sq.dataset.col, 10);

    // Check all playable squares for valid moves
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

function endGame(reason) {
  if (gameOver) return;
  gameOver = true;

  // Stop all timers
  if (sessionInterval) clearInterval(sessionInterval);
  if (roundInterval) clearInterval(roundInterval);

  // Calculate final scores: add remaining pieces' values
  const redPieces = document.querySelectorAll(".piece.red");
  const bluePieces = document.querySelectorAll(".piece.blue");

  let redRemaining = 0;
  redPieces.forEach((piece) => {
    const value = parseFloat(piece.dataset.value);
    if (!isNaN(value)) redRemaining += value;
  });

  let blueRemaining = 0;
  bluePieces.forEach((piece) => {
    const value = parseFloat(piece.dataset.value);
    if (!isNaN(value)) blueRemaining += value;
  });

  // Add remaining values to current scores
  redScore += redRemaining;
  blueScore += blueRemaining;

  // Format scores to 2 decimal places (DepEd compliant)
  const finalRed = redScore.toFixed(2);
  const finalBlue = blueScore.toFixed(2);

  // Determine winner based on final scores
  let winnerMessage = "";
  const redNum = parseFloat(finalRed);
  const blueNum = parseFloat(finalBlue);

  if (redNum > blueNum) {
    winnerMessage = "Red wins!";
  } else if (blueNum > redNum) {
    winnerMessage = "Blue wins!";
  } else {
    winnerMessage = "It's a draw!";
  }

  // Create detailed final message
  const finalMessage =
    `GAME OVER\n\n` +
    `${reason}\n\n` +
    `Final Scores:\n` +
    `Red: ${finalRed}\n` +
    `Blue: ${finalBlue}\n\n` +
    `${winnerMessage}\n\n` +
    `Remaining pieces added:\n` +
    `Red: ${redRemaining.toFixed(2)}\n` +
    `Blue: ${blueRemaining.toFixed(2)}`;

  // Show alert and log to console
  alert(finalMessage);
  console.log("Game Over:", reason);
  console.log("Final Scores - Red:", finalRed, "Blue:", finalBlue);
  console.log(
    "Remaining values - Red:",
    redRemaining.toFixed(2),
    "Blue:",
    blueRemaining.toFixed(2)
  );
}

function undoMove() {
  if (gameOver || replayMode || currentMoveIndex <= 0) return;

  currentMoveIndex--;
  restoreBoardState(moveHistoryStates[currentMoveIndex]);

  // Update move history to match
  currentHistoryIndex = currentMoveIndex - 1;
  if (currentHistoryIndex < -1) currentHistoryIndex = -1;
  updateMoveHistoryDOM();
}

function redoMove() {
  if (
    gameOver ||
    replayMode ||
    currentMoveIndex >= moveHistoryStates.length - 1
  )
    return;

  currentMoveIndex++;
  restoreBoardState(moveHistoryStates[currentMoveIndex]);

  // Update move history to match
  currentHistoryIndex = currentMoveIndex - 1;
  updateMoveHistoryDOM();
}

function startReplay(speed = 1000) {
  if (moveHistoryStates.length === 0) return;

  replayMode = true;
  let replayIndex = 0;

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
  // Restore to current game state
  if (currentMoveIndex >= 0 && currentMoveIndex < moveHistoryStates.length) {
    restoreBoardState(moveHistoryStates[currentMoveIndex]);
  }
}

// INIT
setupDebugControls();
placeInitialPieces();
