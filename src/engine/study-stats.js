// Format — study mode stats: daily streak + cumulative study time (localStorage)

window.Format = window.Format || {};

(function () {
  const STORAGE_KEY = "format-study-stats";
  const DAY_MS = 24 * 60 * 60 * 1000;

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed.days === "object" ? parsed : { days: {} };
    } catch {
      return { days: {} };
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // Records elapsed study time (seconds) against today's date.
  function recordSession(seconds) {
    const secs = Math.round(seconds);
    if (!Number.isFinite(secs) || secs <= 0) return;

    const data = load();
    const key = dateKey(new Date());
    data.days[key] = (data.days[key] || 0) + secs;
    save(data);
  }

  // Counts consecutive days (ending today or yesterday) with recorded time.
  function computeStreak(days) {
    const today = new Date();
    if (days[dateKey(today)]) {
      return countBack(days, today);
    }
    const yesterday = new Date(today.getTime() - DAY_MS);
    if (days[dateKey(yesterday)]) {
      return countBack(days, yesterday);
    }
    return 0;
  }

  function countBack(days, fromDate) {
    let streak = 0;
    let cursor = new Date(fromDate);
    while (days[dateKey(cursor)]) {
      streak++;
      cursor = new Date(cursor.getTime() - DAY_MS);
    }
    return streak;
  }

  function getStats() {
    const { days } = load();
    const totalSeconds = Object.values(days).reduce((sum, secs) => sum + secs, 0);
    return {
      streak: computeStreak(days),
      totalSeconds,
      studiedToday: Boolean(days[dateKey(new Date())]),
    };
  }

  Format.StudyStats = { recordSession, getStats };
})();
