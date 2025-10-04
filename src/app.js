const gameboard = document.getElementById("gameboard");
const redScoreEl = document.getElementById("red-score");
const blueScoreEl = document.getElementById("blue-score");
const currentPlayerEl = document.getElementById("current-player");
const errorMessageEl = document.getElementById("error-message");

const mainMenu = document.getElementById("main-menu");
const gameScreen = document.getElementById("game-screen");
let gameMode = null; // "pvp" or "pvc"

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
let currentMoveIndex = -1; // Current position in move history

let replayMode = false;
let replayInterval = null;
let gameOver = false;

let piecesTransparent = false;

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
      // Optional: aria-label only needed in game
      const symbol = document.createElement("span");
      symbol.classList.add("symbol");
      symbol.textContent = DAMATH_LAYOUT[row][col];
      symbol.setAttribute("aria-hidden", "true");
      square.appendChild(symbol);

      // Only add pieces if requested
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
          square.appendChild(piece);
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
        square.setAttribute(
          "aria-label",
          `Square ${row},${col} ${isLight ? "playable" : "dark"}`
        );

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
  } finally {
    showLoading(false);
  }
}

// ================== UTIL FUNCTIONS ==================
function getMathSymbol(row, col) {
  return DAMATH_LAYOUT[row][col];
}

// Highlight move squares
function highlightMoveSquares(startRow, startCol, endRow, endCol) {
  clearMoveHighlights();

  const fromSquare = document.querySelector(
    `.square[data-row='${startRow}'][data-col='${startCol}']`
  );
  const toSquare = document.querySelector(
    `.square[data-row='${endRow}'][data-col='${endCol}']`
  );

  if (fromSquare) {
    fromSquare.classList.add("move-from");
    fromSquare.setAttribute(
      "aria-label",
      `${fromSquare.getAttribute("aria-label")} move from`
    );
  }
  if (toSquare) {
    toSquare.classList.add("move-to");
    toSquare.setAttribute(
      "aria-label",
      `${toSquare.getAttribute("aria-label")} move to`
    );
  }

  // Auto-clear highlights after 2 seconds
  setTimeout(clearMoveHighlights, 2000);
}

