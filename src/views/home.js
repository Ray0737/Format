// Format — home view: document grid, template grid, search

window.Format = window.Format || {};

(function () {
  function renderDocs(filterText) {
    const grid = document.getElementById("doc-grid");
    const emptyState = document.getElementById("doc-empty-state");
    const noResults = document.getElementById("doc-no-results");
    if (!grid) return;

    const allDocs = Format.DocStore.getAll();
    const query = (filterText ?? "").trim().toLowerCase();
    const docs = query
      ? allDocs.filter((doc) => (doc.title ?? "").toLowerCase().includes(query))
      : allDocs;

    grid.innerHTML = "";
    docs.forEach((doc) => grid.appendChild(Format.DocCard.render(doc)));

    if (!query) {
      grid.appendChild(Format.DocCard.renderNew());
    }

    const hasNoDocs = allDocs.length === 0;
    emptyState?.classList.toggle("hidden", !hasNoDocs);
    grid.classList.toggle("hidden", hasNoDocs && !query);
    noResults?.classList.toggle("hidden", !(query && docs.length === 0));
  }

  function initSearch() {
    const input = document.querySelector(".hero-search");
    const handler = (event) => renderDocs(event.target.value);
    input?.addEventListener("input", handler);
    input?.addEventListener("search", handler);
  }

  function formatStudyTime(totalSeconds) {
    const totalMinutes = Math.round(totalSeconds / 60);
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  // "Due for review" queue — standalone flashcard decks with cards due today.
  function renderReviewQueue() {
    const section = document.getElementById("review-queue");
    if (!section || !Format.SRS || !Format.DeckStore) return;

    const due = Format.DeckStore.getAll()
      .map((deck) => ({ deck, stats: Format.SRS.deckStats(deck.id, deck.cards.map((c) => c.id)) }))
      .filter((e) => e.stats.due > 0);

    if (!due.length) {
      section.classList.add("hidden");
      section.innerHTML = "";
      return;
    }

    section.classList.remove("hidden");
    const cards = due
      .map(
        ({ deck, stats }) => `
      <div class="review-queue-card">
        <div class="review-queue-card__top">
          <span class="review-queue-card__icon">${Format.icons.flashcard}</span>
          <span class="review-queue-card__count">${stats.due}</span>
        </div>
        <h3 class="review-queue-card__title">${Format.escapeHtml(deck.name || "Untitled deck")}</h3>
        <p class="review-queue-card__meta">${stats.due} due · ${stats.total} card${stats.total === 1 ? "" : "s"}</p>
        <button type="button" class="review-queue-card__btn" data-action="review-deck" data-deck-id="${deck.id}">Review now</button>
      </div>`
      )
      .join("");
    section.innerHTML = `<h2 class="text-heading mb-4 text-navy-800">Due for review</h2><div class="review-queue-grid">${cards}</div>`;
  }

  function initReviewQueue() {
    document.addEventListener("click", (event) => {
      const btn = event.target.closest('[data-action="review-deck"]');
      if (!btn) return;
      event.preventDefault();
      Format.Review?.start(btn.dataset.deckId);
    });
  }

  function renderStats() {
    const stats = Format.StudyStats?.getStats();
    if (!stats) return;

    const streakEl = document.getElementById("hero-stat-streak");
    const totalEl = document.getElementById("hero-stat-total");
    if (streakEl) streakEl.textContent = String(stats.streak);
    if (totalEl) totalEl.textContent = formatStudyTime(stats.totalSeconds);
  }

  function initDelete() {
    document.addEventListener("click", (event) => {
      const btn = event.target.closest('[data-action="delete-doc"]');
      if (!btn) return;

      event.preventDefault();
      event.stopPropagation();

      const id = btn.dataset.docId;
      const doc = Format.DocStore.getDoc(id);
      if (!doc) return;

      Format.ConfirmDialog.open(`Delete "${doc.title || "Untitled"}"? This can't be undone.`, {
        title: "Delete document",
        okLabel: "Delete",
      }).then((confirmed) => {
        if (!confirmed) return;
        Format.DocStore.deleteDoc(id);
        renderDocs(document.querySelector(".hero-search")?.value ?? "");
      });
    });
  }

  function initDuplicate() {
    document.addEventListener("click", (event) => {
      const btn = event.target.closest('[data-action="duplicate-doc"]');
      if (!btn) return;

      event.preventDefault();
      event.stopPropagation();

      const id = btn.dataset.docId;
      Format.DocStore.duplicateDoc(id).then((copy) => {
        if (!copy) return;
        renderDocs(document.querySelector(".hero-search")?.value ?? "");
      });
    });
  }

  // Briefly shows shimmer placeholders before the (synchronous) localStorage
  // read paints, so a cold load doesn't flash an empty grid.
  function showSkeleton() {
    const grid = document.getElementById("doc-grid");
    if (!grid) return;
    grid.classList.add("is-loading");
    grid.innerHTML = Array.from({ length: 4 }, () => '<div class="doc-skeleton"></div>').join("");
  }

  function init() {
    showSkeleton();
    requestAnimationFrame(() => {
      const grid = document.getElementById("doc-grid");
      grid?.classList.remove("is-loading");
      renderDocs("");
    });
    renderStats();
    renderReviewQueue();
    initSearch();
    initDelete();
    initDuplicate();
    initReviewQueue();
  }

  document.addEventListener("DOMContentLoaded", init);

  Format.HomeView = { renderDocs, renderStats, renderReviewQueue };
})();
