// Game constants
const PIECES = {
  // === RED ===
  r1: { color: "red", value: -9, isKing: false },
  r2: { color: "red", value: 6, isKing: false },
  r3: { color: "red", value: -1, isKing: false },
  r4: { color: "red", value: 4, isKing: false },
  r5: { color: "red", value: 0, isKing: false },
  r6: { color: "red", value: -3, isKing: false },
  r7: { color: "red", value: 10, isKing: false },
  r8: { color: "red", value: -7, isKing: false },
  r9: { color: "red", value: -11, isKing: false },
  r10: { color: "red", value: 8, isKing: false },
  r11: { color: "red", value: -5, isKing: false },
  r12: { color: "red", value: 2, isKing: false },

  // === BLUE ===
  b1: { color: "blue", value: 2, isKing: false },
  b2: { color: "blue", value: -5, isKing: false },
  b3: { color: "blue", value: 8, isKing: false },
  b4: { color: "blue", value: -11, isKing: false },
  b5: { color: "blue", value: -7, isKing: false },
  b6: { color: "blue", value: 10, isKing: false },
  b7: { color: "blue", value: -3, isKing: false },
  b8: { color: "blue", value: 0, isKing: false },
  b9: { color: "blue", value: 4, isKing: false },
  b10: { color: "blue", value: -1, isKing: false },
  b11: { color: "blue", value: 6, isKing: false },
  b12: { color: "blue", value: -9, isKing: false },

  // === KING (DAMA) VERSIONS — auto-generated or manual ===
  r1_king: { color: "red", value: -9, isKing: true },
  r2_king: { color: "red", value: 6, isKing: true },
  r3_king: { color: "red", value: -1, isKing: true },
  r4_king: { color: "red", value: 4, isKing: true },
  r5_king: { color: "red", value: 0, isKing: true },
  r6_king: { color: "red", value: -3, isKing: true },
  r7_king: { color: "red", value: 10, isKing: true },
  r8_king: { color: "red", value: -7, isKing: true },
  r9_king: { color: "red", value: -11, isKing: true },
  r10_king: { color: "red", value: 8, isKing: true },
  r11_king: { color: "red", value: -5, isKing: true },
  r12_king: { color: "red", value: 2, isKing: true },

  b1_king: { color: "blue", value: 2, isKing: true },
  b2_king: { color: "blue", value: -5, isKing: true },
  b3_king: { color: "blue", value: 8, isKing: true },
  b4_king: { color: "blue", value: -11, isKing: true },
  b5_king: { color: "blue", value: -7, isKing: true },
  b6_king: { color: "blue", value: 10, isKing: true },
  b7_king: { color: "blue", value: -3, isKing: true },
  b8_king: { color: "blue", value: 0, isKing: true },
  b9_king: { color: "blue", value: 4, isKing: true },
  b10_king: { color: "blue", value: -1, isKing: true },
  b11_king: { color: "blue", value: 6, isKing: true },
  b12_king: { color: "blue", value: -9, isKing: true },
};

const DAMATH_LAYOUT = [
  ["x", "", "÷", "", "-", "", "+", ""],
  ["", "÷", "", "x", "", "+", "", "-"],
  ["-", "", "+", "", "x", "", "÷", ""],
  ["", "+", "", "-", "", "÷", "", "x"],
  ["x", "", "÷", "", "-", "", "+", ""],
  ["", "÷", "", "x", "", "+", "", "-"],
  ["-", "", "+", "", "x", "", "÷", ""],
  ["", "+", "", "-", "", "÷", "", "x"],
];

const DIRECTIONS = {
  red: [
    [-1, -1], // DOM: move up-left
    [-1, 1], // DOM: move up-right
  ],
  blue: [
    [1, -1], // DOM: move down-left
    [1, 1], // DOM: move down-right
  ],
  king: [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ],
};

// Initial setups

const INITIAL_SETUP = {
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
};

const DEBUG_SETUP = {
  "5,1": "r1",
  "6,2": "r6",
  "7,3": "b12_king",
};

// Game mode detection
const path = window.location.pathname;
let gameMode = "pvp";
if (path.includes("/pvai/")) {
  gameMode = "pvai";
} else if (path.includes("/debug_mode/")) {
  gameMode = "pvai";
  window.debugMode = true;
}

// Debug flag
if (typeof window.debugMode === "undefined") window.debugMode = false;
let debugMode = window.debugMode;
