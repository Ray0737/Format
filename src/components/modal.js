// Format — "New document" modal: template picker + name input

window.Format = window.Format || {};

(function () {
  const TYPES = [
    { type: "blank", label: "Blank A4", icon: "blank", desc: "Empty page, start writing" },
    { type: "pdf", label: "PDF Import", icon: "pdf", desc: "Annotate a PDF" },
  ];

  const CHECK_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  let selectedType = "blank";

  function renderTypeGrid() {
    const grid = document.getElementById("new-doc-types");
    if (!grid) return;

    grid.innerHTML = "";
    TYPES.forEach(({ type, label, icon, desc }) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "picker-card";
      card.dataset.type = type;
      card.classList.toggle("is-selected", type === selectedType);
      card.innerHTML = `
        <span class="picker-card__check">${CHECK_SVG}</span>
        <span class="picker-card__icon">${Format.icons[icon]}</span>
        <span class="picker-card__title">${label}</span>
        <span class="picker-card__desc">${desc}</span>
      `;
      grid.appendChild(card);
    });
  }

  function selectType(type) {
    selectedType = type;
    document.querySelectorAll("#new-doc-types .picker-card").forEach((card) => {
      card.classList.toggle("is-selected", card.dataset.type === type);
    });
  }

  function open(presetType) {
    selectedType = TYPES.some((t) => t.type === presetType) ? presetType : "blank";
    renderTypeGrid();

    const input = document.getElementById("new-doc-name");
    if (input) input.value = "";

    document.getElementById("new-doc-modal")?.classList.remove("hidden");
    input?.focus();
  }

  function close() {
    document.getElementById("new-doc-modal")?.classList.add("hidden");
  }

  function isOpen() {
    return !document.getElementById("new-doc-modal")?.classList.contains("hidden");
  }

  function createAndOpenDoc() {
    const input = document.getElementById("new-doc-name");
    const doc = Format.DocStore.createDoc(selectedType, input?.value ?? "");
    close();
    Format.HomeView?.renderDocs("");
    Format.Editor?.open(doc.id);
    return doc;
  }

  function init() {
    renderTypeGrid();

    document.addEventListener("click", (event) => {
      const newDocTrigger = event.target.closest('[data-action="new-doc"]');
      if (newDocTrigger) {
        event.preventDefault();
        open();
        return;
      }

      const templateCard = event.target.closest(".template-card[data-template]");
      if (templateCard) {
        open(templateCard.dataset.template);
        return;
      }

      const typeCard = event.target.closest("#new-doc-types .picker-card");
      if (typeCard) {
        selectType(typeCard.dataset.type);
        return;
      }

      if (event.target.closest("#new-doc-create")) {
        createAndOpenDoc();
        return;
      }

      if (event.target.closest('[data-action="close-modal"]') || event.target.id === "new-doc-modal") {
        close();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) close();
      if (event.key === "Enter" && isOpen() && document.activeElement?.id === "new-doc-name") {
        createAndOpenDoc();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  Format.Modal = { open, close };
})();