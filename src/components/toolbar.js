// Format — floating editor toolbar (Phase 5)
//
// Renders a Canva-style dark navy pill below the editor topbar. All commands
// run through Format.EditorCmd (execCommand wrappers). Because clicking a
// toolbar control normally steals DOM focus from the contenteditable .a4-page
// (collapsing the selection before execCommand can act on it), this module
// tracks the last selection range made inside a page and restores it before
// running any command.

window.Format = window.Format || {};

(function () {
  // Font choices kept deliberately minimal: Inter (default UI font), Arial
  // and Times New Roman (universal Word-style options), and Sarabun for
  // Thai text. Sarabun is appended as a fallback on every option (its
  // unicode-range only covers Thai script, so it has no effect on Latin
  // text) so Thai glyphs always render correctly regardless of font choice.
  const FONT_FAMILIES = [
    { label: "Inter", value: "Inter, Sarabun, sans-serif" },
    { label: "Arial", value: "Arial, Sarabun, sans-serif" },
    { label: "Times New Roman", value: "'Times New Roman', Sarabun, serif" },
    { label: "Sarabun", value: "Sarabun, Inter, sans-serif" },
  ];

  const TEXT_COLORS = ["#051224", "#5a7080", "#c0392b", "#de7914", "#1a7a4a", "#0a2040", "#ffffff"];
  const HIGHLIGHT_COLORS = ["#fff3a3", "#ffd6a5", "#caffbf", "#a0c4ff", "#ffadad", "#d0bfff", "transparent"];

  const STATE_COMMANDS = [
    "bold",
    "italic",
    "underline",
    "strikeThrough",
    "subscript",
    "superscript",
    "justifyLeft",
    "justifyCenter",
    "justifyRight",
    "justifyFull",
    "insertUnorderedList",
    "insertOrderedList",
  ];

  const TABLE_GRID_SIZE = 8;

  let savedRange = null;

  function icon(name) {
    return Format.icons[name] ?? "";
  }

  function colorSwatches(colors, attr) {
    return colors
      .map((c) => {
        if (c === "transparent") {
          return `<button type="button" class="toolbar-color-swatch is-none" data-${attr}="transparent" title="None"></button>`;
        }
        return `<button type="button" class="toolbar-color-swatch" style="background:${c}" data-${attr}="${c}" title="${c}"></button>`;
      })
      .join("");
  }

  function render() {
    const root = document.getElementById("editor-toolbar");
    if (!root) return;

    const fontOptions = FONT_FAMILIES.map((f) => `<option value="${f.value}">${f.label}</option>`).join("");

    let tableCells = "";
    for (let r = 1; r <= TABLE_GRID_SIZE; r++) {
      for (let c = 1; c <= TABLE_GRID_SIZE; c++) {
        tableCells += `<div class="toolbar-table-cell" data-row="${r}" data-col="${c}"></div>`;
      }
    }

    root.innerHTML = `
      <div class="toolbar-group">
        <select class="toolbar-select" id="toolbar-font-family" title="Font family">${fontOptions}</select>
      </div>
      <div class="toolbar-group">
        <button type="button" class="toolbar-btn" data-cmd="font-decrease" title="Decrease font size">&minus;</button>
        <input type="number" class="toolbar-fontsize" id="toolbar-font-size" value="16" min="8" max="96" title="Font size">
        <button type="button" class="toolbar-btn" data-cmd="font-increase" title="Increase font size">+</button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <button type="button" class="toolbar-btn" data-cmd="bold" style="font-weight:800" title="Bold (Ctrl+B)">B</button>
        <button type="button" class="toolbar-btn" data-cmd="italic" style="font-style:italic" title="Italic (Ctrl+I)">I</button>
        <button type="button" class="toolbar-btn" data-cmd="underline" style="text-decoration:underline" title="Underline (Ctrl+U)">U</button>
        <button type="button" class="toolbar-btn" data-cmd="strikeThrough" style="text-decoration:line-through" title="Strikethrough">S</button>
        <button type="button" class="toolbar-btn" data-cmd="subscript" title="Subscript">X<sub>2</sub></button>
        <button type="button" class="toolbar-btn" data-cmd="superscript" title="Superscript">X<sup>2</sup></button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <button type="button" class="toolbar-btn" data-cmd="case" title="Change case">Aa</button>
        <button type="button" class="toolbar-btn" data-cmd="clear" style="text-decoration:line-through" title="Clear formatting">Tx</button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <button type="button" class="toolbar-btn" data-cmd="justifyLeft" title="Align left">${icon("align-left")}</button>
        <button type="button" class="toolbar-btn" data-cmd="justifyCenter" title="Align center">${icon("align-center")}</button>
        <button type="button" class="toolbar-btn" data-cmd="justifyRight" title="Align right">${icon("align-right")}</button>
        <button type="button" class="toolbar-btn" data-cmd="justifyFull" title="Justify">${icon("align-justify")}</button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <button type="button" class="toolbar-btn" data-cmd="insertUnorderedList" title="Bullet list">${icon("list-bullet")}</button>
        <button type="button" class="toolbar-btn" data-cmd="insertOrderedList" title="Numbered list">${icon("list-numbered")}</button>
        <button type="button" class="toolbar-btn" data-cmd="checklist" title="Checklist">${icon("todo")}</button>
        <button type="button" class="toolbar-btn" data-cmd="outdent" title="Decrease indent">${icon("outdent")}</button>
        <button type="button" class="toolbar-btn" data-cmd="indent" title="Increase indent">${icon("indent")}</button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <div style="position:relative">
          <button type="button" class="toolbar-btn toolbar-btn--color" data-popover="color" title="Text color">
            <span>A</span><span class="toolbar-color-bar" id="toolbar-color-bar" style="background:#051224"></span>
          </button>
          <div class="toolbar-popover" id="toolbar-color-popover">
            <div class="toolbar-color-grid">${colorSwatches(TEXT_COLORS, "color")}</div>
          </div>
        </div>
        <div style="position:relative">
          <button type="button" class="toolbar-btn toolbar-btn--color" data-popover="highlight" title="Highlight color">
            ${icon("highlighter")}<span class="toolbar-color-bar" id="toolbar-highlight-bar" style="background:#fff3a3"></span>
          </button>
          <div class="toolbar-popover" id="toolbar-highlight-popover">
            <div class="toolbar-color-grid">${colorSwatches(HIGHLIGHT_COLORS, "highlight")}</div>
          </div>
        </div>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <div style="position:relative">
          <button type="button" class="toolbar-btn" data-popover="table" title="Insert table">${icon("table")}</button>
          <div class="toolbar-popover" id="toolbar-table-popover">
            <div class="toolbar-table-grid" id="toolbar-table-grid">${tableCells}</div>
            <div class="toolbar-table-label" id="toolbar-table-label">Insert table</div>
          </div>
        </div>
        <button type="button" class="toolbar-btn" data-cmd="image" title="Insert image">${icon("image")}</button>
        <input type="file" id="toolbar-image-input" accept="image/*" class="hidden">
        <div style="position:relative">
          <button type="button" class="toolbar-btn" data-popover="shapes" title="Insert shape">${icon("shapes")}</button>
          <div class="toolbar-popover toolbar-popover--shapes" id="toolbar-shapes-popover">
            <button type="button" class="toolbar-shape-option" data-shape="rect" title="Rectangle">${icon("shape-rect")}</button>
            <button type="button" class="toolbar-shape-option" data-shape="ellipse" title="Circle">${icon("shape-circle")}</button>
            <button type="button" class="toolbar-shape-option" data-shape="line" title="Line">${icon("shape-line")}</button>
            <button type="button" class="toolbar-shape-option" data-shape="triangle" title="Triangle">${icon("shape-triangle")}</button>
          </div>
        </div>
        <button type="button" class="toolbar-btn" data-cmd="equation" title="Insert equation">${icon("sigma")}</button>
        <button type="button" class="toolbar-btn" data-cmd="pagebreak" title="Insert page break">${icon("page-break")}</button>
      </div>
    `;
  }

  function isEditorActive() {
    const view = document.getElementById("view-editor");
    return !!view && !view.classList.contains("hidden");
  }

  function getFocusedPage() {
    return document.activeElement?.closest(".a4-page") ?? null;
  }

  function saveRange() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const node = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
    if (node?.closest(".a4-page")) {
      savedRange = range.cloneRange();
    }
  }

  function focusPageAndRestore() {
    if (!savedRange) return;
    const node = savedRange.startContainer.nodeType === 1 ? savedRange.startContainer : savedRange.startContainer.parentElement;
    const page = node?.closest(".a4-page");
    page?.focus();

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(savedRange);
  }

  function closePopovers() {
    document.querySelectorAll("#editor-toolbar .toolbar-popover.is-open").forEach((p) => p.classList.remove("is-open"));
  }

  function togglePopover(name) {
    const popover = document.getElementById(`toolbar-${name}-popover`);
    if (!popover) return;
    const wasOpen = popover.classList.contains("is-open");
    closePopovers();
    if (!wasOpen) popover.classList.add("is-open");
  }

  function syncState() {
    if (!getFocusedPage()) return;

    const root = document.getElementById("editor-toolbar");
    if (!root) return;

    STATE_COMMANDS.forEach((cmd) => {
      const btn = root.querySelector(`[data-cmd="${cmd}"]`);
      btn?.classList.toggle("is-active", Format.EditorCmd.queryState(cmd));
    });

    const fontSelect = document.getElementById("toolbar-font-family");
    if (fontSelect) {
      const value = Format.EditorCmd.queryValue("fontName").replace(/['"]/g, "").toLowerCase();
      const match = FONT_FAMILIES.find((f) => value && f.value.toLowerCase().startsWith(value));
      if (match) fontSelect.value = match.value;
    }

    const fontSizeInput = document.getElementById("toolbar-font-size");
    if (fontSizeInput) {
      const selection = window.getSelection();
      const node = selection?.anchorNode;
      const el = node?.nodeType === 1 ? node : node?.parentElement;
      if (el) {
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (!Number.isNaN(size)) fontSizeInput.value = Math.round(size);
      }
    }
  }

  function setFontSize(px) {
    const clamped = Math.max(8, Math.min(96, px));
    const input = document.getElementById("toolbar-font-size");
    if (input) input.value = clamped;
    focusPageAndRestore();
    Format.EditorCmd.setFontSize(clamped);
    syncState();
  }

  function handleClick(event) {
    const popoverToggle = event.target.closest("[data-popover]");
    if (popoverToggle) {
      togglePopover(popoverToggle.dataset.popover);
      return;
    }

    if (!event.target.closest(".toolbar-popover")) {
      closePopovers();
    }

    const colorSwatch = event.target.closest("[data-color]");
    if (colorSwatch) {
      const value = colorSwatch.dataset.color;
      focusPageAndRestore();
      Format.EditorCmd.exec("foreColor", value);
      document.getElementById("toolbar-color-bar").style.background = value;
      syncState();
      return;
    }

    const highlightSwatch = event.target.closest("[data-highlight]");
    if (highlightSwatch) {
      const value = highlightSwatch.dataset.highlight;
      focusPageAndRestore();
      Format.EditorCmd.exec("hiliteColor", value);
      document.getElementById("toolbar-highlight-bar").style.background = value;
      syncState();
      return;
    }

    const tableCell = event.target.closest(".toolbar-table-cell");
    if (tableCell) {
      focusPageAndRestore();
      Format.EditorCmd.insertTable(Number(tableCell.dataset.row), Number(tableCell.dataset.col));
      syncState();
      return;
    }

    const shapeOption = event.target.closest("[data-shape]");
    if (shapeOption) {
      focusPageAndRestore();
      Format.EditorCmd.insertShape(shapeOption.dataset.shape);
      closePopovers();
      return;
    }

    const btn = event.target.closest("[data-cmd]");
    if (!btn) return;

    const cmd = btn.dataset.cmd;
    const fontSizeInput = document.getElementById("toolbar-font-size");

    switch (cmd) {
      case "font-decrease":
        setFontSize((Number(fontSizeInput?.value) || 16) - 1);
        return;
      case "font-increase":
        setFontSize((Number(fontSizeInput?.value) || 16) + 1);
        return;
      case "case":
        focusPageAndRestore();
        Format.EditorCmd.changeCase();
        syncState();
        return;
      case "clear":
        focusPageAndRestore();
        Format.EditorCmd.clearFormatting();
        syncState();
        return;
      case "image":
        document.getElementById("toolbar-image-input")?.click();
        return;
      case "pagebreak":
        focusPageAndRestore();
        Format.Editor?.insertPageBreak();
        return;
      case "equation":
        focusPageAndRestore();
        Format.Equation?.open();
        return;
      case "checklist":
        focusPageAndRestore();
        Format.EditorCmd.insertChecklist();
        return;
      default:
        focusPageAndRestore();
        Format.EditorCmd.exec(cmd);
        syncState();
    }
  }

  function init() {
    render();

    const root = document.getElementById("editor-toolbar");
    if (!root) return;

    root.addEventListener("mousedown", (event) => {
      if (event.target.closest("select, input")) return;
      event.preventDefault();
    });

    root.addEventListener("click", handleClick);

    document.getElementById("toolbar-font-family")?.addEventListener("change", (event) => {
      focusPageAndRestore();
      Format.EditorCmd.exec("fontName", event.target.value);
      syncState();
    });

    document.getElementById("toolbar-font-size")?.addEventListener("change", (event) => {
      setFontSize(Number(event.target.value) || 16);
    });

    const tableGrid = document.getElementById("toolbar-table-grid");
    const tableLabel = document.getElementById("toolbar-table-label");
    tableGrid?.addEventListener("mouseover", (event) => {
      const cell = event.target.closest(".toolbar-table-cell");
      if (!cell) return;
      const row = Number(cell.dataset.row);
      const col = Number(cell.dataset.col);
      tableGrid.querySelectorAll(".toolbar-table-cell").forEach((c) => {
        c.classList.toggle("is-hover", Number(c.dataset.row) <= row && Number(c.dataset.col) <= col);
      });
      if (tableLabel) tableLabel.textContent = `${row} x ${col}`;
    });
    tableGrid?.addEventListener("mouseleave", () => {
      tableGrid.querySelectorAll(".toolbar-table-cell.is-hover").forEach((c) => c.classList.remove("is-hover"));
      if (tableLabel) tableLabel.textContent = "Insert table";
    });

    document.getElementById("toolbar-image-input")?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) {
        focusPageAndRestore();
        Format.EditorCmd.insertImageFile(file);
      }
      event.target.value = "";
      closePopovers();
    });

    document.addEventListener("mousedown", (event) => {
      if (!event.target.closest("#editor-toolbar")) closePopovers();
    });

    document.addEventListener("selectionchange", () => {
      if (!isEditorActive()) return;
      saveRange();
      syncState();
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  Format.Toolbar = { render };
})();