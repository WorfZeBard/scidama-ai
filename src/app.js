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
  // add all initial pieces you want
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
  b1: { color: "blue", value: 2},
  b2: { color: "blue", value: -5},
  b3: { color: "blue", value: 8},
  b4: { color: "blue", value: -11},
  b5: { color: "blue", value: -7},
  b6: { color: "blue", value: 10},
  b7: { color: "blue", value: -3},
  b8: { color: "blue", value: -0},
  b9: { color: "blue", value: -4},
  b10: { color: "blue", value: -1},
  b11: { color: "blue", value: -6},
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
  ["", "+", "", "-", "", "÷", "", "x"]
];

function getMathSymbol(row, col) {
  return DAMATH_LAYOUT[row][col];
}


// ================== BOARD GENERATION ==================
for (let row = 0; row < 8; row++) {
  for (let col = 0; col < 8; col++) {
    const square = document.createElement("div");
    square.classList.add("square", (row + col) % 2 === 0 ? "light" : "dark");
    square.dataset.row = row;
    square.dataset.col = col;

    // Add math symbol
    const symbol = document.createElement("span");
    symbol.classList.add("symbol");
    symbol.textContent = getMathSymbol(row, col);
    square.appendChild(symbol);

    gameboard.appendChild(square);
  }
}

// ================== PLACE INITIAL PIECES ==================
function placeInitialPieces() {
  for (const pos in INITIAL_SETUP) {
    const [row, col] = pos.split(",").map(Number);
    const pieceKey = INITIAL_SETUP[pos];
    const pieceData = PIECES[pieceKey];
    if (!pieceData) continue;

    const square = document.querySelector(
      `.square[data-row='${row}'][data-col='${col}']`
    );
    if (!square) continue;

    const piece = document.createElement("div");
    piece.classList.add("piece", pieceData.color);
    piece.setAttribute("tabindex", "0");
    piece.draggable = true;

    // Save value on element
    piece.dataset.value = pieceData.value;

    // Add number label in center
    const numberLabel = document.createElement("span");
    numberLabel.classList.add("piece-number");
    numberLabel.textContent = pieceData.value;

    piece.appendChild(numberLabel);
    square.appendChild(piece);
  }
}

// ================== HIGHLIGHT MATH SYMBOL ==================
function highlightSquareSymbol(row, col) {
  document.querySelectorAll(".symbol").forEach((sym) => {
    sym.classList.remove("highlight");
    void sym.offsetWidth; // retrigger animation
  });
  const square = document.querySelector(
    `.square[data-row='${row}'][data-col='${col}']`
  );
  if (square) {
    const symbol = square.querySelector(".symbol");
    if (symbol) symbol.classList.add("highlight");
  }
}

// ================== SWITCH TURN ==================
function switchTurn() {
  // Switch player
  currentPlayer = currentPlayer === "red" ? "blue" : "red";
  document.getElementById("player").textContent = currentPlayer;

  // Reset the round timer for the new player
  if (roundInterval) clearInterval(roundInterval);
  roundMinutes = 1;
  roundSeconds = 0;

  // Update timer element class for active player
  roundEl.classList.remove("timer-red", "timer-blue", "timer-warning");
  if (currentPlayer === "red") {
    roundEl.classList.add("timer-red");
  } else {
    roundEl.classList.add("timer-blue");
  }

  startRoundTimer();
}


// ================== VALID MOVE CHECK ==================
function isValidMove(piece, startRow, startCol, endRow, endCol) {
  const targetSquare = document.querySelector(
    `.square[data-row='${endRow}'][data-col='${endCol}']`
  );
  if (!targetSquare) return false;

  // Cannot move onto an occupied square
  if (targetSquare.querySelector(".piece")) return false;

  const rowDiff = endRow - startRow;
  const colDiff = Math.abs(endCol - startCol);

  // Determine piece color
  const color = piece.classList.contains("red") ? "red" : "blue";
  const isKing = piece.classList.contains("king");

  // Forward movement only (unless king)
  if (!isKing) {
    if (color === "red" && rowDiff >= 0) return false; // red moves up (decreasing row)
    if (color === "blue" && rowDiff <= 0) return false; // blue moves down (increasing row)
  }

  // Only allow diagonal by 1
  if (Math.abs(rowDiff) === 1 && colDiff === 1) {
    return true;
  }

  // Capture move (jump over opponent)
  if (Math.abs(rowDiff) === 2 && colDiff === 2) {
    const midRow = startRow + rowDiff / 2;
    const midCol = startCol + (endCol - startCol) / 2;
    const midSquare = document.querySelector(
      `.square[data-row='${midRow}'][data-col='${midCol}']`
    );
    const midPiece = midSquare.querySelector(".piece");

    if (
      midPiece &&
      !midPiece.classList.contains(color) &&
      !targetSquare.querySelector(".piece")
    ) {
      return true;
    }
  }

  return false;
}

