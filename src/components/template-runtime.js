// Format — runtime behaviors for template content (Phase 9)
//
// Wires interactive behavior onto template-generated markup living inside the
// contenteditable .a4-page:
//   • To-Do        — checkbox strike-through, Enter adds a row, Backspace
//                    removes an empty row
//   • Table        — Tab / Shift+Tab moves between cells; Tab in the last cell
//                    appends a new row
//   • Flashcard    — 3D flip, prev/next, add/delete, live counter
//   • PDF Import    — PDF.js renders each page into its own A4 background page
//
// All mutations flag the document unsaved via Format.Editor.markUnsaved().

window.Format = window.Format || {};

(function () {
  function canvas() {
    return document.getElementById("editor-canvas");
  }

  function markUnsaved() {
    Format.Editor?.markUnsaved?.();
  }

  // The element at the caret. With nested contenteditable (cells / list text
  // inside an editable .a4-page), the keydown event.target is the outer host,
  // so we resolve the actual context from the current selection instead.
  function caretEl() {
    const sel = window.getSelection();
    const node = sel && sel.rangeCount ? sel.getRangeAt(0).startContainer : null;
    if (!node) return null;
    return node.nodeType === 1 ? node : node.parentElement;
  }

  // ── To-Do lists ──────────────────────────────────────────────────────
  function onTodoClick(event) {
    const checkbox = event.target.closest('.todo-list input[type="checkbox"]');
    if (!checkbox) return;
    const item = checkbox.closest(".todo-item");
    item?.classList.toggle("is-done", checkbox.checked);
    markUnsaved();
  }

  function newTodoItem() {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.innerHTML = '<input type="checkbox"><span class="todo-text" contenteditable="true"></span>';
    return li;
  }

  function onTodoKeydown(event) {
    if (event.key !== "Enter" && event.key !== "Backspace") return;
    const text = caretEl()?.closest(".todo-list .todo-text");
    if (!text) return;
    const item = text.closest(".todo-item");
    const list = text.closest(".todo-list");

    if (event.key === "Enter") {
      event.preventDefault();
      const li = newTodoItem();
      item.after(li);
      li.querySelector(".todo-text").focus();
      markUnsaved();
    } else if (event.key === "Backspace" && text.textContent.trim() === "") {
      const prev = item.previousElementSibling;
      if (prev && list.children.length > 1) {
        event.preventDefault();
        item.remove();
        const prevText = prev.querySelector(".todo-text");
        prevText?.focus();
        // place caret at end
        const range = document.createRange();
        range.selectNodeContents(prevText);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        markUnsaved();
      }
    }
  }

  // ── Table cell navigation ────────────────────────────────────────────
  function onTableKeydown(event) {
    if (event.key !== "Tab") return;
    const cell = caretEl()?.closest("td, th");
    const table = cell?.closest("table");
    if (!cell || !table) return;

    event.preventDefault();
    event.stopPropagation(); // don't also trigger editor-cmd's Tab→indent
    const cells = Array.from(table.querySelectorAll("td, th"));
    const index = cells.indexOf(cell);

    let target;
    if (event.shiftKey) {
      target = cells[index - 1];
    } else {
      target = cells[index + 1];
      if (!target) {
        // Last cell: append a new row mirroring the final row's cell count.
        const lastRow = table.querySelector("tbody tr:last-child") || cell.closest("tr");
        const colCount = lastRow.children.length;
        const tr = document.createElement("tr");
        for (let c = 0; c < colCount; c++) {
          const td = document.createElement("td");
          td.contentEditable = "true";
          td.innerHTML = "<br>";
          tr.appendChild(td);
        }
        (table.querySelector("tbody") || table).appendChild(tr);
        target = tr.firstElementChild;
        markUnsaved();
      }
    }

    if (target) {
      target.focus();
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  // ── PDF import ───────────────────────────────────────────────────────
  let pdfLibPromise = null;
  function loadPdfLib() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfLibPromise) return pdfLibPromise;
    pdfLibPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "lib/pdf.min.js";
      script.onload = () => {
        const lib = window.pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc = "lib/pdf.worker.min.js";
          resolve(lib);
        } else {
          reject(new Error("pdf.js failed to expose pdfjsLib"));
        }
      };
      script.onerror = () => reject(new Error("Failed to load lib/pdf.min.js"));
      document.head.appendChild(script);
    });
    return pdfLibPromise;
  }

  async function importPdf(file, placeholder) {
    const container = canvas();
    if (!container || !file) return;
    placeholder.classList.add("is-loading");
    const title = placeholder.querySelector(".pdf-import-title");
    if (title) title.textContent = "Rendering PDF…";

    try {
      const lib = await loadPdfLib();
      const data = await file.arrayBuffer();
      const pdf = await lib.getDocument({ data }).promise;

      // Each page is rendered at its ACTUAL size: PDF units are points
      // (1/72in), converted to CSS px at 96dpi (× 96/72). Whatever orientation
      // and size the source page is — portrait, landscape, 16:9 slide — the
      // imported page matches it exactly (no A4 frame).
      const PT_TO_PX = 96 / 72;
      const pages = [];
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const w = Math.round(base.width * PT_TO_PX);
        const h = Math.round(base.height * PT_TO_PX);
        const viewport = page.getViewport({ scale: PT_TO_PX * 2 }); // 2× for crispness
        const render = document.createElement("canvas");
        render.width = viewport.width;
        render.height = viewport.height;
        await page.render({ canvasContext: render.getContext("2d"), viewport }).promise;
        pages.push({ url: render.toDataURL("image/png"), w, h });
      }

      Format.Editor.renderPdfPages(pages);
    } catch (err) {
      console.error("PDF import failed", err);
      placeholder.classList.remove("is-loading");
      if (title) title.textContent = "Could not read that PDF";
      Format.Toast?.show?.("PDF import failed — the file may be corrupt.", "error");
    }
  }

  function onPdfChange(event) {
    const input = event.target.closest('.pdf-import-placeholder input[type="file"]');
    if (!input) return;
    const file = input.files?.[0];
    const placeholder = input.closest(".pdf-import-placeholder");
    if (file && placeholder) importPdf(file, placeholder);
  }

  // Clicking anywhere on the upload box opens the file picker (the label/input
  // already handle their own clicks, so skip those to avoid double-opening).
  function onPdfBoxClick(event) {
    const box = event.target.closest(".pdf-import-placeholder");
    if (!box || event.target.closest("label, input")) return;
    box.querySelector('input[type="file"]')?.click();
  }

  function init() {
    const root = canvas();
    if (!root) return;

    root.addEventListener("click", (event) => {
      onTodoClick(event);
      onPdfBoxClick(event);
    });
    root.addEventListener("keydown", (event) => {
      onTodoKeydown(event);
      onTableKeydown(event);
    });
    root.addEventListener("change", onPdfChange);
  }

  document.addEventListener("DOMContentLoaded", init);

  Format.TemplateRuntime = {};
})();
