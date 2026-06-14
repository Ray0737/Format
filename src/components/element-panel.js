// Format — floating control panel + selection handles for inserted elements
//
// Inserted .doc-element wrappers (position: absolute inside .a4-page) can be:
//   • selected (click)
//   • moved by dragging anywhere on the body (images/shapes), Canva-style;
//     tables keep a corner grip since their body is editable
//   • resized from 8 handles (4 corners + 4 edges) added on selection
//   • locked, duplicated, re-stacked (front/back), or deleted via the pill

window.Format = window.Format || {};

(function () {
  const RZ_DIRS = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  let selected = null;

  function isDraggableBody(el) {
    return el.dataset.element === "image" || el.dataset.element === "shape";
  }

  function render() {
    const root = document.getElementById("element-panel");
    if (!root) return;

    root.innerHTML = `
      <button type="button" class="element-panel__btn" data-el-cmd="lock" title="Lock position">${Format.icons.lock}</button>
      <button type="button" class="element-panel__btn" data-el-cmd="duplicate" title="Duplicate">${Format.icons.copy}</button>
      <button type="button" class="element-panel__btn element-panel__btn--danger" data-el-cmd="delete" title="Delete">${Format.icons.trash}</button>
      <span class="element-panel__sep"></span>
      <div class="element-panel__more">
        <button type="button" class="element-panel__btn" data-el-cmd="more" title="More">${Format.icons.more}</button>
        <div class="element-panel__menu" id="element-panel-menu">
          <button type="button" class="element-panel__menu-item" data-el-cmd="front">${Format.icons["bring-forward"]}<span>Bring forward</span></button>
          <button type="button" class="element-panel__menu-item" data-el-cmd="back">${Format.icons["send-backward"]}<span>Send backward</span></button>
        </div>
      </div>
    `;
  }

  // Adds the 8 resize handles to an image/shape (idempotent). Strips any
  // legacy single-corner/move handles from older saved elements first.
  function addHandles(el) {
    if (!el || !isDraggableBody(el)) return;
    el.querySelectorAll(".doc-element__resize, .doc-element__handle").forEach((h) => h.remove());
    if (el.querySelector(".doc-element__rz")) return;
    RZ_DIRS.forEach((dir) => {
      const h = document.createElement("span");
      h.className = `doc-element__rz doc-element__rz--${dir}`;
      h.dataset.dir = dir;
      el.appendChild(h);
    });
  }

  function removeHandles(el) {
    el?.querySelectorAll(".doc-element__rz").forEach((h) => h.remove());
  }

  function positionPanel() {
    const root = document.getElementById("element-panel");
    if (!root || !selected) return;
    const rect = selected.getBoundingClientRect();
    root.style.left = `${rect.left + rect.width / 2}px`;
    root.style.top = `${rect.top - root.offsetHeight - 10}px`;
  }

  function syncLockButton() {
    const btn = document.querySelector('#element-panel [data-el-cmd="lock"]');
    if (!btn || !selected) return;
    const locked = selected.classList.contains("is-locked");
    btn.classList.toggle("is-active", locked);
    btn.innerHTML = locked ? Format.icons.unlock : Format.icons.lock;
    btn.title = locked ? "Unlock position" : "Lock position";
  }

  function select(el) {
    if (selected === el) return;
    deselect();
    selected = el;
    el.classList.add("is-selected");
    addHandles(el);
    document.getElementById("element-panel")?.classList.add("is-open");
    syncLockButton();
    positionPanel();
  }

  function deselect() {
    if (!selected) return;
    removeHandles(selected);
    selected.classList.remove("is-selected");
    selected = null;
    document.getElementById("element-panel")?.classList.remove("is-open");
    document.getElementById("element-panel-menu")?.classList.remove("is-open");
  }

  // Swaps z-index with the adjacent element, moving this element one step
  // toward the front or back.
  function reorderZ(el, direction) {
    const page = el.closest(".a4-page");
    if (!page) return;
    const elements = Array.from(page.querySelectorAll(".doc-element")).sort(
      (a, b) => (Number(a.style.zIndex) || 1) - (Number(b.style.zIndex) || 1)
    );
    const index = elements.indexOf(el);
    const targetIndex = direction === "front" ? index + 1 : index - 1;
    if (targetIndex < 0 || targetIndex >= elements.length) return;
    const other = elements[targetIndex];
    const tmp = el.style.zIndex || "1";
    el.style.zIndex = other.style.zIndex || "1";
    other.style.zIndex = tmp;
  }

  function startDrag(event, el) {
    const page = el?.closest(".a4-page");
    if (!el || !page || el.classList.contains("is-locked")) return;

    event.preventDefault();
    const pageRect = page.getBoundingClientRect();
    const startLeft = el.offsetLeft;
    const startTop = el.offsetTop;
    const startX = event.clientX;
    const startY = event.clientY;
    // Compensate pointer↔layout scale when the editor is zoomed.
    const scale = pageRect.width ? page.offsetWidth / pageRect.width : 1;

    function onMove(moveEvent) {
      const dx = (moveEvent.clientX - startX) * scale;
      const dy = (moveEvent.clientY - startY) * scale;
      const left = Math.max(0, Math.min(startLeft + dx, page.offsetWidth - el.offsetWidth));
      const top = Math.max(0, Math.min(startTop + dy, page.offsetHeight - el.offsetHeight));
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      positionPanel();
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      Format.Editor?.markUnsaved?.();
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // Resizes from any of the 8 handles. Corner handles scale proportionally
  // (keep aspect); side handles stretch that one axis freely. West/north
  // handles also move the element's origin.
  function startResize(event, handle) {
    const el = handle.closest(".doc-element");
    if (!el || el.classList.contains("is-locked")) return;

    event.preventDefault();
    const dir = handle.dataset.dir || "se";
    const east = dir.includes("e");
    const west = dir.includes("w");
    const south = dir.includes("s");
    const north = dir.includes("n");
    const MIN = 30;

    const page = el.closest(".a4-page");
    const pageRect = page.getBoundingClientRect();
    const scale = pageRect.width ? page.offsetWidth / pageRect.width : 1;
    const startW = el.offsetWidth;
    const startH = el.offsetHeight;
    const startL = el.offsetLeft;
    const startT = el.offsetTop;
    const aspect = startW / startH || 1;
    const startX = event.clientX;
    const startY = event.clientY;

    function onMove(moveEvent) {
      const dx = (moveEvent.clientX - startX) * scale;
      const dy = (moveEvent.clientY - startY) * scale;
      let w = startW;
      let h = startH;
      if (east) w = startW + dx;
      if (west) w = startW - dx;
      if (south) h = startH + dy;
      if (north) h = startH - dy;

      const corner = (east || west) && (north || south);
      if (corner) {
        // Proportional scale — driven by whichever axis moved more relative to
        // its start size, so diagonal drags feel natural.
        const candW = Math.max(MIN, w);
        const candH = Math.max(MIN, h);
        if (candW / startW >= candH / startH) {
          w = candW;
          h = w / aspect;
        } else {
          h = candH;
          w = h * aspect;
        }
      } else {
        // Side handle — stretch this one axis freely.
        w = Math.max(MIN, w);
        h = Math.max(MIN, h);
      }

      let l = startL;
      let t = startT;
      if (west) l = startL + (startW - w);
      if (north) t = startT + (startH - h);

      el.style.width = `${Math.round(w)}px`;
      el.style.height = `${Math.round(h)}px`;
      el.style.left = `${Math.round(l)}px`;
      el.style.top = `${Math.round(t)}px`;
      positionPanel();
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      Format.Editor?.markUnsaved?.();
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // Clones the selected element, offsets it, tops the z-order, selects the copy.
  function duplicate(el) {
    const page = el.closest(".a4-page");
    if (!page) return;
    removeHandles(el);
    const clone = el.cloneNode(true);
    clone.classList.remove("is-locked", "is-selected");
    removeHandles(clone);

    const maxZ = Array.from(page.querySelectorAll(".doc-element")).reduce(
      (max, e) => Math.max(max, Number(e.style.zIndex) || 1),
      0
    );
    clone.style.zIndex = String(maxZ + 1);
    const left = Math.min(el.offsetLeft + 16, Math.max(0, page.clientWidth - el.offsetWidth));
    const top = Math.min(el.offsetTop + 16, Math.max(0, page.clientHeight - el.offsetHeight));
    clone.style.left = `${left}px`;
    clone.style.top = `${top}px`;

    page.appendChild(clone);
    selected = null; // force re-select to re-add handles
    select(clone);
    Format.Editor?.markUnsaved?.();
  }

  function closeMenu() {
    document.getElementById("element-panel-menu")?.classList.remove("is-open");
  }

  function handlePanelClick(event) {
    const btn = event.target.closest("[data-el-cmd]");
    if (!btn || !selected) return;
    const cmd = btn.dataset.elCmd;

    if (cmd === "more") {
      document.getElementById("element-panel-menu")?.classList.toggle("is-open");
      return;
    }

    switch (cmd) {
      case "front":
        reorderZ(selected, "front");
        Format.Editor?.markUnsaved?.();
        break;
      case "back":
        reorderZ(selected, "back");
        Format.Editor?.markUnsaved?.();
        break;
      case "lock":
        selected.classList.toggle("is-locked");
        syncLockButton();
        break;
      case "duplicate":
        duplicate(selected);
        break;
      case "delete": {
        const el = selected;
        deselect();
        el.remove();
        Format.Editor?.markUnsaved?.();
        break;
      }
    }
    closeMenu();
  }

  function init() {
    render();

    document.addEventListener("mousedown", (event) => {
      // Resize handle (8-way)
      const rz = event.target.closest(".doc-element__rz");
      if (rz) {
        select(rz.closest(".doc-element"));
        startResize(event, rz);
        return;
      }

      // Table move grip
      const grip = event.target.closest(".doc-element__handle");
      if (grip) {
        const gel = grip.closest(".doc-element");
        select(gel);
        startDrag(event, gel);
        return;
      }

      const el = event.target.closest(".doc-element");
      if (el) {
        select(el);
        // Drag from anywhere on an image/shape body (Canva-style). Tables are
        // excluded by isDraggableBody — they move via their grip so their cells
        // stay editable.
        if (isDraggableBody(el) && !el.classList.contains("is-locked")) {
          startDrag(event, el);
        }
        return;
      }

      if (!event.target.closest("#element-panel")) {
        deselect();
      }
    });

    document.getElementById("element-panel")?.addEventListener("click", handlePanelClick);

    window.addEventListener(
      "scroll",
      () => {
        if (selected) positionPanel();
      },
      true
    );
  }

  document.addEventListener("DOMContentLoaded", init);

  Format.ElementPanel = { deselect };
})();