function switchTurn() {
  currentPlayer = currentPlayer === "red" ? "blue" : "red";
  currentPlayerEl.textContent = currentPlayer;

  // Update current player label for styling
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

  // Future AI hook
  if (gameMode === "pvc" && currentPlayer === "blue") {
    // TODO: Call AI move logic here
    setTimeout(() => {
      alert("AI move logic not implemented yet.");
    }, 500);
  }
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

  // Optional: Log to move history as final entries
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

// Save current board state
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

  // Save all pieces
  document.querySelectorAll(".piece").forEach((piece) => {
    const square = piece.parentElement;
    // Get the piece key from data-value or reconstruct it
    const value = piece.dataset.value;
    const color = piece.classList.contains("red") ? "red" : "blue";

    // Find the original piece key from PIECES object
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
    // Fallback if not found
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

// Restore board state
function restoreBoardState(state) {
  // Clear board
  document.querySelectorAll(".piece").forEach((p) => p.remove());

  // Restore pieces
  state.pieces.forEach((pieceData) => {
    const square = document.querySelector(
      `.square[data-row='${pieceData.row}'][data-col='${pieceData.col}']`
    );
    if (!square) return;

    // Extract color from piece key (e.g., "r7" → "red", "b3" → "blue")
    const color = pieceData.key.startsWith("r") ? "red" : "blue";

    const piece = document.createElement("div");
    piece.classList.add("piece", color);
    if (pieceData.isKing) piece.classList.add("king");
    piece.dataset.value = pieceData.value;
    piece.draggable = true;
    piece.tabIndex = 0;
    piece.setAttribute("aria-label", `${color} piece value ${pieceData.value}`);

    const numberLabel = document.createElement("span");
    numberLabel.classList.add("piece-number");
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

  // Update current player label for styling
  const currentPlayerLabel = document.querySelector(".current-player-label");
  if (currentPlayerLabel) {
    currentPlayerLabel.setAttribute("data-player", currentPlayer);
  }

  // Restore mustCaptureWithPiece
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

  // Update UI
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

  // Handle division by zero
  if (operator.trim().includes("÷") || operator.trim() === "/") {
    if (capturedValue === 0) {
      console.warn("Sci-Damath: Division by zero! Score = 0.00");
      return 0.0;
    }
  }

  // Calculate base result
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

  // Apply multipliers based on dama status
  let multiplier = 1;
  if (isCapturingKing && isCapturedKing) {
    multiplier = 4; // Dama vs Dama
  } else if (isCapturingKing || isCapturedKing) {
    multiplier = 2; // Dama vs Ordinary (either direction)
  }

  const finalResult = result * multiplier;

  // DepEd rounding: 2 decimal places, standard rounding
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
    // King capture logic (unchanged - already works)
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
    // ✅ FIXED: Regular piece capture logic
    if (Math.abs(endRow - startRow) !== 2 || Math.abs(endCol - startCol) !== 2)
      return false;

    // ✅ Ensure landing square is EMPTY
    const endSq = document.querySelector(
      `.square[data-row='${endRow}'][data-col='${endCol}']`
    );
    if (endSq?.querySelector(".piece")) return false;

    // ✅ Get middle square and piece
    const midRow = (startRow + endRow) / 2;
    const midCol = (startCol + endCol) / 2;
    const midSq = document.querySelector(
      `.square[data-row='${midRow}'][data-col='${midCol}']`
    );
    const midPiece = midSq?.querySelector(".piece");

    // ✅ Valid capture: opponent piece in middle, empty landing square
    return midPiece && !midPiece.classList.contains(color);
  }
}

function isValidMove(piece, startRow, startCol, endRow, endCol) {
  const target = document.querySelector(
    `.square[data-row='${endRow}'][data-col='${endCol}']`
  );
  // ✅ Target must be playable and EMPTY
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

  // ✅ Mandatory capture enforcement
  if (playerHasMandatoryCapture(color)) {
    return isCaptureMove(piece, startRow, startCol, endRow, endCol);
  }

  // Non-capture moves
  if (isKing) {
    if (Math.abs(rowDiff) !== Math.abs(colDiff) || rowDiff === 0) return false;
    return isDiagonalPathClear(startRow, startCol, endRow, endCol, color);
  } else {
    // Regular piece: only 1-square forward moves (non-captures)
    if (Math.abs(rowDiff) !== 1 || Math.abs(colDiff) !== 1) return false;
    if (color === "red" && rowDiff >= 0) return false; // red moves up
    if (color === "blue" && rowDiff <= 0) return false; // blue moves down
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
      let multiplier = 1;
      let multiplierText = "×1";
      if (entry.isCapturingKing && entry.isCapturedKing) {
        multiplier = 4;
        multiplierText = "×4 (DAMA vs DAMA)";
      } else if (entry.isCapturingKing || entry.isCapturedKing) {
        multiplier = 2;
        multiplierText = "×2 (DAMA involved)";
      }

      // Color based on result sign
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
    // ✅ NEW (robust)
    if (
      Math.abs(endRow - startRow) === 2 &&
      Math.abs(endCol - startCol) === 2
    ) {
      const midRow = (startRow + endRow) / 2;
      const midCol = (startCol + endCol) / 2;

      // ✅ SAFETY CHECKS
      if (midRow < 0 || midRow > 7 || midCol < 0 || midCol > 7) {
        console.warn("Invalid mid position:", midRow, midCol);
        return;
      }

      const midSquare = document.querySelector(
        `.square[data-row='${midRow}'][data-col='${midCol}']`
      );
      const midPiece = midSquare?.querySelector(".piece");

      // ✅ VALIDATE CAPTURED PIECE
      if (midPiece && !midPiece.classList.contains(color)) {
        capturedPieces.push(midPiece);
      } else {
        console.warn("No valid captured piece found at:", midRow, midCol);
      }
    }
  }

  let scoreChange = 0;

  if (capturedPieces.length > 0) {
    const capturedPiece = capturedPieces[0];

    // ✅ SAFETY CHECK: Ensure captured piece exists
    if (!capturedPiece) {
      console.error("Captured piece is undefined!");
      return;
    }

    const operator = getMathSymbol(endRow, endCol);

    // ✅ PASS THE PIECE ELEMENTS, NOT VALUES
    scoreChange = calculateSciDamathScore(piece, capturedPiece, operator);

    if (color === "red") redScore += scoreChange;
    else blueScore += scoreChange;

    redScoreEl.textContent = redScore.toFixed(2);
    blueScoreEl.textContent = blueScore.toFixed(2);

    // Play capture sound
    playSound("capture");

    logMove({
      type: "capture",
      player: color,
      piece: pieceKey,
      capturingValue: parseInt(piece.dataset.value, 10),
      operator: operator,
      capturedValue: parseInt(capturedPiece.dataset.value, 10),
      result: scoreChange,
      isCapturingKing: piece.classList.contains("king"), // 👈 ADD
      isCapturedKing: capturedPiece.classList.contains("king"), // 👈 ADD
    });

    // ✅ REMOVE PIECE LAST
    capturedPieces.forEach((p) => p.remove());
  } else {
    // Play move sound
    playSound("move");

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
  const startSq = piece.parentElement;
  const endSq = document.querySelector(
    `.square[data-row='${endRow}'][data-col='${endCol}']`
  );

  // 👇 RESTORE FULL OPACITY ON OLD SQUARE (no piece now)
  startSq
    .querySelector(".symbol")
    ?.style.setProperty("--symbol-opacity", "0.8");

  // 👇 MOVE PIECE
  endSq.appendChild(piece);

  // 👇 DIM SYMBOL ON NEW SQUARE
  endSq.querySelector(".symbol")?.style.setProperty("--symbol-opacity", "0.3");

  // ✅ ADD THIS LINE TO ENABLE CHESS-STYLE HIGHLIGHTING:
  highlightMoveSquares(startRow, startCol, endRow, endCol);

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
    // Play promotion sound
    playSound("promotion");

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

  // === SAVE BOARD STATE FOR UNDO/REDO ===
  moveHistoryStates = moveHistoryStates.slice(0, currentMoveIndex + 1);
  const currentState = saveBoardState();
  moveHistoryStates.push(currentState);
  currentMoveIndex++;

  // ✅ ADD MOVE HIGHLIGHTING (works in replay mode too)
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
  // Remove valid move hints
  document.querySelectorAll(".square.valid-move").forEach((sq) => {
    sq.classList.remove("valid-move");
  });

  // Remove selection highlights
  document.querySelectorAll(".square.piece-dragging").forEach((sq) => {
    sq.classList.remove("piece-dragging");
  });
}

// ================== INPUT HANDLERS ==================
gameboard.addEventListener("click", (e) => {
  const piece = e.target.closest(".piece");
  const square = e.target.closest(".square");

  if (!square || !square.classList.contains("playable")) return;

  // Only allow selecting current player's pieces
  if (piece && piece.classList.contains(currentPlayer)) {
    // Clear previous selection
    document.querySelectorAll(".square.piece-selected").forEach((sq) => {
      sq.classList.remove("piece-selected");
    });

    // Select new piece
    selectedPiece = piece;
    const pieceSquare = piece.parentElement;

    // Show valid moves
    const startRow = parseInt(pieceSquare.dataset.row, 10);
    const startCol = parseInt(pieceSquare.dataset.col, 10);
    showValidMoves(piece, startRow, startCol);
    return;
  }

  // Handle move attempt
  if (selectedPiece && square) {
    const startSq = selectedPiece.parentElement;
    const startRow = parseInt(startSq.dataset.row, 10);
    const startCol = parseInt(startSq.dataset.col, 10);
    const endRow = parseInt(square.dataset.row, 10);
    const endCol = parseInt(square.dataset.col, 10);

    if (isValidMove(selectedPiece, startRow, startCol, endRow, endCol)) {
      performMove(selectedPiece, startRow, startCol, endRow, endCol);
    } else {
    }
    // Remove selection after move attempt (valid or invalid)
    if (selectedPiece) {
      selectedPiece = null;
    }
    clearValidMoves();
  }
});

gameboard.addEventListener("dragstart", (e) => {
  const piece = e.target.closest(".piece");
  if (!piece || !piece.classList.contains(currentPlayer)) {
    e.preventDefault();
    return;
  }

  // Highlight original square
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
    // Remove dragging highlight
    selectedPiece.parentElement.classList.remove("piece-dragging");
    selectedPiece = null;
    clearValidMoves();
    cleanupDrag();
  }
});

gameboard.addEventListener("dragover", (e) => {
  e.preventDefault();
  // Optional: Add hover effect on valid drop targets
});

gameboard.addEventListener("drop", (e) => {
  e.preventDefault();
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

  // Clean up
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
        clearInterval(sessionInterval); // Stop session too
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
    piece.setAttribute(
      "aria-label",
      `${pieceData.color} piece value ${pieceData.value}`
    );

    const label = document.createElement("span");
    label.classList.add("piece-number");
    label.textContent = pieceData.value;
    piece.appendChild(label);
    square.appendChild(piece);

    // 👇 DIM SYMBOL BECAUSE PIECE IS PRESENT
    square
      .querySelector(".symbol")
      ?.style.setProperty("--symbol-opacity", "0.3");
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

  // Reset unified state system
  moveHistoryStates = [];
  currentMoveIndex = -1;
  moveHistoryEntries = [];
  currentHistoryIndex = -1;
  replayMode = false;
  if (replayInterval) clearInterval(replayInterval);

  // Clear status messages
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

  // Debug toggle
  if (toggle) {
    toggle.addEventListener("click", () => {
      debugMode = !debugMode;
      toggle.textContent = `Debug Mode: ${debugMode ? "ON" : "OFF"}`;
      toggle.classList.toggle("debug-on", debugMode);
      resetGame();
    });
  }

  // Reset board
  if (reset) {
    reset.addEventListener("click", resetGame);
  }

  // End game
  if (endGameBtn) {
    endGameBtn.addEventListener("click", () => {
      if (sessionInterval) clearInterval(sessionInterval);
      if (roundInterval) clearInterval(roundInterval);
      endGame("Game ended manually");
    });
  }

  // Surrender
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

  // Agree to finish
  if (agreeBtn) {
    agreeBtn.addEventListener("click", () => {
      if (!gameOver && confirm("Do both players agree to end the game?")) {
        endGame("Game ended by mutual agreement.");
      }
    });
  }

  // Undo/Redo
  if (undoBtn) undoBtn.addEventListener("click", undoMove);
  if (redoBtn) redoBtn.addEventListener("click", redoMove);

  // Replay
  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      if (confirm("Start replay from beginning?")) {
        startReplay(1000);
      }
    });
  }
  if (stopReplayBtn) {
    stopReplayBtn.addEventListener("click", stopReplay);
  }

  // Transparency toggle
  if (transparencyBtn) {
    transparencyBtn.addEventListener("click", togglePieceTransparency);
  }

  // Back to menu (only in game.html)
  if (backToMenuBtn) {
    backToMenuBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("Return to main menu? Current game will be lost.")) {
        window.location.href = "index.html";
      }
    });
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

  // Play game end sound
  playSound("gameEnd");

  // === USE calculateFinalScores() INSTEAD ===
  const finalScores = calculateFinalScores();
  const finalRed = finalScores.red.toFixed(2);
  const finalBlue = finalScores.blue.toFixed(2);

  // Determine winner based on final scores
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

  // Create detailed final message
  const finalMessage =
    `GAME OVER\n\n` +
    `${reason}\n\n` +
    `Final Scores:\n` +
    `Red: ${finalRed}\n` +
    `Blue: ${finalBlue}\n\n` +
    `${winnerMessage}`;

  // Show alert and log to console
  alert(finalMessage);
  console.log("Game Over:", reason);
  console.log("Final Scores - Red:", finalRed, "Blue:", finalBlue);
}

