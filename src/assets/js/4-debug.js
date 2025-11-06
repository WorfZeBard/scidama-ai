function printBoard() {
  const board = createLogicalBoard();
  const setup = {};

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        let key = null;
        const isKing = piece.isKing;
        const color = piece.color;
        const value = piece.value;

        // Look for a PIECES entry matching color, value, and king status
        for (const [k, data] of Object.entries(PIECES)) {
          if (
            data.color === color &&
            data.value === value &&
            data.isKing === isKing
          ) {
            key = k;
            break;
          }
        }

        // Fallback (should rarely happen if PIECES is complete)
        if (!key) {
          const baseKey = `${color.charAt(0)}${value}`;
          key = isKing ? `${baseKey}_king` : baseKey;
        }

        setup[`${r},${c}`] = key;
      }
    }
  }

  // Format as clean, readable JS object
  const lines = Object.entries(setup).map(
    ([pos, key]) => `  "${pos}": "${key}"`
  );
  const output = `{\n${lines.join(",\n")}\n}`;
  console.log("Current board as setup object:\n", output);
  return output;
}
