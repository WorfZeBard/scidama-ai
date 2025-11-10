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

function createMenuBoard() {
  const bg = document.getElementById("menu-board-background");
  if (!bg) return;

  bg.innerHTML = "";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      const isLight = (row + col) % 2 === 0;
      square.className = `square ${isLight ? "light" : "dark"}`;

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

function closeModal() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.hidden = true;
  });
}

function openModal(modalId) {
  closeModal();
  const modal = document.getElementById(modalId);
  if (modal) modal.hidden = false;
}

document.addEventListener("DOMContentLoaded", () => {
  createMenuBoard();

  // === Main Menu Buttons ===
  document.getElementById("btn-pvp")?.addEventListener("click", () => openModal("pvp-modal"));
  document.getElementById("btn-pvai")?.addEventListener("click", () => openModal("pvai-modal"));
  document.getElementById("btn-options")?.addEventListener("click", () => openModal("options-modal"));
  document.getElementById("btn-debug")?.addEventListener("click", () => {
    window.location.href = "debug_mode/debug_mode.html";
  });

  // === Modal Close Buttons (Delegated) ===
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-close")) {
      closeModal();
    }
  });

  // === Variant Selection ===
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("variant-btn") && e.target.dataset.variant) {
      const variant = e.target.dataset.variant;

      if (variant === "integer") {
        window.location.href = "pvp/sci-damath/pvp-integer-scidamath.html";
      } else if (variant === "integer-ai") {
        openModal("difficulty-modal");

        const handleDifficulty = (event) => {
          if (event.target.classList.contains("difficulty-btn")) {
            const difficulty = event.target.dataset.difficulty;
            localStorage.setItem("aiDifficulty", difficulty);
            window.location.href = "pvai/sci-damath/pvai-integer-scidamath.html";
            document.removeEventListener("click", handleDifficulty); // Cleanup
          }
        };
        document.addEventListener("click", handleDifficulty);
      }
    }
  });

  // === Theme Handling ===
  const themeSelect = document.getElementById("theme-select");

  // Load saved theme
  const savedOptions = JSON.parse(localStorage.getItem("sciDamathOptions") || "{}");
  if (savedOptions.theme) {
    themeSelect.value = savedOptions.theme;
  }

  // Apply theme to the document
  function applyTheme(themeValue) {
    if (themeValue === "system") {
      // Match system preference
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.body.setAttribute("data-theme", isDark ? "dark" : "light");
    } else {
      // Use selected theme
      document.body.setAttribute("data-theme", themeValue);
    }
  }

  // Save and apply theme
  function saveAndApplyTheme() {
    const themeValue = themeSelect.value;
    const options = { theme: themeValue };
    localStorage.setItem("sciDamathOptions", JSON.stringify(options));
    applyTheme(themeValue);
  }

  // Listen for theme changes
  themeSelect?.addEventListener("change", saveAndApplyTheme);

  // Apply theme on initial load
  applyTheme(themeSelect?.value || "light");

  // Optional: Update theme if system preference changes (only when "system" is selected)
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", (e) => {
    const saved = JSON.parse(localStorage.getItem("sciDamathOptions") || "{}");
    if (saved.theme === "system") {
      document.body.setAttribute("data-theme", e.matches ? "dark" : "light");
    }
  });

});

// Open AI Difficulty Modal from PvAI modal
const pvaiButtons = document.querySelectorAll("#pvai-modal .variant-btn[data-variant='integer-ai']");
pvaiButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    document.getElementById("pvai-modal").hidden = true;
    document.getElementById("difficulty-modal").hidden = false;
  });
});

// assets/js/menu.js
// REPLACE the existing difficulty button click handler with this:
document.querySelectorAll(".difficulty-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const depth = parseInt(btn.getAttribute("ai-difficulty"), 10);
    const playerColorSelect = document.getElementById("player-color");
    const humanColor = playerColorSelect ? playerColorSelect.value : "red";
    
    if ([2, 3, 4, 6].includes(depth)) {
      localStorage.setItem("aiDepth", String(depth));
      localStorage.setItem("pvaiPlayerColor", humanColor);
      console.log("AI Difficulty set to:", depth, "Human color:", humanColor);
      window.location.href = "pvai/sci-damath/pvai-integer-scidamath.html";
    }
  });
});