// Format — LaTeX equation editor (Phase 13)
//
// Insert Equation (toolbar Σ button) opens a modal with a LaTeX input and a
// live KaTeX preview. Confirming inserts the rendered math as an inline,
// non-editable .doc-equation span carrying the source in data-latex, so it can
// be re-opened and edited by clicking it. KaTeX is lazy-loaded from lib/ on
// first use — no CDN.

window.Format = window.Format || {};

(function () {
  let katexPromise = null;
  let savedRange = null;
  let editingEl = null; // the .doc-equation being edited, or null when inserting

  function loadKatex() {
    if (window.katex) return Promise.resolve(window.katex);
    if (katexPromise) return katexPromise;
    katexPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "lib/katex.min.js";
      script.onload = () => (window.katex ? resolve(window.katex) : reject(new Error("KaTeX missing")));
      script.onerror = () => reject(new Error("Failed to load lib/katex.min.js"));
      document.head.appendChild(script);
    });
    return katexPromise;
  }

  function els() {
    return {
      modal: document.getElementById("equation-modal"),
      input: document.getElementById("equation-input"),
      preview: document.getElementById("equation-preview"),
      error: document.getElementById("equation-error"),
    };
  }

  function renderPreview() {
    const { input, preview, error } = els();
    if (!input || !preview) return;
    const latex = input.value.trim();
    if (!latex) {
      preview.innerHTML = '<span class="equation-empty">Preview appears here</span>';
      error.textContent = "";
      return;
    }
    try {
      window.katex.render(latex, preview, { throwOnError: true, displayMode: true });
      error.textContent = "";
    } catch (err) {
      error.textContent = err.message.replace(/^KaTeX parse error:\s*/, "");
    }
  }

  function captureRange() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
    if (node?.closest(".a4-page")) savedRange = range.cloneRange();
  }

  function open(existingEl) {
    editingEl = existingEl || null;
    if (!editingEl) captureRange();

    loadKatex()
      .then(() => {
        const { modal, input } = els();
        if (!modal) return;
        input.value = editingEl ? editingEl.dataset.latex || "" : "";
        modal.classList.remove("hidden");
        renderPreview();
        input.focus();
      })
      .catch((err) => {
        console.error(err);
        Format.Toast?.show?.("Could not load the equation engine.", "error");
      });
  }

  function close() {
    els().modal?.classList.add("hidden");
    editingEl = null;
  }

  function buildEquationSpan(latex) {
    const span = document.createElement("span");
    span.className = "doc-equation";
    span.contentEditable = "false";
    span.dataset.latex = latex;
    window.katex.render(latex, span, { throwOnError: false, displayMode: false });
    return span;
  }

  function insert() {
    const latex = els().input?.value.trim();
    if (!latex) return;

    let span;
    try {
      span = buildEquationSpan(latex);
    } catch (err) {
      console.error(err);
      Format.Toast?.show?.("Invalid LaTeX.", "error");
      return;
    }

    if (editingEl) {
      editingEl.replaceWith(span);
    } else {
      const page = (savedRange &&
        (savedRange.startContainer.nodeType === 1
          ? savedRange.startContainer
          : savedRange.startContainer.parentElement
        )?.closest(".a4-page")) || document.querySelector("#editor-canvas .a4-page");
      if (savedRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
        savedRange.deleteContents();
        savedRange.insertNode(span);
        // Move caret after the inserted equation.
        const after = document.createRange();
        after.setStartAfter(span);
        after.collapse(true);
        sel.removeAllRanges();
        sel.addRange(after);
      } else if (page) {
        page.appendChild(span);
      }
    }

    Format.Editor?.markUnsaved?.();
    close();
  }

  function init() {
    const input = document.getElementById("equation-input");
    input?.addEventListener("input", renderPreview);
    input?.addEventListener("keydown", (event) => {
      // Ctrl+Enter inserts; plain Enter adds a newline in the LaTeX source.
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        insert();
      }
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest('[data-action="equation-insert"]')) {
        insert();
        return;
      }
      if (event.target.closest('[data-action="equation-close"]')) {
        close();
        return;
      }
      // Click an existing equation in a page → edit it.
      const eq = event.target.closest(".doc-equation");
      if (eq && eq.closest(".a4-page") && !Format.Ink?.isEnabled?.()) {
        open(eq);
      }
    });

    document.getElementById("equation-modal")?.addEventListener("click", (event) => {
      if (event.target.id === "equation-modal") close();
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  Format.Equation = { open };
})();
