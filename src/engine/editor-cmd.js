// Format — editor keyboard shortcut layer + toolbar command helpers
// (execCommand wrappers)
//
// Ctrl+Z/Y/Shift+Z (undo/redo), Ctrl+A (select all), Ctrl+B/I/U (handled
// natively by contenteditable in Chromium too, but wired explicitly here so
// the same `exec` helper can be reused by the Phase 5 toolbar), and
// Ctrl+C/V/X/P are left to the browser's default behavior.

window.Format = window.Format || {};

(function () {
  const TOGGLE_COMMANDS = {
    b: "bold",
    i: "italic",
    u: "underline",
  };

  function exec(command, value = null) {
    document.execCommand(command, false, value);
  }

  function queryState(command) {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  }

  function queryValue(command) {
    try {
      return document.queryCommandValue(command);
    } catch {
      return "";
    }
  }

  // execCommand("fontSize") only supports legacy sizes 1-7, so we use it to
  // wrap the selection in <font size="7"> tags, then swap that attribute for
  // an inline px style — a standard workaround for arbitrary font sizes.
  function setFontSize(px) {
    exec("fontSize", "7");
    const page = document.activeElement?.closest(".a4-page");
    const scope = page || document;
    scope.querySelectorAll('font[size="7"]').forEach((el) => {
      el.removeAttribute("size");
      el.style.fontSize = `${px}px`;
    });
  }

  // Cycles selected text through UPPERCASE -> lowercase -> Title Case.
  function changeCase() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString();
    let next;
    if (text === text.toUpperCase()) {
      next = text.toLowerCase();
    } else if (text === text.toLowerCase()) {
      next = text.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
    } else {
      next = text.toUpperCase();
    }

    exec("insertText", next);
  }

  function clearFormatting() {
    exec("removeFormat");
    exec("unlink");
  }

  // Inserts an interactive checklist at the caret. Behavior (checkbox strike,
  // Enter adds a row, Backspace removes an empty row) is wired globally by
  // Format.TemplateRuntime, which listens on the editor canvas.
  function insertChecklist() {
    const page = document.activeElement?.closest(".a4-page");
    if (!page) return;
    const html =
      '<ul class="todo-list" data-todo="true">' +
      '<li class="todo-item"><input type="checkbox"><span class="todo-text" contenteditable="true">New item</span></li>' +
      "</ul><p><br></p>";
    exec("insertHTML", html);
    Format.Editor?.markUnsaved?.();
  }

  // Inserts the table as a draggable, lockable .doc-element wrapper
  // (absolutely positioned within the .a4-page). The wrapper itself is
  // contenteditable="false" so it can be dragged like an image, but the
  // <table> inside is contenteditable="true" (an "editable island") so cell
  // content can still be typed. Column/row resizer handles are added to the
  // first row/column cells for use by Format.TableTools.
  function insertTable(rows, cols) {
    const page = document.activeElement?.closest(".a4-page");
    if (!page) return;

    const cellWidth = 80;
    const cellHeight = 32;

    let colgroup = "<colgroup>";
    for (let c = 0; c < cols; c++) colgroup += `<col style="width:${cellWidth}px">`;
    colgroup += "</colgroup>";

    let body = "<tbody>";
    for (let r = 0; r < rows; r++) {
      body += `<tr style="height:${cellHeight}px">`;
      for (let c = 0; c < cols; c++) {
        let handles = "";
        if (r === 0) handles += `<span class="col-resizer" data-col="${c}" title="Resize column"></span>`;
        if (c === 0) handles += `<span class="row-resizer" data-row="${r}" title="Resize row"></span>`;
        body += `<td><br>${handles}</td>`;
      }
      body += "</tr>";
    }
    body += "</tbody>";

    const existing = page.querySelectorAll(".doc-element");
    const maxZ = Array.from(existing).reduce((max, el) => Math.max(max, Number(el.style.zIndex) || 1), 0);
    const offset = (existing.length % 6) * 16;

    const html = `<div class="doc-element doc-element--table" data-element="table" contenteditable="false" style="left:${48 + offset}px; top:${48 + offset}px; z-index:${maxZ + 1}"><span class="doc-element__handle" title="Drag to move">${Format.icons.move}</span><table class="doc-table" contenteditable="true">${colgroup}${body}</table></div>`;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    page.appendChild(wrapper.firstElementChild);
    Format.Editor?.markUnsaved?.();
  }

  // Inserts the image as a draggable, resizable .doc-element wrapper
  // (absolutely positioned within the .a4-page) so it can be moved, locked,
  // and re-stacked via the floating element panel.
  function insertImageFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const page = document.activeElement?.closest(".a4-page");
    if (!page) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const probe = new Image();
      probe.onload = () => {
        const existing = page.querySelectorAll(".doc-element");
        const maxZ = Array.from(existing).reduce((max, el) => Math.max(max, Number(el.style.zIndex) || 1), 0);
        const offset = (existing.length % 6) * 16;
        const width = 240;
        const height = Math.round(width * (probe.naturalHeight / probe.naturalWidth)) || width;
        const html = `<div class="doc-element" data-element="image" contenteditable="false" style="left:${48 + offset}px; top:${48 + offset}px; width:${width}px; height:${height}px; z-index:${maxZ + 1}"><span class="doc-element__handle" title="Drag to move">${Format.icons.move}</span><img src="${dataUrl}" alt="" draggable="false"><span class="doc-element__resize" title="Resize"></span></div>`;
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        page.appendChild(wrapper.firstElementChild);
        Format.Editor?.markUnsaved?.();
      };
      probe.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // Shape presets: each is an inline SVG (viewBox 0 0 100 100,
  // preserveAspectRatio="none" so it stretches to fill the .doc-element
  // wrapper exactly, allowing free non-uniform resize) plus a default
  // wrapper size. vector-effect="non-scaling-stroke" keeps the outline a
  // constant 3px regardless of how the shape is stretched.
  const SHAPE_PRESETS = {
    rect: { width: 160, height: 120, markup: '<rect x="3" y="3" width="94" height="94" rx="2"/>' },
    ellipse: { width: 140, height: 140, markup: '<ellipse cx="50" cy="50" rx="47" ry="47"/>' },
    line: { width: 160, height: 24, markup: '<line x1="0" y1="50" x2="100" y2="50"/>' },
    triangle: { width: 160, height: 130, markup: '<polygon points="50,3 97,97 3,97"/>' },
  };

  // Inserts a shape as a draggable, resizable, lockable .doc-element wrapper
  // (absolutely positioned within the .a4-page), reusing the same floating
  // element panel as images and tables.
  function insertShape(type) {
    const preset = SHAPE_PRESETS[type] || SHAPE_PRESETS.rect;
    const page = document.activeElement?.closest(".a4-page");
    if (!page) return;

    const existing = page.querySelectorAll(".doc-element");
    const maxZ = Array.from(existing).reduce((max, el) => Math.max(max, Number(el.style.zIndex) || 1), 0);
    const offset = (existing.length % 6) * 16;

    const fillStroke =
      type === "line"
        ? 'fill="none" stroke="var(--color-navy-800)"'
        : 'fill="var(--color-navy-100)" stroke="var(--color-navy-800)"';
    const svg = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" ${fillStroke} stroke-width="3" vector-effect="non-scaling-stroke">${preset.markup}</svg>`;

    const html = `<div class="doc-element doc-element--shape" data-element="shape" contenteditable="false" style="left:${48 + offset}px; top:${48 + offset}px; width:${preset.width}px; height:${preset.height}px; z-index:${maxZ + 1}"><span class="doc-element__handle" title="Drag to move">${Format.icons.move}</span>${svg}<span class="doc-element__resize" title="Resize"></span></div>`;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    page.appendChild(wrapper.firstElementChild);
    Format.Editor?.markUnsaved?.();
  }

  function handleKeydown(event) {
    if (!document.getElementById("view-editor") || document.getElementById("view-editor").classList.contains("hidden")) return;

    const ctrl = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (ctrl && key === "s") {
      event.preventDefault();
      Format.Editor?.save();
      return;
    }

    if (!event.target.closest(".a4-page")) return;

    if (ctrl && TOGGLE_COMMANDS[key]) {
      event.preventDefault();
      exec(TOGGLE_COMMANDS[key]);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      exec(event.shiftKey ? "outdent" : "indent");
    }
  }

  function init() {
    document.addEventListener("keydown", handleKeydown);
  }

  document.addEventListener("DOMContentLoaded", init);

  Format.EditorCmd = {
    exec,
    queryState,
    queryValue,
    setFontSize,
    changeCase,
    clearFormatting,
    insertChecklist,
    insertTable,
    insertImageFile,
    insertShape,
  };
})();