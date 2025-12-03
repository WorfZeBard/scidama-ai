// input.js

function handleDrop(e) {
  e.preventDefault();
  if (gameOver || replayMode) return;
  if (gameMode === "pvai" && currentPlayer === window.aiColor) {
    showErrorMessage("It's the AI's turn.");
    cleanupDrag();
    return;
  }

  const square = e.target.closest(".square");
  if (!square || !square.classList.contains("playable") || !selectedPiece) {
    cleanupDrag();
    return;
  }

  // If a forced capture is active, ensure it's the same piece
  if (mustCaptureWithPiece && selectedPiece !== mustCaptureWithPiece) {
    cleanupDrag();
    return;
  }

  const startSq = selectedPiece.parentElement;
  const startRow = parseInt(startSq.dataset.row, 10);
  const startCol = parseInt(startSq.dataset.col, 10);
  const endRow = parseInt(square.dataset.row, 10);
  const endCol = parseInt(square.dataset.col, 10);

  performMove(selectedPiece, startRow, startCol, endRow, endCol);

  if (selectedPiece) {
    selectedPiece.parentElement.classList.remove("piece-dragging");
    selectedPiece = null;
  }
  clearValidMoves();
}

function handleBoardClick(e) {
  if (gameOver || replayMode) return;
  if (gameMode === "pvai" && currentPlayer === window.aiColor) {
    showErrorMessage("It's the AI's turn.");
    return;
  }
  const square = e.target.closest(".square");
  if (!square || !square.classList.contains("playable")) return;

  const endRow = parseInt(square.dataset.row, 10);
  const endCol = parseInt(square.dataset.col, 10);

  // ===== CASE 1: Forced multi-capture =====
  if (mustCaptureWithPiece) {
    const startSq = mustCaptureWithPiece.parentElement;
    const startRow = parseInt(startSq.dataset.row, 10);
    const startCol = parseInt(startSq.dataset.col, 10);
    performMove(mustCaptureWithPiece, startRow, startCol, endRow, endCol);
    return;
  }

  // ===== CASE 2: Auto-highlighted capture destination clicked =====
  if (autoHighlightedCaptureMoves.length > 0) {
    const matchingMove = autoHighlightedCaptureMoves.find(
      (m) => m.endRow === endRow && m.endCol === endCol
    );
    if (matchingMove) {
      const piece = findPieceInDOM(
        matchingMove.startRow,
        matchingMove.startCol
      );
      if (piece) {
        performMove(
          piece,
          matchingMove.startRow,
          matchingMove.startCol,
          endRow,
          endCol
        );
        return;
      }
    }
  }

  // ===== CASE 3: Normal selection (fallback) =====
  const piece = e.target.closest(".piece");
  if (piece && piece.classList.contains(currentPlayer)) {
    document
      .querySelectorAll(".square.piece-selected")
      .forEach((sq) => sq.classList.remove("piece-selected"));
    selectedPiece = piece;
    const sq = piece.parentElement;
    const r = parseInt(sq.dataset.row, 10);
    const c = parseInt(sq.dataset.col, 10);
    showValidMoves(r, c);
    return;
  }

  // ===== CASE 4: Move with pre-selected piece =====
  if (selectedPiece && square) {
    const startSq = selectedPiece.parentElement;
    const startRow = parseInt(startSq.dataset.row, 10);
    const startCol = parseInt(startSq.dataset.col, 10);
    performMove(selectedPiece, startRow, startCol, endRow, endCol);
    selectedPiece = null;
    clearValidMoves();
  }
}

function attachInputHandlers() {
  if (!gameboard) {
    console.warn("attachInputHandlers: gameboard is not ready");
    return;
  }

  // Remove any existing listeners by replacing the element
  const newGameboard = gameboard.cloneNode(false);
  gameboard.parentNode.replaceChild(newGameboard, gameboard);
  gameboard = newGameboard;
  gameboard.replaceChildren();
  // Rebuild the board content
  initializeBoard();

  // Now attach fresh event listeners
  gameboard.addEventListener("click", handleBoardClick);
  gameboard.addEventListener("dragstart", handleDragStart);
  gameboard.addEventListener("dragend", handleDragEnd);
  gameboard.addEventListener("dragover", (e) => e.preventDefault());
  gameboard.addEventListener("drop", handleDrop);
}

function handleDragStart(e) {
  if (gameMode === "pvai" && currentPlayer === window.aiColor) {
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
  showValidMoves(r, c);
}

function handleDragEnd(e) {
  if (selectedPiece) {
    selectedPiece.parentElement.classList.remove("piece-dragging");
    selectedPiece = null;
    clearValidMoves();
    cleanupDrag();
  }
}

function cleanupDrag() {
  document
    .querySelectorAll(".square.piece-dragging")
    .forEach((sq) => sq.classList.remove("piece-dragging"));
}

// Expose globally
window.attachInputHandlers = attachInputHandlers;
