// Game constants
const PIECES = {
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
  b1: { color: "blue", value: 2 },
  b2: { color: "blue", value: -5 },
  b3: { color: "blue", value: 8 },
  b4: { color: "blue", value: -11 },
  b5: { color: "blue", value: -7 },
  b6: { color: "blue", value: 10 },
  b7: { color: "blue", value: -3 },
  b8: { color: "blue", value: 0 },
  b9: { color: "blue", value: 4 },
  b10: { color: "blue", value: -1 },
  b11: { color: "blue", value: 6 },
  b12: { color: "blue", value: -9 },
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
    [-1, -1],
    [-1, 1],
  ],
  blue: [
    [1, -1],
    [1, 1],
  ],
  king: [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ],
};

// Initial setups
// const INITIAL_SETUP = {
//   "0,0": "r1",
//   "4,0": "r2",
//   "4,2": "r2",
//   "5,1": "r3",
//   "5,3": "r4",
//   "2,2": "r5",
//   "2,0": "r5",
//   "3,1": "b3",
// };

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
  "0,0": "r1",
  "4,0": "r2",
  "4,2": "r2",
  "5,1": "r3",
  "5,3": "r4",
  "2,2": "r5",
  "2,0": "r5",
  "3,1": "b3",
};

// Game mode detection
const path = window.location.pathname;
let gameMode = "pvp";
if (path.includes("/pvai/")) {
  gameMode = "pvai";
} else if (path.includes("/debug_mode/")) {
  gameMode = "debug";
  window.debugMode = true;
}

// Debug flag
if (typeof window.debugMode === "undefined") window.debugMode = false;
let debugMode = window.debugMode;

// AI difficulty
let aiDepth = 1;
const savedDifficulty = localStorage.getItem("aiDifficulty");
if (savedDifficulty && [1, 3, 4, 6].includes(parseInt(savedDifficulty))) {
  aiDepth = parseInt(savedDifficulty);
}
