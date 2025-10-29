function startSessionTimer() {
  if (sessionInterval) clearInterval(sessionInterval);
  sessionInterval = setInterval(() => {
    if (sessionSeconds === 0) {
      if (sessionMinutes === 0) {
        clearInterval(sessionInterval);
        clearInterval(roundInterval);
        endGame("Session time expired.");
        return;
      }
      sessionMinutes--;
      sessionSeconds = 59;
    } else {
      sessionSeconds--;
    }
    updateTimerDisplay();
  }, 1000);
}

function startRoundTimer() {
  if (roundInterval) clearInterval(roundInterval);
  roundInterval = setInterval(() => {
    if (roundSeconds === 0) {
      if (roundMinutes === 0) {
        clearInterval(roundInterval);
        clearInterval(sessionInterval);
        endGame("Round time expired.");
        return;
      }
      roundMinutes--;
      roundSeconds = 59;
    } else roundSeconds--;
    updateTimerDisplay();
  }, 1000);
}

function updateTimerDisplay() {
  sessionEl.textContent = `${String(sessionMinutes).padStart(2, "0")}:${String(
    sessionSeconds
  ).padStart(2, "0")}`;
  roundEl.textContent = `${String(roundMinutes).padStart(2, "0")}:${String(
    roundSeconds
  ).padStart(2, "0")}`;
  roundEl.classList.toggle(
    "timer-warning",
    roundMinutes === 0 && roundSeconds <= 10
  );
}
