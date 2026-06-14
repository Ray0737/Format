// Format — flashcard deck store (standalone, not document-based)
//
// Decks live entirely in localStorage (cards are small front/back text), kept
// separate from the A4 document model. SRS scheduling (Format.SRS) keys off
// deck id + card id.
//
//   format-decks → [ { id, name, cards: [{ id, front, back }], updatedAt } ]

window.Format = window.Format || {};

(function () {
  const STORAGE_KEY = "format-decks";

  function readAll() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function writeAll(decks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
  }

  function genId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function getAll() {
    return readAll().slice().sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }

  function getDeck(id) {
    return readAll().find((d) => d.id === id) ?? null;
  }

  function newCard(front = "", back = "") {
    return { id: genId("c"), front, back };
  }

  function createDeck(name) {
    const deck = {
      id: genId("deck"),
      name: name?.trim() || "Untitled deck",
      cards: [newCard("", "")],
      updatedAt: Date.now(),
    };
    writeAll([...readAll(), deck]);
    return deck;
  }

  function touch(deck) {
    deck.updatedAt = Date.now();
  }

  function update(id, mutator) {
    const decks = readAll();
    const deck = decks.find((d) => d.id === id);
    if (!deck) return null;
    mutator(deck);
    touch(deck);
    writeAll(decks);
    return deck;
  }

  function renameDeck(id, name) {
    return update(id, (deck) => {
      deck.name = name?.trim() || "Untitled deck";
    });
  }

  function deleteDeck(id) {
    writeAll(readAll().filter((d) => d.id !== id));
    Format.SRS?.forgetDeck?.(id);
  }

  function addCard(id, front = "", back = "") {
    const card = newCard(front, back);
    update(id, (deck) => deck.cards.push(card));
    return card;
  }

  function updateCard(id, cardId, fields) {
    return update(id, (deck) => {
      const card = deck.cards.find((c) => c.id === cardId);
      if (card) Object.assign(card, fields);
    });
  }

  function deleteCard(id, cardId) {
    return update(id, (deck) => {
      deck.cards = deck.cards.filter((c) => c.id !== cardId);
    });
  }

  Format.DeckStore = {
    STORAGE_KEY,
    getAll,
    getDeck,
    createDeck,
    renameDeck,
    deleteDeck,
    addCard,
    updateCard,
    deleteCard,
  };
})();
