// Format — flashcard review session (Phase 14)
//
// A focused full-screen overlay that walks the due cards of a deck one at a
// time: show the front, tap to reveal the back, then self-rate Hard / OK /
// Easy. Each rating feeds Format.SRS to schedule the next review. The done
// screen shows a per-deck activity heatmap. Launchable from the flashcard
// editor's Review button and the home "Due today" queue.

window.Format = window.Format || {};

(function () {
  let queue = [];
  let index = 0;
  let docId = null;
  let reviewed = 0;

  function overlay() {
    return document.getElementById("review-overlay");
  }

  function ensureOverlay() {
    let el = overlay();
    if (el) return el;
    el = document.createElement("div");
    el.id = "review-overlay";
    el.className = "review-overlay hidden";
    el.innerHTML = `
      <button type="button" class="review-close" data-review-cmd="close" aria-label="Close review">&times;</button>
      <div class="review-stage" id="review-stage"></div>
    `;
    document.body.appendChild(el);
    el.addEventListener("click", onClick);
    return el;
  }

  function esc(v) {
    return Format.escapeHtml(v);
  }

  function stage() {
    return document.getElementById("review-stage");
  }

  function open() {
    ensureOverlay().classList.remove("hidden");
    document.body.classList.add("review-open");
  }

  function close() {
    overlay()?.classList.add("hidden");
    document.body.classList.remove("review-open");
    queue = [];
    index = 0;
    docId = null;
  }

  function heatmapHtml(deckId) {
    const cells = Format.SRS.heatmap(deckId, 16);
    const max = cells.reduce((m, c) => Math.max(m, c.count), 0);
    const level = (c) => {
      if (!c) return 0;
      if (max <= 0) return 0;
      const r = c / max;
      return r > 0.66 ? 4 : r > 0.33 ? 3 : c > 1 ? 2 : 1;
    };
    const dots = cells
      .map((c) => `<span class="review-heat-cell" data-lvl="${level(c.count)}" title="${c.date}: ${c.count} reviews"></span>`)
      .join("");
    return `<div class="review-heatmap" style="grid-template-rows: repeat(7, 1fr); grid-auto-flow: column; grid-template-columns: repeat(16, 1fr);">${dots}</div>`;
  }

  function renderDone() {
    const s = stage();
    if (!s) return;
    s.innerHTML = `
      <div class="review-done">
        <div class="review-done__icon">${Format.icons["check-circle"]}</div>
        <h2 class="review-done__title">${reviewed > 0 ? "Session complete." : "All caught up."}</h2>
        <p class="review-done__sub">${reviewed} card${reviewed === 1 ? "" : "s"} reviewed</p>
        <div class="review-heatmap-wrap">
          <p class="review-heatmap-label">Last 16 weeks</p>
          ${heatmapHtml(docId)}
        </div>
        <button type="button" class="review-primary" data-review-cmd="close">Done</button>
      </div>
    `;
  }

  function renderCard() {
    if (index >= queue.length) {
      renderDone();
      return;
    }
    const card = queue[index];
    const s = stage();
    s.innerHTML = `
      <div class="review-progress">${index + 1} / ${queue.length}</div>
      <div class="review-card" data-review-cmd="flip">
        <div class="review-card__hint" id="review-hint">Tap to reveal</div>
        <div class="review-card__face review-card__front">${card.front ? esc(card.front) : '<span class="review-empty">(empty)</span>'}</div>
        <div class="review-card__face review-card__back hidden">${card.back ? esc(card.back) : '<span class="review-empty">(empty)</span>'}</div>
      </div>
      <div class="review-rating hidden" id="review-rating">
        <button type="button" class="review-grade review-grade--hard" data-review-grade="hard">Hard</button>
        <button type="button" class="review-grade review-grade--ok" data-review-grade="ok">OK</button>
        <button type="button" class="review-grade review-grade--easy" data-review-grade="easy">Easy</button>
      </div>
    `;
  }

  function flip() {
    const back = stage()?.querySelector(".review-card__back");
    const front = stage()?.querySelector(".review-card__front");
    const hint = document.getElementById("review-hint");
    const rating = document.getElementById("review-rating");
    if (!back || back.classList.contains("hidden") === false) return;
    front?.classList.add("hidden");
    back.classList.remove("hidden");
    hint?.classList.add("hidden");
    rating?.classList.remove("hidden");
  }

  function grade(g) {
    const card = queue[index];
    if (!card) return;
    Format.SRS.record(docId, card.id, g);
    reviewed += 1;
    index += 1;
    renderCard();
    Format.HomeView?.renderReviewQueue?.();
    Format.FlashcardsView?.render?.();
  }

  function onClick(event) {
    if (event.target.closest('[data-review-cmd="close"]')) return close();
    const g = event.target.closest("[data-review-grade]")?.dataset.reviewGrade;
    if (g) return grade(g);
    if (event.target.closest('[data-review-cmd="flip"]')) flip();
  }

  function run(deckId, cards) {
    docId = deckId;
    reviewed = 0;
    index = 0;
    const ids = cards.map((c) => c.id);
    const dueIds = new Set(Format.SRS.getDue(deckId, ids));
    queue = cards.filter((c) => dueIds.has(c.id));
    open();
    renderCard();
  }

  // Public: start a review for a deck (Format.DeckStore).
  function start(deckId) {
    ensureOverlay();
    const deck = Format.DeckStore?.getDeck(deckId);
    if (!deck) return;
    run(
      deckId,
      deck.cards.map((c) => ({ id: c.id, front: c.front, back: c.back }))
    );
  }

  function init() {
    ensureOverlay();
    document.addEventListener("keydown", (event) => {
      if (overlay()?.classList.contains("hidden")) return;
      if (event.key === "Escape") close();
      else if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        flip();
      } else if (["1", "2", "3"].includes(event.key)) {
        grade({ 1: "hard", 2: "ok", 3: "easy" }[event.key]);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  Format.Review = { start, close };
})();