// ================== PERFORM MOVE ==================
function performMove(piece, startRow, startCol, endRow, endCol) {
  const startSquare = document.querySelector(
    `.square[data-row='${startRow}'][data-col='${startCol}']`
  );
  const endSquare = document.querySelector(
    `.square[data-row='${endRow}'][data-col='${endCol}']`
  );

  // Capture
  if (Math.abs(endRow - startRow) === 2) {
    const midRow = (startRow + endRow) / 2;
    const midCol = (startCol + endCol) / 2;
    const midSquare = document.querySelector(
      `.square[data-row='${midRow}'][data-col='${midCol}']`
    );
    const midPiece = midSquare.querySelector(".piece");
    if (midPiece) {
      const capturedValue = parseInt(midPiece.dataset.value, 10);
      midPiece.remove();

      if (piece.classList.contains("red")) redScore += capturedValue;
      else blueScore += capturedValue;

      redScoreEl.textContent = redScore;
      blueScoreEl.textContent = blueScore;
    }
  }

  endSquare.appendChild(piece);

  // ===== KING PROMOTION =====
  const color = piece.classList.contains("red") ? "red" : "blue";

  // Red reaches row 0 → king
  if (color === "red" && endRow === 0 && !piece.classList.contains("king")) {
    piece.classList.add("king");
    const kingImg = document.createElement("div");
    kingImg.classList.add("king-image");
    kingImg.textContent = "♛"; // You can use a small crown icon or image
    piece.appendChild(kingImg);
  }

  // Blue reaches row 7 → king
  if (color === "blue" && endRow === 7 && !piece.classList.contains("king")) {
    piece.classList.add("king");
    const kingImg = document.createElement("div");
    kingImg.classList.add("king-image");
    kingImg.textContent = "♛";
    piece.appendChild(kingImg);
  }

  highlightSquareSymbol(endRow, endCol);
  clearValidMoves();

  // ===== HELPER FUNCTION =====
  function makeKing(piece, kingImgSrc) {
    piece.classList.add("king");

    // Remove old piece image
    const oldImg = piece.querySelector("img");
    if (oldImg) oldImg.remove();

    // Add king PNG
    const img = document.createElement("img");
    img.src = kingImgSrc;
    img.classList.add("king-image");
    piece.appendChild(img);
  }

  // ===== START TIMERS ON FIRST MOVE =====
  if (!timersStarted) {
    timersStarted = true;
    startSessionTimer();
    startRoundTimer();
  }

  // Switch turn after move
  switchTurn();
}

// ================== VALID MOVE HIGHLIGHTS ==================
function showValidMoves(piece, startRow, startCol) {
  clearValidMoves();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (isValidMove(piece, startRow, startCol, r, c)) {
        const square = document.querySelector(
          `.square[data-row='${r}'][data-col='${c}']`
        );
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

  // Selecting a piece
  if (piece && piece.classList.contains(currentPlayer)) {
    if (selectedPiece) selectedPiece.classList.remove("selected");
    selectedPiece = piece;
    selectedPiece.classList.add("selected");
    return;
  }

  // Attempting a move
  if (selectedPiece && square) {
    const startSquare = selectedPiece.parentElement;
    const startRow = parseInt(startSquare.dataset.row);
    const startCol = parseInt(startSquare.dataset.col);
    const endRow = parseInt(square.dataset.row);
    const endCol = parseInt(square.dataset.col);

    if (isValidMove(selectedPiece, startRow, startCol, endRow, endCol)) {
      performMove(selectedPiece, startRow, startCol, endRow, endCol);
    }

    selectedPiece.classList.remove("selected");
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

gameboard.addEventListener("dragover", (e) => e.preventDefault());

gameboard.addEventListener("drop", (e) => {
  e.preventDefault();
  const square = e.target.closest(".square");
  if (!square || !selectedPiece) return;

  const startSquare = selectedPiece.parentElement;
  const startRow = parseInt(startSquare.dataset.row);
  const startCol = parseInt(startSquare.dataset.col);
  const endRow = parseInt(square.dataset.row);
  const endCol = parseInt(square.dataset.col);

  if (isValidMove(selectedPiece, startRow, startCol, endRow, endCol)) {
    performMove(selectedPiece, startRow, startCol, endRow, endCol);
  }

  selectedPiece.classList.remove("selected");
  selectedPiece = null;
});

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
    // Keep current player class only
    roundEl.classList.remove("timer-warning");
  }
}


// ================== INIT ==================
placeInitialPieces();
createBoard();