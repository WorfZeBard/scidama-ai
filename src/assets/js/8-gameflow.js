function makeKing(piece) {
  piece.classList.add("king", "promote");
  setTimeout(() => piece.classList.remove("promote"), 600);
}

function playSound(soundName) {
  const sound = window.sounds?.[soundName];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch((e) => console.log("Audio play failed:", e));
  }
}

function checkGameOver() {
  if (gameOver) return true;

  // Surrender
  if (surrenderRequested) {
    const winner = surrenderRequested === "red" ? "Blue" : "Red";
    endGame(`${winner} wins! (${surrenderRequested} surrendered)`, true);
    return true;
  }

  const redPieces = document.querySelectorAll(".piece.red").length;
  const bluePieces = document.querySelectorAll(".piece.blue").length;

  // No pieces left
  if (redPieces === 0 || bluePieces === 0) {
    endGame("One player has no remaining pieces.");
    return true;
  }

  // Check if current player has any valid move
  if (!playerHasAnyValidMove(currentPlayer)) {
    // Current player is stuck → game ends → tally all scores
    let winnerMessage = "";

    const reason = `${currentPlayer === "red" ? "Red" : "Blue"} has no legal moves.`;
    endGame(`${reason}${winnerMessage}`);
    return true;
  }

  // 3-move repetition (optional, keep if desired)
  if (
    (currentPlayer === "red" ? redPieces : bluePieces) === 1 &&
    turnHistoryEntries.length >= 6
  ) {
    const lastThree = turnHistoryEntries.slice(-3);
    const prevThree = turnHistoryEntries.slice(-6, -3);
    if (JSON.stringify(lastThree) === JSON.stringify(prevThree)) {
      endGame("Draw! (3-move repetition with single chip)");
      return true;
    }
  }

  return false;
}
