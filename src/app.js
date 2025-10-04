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

// ================== DEBUG SETUP ==================
let DEBUG_SETUP = {
  // Chain capture testing setup - kings positioned for multiple captures
  "0,0": "r1", // Red king at corner - can capture multiple blue pieces
  
  "1,1": "b1", // Blue piece for red king to capture
  "2,2": "b2", // Blue piece for chain capture
  "3,3": "b3", // Blue piece for chain capture
  "4,4": "b4", // Blue piece for chain capture
  
  "7,7": "r2", // Red king at opposite corner
  
  "6,6": "b5", // Blue piece for red king to capture
  "5,5": "b6", // Blue piece for chain capture
  
  "0,7": "r3", // Red piece for cross-diagonal testing
  "7,0": "r4", // Red piece for cross-diagonal testing
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
  // Clear existing pieces first
  document.querySelectorAll(".piece").forEach(piece => piece.remove());
  
  const setup = debugMode ? DEBUG_SETUP : INITIAL_SETUP;
  
  for (const pos in setup) {
    const [row, col] = pos.split(",").map(Number);
    const pieceKey = setup[pos];
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
  
  // In debug mode, make specific pieces kings for testing
  if (debugMode) {
    makeDebugKings();
  }
}

// ================== DEBUG KINGS ==================
function makeDebugKings() {
  // Make red piece at (0,0) a king - positioned for chain captures
  const redKingSquare1 = document.querySelector(`.square[data-row='0'][data-col='0']`);
  const redKingPiece1 = redKingSquare1?.querySelector('.piece.red');
  if (redKingPiece1 && !redKingPiece1.classList.contains('king')) {
    makeKing(redKingPiece1, "assets/red_crown.png");
    console.log('Debug: Made red piece at (0,0) a king');
  }
  
  // Make red piece at (7,7) a king - positioned for chain captures
  const redKingSquare2 = document.querySelector(`.square[data-row='7'][data-col='7']`);
  const redKingPiece2 = redKingSquare2?.querySelector('.piece.red');
  if (redKingPiece2 && !redKingPiece2.classList.contains('king')) {
    makeKing(redKingPiece2, "assets/red_crown.png");
    console.log('Debug: Made red piece at (7,7) a king');
  }
  
  console.log('Debug setup complete - Kings are ready for chain capture testing!');
  console.log('Red kings at (0,0) and (7,7)');
  console.log('Kings can now perform chain captures and move beyond board edges!');
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

  // Debug logging
  if (debugMode && isKing) {
    console.log(`King move attempt: (${startRow},${startCol}) -> (${endRow},${endCol}), rowDiff: ${rowDiff}, colDiff: ${colDiff}`);
  }

  // Forward movement only (unless king)
  if (!isKing) {
    if (color === "red" && rowDiff >= 0) return false; // red moves up (decreasing row)
    if (color === "blue" && rowDiff <= 0) return false; // blue moves down (increasing row)
    
    // Regular pieces: Only allow diagonal by 1
    if (Math.abs(rowDiff) === 1 && colDiff === 1) {
      return true;
    }

    // Regular pieces: Capture move (jump over opponent)
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
  } else {
    // KING MOVEMENT: Allow multiple diagonal tiles in a straight line
    if (Math.abs(rowDiff) === colDiff && rowDiff !== 0) {
      // Check if path is clear (no pieces blocking the way)
      const pathClear = isPathClear(startRow, startCol, endRow, endCol, color);
      if (pathClear) {
        if (debugMode) console.log('Valid king move: diagonal path clear');
        return true;
      }
    }
    
    // KING CHAIN CAPTURE: Allow movement beyond board edges for chain captures
    if (isChainCaptureMove(startRow, startCol, endRow, endCol, color)) {
      if (debugMode) console.log('Valid king chain capture move beyond board edge');
      return true;
    }
  }

  if (debugMode && isKing) console.log('Invalid king move');
  return false;
}

// ================== PATH CLEARANCE CHECK ==================
function isPathClear(startRow, startCol, endRow, endCol, pieceColor) {
  const rowStep = endRow > startRow ? 1 : -1;
  const colStep = endCol > startCol ? 1 : -1;
  
  let currentRow = startRow + rowStep;
  let currentCol = startCol + colStep;
  
  // Check each square along the diagonal path
  while (currentRow !== endRow && currentCol !== endCol) {
    const square = document.querySelector(
      `.square[data-row='${currentRow}'][data-col='${currentCol}']`
    );
    
    if (square && square.querySelector(".piece")) {
      const piece = square.querySelector(".piece");
      // If we find an opponent piece, we can capture it and stop
      if (!piece.classList.contains(pieceColor)) {
        // Check if this is the last square before the destination
        if (currentRow + rowStep === endRow && currentCol + colStep === endCol) {
          return true; // Can capture this piece
        } else {
          return false; // Cannot jump over pieces
        }
      } else {
        return false; // Cannot move through own pieces
      }
    }
    
    currentRow += rowStep;
    currentCol += colStep;
  }
  
  return true; // Path is clear
}

// ================== FIND CAPTURED PIECES ==================
function findCapturedPieces(startRow, startCol, endRow, endCol, pieceColor) {
  const capturedPieces = [];
  const rowStep = endRow > startRow ? 1 : -1;
  const colStep = endCol > startCol ? 1 : -1;
  
  let currentRow = startRow + rowStep;
  let currentCol = startCol + colStep;
  
  // Check each square along the diagonal path for opponent pieces
  while (currentRow !== endRow && currentCol !== endCol) {
    const square = document.querySelector(
      `.square[data-row='${currentRow}'][data-col='${currentCol}']`
    );
    
    if (square && square.querySelector(".piece")) {
      const piece = square.querySelector(".piece");
      // If we find an opponent piece, add it to captured pieces
      if (!piece.classList.contains(pieceColor)) {
        capturedPieces.push(piece);
        if (debugMode) console.log(`Found captured piece at (${currentRow},${currentCol})`);
      }
    }
    
    currentRow += rowStep;
    currentCol += colStep;
  }
  
  return capturedPieces;
}

// ================== CHAIN CAPTURE FUNCTIONS ==================
function isChainCaptureMove(startRow, startCol, endRow, endCol, pieceColor) {
  // Check if this move would go beyond board edges but capture a piece
  if (endRow < 0 || endRow > 7 || endCol < 0 || endCol > 7) {
    // This move goes beyond board edges - check if there's a capture opportunity
    const capturedPieces = findCapturedPiecesBeyondBoard(startRow, startCol, endRow, endCol, pieceColor);
    return capturedPieces.length > 0;
  }
  return false;
}

function findCapturedPiecesBeyondBoard(startRow, startCol, endRow, endCol, pieceColor) {
  const capturedPieces = [];
  const rowStep = endRow > startRow ? 1 : -1;
  const colStep = endCol > startCol ? 1 : -1;
  
  let currentRow = startRow + rowStep;
  let currentCol = startCol + colStep;
  
  // Check each square along the diagonal path, including beyond board edges
  while (true) {
    // If we're still on the board, check for pieces
    if (currentRow >= 0 && currentRow <= 7 && currentCol >= 0 && currentCol <= 7) {
      const square = document.querySelector(
        `.square[data-row='${currentRow}'][data-col='${currentCol}']`
      );
      
      if (square && square.querySelector(".piece")) {
        const piece = square.querySelector(".piece");
        if (!piece.classList.contains(pieceColor)) {
          capturedPieces.push(piece);
          if (debugMode) console.log(`Found captured piece at (${currentRow},${currentCol}) for chain capture`);
        } else {
          break; // Hit own piece, stop
        }
      }
    }
    
    // Continue moving along the diagonal
    currentRow += rowStep;
    currentCol += colStep;
    
    // Stop if we've reached the target position
    if (currentRow === endRow && currentCol === endCol) {
      break;
    }
    
    // Safety check to prevent infinite loops
    if (Math.abs(currentRow - startRow) > 10 || Math.abs(currentCol - startCol) > 10) {
      break;
    }
  }
  
  return capturedPieces;
}

function checkForChainCapture(piece, currentRow, currentCol) {
  // Check all 4 diagonal directions for additional capture opportunities
  const directions = [
    [-1, -1], [-1, 1], [1, -1], [1, 1] // All diagonal directions
  ];
  
  let hasChainCapture = false;
  
  directions.forEach(([rowDir, colDir]) => {
    let testRow = currentRow + rowDir;
    let testCol = currentCol + colDir;
    
    // Look for opponent pieces in this direction
    while (testRow >= 0 && testRow <= 7 && testCol >= 0 && testCol <= 7) {
      const square = document.querySelector(
        `.square[data-row='${testRow}'][data-col='${testCol}']`
      );
      
      if (square && square.querySelector(".piece")) {
        const testPiece = square.querySelector(".piece");
        const color = piece.classList.contains("red") ? "red" : "blue";
        
        if (!testPiece.classList.contains(color)) {
          // Found opponent piece - check if we can capture it
          hasChainCapture = true;
          if (debugMode) console.log(`Chain capture opportunity found at (${testRow},${testCol})`);
          break;
        } else {
          break; // Hit own piece
        }
      }
      
      testRow += rowDir;
      testCol += colDir;
    }
  });
  
  if (hasChainCapture) {
    if (debugMode) console.log('Chain capture available - king can continue moving');
    // Don't switch turns yet - allow player to continue capturing
    return false; // Don't switch turn
  } else {
    if (debugMode) console.log('No more chain captures available');
    return true; // Switch turn
  }
}

// ================== PERFORM MOVE ==================
function performMove(piece, startRow, startCol, endRow, endCol) {
  const startSquare = document.querySelector(
    `.square[data-row='${startRow}'][data-col='${startCol}']`
  );
  const endSquare = document.querySelector(
    `.square[data-row='${endRow}'][data-col='${endCol}']`
  );

  // Handle captures
  const isKing = piece.classList.contains("king");
  const color = piece.classList.contains("red") ? "red" : "blue";
  
  if (isKing) {
    // King capture: Check for captured pieces along the diagonal path
    const capturedPieces = findCapturedPieces(startRow, startCol, endRow, endCol, color);
    capturedPieces.forEach(capturedPiece => {
      const capturedValue = parseInt(capturedPiece.dataset.value, 10);
      capturedPiece.remove();
      
      if (color === "red") redScore += capturedValue;
      else blueScore += capturedValue;
      
      redScoreEl.textContent = redScore;
      blueScoreEl.textContent = blueScore;
      
      if (debugMode) console.log(`King captured piece with value ${capturedValue}`);
    });
    
    // Check for chain capture opportunities after this move
    let shouldSwitchTurn = true;
    if (capturedPieces.length > 0) {
      shouldSwitchTurn = checkForChainCapture(piece, endRow, endCol);
    }
    
    // Store the shouldSwitchTurn flag for later use
    piece.dataset.shouldSwitchTurn = shouldSwitchTurn;
  } else {
    // Regular piece capture (original logic)
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
  }

  endSquare.appendChild(piece);

  // ===== KING PROMOTION =====

  // Red reaches row 0 → king
  if (color === "red" && endRow === 0 && !piece.classList.contains("king")) {
    makeKing(piece, "assets/red_crown.png");
  }

  // Blue reaches row 7 → king
  if (color === "blue" && endRow === 7 && !piece.classList.contains("king")) {
    makeKing(piece, "assets/blue_crown.png");
  }

  highlightSquareSymbol(endRow, endCol);
  clearValidMoves();

  // ===== HELPER FUNCTION =====
  function makeKing(piece, kingImgSrc) {
    piece.classList.add("king");

    // Remove old king image if it exists
    const oldKingImg = piece.querySelector(".king-image");
    if (oldKingImg) oldKingImg.remove();

    // Add king crown image
    const kingImg = document.createElement("img");
    kingImg.src = kingImgSrc;
    kingImg.classList.add("king-image");
    kingImg.alt = "King";
    piece.appendChild(kingImg);
  }

  // ===== START TIMERS ON FIRST MOVE =====
  if (!timersStarted) {
    timersStarted = true;
    startSessionTimer();
    startRoundTimer();
  }

  // Switch turn after move (unless chain capture is available)
  const shouldSwitchTurn = piece.dataset.shouldSwitchTurn !== 'false';
  if (shouldSwitchTurn) {
    switchTurn();
  } else {
    // Keep the same player for chain capture
    if (debugMode) console.log('Turn not switched - chain capture available');
  }
}

// ================== VALID MOVE HIGHLIGHTS ==================
function showValidMoves(piece, startRow, startCol) {
  clearValidMoves();
  
  // Show valid moves within board bounds
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
  
  // Show chain capture opportunities beyond board edges
  if (piece.classList.contains("king")) {
    showChainCaptureMoves(piece, startRow, startCol);
  }
}

function showChainCaptureMoves(piece, startRow, startCol) {
  const color = piece.classList.contains("red") ? "red" : "blue";
  
  // Check all 4 diagonal directions for chain capture opportunities
  const directions = [
    [-1, -1], [-1, 1], [1, -1], [1, 1] // All diagonal directions
  ];
  
  directions.forEach(([rowDir, colDir]) => {
    let testRow = startRow + rowDir;
    let testCol = startCol + colDir;
    
    // Look for opponent pieces in this direction
    while (testRow >= 0 && testRow <= 7 && testCol >= 0 && testCol <= 7) {
      const square = document.querySelector(
        `.square[data-row='${testRow}'][data-col='${testCol}']`
      );
      
      if (square && square.querySelector(".piece")) {
        const testPiece = square.querySelector(".piece");
        
        if (!testPiece.classList.contains(color)) {
          // Found opponent piece - mark it as a chain capture target
          square.classList.add("chain-capture-target");
          if (debugMode) console.log(`Chain capture target at (${testRow},${testCol})`);
          break;
        } else {
          break; // Hit own piece
        }
      }
      
      testRow += rowDir;
      testCol += colDir;
    }
  });
}

function clearValidMoves() {
  document.querySelectorAll(".square.valid-move").forEach((sq) => {
    sq.classList.remove("valid-move");
  });
  document.querySelectorAll(".square.chain-capture-target").forEach((sq) => {
    sq.classList.remove("chain-capture-target");
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
    
    // Show valid moves for debugging
    const startSquare = selectedPiece.parentElement;
    const startRow = parseInt(startSquare.dataset.row);
    const startCol = parseInt(startSquare.dataset.col);
    showValidMoves(selectedPiece, startRow, startCol);
    
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


// ================== DEBUG CONTROLS ==================
function setupDebugControls() {
  const debugToggle = document.getElementById('debug-toggle');
  const resetBoard = document.getElementById('reset-board');
  
  debugToggle.addEventListener('click', () => {
    debugMode = !debugMode;
    debugToggle.textContent = `Debug Mode: ${debugMode ? 'ON' : 'OFF'}`;
    debugToggle.style.background = debugMode ? '#51cf66' : '#ff6b6b';
    
    // Reset scores and timers when switching modes
    redScore = 0;
    blueScore = 0;
    redScoreEl.textContent = redScore;
    blueScoreEl.textContent = blueScore;
    currentPlayer = "red";
    document.getElementById("player").textContent = currentPlayer;
    
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
    
    // Reload board with new setup
    placeInitialPieces();
    
    console.log(`Debug mode ${debugMode ? 'enabled' : 'disabled'}`);
  });
  
  resetBoard.addEventListener('click', () => {
    // Reset scores and timers
    redScore = 0;
    blueScore = 0;
    redScoreEl.textContent = redScore;
    blueScoreEl.textContent = blueScore;
    currentPlayer = "red";
    document.getElementById("player").textContent = currentPlayer;
    
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
    
    console.log('Board reset');
  });
}

// ================== INIT ==================
setupDebugControls();
placeInitialPieces();