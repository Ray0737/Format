// Format — document card renderer

window.Format = window.Format || {};

(function () {
  const TYPE_META = {
    blank: { label: "Blank A4", icon: "blank" },
    pdf: { label: "PDF Import", icon: "pdf" },
    // Legacy fallbacks for any pre-existing docs of removed types.
    table: { label: "Document", icon: "blank" },
    todo: { label: "Document", icon: "blank" },
    flashcard: { label: "Document", icon: "blank" },
  };

  function render(doc) {
    const meta = TYPE_META[doc.type] ?? TYPE_META.blank;
    const card = document.createElement("div");
    card.className =
      "doc-card group relative flex flex-col gap-3 rounded-[10px] border border-border bg-white p-4 transition-shadow hover:shadow-md";

    card.innerHTML = `
      <a href="#editor" data-view="editor" data-doc-id="${doc.id}" class="absolute inset-0 z-0" aria-label="Open ${Format.escapeHtml(doc.title || "Untitled")}"></a>
      <button type="button" data-action="duplicate-doc" data-doc-id="${doc.id}" class="doc-card__duplicate absolute right-10 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-navy-50 hover:text-navy-800" title="Duplicate document" aria-label="Duplicate document">${Format.icons.copy}</button>
      <button type="button" data-action="delete-doc" data-doc-id="${doc.id}" class="doc-card__delete absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-navy-50 hover:text-danger" title="Delete document" aria-label="Delete document">${Format.icons.trash}</button>
      <div class="pointer-events-none flex flex-col gap-3">
        <div class="doc-card__icon flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy-800">${Format.icons[meta.icon]}</div>
        <h3 class="text-card-title truncate text-navy-800">${Format.escapeHtml(doc.title || "Untitled")}</h3>
        <div class="mt-auto flex items-center justify-between text-xs text-muted">
          <span class="doc-card__badge inline-flex items-center rounded-full bg-navy-50 px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-navy-800">${meta.label}</span>
          <span>${Format.formatDate(doc.updatedAt)}</span>
        </div>
      </div>
    `;

    return card;
  }

  function renderNew() {
    const card = document.createElement("button");
    card.type = "button";
    card.dataset.action = "new-doc";
    card.className =
      "doc-card doc-card--new flex min-h-[148px] flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-border text-muted transition-colors hover:border-amber hover:text-amber";

    card.innerHTML = `
      <span class="flex h-8 w-8 items-center justify-center">${Format.icons.plus}</span>
      <span class="text-sm font-medium">New document</span>
    `;

    return card;
  }

  Format.DocCard = { render, renderNew, TYPE_META };
})();