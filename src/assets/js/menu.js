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

// Close any open modal
function closeModal() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.hidden = true;
  });
}

// Open a specific modal
function openModal(modalId) {
  closeModal();
  const modal = document.getElementById(modalId);
  if (modal) modal.hidden = false;
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
  createMenuBoard();
  
  // Main menu buttons
  document.getElementById('btn-pvp')?.addEventListener('click', () => openModal('pvp-modal'));
  document.getElementById('btn-pvai')?.addEventListener('click', () => openModal('pvai-modal'));
  document.getElementById('btn-options')?.addEventListener('click', () => openModal('options-modal'));
  document.getElementById('btn-debug')?.addEventListener('click', () => {
    window.location.href = '../debug_mode/debug_mode.html';
  });

  // ✅ EVENT DELEGATION: Works for ALL .modal-close buttons, even in hidden modals
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-close')) {
      closeModal();
    }
  });

  // Rest of your code (variant selection, options, etc.)
});

// Set up event listeners AFTER DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  createMenuBoard();

  // Main menu buttons
  document
    .getElementById("btn-pvp")
    ?.addEventListener("click", () => openModal("pvp-modal"));
  document
    .getElementById("btn-pvai")
    ?.addEventListener("click", () => openModal("pvai-modal"));
  document
    .getElementById("btn-options")
    ?.addEventListener("click", () => openModal("options-modal"));
  document.getElementById("btn-debug")?.addEventListener("click", () => {
    window.location.href = "debug_mode/debug_mode.html";
  });

  // Handle ALL close buttons (including dynamically added ones)
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-close")) {
      closeModal();
    }
  });

  // Handle variant selection → show difficulty for AI games
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("variant-btn") && e.target.dataset.variant) {
    const variant = e.target.dataset.variant;

    if (variant === "integer") {
      // PvP: go directly to game
      window.location.href = "pvp/sci-damath/pvp-integer-scidamath.html";
    } 
    else if (variant === "integer-ai") {
      // PvAI: show difficulty modal first
      openModal("difficulty-modal");

      // Set up one-time listener for difficulty buttons
      const handleDifficulty = (event) => {
        if (event.target.classList.contains("difficulty-btn")) {
          const difficulty = event.target.dataset.difficulty;
          localStorage.setItem("aiDifficulty", difficulty);
          window.location.href = "pvai/sci-damath/pvai-integer-scidamath.html";
          // Clean up listener to avoid duplicates
          document.removeEventListener("click", handleDifficulty);
        }
      };
      document.addEventListener("click", handleDifficulty);
    }
  }
});

  // Options handling
  const soundVolume = document.getElementById("sound-volume");
  const themeSelect = document.getElementById("theme-select");
  const enableSounds = document.getElementById("enable-sounds");
  const enableNotifications = document.getElementById("enable-notifications");

  // Load saved options
  const savedOptions = JSON.parse(
    localStorage.getItem("sciDamathOptions") || "{}"
  );
  if (savedOptions.soundVolume !== undefined)
    soundVolume.value = savedOptions.soundVolume;
  if (savedOptions.theme) themeSelect.value = savedOptions.theme;
  if (savedOptions.enableSounds !== undefined)
    enableSounds.checked = savedOptions.enableSounds;
  if (savedOptions.enableNotifications !== undefined)
    enableNotifications.checked = savedOptions.enableNotifications;

  // Save options on change
  function saveOptions() {
    const options = {
      soundVolume: parseInt(soundVolume.value),
      theme: themeSelect.value,
      enableSounds: enableSounds.checked,
      enableNotifications: enableNotifications.checked,
    };
    localStorage.setItem("sciDamathOptions", JSON.stringify(options));
  }

  // Use event delegation for options (in case they're in modal)
  document.addEventListener("change", (e) => {
    if (
      e.target.id === "sound-volume" ||
      e.target.id === "theme-select" ||
      e.target.id === "enable-sounds" ||
      e.target.id === "enable-notifications"
    ) {
      saveOptions();
    }
  });

  // Apply theme from options
  const currentTheme = themeSelect?.value || "light";
  if (
    currentTheme === "dark" ||
    (currentTheme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.body.setAttribute("data-theme", "dark");
  }

  // Skip link focus management
  const skipLink = document.querySelector(".skip-link");
  skipLink?.addEventListener("click", () => {
    const main = document.getElementById("main-menu");
    main?.focus();
  });
});
