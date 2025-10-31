// assets/js/theme.js
(function () {
    // Apply theme
    function applyTheme(themeValue) {
        document.body.setAttribute("data-theme", themeValue);
    }

    // Save theme to localStorage
    function saveTheme(themeValue) {
        const options = JSON.parse(localStorage.getItem("sciDamathOptions") || "{}");
        options.theme = themeValue;
        localStorage.setItem("sciDamathOptions", JSON.stringify(options));
    }

    // Load saved theme (default: light)
    function loadTheme() {
        const saved = JSON.parse(localStorage.getItem("sciDamathOptions") || "{}");
        return saved.theme || "light";
    }

    // Toggle between 'light' and 'dark'
    function toggleTheme() {
        const current = document.body.getAttribute("data-theme") || "light";
        const newTheme = current === "dark" ? "light" : "dark";
        applyTheme(newTheme);
        saveTheme(newTheme);
        return newTheme;
    }

    // Update toggle button text
    function updateToggleButton(themeValue) {
        const btn = document.getElementById("toggle-dark-mode");
        if (btn) {
            btn.textContent = themeValue === "dark" ? "Light Mode" : "Dark Mode";
        }
    }

    // Initialize on page load
    document.addEventListener("DOMContentLoaded", () => {
        const savedTheme = loadTheme();

        // If page has a full theme selector (main menu), use it
        const themeSelect = document.getElementById("theme-select");
        if (themeSelect) {
            themeSelect.value = savedTheme;
            applyTheme(savedTheme === "system"
                ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                : savedTheme
            );

            themeSelect.addEventListener("change", (e) => {
                const value = e.target.value;
                saveTheme(value);
                if (value === "system") {
                    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                    applyTheme(isDark ? "dark" : "light");
                } else {
                    applyTheme(value);
                }
            });

            // Optional: auto-update if system theme changes and "system" is selected
            if (savedTheme === "system") {
                window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
                    applyTheme(e.matches ? "dark" : "light");
                });
            }
            return;
        }

        // Otherwise, assume it's a game page with toggle button
        const toggleBtn = document.getElementById("toggle-dark-mode");
        if (toggleBtn) {
            // Resolve "system" to actual theme for game (since game toggle is light/dark only)
            const resolvedTheme = savedTheme === "system"
                ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                : (savedTheme === "dark" ? "dark" : "light");

            applyTheme(resolvedTheme);
            updateToggleButton(resolvedTheme);

            toggleBtn.addEventListener("click", () => {
                const newTheme = toggleTheme();
                updateToggleButton(newTheme);
            });
        } else {
            // Fallback: just apply saved theme (e.g., debug pages)
            const resolved = savedTheme === "system"
                ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                : savedTheme;
            applyTheme(resolved === "dark" ? "dark" : "light");
        }
    });
})();