// 8-input.js
function attachInputHandlers() {
  if (!gameboard) {
    console.warn("attachInputHandlers called before gameboard ready");
    return;
  }

  // Remove existing listeners if re-initializing (optional)
  gameboard.replaceWith(gameboard.cloneNode(true)); // quick reset, or use removeEventListener properly

  gameboard.addEventListener("click", handleBoardClick);
  gameboard.addEventListener("dragstart", handleDragStart);
  gameboard.addEventListener("dragend", handleDragEnd);
  gameboard.addEventListener("dragover", (e) => e.preventDefault());
  gameboard.addEventListener("drop", handleDrop);
}

// Define handlers separately
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
    const r = parseInt(sq.dataset.row),
      c = parseInt(sq.dataset.col);
    showValidMoves(piece, r, c);
    return;
  }

  if (selectedPiece && square) {
    const startSq = selectedPiece.parentElement;
    const startRow = parseInt(startSq.dataset.row);
    const startCol = parseInt(startSq.dataset.col);
    const endRow = parseInt(square.dataset.row);
    const endCol = parseInt(square.dataset.col);

    const board = createLogicalBoard();
    const moves = generateAllMoves(board, currentPlayer);
    const valid = moves.some(
      (m) =>
        m.startRow === startRow &&
        m.startCol === startCol &&
        m.endRow === endRow &&
        m.endCol === endCol
    );

    if (valid) {
      performMove(selectedPiece, startRow, startCol, endRow, endCol);
    }
    selectedPiece = null;
    clearValidMoves();
  }
}

// Similarly define handleDragStart, handleDragEnd, handleDrop...
// (Use the same logic as original, but as named functions)

// Expose for init.js
window.attachInputHandlers = attachInputHandlers;
