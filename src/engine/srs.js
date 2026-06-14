// Format — flashcard spaced repetition engine (Phase 14)
//
// SM-2-style scheduling with three self-rating grades (Hard / OK / Easy).
// Per-card scheduling state and a per-deck daily review log are persisted to
// localStorage. New cards (no state yet) are always due.
//
//   format-srs      → { [docId]: { [cardId]: { ease, interval, reps, due, last } } }
//   format-srs-log  → { [docId]: { [YYYY-MM-DD]: reviewCount } }

window.Format = window.Format || {};

(function () {
  const STATE_KEY = "format-srs";
  const LOG_KEY = "format-srs-log";
  const DAY = 86400000;

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function dayKey(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function getCardState(docId, cardId) {
    return read(STATE_KEY)[docId]?.[cardId] ?? null;
  }

  // Pure SM-2 variant. grade ∈ { "hard", "ok", "easy" }.
  function nextState(prev, grade) {
    let ease = prev?.ease ?? 2.5;
    let interval = prev?.interval ?? 0;
    let reps = prev?.reps ?? 0;

    if (grade === "hard") {
      ease = Math.max(1.3, ease - 0.2);
      reps += 1;
      interval = reps <= 1 ? 1 : Math.max(1, Math.round(interval * 1.2));
    } else if (grade === "easy") {
      ease = ease + 0.15;
      reps += 1;
      interval = reps === 1 ? 2 : Math.round(Math.max(interval, 1) * ease * 1.3);
    } else {
      // "ok" / Good — standard SM-2 progression
      reps += 1;
      if (reps === 1) interval = 1;
      else if (reps === 2) interval = 3;
      else interval = Math.round(interval * ease);
    }

    const now = Date.now();
    return { ease: Math.round(ease * 100) / 100, interval, reps, due: now + interval * DAY, last: now };
  }

  // Records a grade for a card, updates its schedule, and logs the review.
  function record(docId, cardId, grade) {
    const all = read(STATE_KEY);
    if (!all[docId]) all[docId] = {};
    const updated = nextState(all[docId][cardId], grade);
    all[docId][cardId] = updated;
    write(STATE_KEY, all);

    const log = read(LOG_KEY);
    if (!log[docId]) log[docId] = {};
    const k = dayKey(Date.now());
    log[docId][k] = (log[docId][k] || 0) + 1;
    write(LOG_KEY, log);

    return updated;
  }

  // Given the deck's current card ids, returns those due now (new cards count
  // as due). Order: new cards first, then by soonest due date.
  function getDue(docId, cardIds) {
    const states = read(STATE_KEY)[docId] || {};
    const now = Date.now();
    return cardIds
      .map((id) => ({ id, st: states[id] }))
      .filter(({ st }) => !st || st.due <= now)
      .sort((a, b) => (a.st?.due ?? 0) - (b.st?.due ?? 0))
      .map(({ id }) => id);
  }

  function deckStats(docId, cardIds) {
    const states = read(STATE_KEY)[docId] || {};
    const now = Date.now();
    let due = 0;
    let learned = 0;
    cardIds.forEach((id) => {
      const st = states[id];
      if (!st || st.due <= now) due += 1;
      if (st && st.reps > 0) learned += 1;
    });
    return { total: cardIds.length, due, learned, isNew: learned === 0 };
  }

  // Returns the last `weeks` of daily review counts as a flat array ordered
  // oldest→newest, ending today, for rendering a contribution-style heatmap.
  function heatmap(docId, weeks = 16) {
    const log = read(LOG_KEY)[docId] || {};
    const days = weeks * 7;
    const out = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const ts = today.getTime() - i * DAY;
      out.push({ date: dayKey(ts), count: log[dayKey(ts)] || 0 });
    }
    return out;
  }

  // Removes a deck's SRS data (called when a doc is deleted, optional).
  function forgetDeck(docId) {
    const all = read(STATE_KEY);
    const log = read(LOG_KEY);
    delete all[docId];
    delete log[docId];
    write(STATE_KEY, all);
    write(LOG_KEY, log);
  }

  Format.SRS = { getCardState, nextState, record, getDue, deckStats, heatmap, forgetDeck };
})();
