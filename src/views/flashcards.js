// Format — Flashcards view: standalone deck manager (not document-based)
//
// Two modes rendered into #flashcards-stage:
//   • list   — all decks as cards (name, card/due counts, Review, delete)
//   • editor — one deck: rename, add/edit/delete cards (front/back), Review
//
// Decks are persisted via Format.DeckStore; review + scheduling via
// Format.Review / Format.SRS, keyed by deck id.

window.Format = window.Format || {};

(function () {
  let editingDeckId = null;

  function stage() {
    return document.getElementById("flashcards-stage");
  }

  function esc(v) {
    return Format.escapeHtml(v);
  }

  function deckStats(deck) {
    const ids = deck.cards.map((c) => c.id);
    return Format.SRS ? Format.SRS.deckStats(deck.id, ids) : { total: ids.length, due: ids.length };
  }

  // ── List mode ─────────────────────────────────────────────────────────
  function renderList() {
    editingDeckId = null;
    const decks = Format.DeckStore.getAll();

    const cards = decks
      .map((deck) => {
        const stats = deckStats(deck);
        const dueBadge = stats.due > 0 ? `<span class="fc-deck-card__due">${stats.due} due</span>` : "";
        return `
        <div class="fc-deck-card group">
          <button type="button" class="fc-deck-card__open" data-fc="open" data-deck="${deck.id}" aria-label="Open ${esc(deck.name)}"></button>
          <button type="button" class="fc-deck-card__del" data-fc="delete-deck" data-deck="${deck.id}" title="Delete deck" aria-label="Delete deck">${Format.icons.trash}</button>
          <div class="fc-deck-card__top">
            <span class="fc-deck-card__icon">${Format.icons.flashcard}</span>
            ${dueBadge}
          </div>
          <h3 class="fc-deck-card__name">${esc(deck.name)}</h3>
          <p class="fc-deck-card__meta">${stats.total} card${stats.total === 1 ? "" : "s"}</p>
          <button type="button" class="fc-deck-card__review" data-fc="review" data-deck="${deck.id}">
            ${stats.due > 0 ? "Review now" : "Study"}
          </button>
        </div>`;
      })
      .join("");

    const totalDue = decks.reduce((sum, d) => sum + deckStats(d).due, 0);
    const summary = decks.length
      ? `${decks.length} deck${decks.length === 1 ? "" : "s"}${totalDue ? ` · ${totalDue} due` : ""}`
      : "No decks yet";

    stage().innerHTML = `
      <div class="fc-toolbar">
        <span class="fc-count">${summary}</span>
        <button type="button" class="fc-new-btn" data-fc="new-deck">
          <span class="fc-new-btn__icon">${Format.icons.plus}</span> New deck
        </button>
      </div>
      <div class="fc-deck-grid">
        ${cards}
        <button type="button" class="fc-deck-card fc-deck-card--new" data-fc="new-deck">
          <span class="fc-deck-card__plus">${Format.icons.plus}</span>
          <span>New deck</span>
        </button>
      </div>
    `;
  }

  // ── Editor mode ───────────────────────────────────────────────────────
  function renderEditor(deckId) {
    const deck = Format.DeckStore.getDeck(deckId);
    if (!deck) return renderList();
    editingDeckId = deckId;
    const stats = deckStats(deck);

    const rows = deck.cards
      .map(
        (card, i) => `
      <div class="fc-card-row" data-card="${card.id}">
        <span class="fc-card-row__num">${i + 1}</span>
        <label class="fc-card-field-wrap">
          <span class="fc-card-field-label">Front</span>
          <textarea class="fc-card-field" data-side="front" rows="2" placeholder="Term or question">${esc(card.front)}</textarea>
        </label>
        <label class="fc-card-field-wrap">
          <span class="fc-card-field-label">Back</span>
          <textarea class="fc-card-field" data-side="back" rows="2" placeholder="Definition or answer">${esc(card.back)}</textarea>
        </label>
        <button type="button" class="fc-card-del" data-fc="del-card" data-card="${card.id}" title="Delete card" aria-label="Delete card">${Format.icons.trash}</button>
      </div>`
      )
      .join("");

    stage().innerHTML = `
      <button type="button" class="fc-back" data-fc="back">
        <span class="fc-back__icon">${Format.icons["arrow-left"]}</span> All decks
      </button>
      <div class="fc-editor-head">
        <input type="text" class="fc-deck-name" value="${esc(deck.name)}" aria-label="Deck name" autocomplete="off">
        <div class="fc-editor-actions">
          <button type="button" class="fc-btn fc-btn--primary" data-fc="review" data-deck="${deck.id}" ${stats.total === 0 ? "disabled" : ""}>Review${stats.due > 0 ? ` (${stats.due})` : ""}</button>
          <button type="button" class="fc-btn fc-btn--danger" data-fc="delete-deck" data-deck="${deck.id}">Delete deck</button>
        </div>
      </div>
      <p class="fc-editor-meta">${stats.total} card${stats.total === 1 ? "" : "s"}${stats.due > 0 ? ` · ${stats.due} due for review` : ""}</p>
      <div class="fc-card-list">
        ${rows}
      </div>
      <button type="button" class="fc-add-card" data-fc="add-card">
        <span class="fc-add-card__icon">${Format.icons.plus}</span> Add card
      </button>
    `;
  }

  function render() {
    if (editingDeckId && Format.DeckStore.getDeck(editingDeckId)) renderEditor(editingDeckId);
    else renderList();
  }

  // ── Events ────────────────────────────────────────────────────────────
  function onClick(event) {
    const action = event.target.closest("[data-fc]")?.dataset.fc;
    if (!action) return;
    const deckEl = event.target.closest("[data-deck]");
    const deckId = deckEl?.dataset.deck;

    switch (action) {
      case "new-deck": {
        const deck = Format.DeckStore.createDeck("Untitled deck");
        renderEditor(deck.id);
        stage().querySelector(".fc-deck-name")?.select();
        break;
      }
      case "open":
        renderEditor(deckId);
        break;
      case "back":
        renderList();
        break;
      case "review":
        if (deckId) Format.Review?.start(deckId);
        break;
      case "add-card": {
        Format.DeckStore.addCard(editingDeckId);
        renderEditor(editingDeckId);
        const fields = stage().querySelectorAll(".fc-card-row:last-child .fc-card-field");
        fields[0]?.focus();
        break;
      }
      case "del-card": {
        const cardId = event.target.closest("[data-card]")?.dataset.card;
        Format.DeckStore.deleteCard(editingDeckId, cardId);
        renderEditor(editingDeckId);
        break;
      }
      case "delete-deck": {
        const id = deckId;
        const deck = Format.DeckStore.getDeck(id);
        Format.ConfirmDialog.open(`Delete "${deck?.name || "deck"}"? This removes all its cards.`, {
          title: "Delete deck",
          okLabel: "Delete",
        }).then((ok) => {
          if (!ok) return;
          Format.DeckStore.deleteDeck(id);
          renderList();
          Format.HomeView?.renderReviewQueue?.();
        });
        break;
      }
    }
  }

  function onInput(event) {
    if (!editingDeckId) return;
    const field = event.target.closest(".fc-card-field");
    if (field) {
      const cardId = field.closest(".fc-card-row")?.dataset.card;
      if (cardId) Format.DeckStore.updateCard(editingDeckId, cardId, { [field.dataset.side]: field.value });
      return;
    }
    if (event.target.classList.contains("fc-deck-name")) {
      Format.DeckStore.renameDeck(editingDeckId, event.target.value);
    }
  }

  function init() {
    const root = stage();
    if (!root) return;
    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput);
  }

  document.addEventListener("DOMContentLoaded", init);

  Format.FlashcardsView = { render, openDeck: renderEditor };
})();
