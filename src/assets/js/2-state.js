// DOM elements (assigned later in init.js)
let gameboard = null;
let redScoreEl = null;
let blueScoreEl = null;
let currentPlayerEl = null;
let errorMessageEl = null;
let sessionEl = null;
let roundEl = null;

// Game state
let redScore = 0.0;
let blueScore = 0.0;
let currentPlayer = "red";
let selectedPiece = null;
let moveHistoryEntries = [];
let turnHistory = [];
let currentHistoryIndex = -1;
let currentTurnIndex = -1;
let currentTurnStartState = null;
let isTurnActive = false;
let moveHistory = [];
let surrenderRequested = null;
let sessionMinutes = 20;
let sessionSeconds = 0;
let roundMinutes = 1;
let roundSeconds = 0;
let sessionInterval;
let roundInterval;
let timersStarted = false;
let mustCaptureWithPiece = null;
let replayMode = false;
let replayInterval = null;
let gameOver = false;
let piecesTransparent = false;

// For undo/redo
let moveHistoryStates = [];
