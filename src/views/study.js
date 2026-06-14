// Format — study mode: a single focused study timer (flight-themed)
//
// One subject + one duration → a clean countdown with a plane progress line,
// started / est-finish times, and a "done" screen with an optional break.
// (Replaces the earlier multi-leg itinerary builder.)

window.Format = window.Format || {};

(function () {
  const DURATIONS = [25, 45, 60, 90];
  const BREAKS = [5, 10, 15];
  const DEFAULT = { code: "MTH", name: "Mathematics" };

  // Setup state, retained across sessions so the form stays pre-filled.
  let subjectCode = "";
  let subjectName = "";
  let durationMinutes = 25;
  let customMinutes = "";
  let breakMinutes = 5;
  let breakCustom = "";

  let session = null; // { code, name, totalSeconds, startedAt }
  let timer = null;
  let breakResume = null;

  const esc = (v) => Format.escapeHtml(v);
  const pad = (n) => String(n).padStart(2, "0");

  function formatClock(totalSeconds) {
    const s = Math.max(0, Math.round(totalSeconds));
    return { hh: pad(Math.floor(s / 3600)), mm: pad(Math.floor((s % 3600) / 60)), ss: pad(s % 60) };
  }

  function formatTimeOfDay(date) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function formatDuration(totalSeconds) {
    const m = Math.round(totalSeconds / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem === 0 ? `${h} hr` : `${h} hr ${rem} min`;
  }

  function sanitizeCode(value) {
    return (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
  }

  function deriveCode() {
    const c = sanitizeCode(subjectCode);
    if (c) return c;
    const fromName = sanitizeCode(subjectName);
    return fromName ? fromName.slice(0, 3) : DEFAULT.code;
  }

  function stage() {
    return document.getElementById("study-stage");
  }

  function countdownHtml(totalSeconds, big) {
    const c = formatClock(totalSeconds);
    return `
      <div class="study-countdown ${big ? "" : "study-countdown--compact"}" data-el="countdown">
        <span class="study-countdown__seg" data-el="hh">${c.hh}</span>
        <span class="study-countdown__colon">:</span>
        <span class="study-countdown__seg" data-el="mm">${c.mm}</span>
        <span class="study-countdown__colon">:</span>
        <span class="study-countdown__seg" data-el="ss">${c.ss}</span>
      </div>
    `;
  }

  // ---- Setup screen -------------------------------------------------------

  function renderSetup() {
    const root = stage();
    if (!root) return;

    root.innerHTML = `
      <div class="study-setup">
        <div class="study-setup__inner">
          <p class="study-setup__eyebrow">Study Mode</p>
          <h1 class="study-setup__title">Focus session</h1>

          <div class="study-origin">
            <div class="study-field">
              <label class="study-field__label">Subject</label>
              <input type="text" class="study-field__code" data-field="code" maxlength="5"
                placeholder="${DEFAULT.code}" value="${esc(subjectCode)}" autocomplete="off">
              <input type="text" class="study-field__name" data-field="name"
                placeholder="${DEFAULT.name}" value="${esc(subjectName)}" autocomplete="off">
            </div>
          </div>

          <div class="study-duration">
            <label class="study-field__label">Duration</label>
            <div class="study-duration-chips">
              ${DURATIONS.map(
                (m) =>
                  `<button type="button" class="study-chip ${!customMinutes && durationMinutes === m ? "is-active" : ""}" data-action="duration" data-min="${m}">${m} min</button>`
              ).join("")}
              <input type="number" class="study-duration__custom" data-field="custom" placeholder="Custom" min="1" max="999" value="${esc(customMinutes)}">
            </div>
          </div>

          <button type="button" class="study-cta" data-action="start">${Format.icons.plane} Start session</button>
        </div>
      </div>
    `;
  }

  function readSetup() {
    const root = stage();
    if (!root) return;
    const code = root.querySelector('[data-field="code"]');
    const name = root.querySelector('[data-field="name"]');
    const custom = root.querySelector('[data-field="custom"]');
    if (code) subjectCode = code.value;
    if (name) subjectName = name.value;
    if (custom) customMinutes = custom.value;
  }

  function setDuration(mins) {
    durationMinutes = mins;
    customMinutes = "";
    document.querySelectorAll('[data-action="duration"]').forEach((b) => {
      b.classList.toggle("is-active", Number(b.dataset.min) === mins);
    });
    const custom = document.querySelector('[data-field="custom"]');
    if (custom) custom.value = "";
  }

  // ---- Session screen -----------------------------------------------------

  function startSession() {
    readSetup();
    const minutes = customMinutes && Number(customMinutes) > 0 ? Number(customMinutes) : durationMinutes;
    session = {
      code: deriveCode(),
      name: subjectName.trim() || DEFAULT.name,
      totalSeconds: Math.round(minutes * 60),
      startedAt: Date.now(),
    };

    timer = Format.Timer.create();
    renderSession();
    timer.onTick(handleTick);
    timer.onComplete(handleComplete);
    timer.start(session.totalSeconds);
  }

  function renderSession() {
    const root = stage();
    if (!root || !session) return;

    const started = new Date(session.startedAt);
    const eta = new Date(session.startedAt + session.totalSeconds * 1000);

    root.innerHTML = `
      <div class="study-session">
        <div class="flight-card">
          <div class="study-focus-head">
            <span class="study-focus-code">${esc(session.code)}</span>
            <span class="study-focus-name">${esc(session.name)}</span>
          </div>

          ${countdownHtml(session.totalSeconds, true)}
          <p class="study-countdown-label">remaining</p>

          <div class="study-visual">
            <div class="study-progress">
              <div class="study-progress__fill" data-el="fill"></div>
              <div class="study-progress__plane" data-el="plane">${Format.icons.plane}</div>
            </div>
          </div>

          <div class="flight-meta">
            <div class="flight-meta__col">
              <p class="flight-meta__label">Started</p>
              <p class="flight-meta__time">${formatTimeOfDay(started)}</p>
            </div>
            <div class="flight-meta__divider" aria-hidden="true"></div>
            <div class="flight-meta__col flight-meta__col--end">
              <p class="flight-meta__label">Est. finish</p>
              <p class="flight-meta__time">${formatTimeOfDay(eta)}</p>
            </div>
          </div>
        </div>

        <div class="study-controls">
          <button type="button" class="study-controls__btn study-controls__btn--primary" data-action="pause-resume" data-el="pause-btn">${Format.icons.pause} Pause</button>
          <button type="button" class="study-controls__btn" data-action="reset">${Format.icons.refresh} Reset</button>
          <button type="button" class="study-controls__btn study-controls__btn--danger" data-action="end">${Format.icons["log-out"]} End session</button>
        </div>
      </div>
    `;
  }

  function updateCountdown(remaining) {
    const c = formatClock(remaining);
    const root = stage();
    const hh = root?.querySelector('[data-el="hh"]');
    const mm = root?.querySelector('[data-el="mm"]');
    const ss = root?.querySelector('[data-el="ss"]');
    if (hh) hh.textContent = c.hh;
    if (mm) mm.textContent = c.mm;
    if (ss) ss.textContent = c.ss;
  }

  function setProgress(progress) {
    const pct = Math.min(100, Math.max(0, (progress || 0) * 100));
    const root = stage();
    const plane = root?.querySelector('[data-el="plane"]');
    const fill = root?.querySelector('[data-el="fill"]');
    if (plane) plane.style.left = `${pct}%`;
    if (fill) fill.style.width = `${pct}%`;
  }

  function handleTick(state) {
    updateCountdown(state.remaining);
    setProgress(state.progress);
  }

  function handleComplete(state) {
    Format.StudyStats.recordSession(state.total);
    renderDone(state.total, false);
  }

  function togglePause() {
    if (!timer) return;
    const btn = stage()?.querySelector('[data-el="pause-btn"]');
    if (timer.isRunning()) {
      timer.pause();
      if (btn) btn.innerHTML = `${Format.icons.play} Resume`;
    } else {
      timer.resume();
      if (btn) btn.innerHTML = `${Format.icons.pause} Pause`;
    }
  }

  function resetSession() {
    if (!timer || !session) return;
    timer.reset();
    updateCountdown(session.totalSeconds);
    setProgress(0);
    const btn = stage()?.querySelector('[data-el="pause-btn"]');
    if (timer.isRunning() && btn) btn.innerHTML = `${Format.icons.pause} Pause`;
  }

  function endSession() {
    if (!timer || !session) return;
    const elapsed = timer.snapshot().elapsed;
    timer.pause();
    Format.StudyStats.recordSession(elapsed);
    renderDone(elapsed, true);
  }

  // ---- Done screen --------------------------------------------------------

  function renderDone(totalSeconds, endedEarly) {
    const root = stage();
    if (!root) return;

    const name = session?.name || DEFAULT.name;
    const code = session?.code || DEFAULT.code;
    timer = null;
    session = null;

    root.innerHTML = `
      <div class="study-arrived">
        <div class="study-arrived__icon">${Format.icons["check-circle"]}</div>
        <h2 class="study-arrived__heading">${endedEarly ? "Session ended." : "Nice work."}</h2>
        <p class="study-arrived__route">${esc(code)} &middot; ${esc(name)}</p>
        <p class="study-arrived__time">${endedEarly ? "Time studied" : "Total time"}: ${formatDuration(totalSeconds)}</p>

        <div class="study-arrived__actions">
          <button type="button" class="study-cta" data-action="new-session">New session</button>
        </div>

        <div class="study-layover-setup">
          <p class="study-layover-setup__label">Take a break</p>
          <div class="study-duration-chips">
            ${BREAKS.map(
              (m) =>
                `<button type="button" class="study-chip ${!breakCustom && breakMinutes === m ? "is-active" : ""}" data-action="break-duration" data-min="${m}">${m} min</button>`
            ).join("")}
            <input type="number" class="study-duration__custom" data-field="break-custom" placeholder="Custom" min="1" max="180" value="${esc(breakCustom)}">
          </div>
          <button type="button" class="study-controls__btn study-controls__btn--primary" data-action="start-break">${Format.icons.refresh} Start break</button>
        </div>
      </div>
    `;
  }

  // ---- Break screen -------------------------------------------------------

  function renderBreak(totalSeconds) {
    const root = stage();
    if (!root) return;

    root.innerHTML = `
      <div class="study-layover">
        <div class="study-arrived__icon">${Format.icons.clock}</div>
        <h2 class="study-layover__heading">Break</h2>
        <p class="study-layover__sub">Back to it in</p>
        ${countdownHtml(totalSeconds, true)}
        <button type="button" class="study-controls__btn" data-action="skip-break">${Format.icons["log-out"]} Skip break</button>
      </div>
    `;
  }

  function startBreak() {
    const minutes = breakCustom && Number(breakCustom) > 0 ? Number(breakCustom) : breakMinutes;
    const totalSeconds = Math.round(minutes * 60);

    renderBreak(totalSeconds);
    breakResume = () => {
      timer = null;
      renderSetup();
    };

    timer = Format.Timer.create();
    timer.onTick((state) => updateCountdown(state.remaining));
    timer.onComplete(() => breakResume());
    timer.start(totalSeconds);
  }

  function skipBreak() {
    if (timer) {
      timer.stop();
      timer = null;
    }
    breakResume?.();
  }

  function setBreakDuration(mins) {
    breakMinutes = mins;
    breakCustom = "";
    document.querySelectorAll('[data-action="break-duration"]').forEach((b) => {
      b.classList.toggle("is-active", Number(b.dataset.min) === mins);
    });
    const custom = document.querySelector('[data-field="break-custom"]');
    if (custom) custom.value = "";
  }

  // ---- Events -------------------------------------------------------------

  function handleClick(event) {
    const durationBtn = event.target.closest('[data-action="duration"]');
    if (durationBtn) return setDuration(Number(durationBtn.dataset.min));

    if (event.target.closest('[data-action="start"]')) return startSession();
    if (event.target.closest('[data-action="pause-resume"]')) return togglePause();
    if (event.target.closest('[data-action="reset"]')) return resetSession();
    if (event.target.closest('[data-action="end"]')) return endSession();
    if (event.target.closest('[data-action="new-session"]')) return renderSetup();

    const breakBtn = event.target.closest('[data-action="break-duration"]');
    if (breakBtn) return setBreakDuration(Number(breakBtn.dataset.min));

    if (event.target.closest('[data-action="start-break"]')) return startBreak();
    if (event.target.closest('[data-action="skip-break"]')) return skipBreak();
  }

  function handleInput(event) {
    const field = event.target.dataset.field;
    if (field === "code") {
      const cursor = event.target.selectionStart;
      const before = event.target.value.length;
      event.target.value = sanitizeCode(event.target.value);
      const after = event.target.value.length;
      const np = Math.max(0, (cursor ?? after) - (before - after));
      event.target.setSelectionRange(np, np);
    } else if (field === "name") {
      subjectName = event.target.value;
    } else if (field === "custom") {
      customMinutes = event.target.value;
      document.querySelectorAll('[data-action="duration"]').forEach((b) => b.classList.remove("is-active"));
    } else if (field === "break-custom") {
      breakCustom = event.target.value;
      document.querySelectorAll('[data-action="break-duration"]').forEach((b) => b.classList.remove("is-active"));
    }
  }

  function init() {
    renderSetup();
    const root = stage();
    root?.addEventListener("click", handleClick);
    root?.addEventListener("input", handleInput);
  }

  document.addEventListener("DOMContentLoaded", init);

  Format.StudyView = { renderSetup };
})();
