const gameboard = document.getElementById("gameboard");
const redScoreEl = document.getElementById("red-score");
const blueScoreEl = document.getElementById("blue-score");
const currentPlayerEl = document.getElementById("current-player");

let redScore = 0;
let blueScore = 0;
let currentPlayer = "red"; // Red starts first
let selectedPiece = null;

let sessionMinutes = 20; // 20:00 session
let sessionSeconds = 0;

let roundMinutes = 1; // 1:00 round
let roundSeconds = 0;

let sessionInterval;
let roundInterval;

let timersStarted = false;
let debugMode = false; // Debug mode toggle

// Chain capture state
let mustCaptureWithPiece = null;

// ================== INITIAL SETUP (on LIGHT squares only) ==================
let INITIAL_SETUP = {
  // Blue pieces (top)
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
  // Red pieces (bottom)
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

// ================== DEBUG SETUP ==================
let DEBUG_SETUP = {
  "0,0": "r2", // Red king on light square (top-left)
  "7,7": "r6", // Red king on light square (bottom-right)
  "2,4": "b1",
  "4,4": "b2",
  "2,2": "b3",
  "4,2": "b4",
};

const sessionEl = document.getElementById("session-time");
const roundEl = document.getElementById("round-time");

// ================== PIECE DEFINITIONS ==================
const PIECES = {
  // Red pieces
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
  // Blue pieces
  b1: { color: "blue", value: 2 },
  b2: { color: "blue", value: -5 },
  b3: { color: "blue", value: 8 },
  b4: { color: "blue", value: -11 },
  b5: { color: "blue", value: -7 },
  b6: { color: "blue", value: 10 },
  b7: { color: "blue", value: -3 },
  b8: { color: "blue", value: 0 }, // fixed -0 → 0
  b9: { color: "blue", value: -4 },
  b10: { color: "blue", value: -1 },
  b11: { color: "blue", value: -6 },
  b12: { color: "blue", value: -9 },
};

// ================== DAMATH BOARD SYMBOLS ==================
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

    // Only light squares are playable
    if (isLight) {
      square.classList.add("playable");
    }

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
  document.querySelectorAll(".symbol").forEach((sym) => {
    sym.classList.remove("highlight");
  });
  const square = document.querySelector(
    `.square[data-row='${row}'][data-col='${col}']`
  );
  if (square) {
    const symbol = square.querySelector(".symbol");
    if (symbol) symbol.classList.add("highlight");
  }
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

// ================== BRAZILIAN CHECKERS LOGIC ==================
function playerHasMandatoryCapture(color) {
  const pieces = document.querySelectorAll(`.piece.${color}`);
  for (const piece of pieces) {
    const sq = piece.parentElement;
    const row = parseInt(sq.dataset.row, 10);
    const col = parseInt(sq.dataset.col, 10);
    if (hasMandatoryCapture(piece, row, col)) {
      return true;
    }
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
            if (!landSq.querySelector(".piece")) {
              return true;
            }
          }
          break;
        }
        r += dRow;
        c += dCol;
      }
    }
  } else {
    // Regular piece: check all 4 diagonal directions for captures
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
  const targetSquare = document.querySelector(
    `.square[data-row='${endRow}'][data-col='${endCol}']`
  );
  if (
    !targetSquare ||
    !targetSquare.classList.contains("playable") ||
    targetSquare.querySelector(".piece")
  ) {
    return false;
  }

  const color = piece.classList.contains("red") ? "red" : "blue";
  const isKing = piece.classList.contains("king");
  const rowDiff = endRow - startRow;
  const colDiff = endCol - startCol;

  // Global mandatory capture rule
  if (playerHasMandatoryCapture(color)) {
    return isCaptureMove(piece, startRow, startCol, endRow, endCol);
  }

  // Non-capture moves
  if (isKing) {
    if (Math.abs(rowDiff) !== Math.abs(colDiff) || rowDiff === 0) return false;
    return isDiagonalPathClear(startRow, startCol, endRow, endCol, color);
  } else {
    // Regular piece: ONLY 1-square FORWARD for non-captures
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
    if (p && !p.classList.contains(color)) {
      captured.push(p);
    }
    r += dRow;
    c += dCol;
  }
  return captured;
}

function checkForChainCapture(piece, row, col) {
  return hasMandatoryCapture(piece, row, col);
}

