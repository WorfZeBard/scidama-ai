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
let currentTurnMoveIds = [];
let nextMoveId = 0;
let turnHistory = [];
let turnHistoryEntries = [];
let currentTurnIndex = 0;
let currentTurnStartState = null;
let isTurnActive = false;
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
let finalScores = 0.0;
let finalRed = 0.0;
let finalBlue = 0.0;