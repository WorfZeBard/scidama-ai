// input.js

function attachInputHandlers() {
  if (!gameboard) {
    console.warn("attachInputHandlers: gameboard is not ready");
    return;
  }

  // Remove any existing listeners by replacing the element
  const newGameboard = gameboard.cloneNode(false);
  gameboard.parentNode.replaceChild(newGameboard, gameboard);
  gameboard = newGameboard;

  // Rebuild the board content
  initializeBoard();

  // Now attach fresh event listeners
  gameboard.addEventListener("click", handleBoardClick);
  gameboard.addEventListener("dragstart", handleDragStart);
  gameboard.addEventListener("dragend", handleDragEnd);
  gameboard.addEventListener("dragover", (e) => e.preventDefault());
  gameboard.addEventListener("drop", handleDrop);
}

function handleBoardClick(e) {
  if (gameMode === "pvai" && currentPlayer === "blue") return;
  const piece = e.target.closest(".piece");
  const square = e.target.closest(".square");
  if (!square || !square.classList.contains("playable")) return;

  if (piece && piece.classList.contains(currentPlayer)) {
    document
      .querySelectorAll(".square.piece-selected")
      .forEach((sq) => sq.classList.remove("piece-selected"));
    selectedPiece = piece;
    const sq = piece.parentElement;
    const r = parseInt(sq.dataset.row, 10);
    const c = parseInt(sq.dataset.col, 10);
    showValidMoves(piece, r, c);
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
    const isValid = allMoves.some(
      (m) =>
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
}

function handleDragStart(e) {
  if (gameMode === "pvai" && currentPlayer === "blue") {
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
  piece.parentElement.classList.add("piece-dragging");
  const r = parseInt(piece.parentElement.dataset.row, 10);
  const c = parseInt(piece.parentElement.dataset.col, 10);
  showValidMoves(piece, r, c);
}

function handleDragEnd(e) {
  if (selectedPiece) {
    selectedPiece.parentElement.classList.remove("piece-dragging");
    selectedPiece = null;
    clearValidMoves();
    cleanupDrag();
  }
}

function handleDrop(e) {
  e.preventDefault();
  if (gameMode === "pvai" && currentPlayer === "blue") {
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
  const isValid = allMoves.some(
    (m) =>
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
}

function cleanupDrag() {
  document
    .querySelectorAll(".square.piece-dragging")
    .forEach((sq) => sq.classList.remove("piece-dragging"));
}

// Expose globally
window.attachInputHandlers = attachInputHandlers;