// ================== PERFORM MOVE ==================
function performMove(piece, startRow, startCol, endRow, endCol) {
  const startSquare = document.querySelector(
    `.square[data-row='${startRow}'][data-col='${startCol}']`
  );
  const endSquare = document.querySelector(
    `.square[data-row='${endRow}'][data-col='${endCol}']`
  );

  let capturedPieces = [];
  const isKing = piece.classList.contains("king");
  const color = piece.classList.contains("red") ? "red" : "blue";

  if (isKing) {
    capturedPieces = findCapturedPieces(
      startRow,
      startCol,
      endRow,
      endCol,
      color
    );
  } else {
    if (Math.abs(endRow - startRow) === 2) {
      const midRow = (startRow + endRow) / 2;
      const midCol = (startCol + endCol) / 2;
      const midPiece = document.querySelector(
        `.square[data-row='${midRow}'][data-col='${midCol}'] .piece`
      );
      if (midPiece) capturedPieces.push(midPiece);
    }
  }

  // Remove captured pieces and update score
  capturedPieces.forEach((capturedPiece) => {
    const capturedValue = parseInt(capturedPiece.dataset.value, 10);
    capturedPiece.remove();

    if (color === "red") redScore += capturedValue;
    else blueScore += capturedValue;
  });

  redScoreEl.textContent = redScore;
  blueScoreEl.textContent = blueScore;

  // Move piece
  endSquare.appendChild(piece);

  // Handle chain capture
  if (
    capturedPieces.length > 0 &&
    checkForChainCapture(piece, endRow, endCol)
  ) {
    mustCaptureWithPiece = piece;
  } else {
    mustCaptureWithPiece = null;
    switchTurn();
  }

  // King promotion
  if (!isKing) {
    if (color === "red" && endRow === 0) {
      makeKing(piece, "assets/red_crown.png");
    }
    if (color === "blue" && endRow === 7) {
      makeKing(piece, "assets/blue_crown.png");
    }
  }

  highlightSquareSymbol(endRow, endCol);
  clearValidMoves();

  // Start timers on first move
  if (!timersStarted) {
    timersStarted = true;
    startSessionTimer();
    startRoundTimer();
  }
}

function makeKing(piece, kingImgSrc) {
  piece.classList.add("king");

  const oldKingImg = piece.querySelector(".king-image");
  if (oldKingImg) oldKingImg.remove();

  const kingImg = document.createElement("img");
  kingImg.src = kingImgSrc;
  kingImg.classList.add("king-image");
  kingImg.alt = "King";
  piece.appendChild(kingImg);
}

// ================== DEBUG KINGS ==================
function makeDebugKings() {
  const positions = ["0,0", "7,7"];
  positions.forEach((pos) => {
    const [row, col] = pos.split(",").map(Number);
    const square = document.querySelector(
      `.square[data-row='${row}'][data-col='${col}']`
    );
    const piece = square?.querySelector(".piece.red");
    if (piece && !piece.classList.contains("king")) {
      makeKing(piece, "assets/red_crown.png");
    }
  });
}

// ================== VALID MOVE HIGHLIGHTS ==================
function showValidMoves(piece, startRow, startCol) {
  clearValidMoves();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const square = document.querySelector(
        `.square[data-row='${r}'][data-col='${c}']`
      );
      if (
        square &&
        square.classList.contains("playable") &&
        isValidMove(piece, startRow, startCol, r, c)
      ) {
        square.classList.add("valid-move");
      }
    }
  }
}

function clearValidMoves() {
  document.querySelectorAll(".square.valid-move").forEach((sq) => {
    sq.classList.remove("valid-move");
  });
}

// ================== CLICK SELECTION + MOVE ==================
gameboard.addEventListener("click", (e) => {
  const piece = e.target.closest(".piece");
  const square = e.target.closest(".square");

  if (!square || !square.classList.contains("playable")) return;

  // Chain capture: only allow the capturing piece to be selected/moved
  if (mustCaptureWithPiece && piece !== mustCaptureWithPiece) {
    return;
  }

  // Selecting a piece
  if (piece && piece.classList.contains(currentPlayer)) {
    if (selectedPiece) selectedPiece.classList.remove("selected");
    selectedPiece = piece;
    selectedPiece.classList.add("selected");

    const startSquare = selectedPiece.parentElement;
    const startRow = parseInt(startSquare.dataset.row, 10);
    const startCol = parseInt(startSquare.dataset.col, 10);
    showValidMoves(selectedPiece, startRow, startCol);
    return;
  }

  // Attempting a move
  if (selectedPiece && square) {
    const startSquare = selectedPiece.parentElement;
    const startRow = parseInt(startSquare.dataset.row, 10);
    const startCol = parseInt(startSquare.dataset.col, 10);
    const endRow = parseInt(square.dataset.row, 10);
    const endCol = parseInt(square.dataset.col, 10);

    if (isValidMove(selectedPiece, startRow, startCol, endRow, endCol)) {
      performMove(selectedPiece, startRow, startCol, endRow, endCol);
    } else if (playerHasMandatoryCapture(currentPlayer)) {
      // Show invalid move animation only if mandatory capture exists
      square.classList.add("invalid-move");
      setTimeout(() => {
        square.classList.remove("invalid-move");
      }, 300);
    }

    if (selectedPiece) {
      selectedPiece.classList.remove("selected");
    }
    selectedPiece = null;
  }
});