function undoMove() {
  if (gameOver || replayMode || currentMoveIndex <= 0) {
    return;
  }

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
  ) {
    return;
  }

  currentMoveIndex++;
  restoreBoardState(moveHistoryStates[currentMoveIndex]);

  // Update move history to match
  currentHistoryIndex = currentMoveIndex - 1;
  updateMoveHistoryDOM();
}

function startReplay(speed = 1000) {
  if (moveHistoryStates.length === 0) {
    return;
  }

  replayMode = true;
  let replayIndex = 0;

  // Clear any existing highlights
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
  // Restore to current game state
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

// Clear move highlights
function clearMoveHighlights() {
  document
    .querySelectorAll(".square.move-from, .square.move-to")
    .forEach((sq) => {
      sq.classList.remove("move-from", "move-to");
      // Reset aria-label to remove move annotations
      const baseLabel = sq.classList.contains("light") ? "playable" : "dark";
      sq.setAttribute(
        "aria-label",
        `Square ${sq.dataset.row},${sq.dataset.col} ${baseLabel}`
      );
    });
}

// Highlight move squares
function highlightMoveSquares(startRow, startCol, endRow, endCol) {
  clearMoveHighlights();

  const fromSquare = document.querySelector(
    `.square[data-row='${startRow}'][data-col='${startCol}']`
  );
  const toSquare = document.querySelector(
    `.square[data-row='${endRow}'][data-col='${endCol}']`
  );

  if (fromSquare) {
    fromSquare.classList.add("move-from");
    fromSquare.setAttribute(
      "aria-label",
      `${fromSquare.getAttribute("aria-label")} move from`
    );
  }
  if (toSquare) {
    toSquare.classList.add("move-to");
    toSquare.setAttribute(
      "aria-label",
      `${toSquare.getAttribute("aria-label")} move to`
    );
  }
}

function initializeGame() {
  // Reset all game state
  resetGame(); // This already clears board, scores, timers, etc.

  // Set initial current player styling
  const currentPlayerLabel = document.querySelector(".current-player-label");
  if (currentPlayerLabel) {
    currentPlayerLabel.setAttribute("data-player", currentPlayer);
  }

  // Initialize board and controls
  initializeBoard();
  setupDebugControls();
}

// ================== INITIALIZATION ==================
document.addEventListener("DOMContentLoaded", () => {
  // Check if we're on the game screen (gameboard exists)
  if (gameboard) {
    // Initialize game directly
    const currentPlayerLabel = document.querySelector(".current-player-label");
    if (currentPlayerLabel) {
      currentPlayerLabel.setAttribute("data-player", currentPlayer);
    }
    initializeBoard();
    setupDebugControls();

    // Handle "Back to Menu" button if present
    const backToMenuBtn = document.getElementById("back-to-menu");
    if (backToMenuBtn) {
      backToMenuBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (confirm("Return to main menu? Current game will be lost.")) {
          window.location.href = "index.html";
        }
      });
    }
  } else {
    // Optional: If you ever load app.js on menu page, handle it here
    console.warn(
      "Gameboard not found. Make sure this script is only loaded on game.html"
    );
  }
});

// Export for testing if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    calculateSciDamathScore,
    isValidMove,
    playerHasMandatoryCapture,
  };
}
