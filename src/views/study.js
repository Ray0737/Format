// Format — study mode view: itinerary setup, long-haul session, arrived screen

window.Format = window.Format || {};

(function () {
  const DURATION_PRESETS = [25, 45, 60, 90];
  const LAYOVER_PRESETS = [5, 10, 15];
  const MAX_LEGS = 5;
  const DEFAULT_ORIGIN = { code: "MTH", name: "Mathematics" };
  const DEFAULT_LEG = { code: "PHY", name: "Physics" };

  // Setup form state, retained across "New session" so the form stays
  // pre-filled with whatever the user last typed.
  let originFields = { code: "", name: "" };
  let legs = [{ code: "", name: "", durationMinutes: 25, customMinutes: "" }];
  let layoverMinutes = 5;
  let layoverCustom = "";

  let session = null;
  let timer = null;

  // Retained after an itinerary ends so the post-arrival layover screen can
  // show the route — cleared once a new itinerary boards.
  let lastItinerary = null;
  let layoverResume = null;

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function formatClock(totalSeconds) {
    const safe = Math.max(0, Math.round(totalSeconds));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    return { hh: pad(h), mm: pad(m), ss: pad(s) };
  }

  function formatTimeOfDay(date) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function formatDuration(totalSeconds) {
    const totalMinutes = Math.round(totalSeconds / 60);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
  }

  function sanitizeCode(value) {
    return (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
  }

  function stage() {
    return document.getElementById("study-stage");
  }

  function arrowRightSvg() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  }

  // ---- Setup screen ----------------------------------------------------

  function originCard() {
    return `
      <div class="study-route-stop study-route-stop--origin">
        <p class="study-route-stop__label">Starting point</p>
        <input type="text" id="study-from-code" class="study-route-stop__code" data-field="from-code" maxlength="5" placeholder="${DEFAULT_ORIGIN.code}" value="${Format.escapeHtml(originFields.code)}" autocomplete="off">
        <input type="text" class="study-route-stop__name" data-field="from-name" placeholder="${DEFAULT_ORIGIN.name}" value="${Format.escapeHtml(originFields.name)}" autocomplete="off">
      </div>
    `;
  }

  function legCard(leg, index) {
    const fallback = index === 0 ? DEFAULT_LEG : { code: `STOP${index + 1}`, name: `Stop ${index + 1}` };

    return `
      <div class="study-route-stop" data-leg-index="${index}">
        ${legs.length > 1 ? `<button type="button" class="study-route-stop__remove" data-action="remove-leg" data-index="${index}" aria-label="Remove stop">&times;</button>` : ""}
        <p class="study-route-stop__label">Stop ${index + 1}</p>
        <input type="text" class="study-route-stop__code" data-field="leg-code" data-index="${index}" maxlength="5" placeholder="${fallback.code}" value="${Format.escapeHtml(leg.code)}" autocomplete="off">
        <input type="text" class="study-route-stop__name" data-field="leg-name" data-index="${index}" placeholder="${fallback.name}" value="${Format.escapeHtml(leg.name)}" autocomplete="off">
        <div class="study-route-stop__duration">
          ${DURATION_PRESETS.map(
            (mins) =>
              `<button type="button" class="study-chip study-chip--sm ${!leg.customMinutes && leg.durationMinutes === mins ? "is-active" : ""}" data-action="leg-duration" data-index="${index}" data-minutes="${mins}">${mins}</button>`
          ).join("")}
          <input type="number" class="study-duration__custom study-duration__custom--sm" data-field="leg-custom-minutes" data-index="${index}" placeholder="min" min="1" max="999" value="${Format.escapeHtml(leg.customMinutes)}">
        </div>
      </div>
    `;
  }

  function renderSetup() {
    const root = stage();
    if (!root) return;

    root.innerHTML = `
      <div class="study-setup">
        <div class="study-setup__inner">
          <p class="study-setup__eyebrow">Study Mode</p>
          <h1 class="study-setup__title">Plan your day</h1>

          <div class="study-route-row">
            ${originCard()}
            ${legs
              .map(
                (leg, index) => `
                  <div class="study-route-arrow">${arrowRightSvg()}</div>
                  ${legCard(leg, index)}
                `
              )
              .join("")}
            ${
              legs.length < MAX_LEGS
                ? `
                  <div class="study-route-arrow">${arrowRightSvg()}</div>
                  <button type="button" class="study-route-add" data-action="add-leg">
                    <span class="study-route-add__icon">+</span>
                    <span>Add stop</span>
                  </button>
                `
                : ""
            }
          </div>

          <div class="study-layover-field">
            <label class="study-field__label">Layover between stops</label>
            <div class="study-duration-chips">
              ${LAYOVER_PRESETS.map(
                (mins) =>
                  `<button type="button" class="study-chip study-chip--sm ${!layoverCustom && layoverMinutes === mins ? "is-active" : ""}" data-action="layover-duration" data-minutes="${mins}">${mins} min</button>`
              ).join("")}
              <input type="number" class="study-duration__custom study-duration__custom--sm" data-field="layover-custom" placeholder="Custom" min="1" max="180" value="${Format.escapeHtml(layoverCustom)}">
            </div>
          </div>

          <button type="button" class="study-cta" data-action="board">${Format.icons.plane} Board flight</button>
        </div>
      </div>
    `;
  }

  function readSetupFields() {
    const root = stage();
    if (!root) return;

    const fromCode = root.querySelector('[data-field="from-code"]');
    const fromName = root.querySelector('[data-field="from-name"]');
    if (fromCode) originFields.code = fromCode.value;
    if (fromName) originFields.name = fromName.value;

    legs.forEach((leg, index) => {
      const codeInput = root.querySelector(`[data-field="leg-code"][data-index="${index}"]`);
      const nameInput = root.querySelector(`[data-field="leg-name"][data-index="${index}"]`);
      if (codeInput) leg.code = codeInput.value;
      if (nameInput) leg.name = nameInput.value;
    });
  }

  function addLeg() {
    if (legs.length >= MAX_LEGS) return;
    readSetupFields();
    legs.push({ code: "", name: "", durationMinutes: 25, customMinutes: "" });
    renderSetup();
  }

  function removeLeg(index) {
    if (legs.length <= 1) return;
    readSetupFields();
    legs.splice(index, 1);
    renderSetup();
  }

  function setLegDuration(index, mins) {
    const leg = legs[index];
    if (!leg) return;
    leg.durationMinutes = mins;
    leg.customMinutes = "";
    const row = stage()?.querySelector(`.study-leg[data-leg-index="${index}"]`);
    row?.querySelectorAll('[data-action="leg-duration"]').forEach((btn) => {
      btn.classList.toggle("is-active", Number(btn.dataset.minutes) === mins);
    });
    const custom = row?.querySelector('[data-field="leg-custom-minutes"]');
    if (custom) custom.value = "";
  }

  function setLegCustomMinutes(index, value) {
    const leg = legs[index];
    if (!leg) return;
    leg.customMinutes = value;
    const row = stage()?.querySelector(`.study-leg[data-leg-index="${index}"]`);
    row?.querySelectorAll('[data-action="leg-duration"]').forEach((btn) => btn.classList.remove("is-active"));
  }

  function setLayoverDuration(mins) {
    layoverMinutes = mins;
    layoverCustom = "";
    document.querySelectorAll('[data-action="layover-duration"]').forEach((btn) => {
      btn.classList.toggle("is-active", Number(btn.dataset.minutes) === mins);
    });
    const custom = document.querySelector('[data-field="layover-custom"]');
    if (custom) custom.value = "";
  }

  function setLayoverCustom(value) {
    layoverCustom = value;
    document.querySelectorAll('[data-action="layover-duration"]').forEach((btn) => btn.classList.remove("is-active"));
  }

  function boardFlight() {
    readSetupFields();

    const originCode = sanitizeCode(originFields.code) || DEFAULT_ORIGIN.code;
    const originName = originFields.name.trim() || DEFAULT_ORIGIN.name;

    const resolvedLegs = legs.map((leg, index) => {
      const fallback = index === 0 ? DEFAULT_LEG : { code: `STOP${index + 1}`, name: `Stop ${index + 1}` };
      const code = sanitizeCode(leg.code) || fallback.code;
      const name = leg.name.trim() || fallback.name;
      const minutes = leg.customMinutes && Number(leg.customMinutes) > 0 ? Number(leg.customMinutes) : leg.durationMinutes;
      return { code, name, totalSeconds: Math.round(minutes * 60) };
    });

    const layMinutes = layoverCustom && Number(layoverCustom) > 0 ? Number(layoverCustom) : layoverMinutes;

    session = {
      origin: { code: originCode, name: originName },
      legs: resolvedLegs,
      layoverSeconds: Math.round(layMinutes * 60),
      currentLeg: 0,
      completedSeconds: 0,
      legStartedAt: Date.now(),
    };

    startLeg();
  }

  // ---- Session screen -----------------------------------------------------

  function currentFrom() {
    return session.currentLeg === 0 ? session.origin : session.legs[session.currentLeg - 1];
  }

  function currentTo() {
    return session.legs[session.currentLeg];
  }

  function startLeg() {
    session.legStartedAt = Date.now();
    timer = Format.Timer.create();
    renderSession();
    timer.onTick(handleTick);
    timer.onComplete(handleLegComplete);
    timer.start(session.legs[session.currentLeg].totalSeconds);
  }

  function itineraryStripHtml() {
    const stops = [session.origin, ...session.legs];

    return `
      <div class="study-itinerary-strip">
        ${stops
          .map((stop, index) => {
            let stateClass = "";
            if (index <= session.currentLeg) stateClass = "is-done";
            else if (index === session.currentLeg + 1) stateClass = "is-current";
            const sep = index < stops.length - 1 ? '<span class="study-itinerary-strip__sep"></span>' : "";
            return `<span class="study-itinerary-strip__stop ${stateClass}">${Format.escapeHtml(stop.code)}</span>${sep}`;
          })
          .join("")}
      </div>
    `;
  }

  function renderSession() {
    const root = stage();
    if (!root || !session) return;

    const leg = session.legs[session.currentLeg];
    const from = currentFrom();
    const to = currentTo();

    const departed = new Date(session.legStartedAt);
    const eta = new Date(session.legStartedAt + leg.totalSeconds * 1000);
    const clock = formatClock(leg.totalSeconds);

    root.innerHTML = `
      <div class="study-session">
        <div class="flight-card">
          ${session.legs.length > 1 ? itineraryStripHtml() : ""}

          <div class="study-countdown study-countdown--compact" data-el="countdown">
            <span class="study-countdown__seg" data-el="hh">${clock.hh}</span>
            <span class="study-countdown__colon">:</span>
            <span class="study-countdown__seg" data-el="mm">${clock.mm}</span>
            <span class="study-countdown__colon">:</span>
            <span class="study-countdown__seg" data-el="ss">${clock.ss}</span>
          </div>

          <div class="study-visual" data-el="visual">${Format.FlightDisplay.renderVisual({ from, to })}</div>

          <div class="flight-meta">
            <div class="flight-meta__col">
              <p class="flight-meta__place">${Format.escapeHtml(from.name)}</p>
              <p class="flight-meta__label">Started</p>
              <p class="flight-meta__time">${formatTimeOfDay(departed)}</p>
            </div>
            <div class="flight-meta__divider" aria-hidden="true"></div>
            <div class="flight-meta__col flight-meta__col--end">
              <p class="flight-meta__place">${Format.escapeHtml(to.name)}</p>
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
    const clock = formatClock(remaining);
    const root = stage();
    const hh = root?.querySelector('[data-el="hh"]');
    const mm = root?.querySelector('[data-el="mm"]');
    const ss = root?.querySelector('[data-el="ss"]');
    if (hh) hh.textContent = clock.hh;
    if (mm) mm.textContent = clock.mm;
    if (ss) ss.textContent = clock.ss;
  }

  function handleTick(state) {
    updateCountdown(state.remaining);
    const visual = stage()?.querySelector('[data-el="visual"]');
    if (visual) Format.FlightDisplay.update(visual, state);
  }

  function handleLegComplete(state) {
    session.completedSeconds += state.total;
    Format.StudyStats.recordSession(state.total);

    const isLast = session.currentLeg === session.legs.length - 1;
    if (isLast) {
      finishItinerary({ endedEarly: false });
    } else {
      startBetweenLegLayover();
    }
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
    updateCountdown(session.legs[session.currentLeg].totalSeconds);
    const visual = stage()?.querySelector('[data-el="visual"]');
    if (visual) Format.FlightDisplay.update(visual, { progress: 0 });

    const btn = stage()?.querySelector('[data-el="pause-btn"]');
    if (timer.isRunning() && btn) btn.innerHTML = `${Format.icons.pause} Pause`;
  }

  function endSession() {
    if (!timer || !session) return;
    const elapsed = timer.snapshot().elapsed;
    timer.pause();
    Format.StudyStats.recordSession(elapsed);
    finishItinerary({ endedEarly: true, elapsed });
  }

  // ---- Arrived screen -----------------------------------------------------

  function finishItinerary({ endedEarly, elapsed = 0 }) {
    const completedCount = endedEarly ? session.currentLeg + 1 : session.legs.length;
    const totalSeconds = session.completedSeconds + (endedEarly ? elapsed : 0);

    const stops = [session.origin, ...session.legs];
    const reached = stops[completedCount];
    const routeCodes = stops.slice(0, completedCount + 1).map((stop) => stop.code);

    lastItinerary = { fromCode: session.origin.code, toCode: reached.code };

    renderArrived({
      routeCodes,
      originName: session.origin.name,
      reachedName: reached.name,
      totalSeconds,
      endedEarly,
    });

    timer = null;
    session = null;
  }

  function renderArrived({ routeCodes, originName, reachedName, totalSeconds, endedEarly }) {
    const root = stage();
    if (!root) return;

    const timeLabel = formatDuration(totalSeconds);
    const subLabel = endedEarly ? "Session ended early" : "Total time";
    const routeLabel = routeCodes.map((code) => Format.escapeHtml(code)).join(" &rarr; ");

    root.innerHTML = `
      <div class="study-arrived">
        <div class="study-arrived__icon">${Format.icons.plane}</div>
        <h2 class="study-arrived__heading">You've arrived.</h2>
        <p class="study-arrived__route">${routeLabel} &middot; ${Format.escapeHtml(originName)} to ${Format.escapeHtml(reachedName)}</p>
        <p class="study-arrived__time">${subLabel}: ${timeLabel}</p>

        <div class="study-arrived__actions">
          <button type="button" class="study-cta" data-action="new-session">New session</button>
        </div>

        <div class="study-layover-setup">
          <p class="study-layover-setup__label">Layover before next session</p>
          <div class="study-duration-chips">
            ${LAYOVER_PRESETS.map(
              (mins) =>
                `<button type="button" class="study-chip ${!layoverCustom && layoverMinutes === mins ? "is-active" : ""}" data-action="layover-duration" data-minutes="${mins}">${mins} min</button>`
            ).join("")}
            <input type="number" class="study-duration__custom" data-field="layover-custom" placeholder="Custom" min="1" max="180" value="${Format.escapeHtml(layoverCustom)}">
          </div>
          <button type="button" class="study-controls__btn study-controls__btn--primary" data-action="start-layover">${Format.icons.refresh} Start layover</button>
        </div>
      </div>
    `;
  }

  // ---- Layover screen -------------------------------------------------------

  function renderLayover({ totalSeconds, fromCode, toCode }) {
    const root = stage();
    if (!root) return;

    const clock = formatClock(totalSeconds);
    const routeHtml =
      fromCode && toCode
        ? `<p class="study-layover__route">${Format.escapeHtml(fromCode)} &rarr; ${Format.escapeHtml(toCode)}</p>`
        : "";

    root.innerHTML = `
      <div class="study-layover">
        <div class="study-arrived__icon">${Format.icons.plane}</div>
        <h2 class="study-layover__heading">Layover</h2>
        <p class="study-layover__sub">Next stop boards in</p>
        ${routeHtml}
        <div class="study-countdown" data-el="countdown">
          <span class="study-countdown__seg" data-el="hh">${clock.hh}</span>
          <span class="study-countdown__colon">:</span>
          <span class="study-countdown__seg" data-el="mm">${clock.mm}</span>
          <span class="study-countdown__colon">:</span>
          <span class="study-countdown__seg" data-el="ss">${clock.ss}</span>
        </div>
        <button type="button" class="study-controls__btn" data-action="skip-layover">${Format.icons["log-out"]} Skip layover</button>
      </div>
    `;
  }

  function startBetweenLegLayover() {
    const from = currentTo();
    const next = session.legs[session.currentLeg + 1];

    renderLayover({ totalSeconds: session.layoverSeconds, fromCode: from.code, toCode: next.code });

    layoverResume = () => {
      session.currentLeg += 1;
      startLeg();
    };

    timer = Format.Timer.create();
    timer.onTick((state) => updateCountdown(state.remaining));
    timer.onComplete(() => layoverResume());
    timer.start(session.layoverSeconds);
  }

  function startPostArrivalLayover() {
    const minutes = layoverCustom && Number(layoverCustom) > 0 ? Number(layoverCustom) : layoverMinutes;
    const totalSeconds = Math.round(minutes * 60);

    renderLayover({ totalSeconds, fromCode: lastItinerary?.fromCode, toCode: lastItinerary?.toCode });

    layoverResume = () => {
      timer = null;
      renderSetup();
    };

    timer = Format.Timer.create();
    timer.onTick((state) => updateCountdown(state.remaining));
    timer.onComplete(() => layoverResume());
    timer.start(totalSeconds);
  }

  function skipLayover() {
    if (timer) {
      timer.stop();
      timer = null;
    }
    layoverResume?.();
  }

  // ---- Event delegation ----------------------------------------------------

  function handleClick(event) {
    if (event.target.closest('[data-action="add-leg"]')) {
      addLeg();
      return;
    }

    const removeBtn = event.target.closest('[data-action="remove-leg"]');
    if (removeBtn) {
      removeLeg(Number(removeBtn.dataset.index));
      return;
    }

    const legDurationBtn = event.target.closest('[data-action="leg-duration"]');
    if (legDurationBtn) {
      setLegDuration(Number(legDurationBtn.dataset.index), Number(legDurationBtn.dataset.minutes));
      return;
    }

    const layoverBtn = event.target.closest('[data-action="layover-duration"]');
    if (layoverBtn) {
      setLayoverDuration(Number(layoverBtn.dataset.minutes));
      return;
    }

    if (event.target.closest('[data-action="board"]')) {
      boardFlight();
      return;
    }

    if (event.target.closest('[data-action="pause-resume"]')) {
      togglePause();
      return;
    }

    if (event.target.closest('[data-action="reset"]')) {
      resetSession();
      return;
    }

    if (event.target.closest('[data-action="end"]')) {
      endSession();
      return;
    }

    if (event.target.closest('[data-action="new-session"]')) {
      renderSetup();
      return;
    }

    if (event.target.closest('[data-action="start-layover"]')) {
      startPostArrivalLayover();
      return;
    }

    if (event.target.closest('[data-action="skip-layover"]')) {
      skipLayover();
    }
  }

  function handleInput(event) {
    const target = event.target;
    const field = target.dataset.field;

    if (field === "from-code" || field === "leg-code") {
      const cursor = target.selectionStart;
      const before = target.value.length;
      target.value = sanitizeCode(target.value);
      const after = target.value.length;
      const newCursor = Math.max(0, (cursor ?? after) - (before - after));
      target.setSelectionRange(newCursor, newCursor);
      return;
    }

    if (field === "leg-custom-minutes") {
      setLegCustomMinutes(Number(target.dataset.index), target.value);
      return;
    }

    if (field === "layover-custom") {
      setLayoverCustom(target.value);
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