// ================== DRAG & DROP ==================
gameboard.addEventListener("dragstart", (e) => {
  const piece = e.target.closest(".piece");
  if (!piece || !piece.classList.contains(currentPlayer)) {
    e.preventDefault();
    return;
  }
  selectedPiece = piece;
});

gameboard.addEventListener("dragover", (e) => {
  e.preventDefault();
});

gameboard.addEventListener("drop", (e) => {
  e.preventDefault();
  const square = e.target.closest(".square");
  if (!square || !square.classList.contains("playable") || !selectedPiece)
    return;

  // Chain capture restriction
  if (mustCaptureWithPiece && selectedPiece !== mustCaptureWithPiece) {
    selectedPiece = null;
    return;
  }

  const startSquare = selectedPiece.parentElement;
  const startRow = parseInt(startSquare.dataset.row, 10);
  const startCol = parseInt(startSquare.dataset.col, 10);
  const endRow = parseInt(square.dataset.row, 10);
  const endCol = parseInt(square.dataset.col, 10);

  if (isValidMove(selectedPiece, startRow, startCol, endRow, endCol)) {
    performMove(selectedPiece, startRow, startCol, endRow, endCol);
  } else if (playerHasMandatoryCapture(currentPlayer)) {
    square.classList.add("invalid-move");
    setTimeout(() => {
      square.classList.remove("invalid-move");
    }, 300);
  }

  if (selectedPiece) {
    selectedPiece.classList.remove("selected");
  }
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
        alert("Session over!");
        return;
      } else {
        sessionMinutes--;
        sessionSeconds = 59;
      }
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
        alert(`Time's up for ${currentPlayer} player!`);
        return;
      } else {
        roundMinutes--;
        roundSeconds = 59;
      }
    } else {
      roundSeconds--;
    }
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

  // Flash warning if less than 10 seconds
  if (roundMinutes === 0 && roundSeconds <= 10) {
    roundEl.classList.add("timer-warning");
  } else {
    roundEl.classList.remove("timer-warning");
  }
}

// ================== DEBUG CONTROLS ==================
function setupDebugControls() {
  const debugToggle = document.getElementById("debug-toggle");
  const resetBoard = document.getElementById("reset-board");

  if (debugToggle) {
    debugToggle.addEventListener("click", () => {
      debugMode = !debugMode;
      debugToggle.textContent = `Debug Mode: ${debugMode ? "ON" : "OFF"}`;
      debugToggle.style.background = debugMode ? "#51cf66" : "#ff6b6b";

      resetGame();
      console.log(`Debug mode ${debugMode ? "enabled" : "disabled"}`);
    });
  }

  if (resetBoard) {
    resetBoard.addEventListener("click", () => {
      resetGame();
      console.log("Board reset");
    });
  }
}

function resetGame() {
  // Reset scores and state
  redScore = 0;
  blueScore = 0;
  redScoreEl.textContent = redScore;
  blueScoreEl.textContent = blueScore;
  currentPlayer = "red";
  currentPlayerEl.textContent = currentPlayer;

  mustCaptureWithPiece = null;
  selectedPiece = null;

  // Clear timers
  if (sessionInterval) clearInterval(sessionInterval);
  if (roundInterval) clearInterval(roundInterval);
  timersStarted = false;

  // Reset timer displays
  sessionMinutes = 20;
  sessionSeconds = 0;
  roundMinutes = 1;
  roundSeconds = 0;
  updateTimerDisplay();

  // Reload board
  placeInitialPieces();
}

// ================== PLACE INITIAL PIECES ==================
function placeInitialPieces() {
  // Clear existing pieces
  document.querySelectorAll(".piece").forEach((piece) => piece.remove());

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

    const numberLabel = document.createElement("span");
    numberLabel.classList.add("piece-number");
    numberLabel.textContent = pieceData.value;
    piece.appendChild(numberLabel);

    square.appendChild(piece);
  }

  if (debugMode) {
    makeDebugKings();
  }
}

// ================== INIT ==================
setupDebugControls();
placeInitialPieces();
