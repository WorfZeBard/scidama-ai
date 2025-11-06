function createBoardDOM(showPieces = true, setup = null) {
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
  } catch (error) {
    showErrorMessage("Failed to initialize board: " + error.message);
    console.error("Board initialization error:", error);
  }
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

function clearMoveHighlights() {
  document
    .querySelectorAll(".square.move-from, .square.move-to")
    .forEach((sq) => {
      sq.classList.remove("move-from", "move-to");
    });
}

function clearValidMoves() {
  document
    .querySelectorAll(".square.valid-move, .square.piece-dragging")
    .forEach((sq) => {
      sq.classList.remove("valid-move", "piece-dragging");
    });
}

function showValidMoves(piece, startRow, startCol) {
  clearValidMoves();
  const board = createLogicalBoard();
  const allMoves = generateAllMoves(board, currentPlayer);
  const captureMoves = allMoves.filter((m) => m.isCapture);

  let allowedMoves = allMoves;
  if (captureMoves.length > 0) {
    // Enforce Mayor Dama: only show highest-priority captures
    allowedMoves = getAllBestCaptureMoves(board, currentPlayer);
  }

  const validEnds = new Set();
  for (const m of allowedMoves) {
    if (m.startRow === startRow && m.startCol === startCol) {
      validEnds.add(`${m.endRow},${m.endCol}`);
    }
  }

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (validEnds.has(`${r},${c}`)) {
        const sq = document.querySelector(
          `.square[data-row='${r}'][data-col='${c}']`
        );
        if (sq) sq.classList.add("valid-move");
      }
    }
  }
}
