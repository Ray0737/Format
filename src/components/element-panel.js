// Format — floating control panel for inserted elements (images, shapes)
//
// Inserted .doc-element wrappers (position: absolute inside .a4-page) can be
// selected, dragged via their handle, locked in place, re-stacked
// front/back, and deleted through this small floating dark pill.

window.Format = window.Format || {};

(function () {
  let selected = null;

  function render() {
    const root = document.getElementById("element-panel");
    if (!root) return;

    root.innerHTML = `
      <button type="button" class="element-panel__btn" data-el-cmd="back" title="Send backward">${Format.icons["send-backward"]}</button>
      <button type="button" class="element-panel__btn" data-el-cmd="front" title="Bring forward">${Format.icons["bring-forward"]}</button>
      <span class="element-panel__sep"></span>
      <button type="button" class="element-panel__btn" data-el-cmd="lock" title="Lock position">${Format.icons.lock}</button>
      <button type="button" class="element-panel__btn" data-el-cmd="duplicate" title="Duplicate">${Format.icons.copy}</button>
      <span class="element-panel__sep"></span>
      <button type="button" class="element-panel__btn element-panel__btn--danger" data-el-cmd="delete" title="Delete">${Format.icons.trash}</button>
    `;
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
    document.getElementById("element-panel")?.classList.add("is-open");
    syncLockButton();
    positionPanel();
  }

  function deselect() {
    if (!selected) return;
    selected.classList.remove("is-selected");
    selected = null;
    document.getElementById("element-panel")?.classList.remove("is-open");
  }

  // Swaps z-index with the adjacent element in the stacking order, moving
  // this element one step toward the front or back.
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

  function startDrag(event, handle) {
    const el = handle.closest(".doc-element");
    const page = el?.closest(".a4-page");
    if (!el || !page || el.classList.contains("is-locked")) return;

    event.preventDefault();

    const pageRect = page.getBoundingClientRect();
    const startLeft = el.offsetLeft;
    const startTop = el.offsetTop;
    const startX = event.clientX;
    const startY = event.clientY;

    function onMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const left = Math.max(0, Math.min(startLeft + dx, pageRect.width - el.offsetWidth));
      const top = Math.max(0, Math.min(startTop + dy, pageRect.height - el.offsetHeight));
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

  // Resizes the element from its bottom-right corner handle. Images keep
  // their aspect ratio locked (dragging only follows horizontal movement);
  // other elements (shapes) resize width/height independently.
  function startResize(event, handle) {
    const el = handle.closest(".doc-element");
    if (!el || el.classList.contains("is-locked")) return;

    event.preventDefault();

    const lockAspect = el.dataset.element === "image";
    const startWidth = el.offsetWidth;
    const startHeight = el.offsetHeight;
    const aspect = startWidth / startHeight;
    const startX = event.clientX;
    const startY = event.clientY;

    function onMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      const width = Math.max(40, startWidth + dx);
      let height;
      if (lockAspect) {
        height = Math.round(width / aspect);
      } else {
        const dy = moveEvent.clientY - startY;
        height = Math.max(20, startHeight + dy);
      }
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
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

  // Clones the selected element (image / shape / table), offsets it slightly,
  // gives it the top z-index, drops the locked state, and selects the copy.
  function duplicate(el) {
    const page = el.closest(".a4-page");
    if (!page) return;
    const clone = el.cloneNode(true);
    clone.classList.remove("is-locked", "is-selected");

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
    select(clone);
    Format.Editor?.markUnsaved?.();
  }

  function handlePanelClick(event) {
    const btn = event.target.closest("[data-el-cmd]");
    if (!btn || !selected) return;

    switch (btn.dataset.elCmd) {
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
  }

  function init() {
    render();

    document.addEventListener("mousedown", (event) => {
      const handle = event.target.closest(".doc-element__handle");
      if (handle) {
        select(handle.closest(".doc-element"));
        startDrag(event, handle);
        return;
      }

      const resizeHandle = event.target.closest(".doc-element__resize");
      if (resizeHandle) {
        select(resizeHandle.closest(".doc-element"));
        startResize(event, resizeHandle);
        return;
      }

      const el = event.target.closest(".doc-element");
      if (el) {
        select(el);
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