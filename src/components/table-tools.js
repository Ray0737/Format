// Format — column/row resize handles for floating .doc-element--table
//
// Each table inserted via Format.EditorCmd.insertTable() has .col-resizer
// spans on its first row (one per <col>) and .row-resizer spans on its
// first column (one per <tr>). Dragging them adjusts the <col> width or
// <tr> height. Resizers are hidden via CSS while the table is locked.

window.Format = window.Format || {};

(function () {
  function startColResize(event, resizer) {
    const table = resizer.closest("table.doc-table");
    const col = table?.querySelectorAll("col")[Number(resizer.dataset.col)];
    const td = resizer.closest("td");
    if (!col || !td) return;

    event.preventDefault();

    const startWidth = parseFloat(col.style.width) || td.offsetWidth;
    const startX = event.clientX;

    function onMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      col.style.width = `${Math.max(24, startWidth + dx)}px`;
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      Format.Editor?.markUnsaved?.();
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function startRowResize(event, resizer) {
    const tr = resizer.closest("tr");
    if (!tr) return;

    event.preventDefault();

    const startHeight = parseFloat(tr.style.height) || tr.offsetHeight;
    const startY = event.clientY;

    function onMove(moveEvent) {
      const dy = moveEvent.clientY - startY;
      tr.style.height = `${Math.max(20, startHeight + dy)}px`;
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      Format.Editor?.markUnsaved?.();
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function init() {
    document.addEventListener("mousedown", (event) => {
      const colResizer = event.target.closest(".col-resizer");
      if (colResizer) {
        startColResize(event, colResizer);
        return;
      }

      const rowResizer = event.target.closest(".row-resizer");
      if (rowResizer) {
        startRowResize(event, rowResizer);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  Format.TableTools = { init };
})();