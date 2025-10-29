function minimax(
  board,
  depth,
  alpha,
  beta,
  maximizingPlayer,
  redScore,
  blueScore
) {
  if (depth === 0) {
    return evaluateBoardState(board, redScore, blueScore);
  }
  const color = maximizingPlayer ? "blue" : "red";
  const moves = generateAllMoves(board, color);
  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = applyLogicalMove(board, move);
      const eval = minimax(
        newBoard,
        depth - 1,
        alpha,
        beta,
        false,
        redScore,
        blueScore
      );
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = applyLogicalMove(board, move);
      const eval = minimax(
        newBoard,
        depth - 1,
        alpha,
        beta,
        true,
        redScore,
        blueScore
      );
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function findPieceInDOM(startRow, startCol) {
  const sq = document.querySelector(
    `.square[data-row='${startRow}'][data-col='${startCol}']`
  );
  return sq ? sq.querySelector(".piece") : null;
}

function executeLogicalMove(move) {
  const piece = findPieceInDOM(move.startRow, move.startCol);
  if (!piece) {
    console.error("Piece not found for move:", move);
    return;
  }
  performMove(piece, move.startRow, move.startCol, move.endRow, move.endCol);
}

function makeAIMove() {
  if (gameOver || currentPlayer !== "blue" || replayMode) return;
  const board = createLogicalBoard();
  const color = "blue";
  if (mustCaptureWithPiece) {
    const sq = mustCaptureWithPiece.parentElement;
    const startRow = parseInt(sq.dataset.row, 10);
    const startCol = parseInt(sq.dataset.col, 10);
    const piece = board[startRow][startCol];
    if (piece && piece.color === color) {
      const captureMoves = getImmediateCaptures(
        board,
        startRow,
        startCol,
        piece
      );
      if (captureMoves.length > 0) {
        executeLogicalMove(captureMoves[0]);
        return;
      }
    }
  }
  const moves = generateAllMoves(board, color);
  if (moves.length === 0) {
    switchTurn();
    return;
  }
  if (aiDepth === 1) {
    executeLogicalMove(moves[0]);
    return;
  }
  let bestMove = moves[0];
  let bestValue = Infinity;
  for (const move of moves) {
    const newBoard = applyLogicalMove(board, move);
    const value = minimax(
      newBoard,
      aiDepth - 1,
      -Infinity,
      Infinity,
      true,
      redScore,
      blueScore
    );
    if (value < bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }
  executeLogicalMove(bestMove);
}
