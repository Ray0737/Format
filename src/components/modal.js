// Format — "New document" modal: template picker + name input

window.Format = window.Format || {};

(function () {
  const TYPES = [
    { type: "blank", label: "Blank A4", icon: "blank" },
    { type: "pdf", label: "PDF Import", icon: "pdf" },
  ];

  let selectedType = "blank";

  function renderTypeGrid() {
    const grid = document.getElementById("new-doc-types");
    if (!grid) return;

    grid.innerHTML = "";
    TYPES.forEach(({ type, label, icon }) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "modal__type-card";
      card.dataset.type = type;
      card.classList.toggle("is-selected", type === selectedType);
      card.innerHTML = `
        <span class="modal__type-icon">${Format.icons[icon]}</span>
        <span class="modal__type-label">${label}</span>
      `;
      grid.appendChild(card);
    });
  }

  function selectType(type) {
    selectedType = type;
    document.querySelectorAll("#new-doc-types .modal__type-card").forEach((card) => {
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

      const typeCard = event.target.closest("#new-doc-types .modal__type-card");
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