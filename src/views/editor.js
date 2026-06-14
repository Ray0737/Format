// Format — editor view: A4 page canvas, title rename, save/load

window.Format = window.Format || {};

(function () {
  const PAGE_BREAK = "<!--page-break-->";
  const NOMINAL_PAGE_HEIGHT = 1123;
  const PAGE_OVERFLOW_THRESHOLD = 60;
  const AUTOSAVE_DELAY = 1500;

  let currentDocId = null;
  let zoomLevel = 1;
  let saveTimer = null;

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3; // up to 300%

  // Zooms the whole page canvas via the Chromium-only `zoom` property
  // (acceptable since this app targets Edge/Chromium exclusively). The ink
  // layer is told the new zoom so it can re-rasterize its strokes at a higher
  // backing resolution and stay crisp instead of getting upscaled/blurry.
  function setZoom(level) {
    zoomLevel = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(level * 20) / 20));
    const canvas = document.getElementById("editor-canvas");
    if (canvas) canvas.style.zoom = zoomLevel;
    const label = document.getElementById("editor-zoom-level");
    if (label) label.textContent = `${Math.round(zoomLevel * 100)}%`;
    Format.Ink?.setZoom?.(zoomLevel);
  }

  function setStatus(text, unsaved = false) {
    const status = document.getElementById("editor-save-status");
    if (!status) return;
    status.textContent = text;
    status.classList.toggle("is-unsaved", unsaved);
  }

  function isPageEmpty(page) {
    return page.textContent.trim() === "" && !page.querySelector("table, img, input, .flashcard-deck");
  }

  function updateEmptyState(page) {
    page.classList.toggle("is-empty", isPageEmpty(page));
  }

  // A page whose content is an imported PDF page (`.pdf-bg` image) drops the
  // A4 white-card styling and takes the PDF page's actual pixel size, carried
  // on the image's data-w/data-h so it survives save → reload.
  function applyPdfSizing(page) {
    const img = page.querySelector(".pdf-bg");
    if (!img) return;
    page.classList.add("a4-page--pdf");
    const w = Number(img.dataset.w);
    const h = Number(img.dataset.h);
    if (w && h) {
      page.style.width = `${w}px`;
      page.style.minHeight = `${h}px`;
      page.style.height = `${h}px`;
    }
  }

  function createPage(html) {
    const page = document.createElement("div");
    page.className = "a4-page";
    page.contentEditable = "true";
    page.spellcheck = true;
    page.dataset.placeholder = "Start typing...";
    page.innerHTML = html ?? "<p><br></p>";
    applyPdfSizing(page);
    updateEmptyState(page);
    Format.Ink?.attachToPage(page);
    return page;
  }

  function renderPages(html) {
    const canvas = document.getElementById("editor-canvas");
    if (!canvas) return;
    canvas.innerHTML = "";
    (html || "").split(PAGE_BREAK).forEach((chunk) => {
      canvas.appendChild(createPage(chunk || "<p><br></p>"));
    });
  }

  // Replaces the canvas with one page per imported PDF page, each sized to the
  // PDF page's actual dimensions. `pages` = [{ url, w, h }].
  function renderPdfPages(pages) {
    const canvas = document.getElementById("editor-canvas");
    if (!canvas) return;
    canvas.innerHTML = "";
    pages.forEach(({ url, w, h }) => {
      canvas.appendChild(
        createPage(`<img class="pdf-bg" data-w="${w}" data-h="${h}" src="${url}" alt="" draggable="false">`)
      );
    });
    Format.Ink?.loadInto([]);
    scheduleSave();
  }

  // Serializes page HTML, stripping the ink <canvas> overlays (their strokes
  // are persisted separately via Format.Ink / DocStore.saveStrokes).
  function getContent() {
    const canvas = document.getElementById("editor-canvas");
    if (!canvas) return "";
    return Array.from(canvas.querySelectorAll(".a4-page"))
      .map((page) => {
        const clone = page.cloneNode(true);
        // Strip transient overlays so they're never persisted: ink canvas and
        // the dynamic selection/resize handles + selection state.
        clone.querySelectorAll(".ink-canvas, .doc-element__rz").forEach((c) => c.remove());
        clone.querySelectorAll(".doc-element.is-selected").forEach((el) => el.classList.remove("is-selected"));
        return clone.innerHTML;
      })
      .join(PAGE_BREAK);
  }

  function maybeAddPage(page) {
    const canvas = document.getElementById("editor-canvas");
    if (!canvas || page !== canvas.lastElementChild) return;
    if (page.scrollHeight > NOMINAL_PAGE_HEIGHT + PAGE_OVERFLOW_THRESHOLD) {
      canvas.appendChild(createPage());
    }
  }

  // Splits the current page at the caret: everything after the caret moves
  // into a new page inserted immediately after this one.
  function insertPageBreak() {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const anchor = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
    const page = anchor?.closest(".a4-page");
    if (!page) return;

    const tailRange = range.cloneRange();
    tailRange.selectNodeContents(page);
    tailRange.setStart(range.endContainer, range.endOffset);
    const tail = tailRange.extractContents();

    const newPage = createPage("");
    newPage.innerHTML = "";
    newPage.appendChild(tail);
    if (!newPage.textContent.trim() && !newPage.querySelector("table, img, input, .flashcard-deck")) {
      newPage.innerHTML = "<p><br></p>";
    }

    page.after(newPage);
    updateEmptyState(page);
    updateEmptyState(newPage);
    scheduleSave();

    newPage.focus();
    const newRange = document.createRange();
    newRange.selectNodeContents(newPage);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  // Performs the actual save: renames + persists content, with a brief
  // "Saving…" status while the IndexedDB write is in flight.
  function performSave() {
    if (!currentDocId) return;
    const docId = currentDocId;
    const titleInput = document.getElementById("editor-title");
    Format.DocStore.renameDoc(docId, titleInput?.value ?? "");
    setStatus("Saving…");
    const writes = [Format.DocStore.saveContent(docId, getContent())];
    const strokes = Format.Ink?.collectStrokes?.();
    if (strokes) writes.push(Format.DocStore.saveStrokes(docId, strokes));
    Promise.all(writes)
      .then(() => {
        if (currentDocId === docId) setStatus("Saved");
      })
      .catch(() => {
        setStatus("Save failed", true);
        Format.Toast?.show?.("Couldn't save — changes are still in the editor.", "error");
      });
  }

  // Marks the doc unsaved and (re)starts the 1.5s autosave debounce.
  function scheduleSave() {
    setStatus("Unsaved", true);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      performSave();
    }, AUTOSAVE_DELAY);
  }

  // Saves immediately, cancelling any pending debounced autosave.
  function save() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    performSave();
  }

  function open(docId) {
    const doc = Format.DocStore.getDoc(docId);
    if (!doc) return;

    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    currentDocId = docId;

    const titleInput = document.getElementById("editor-title");
    if (titleInput) titleInput.value = doc.title;

    setStatus("Saved");
    setZoom(1);
    Format.showView("editor");

    Format.Ink?.setEnabled(false);
    Promise.all([Format.DocStore.loadContent(docId), Format.DocStore.loadStrokes(docId)]).then(
      ([html, strokes]) => {
        renderPages(html);
        Format.Ink?.loadInto(strokes);
        document.getElementById("editor-canvas")?.querySelector(".a4-page")?.focus();
      }
    );
  }

  function close() {
    Format.Ink?.setEnabled(false);
    save();
    currentDocId = null;
    Format.HomeView?.renderDocs("");
    Format.showView("home");
  }

  function init() {
    const titleInput = document.getElementById("editor-title");

    titleInput?.addEventListener("input", () => scheduleSave());
    titleInput?.addEventListener("blur", () => {
      if (!currentDocId) return;
      save();
    });

    document.getElementById("editor-canvas")?.addEventListener("input", (event) => {
      const page = event.target.closest(".a4-page");
      if (!page) return;
      updateEmptyState(page);
      maybeAddPage(page);
      scheduleSave();
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest('[data-action="editor-back"]')) {
        close();
        return;
      }
      if (event.target.closest('[data-action="editor-save"]')) {
        save();
        return;
      }
      if (event.target.closest('[data-action="editor-study"]')) {
        Format.showView("study");
        return;
      }
      if (event.target.closest('[data-action="zoom-in"]')) {
        setZoom(zoomLevel + 0.1);
        return;
      }
      if (event.target.closest('[data-action="zoom-out"]')) {
        setZoom(zoomLevel - 0.1);
        return;
      }
      if (event.target.closest('[data-action="zoom-reset"]')) {
        setZoom(1);
      }
    });

    // Ctrl + wheel zoom (desktop), and pinch-to-zoom (tablet/touch).
    const canvasEl = document.getElementById("editor-canvas");
    canvasEl?.addEventListener(
      "wheel",
      (event) => {
        if (!event.ctrlKey) return;
        event.preventDefault();
        setZoom(zoomLevel + (event.deltaY < 0 ? 0.1 : -0.1));
      },
      { passive: false }
    );

    let pinchStartDist = 0;
    let pinchStartZoom = 1;
    canvasEl?.addEventListener("touchstart", (event) => {
      if (event.touches.length === 2) {
        pinchStartDist = touchDistance(event.touches);
        pinchStartZoom = zoomLevel;
      }
    });
    canvasEl?.addEventListener(
      "touchmove",
      (event) => {
        if (event.touches.length === 2 && pinchStartDist > 0) {
          event.preventDefault();
          const ratio = touchDistance(event.touches) / pinchStartDist;
          setZoom(pinchStartZoom * ratio);
        }
      },
      { passive: false }
    );
    canvasEl?.addEventListener("touchend", (event) => {
      if (event.touches.length < 2) pinchStartDist = 0;
    });
  }

  function touchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  document.addEventListener("DOMContentLoaded", init);

  function markUnsaved() {
    scheduleSave();
  }

  Format.Editor = { open, save, insertPageBreak, markUnsaved, renderPdfPages, currentDocId: () => currentDocId };
})();