// ================== PIECE DEFINITIONS ==================
const PIECES = {
  rchip: { color: "red", image: "assets/red_chip/rchip.png", value: 1 },
  bchip: { color: "blue", image: "assets/blue_chip/bchip.png", value: 1 },
};

// ================== INITIAL BOARD SETUP ==================
const INITIAL_SETUP = {};

// Place Blue pieces (rows 0–2) → light squares
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 8; col++) {
    if ((row + col) % 2 === 0) {
      INITIAL_SETUP[`${row},${col}`] = "bchip";
    }
  }
}

// Place Red pieces (rows 5–7) → light squares
for (let row = 5; row < 8; row++) {
  for (let col = 0; col < 8; col++) {
    if ((row + col) % 2 === 0) {
      INITIAL_SETUP[`${row},${col}`] = "rchip";
    }
  }
}

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
