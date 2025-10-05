// DAMATH layout for the decorative background board
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

/**
 * Creates the decorative Sci-Damath board in the background
 */
function createMenuBoard() {
  const bg = document.getElementById("menu-board-background");
  if (!bg) return;

  // Clear container (defensive)
  bg.innerHTML = '';

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      const isLight = (row + col) % 2 === 0;
      square.className = `square ${isLight ? 'light' : 'dark'}`;
      
      const symbolText = DAMATH_LAYOUT[row][col];
      if (symbolText) {
        const symbol = document.createElement("span");
        symbol.className = "symbol";
        symbol.textContent = symbolText;
        symbol.setAttribute("aria-hidden", "true");
        square.appendChild(symbol);
      }
      
      bg.appendChild(square);
    }
  }
}

/**
 * Handles skip link focus behavior for accessibility
 */
function setupSkipLink() {
  const skipLink = document.querySelector('.skip-link');
  if (!skipLink) return;

  skipLink.addEventListener('click', () => {
    const main = document.getElementById('main-content');
    if (main) {
      main.focus();
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    createMenuBoard();
    setupSkipLink();
  });
} else {
  createMenuBoard();
  setupSkipLink();
}