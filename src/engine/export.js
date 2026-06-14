// Format — document export (Phase 10)
//
// Three paths, all fully offline:
//   • Print   — relies on the @media print stylesheet, calls window.print()
//   • PDF      — html2canvas captures each .a4-page, jsPDF assembles an A4 doc
//   • PNG      — html2canvas captures each page, downloads one file per page
//
// Ink overlays live inside .a4-page as <canvas>, so html2canvas captures them
// on top of the page content automatically. jsPDF / html2canvas are lazy-loaded
// from lib/ only when a raster export is requested.

window.Format = window.Format || {};

(function () {
  let html2canvasPromise = null;
  let jsPdfPromise = null;

  function loadScript(src, check) {
    return new Promise((resolve, reject) => {
      if (check()) return resolve();
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => (check() ? resolve() : reject(new Error(`${src} loaded but global missing`)));
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  function loadHtml2Canvas() {
    if (!html2canvasPromise) {
      html2canvasPromise = loadScript("lib/html2canvas.min.js", () => !!window.html2canvas);
    }
    return html2canvasPromise;
  }

  function loadJsPdf() {
    if (!jsPdfPromise) {
      jsPdfPromise = loadScript("lib/jspdf.min.js", () => !!(window.jspdf && window.jspdf.jsPDF));
    }
    return jsPdfPromise;
  }

  function fileBase() {
    const title = (document.getElementById("editor-title")?.value || "Untitled").trim() || "Untitled";
    const safe = title.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return `${safe}-${stamp}`;
  }

  function pages() {
    return Array.from(document.querySelectorAll("#editor-canvas .a4-page"));
  }

  // Captures a single .a4-page to a canvas at 2x scale, with selection/handles
  // temporarily hidden so they don't appear in the output.
  async function capturePage(page) {
    Format.ElementPanel?.deselect?.();
    return window.html2canvas(page, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
  }

  function download(href, name) {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function print() {
    Format.ElementPanel?.deselect?.();
    Format.Ink?.setEnabled(false);
    window.print();
  }

  async function exportPdf() {
    Format.Toast?.show?.("Building PDF…");
    await Promise.all([loadHtml2Canvas(), loadJsPdf()]);
    const list = pages();
    if (!list.length) return;

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < list.length; i++) {
      const canvas = await capturePage(list[i]);
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      // Fit the captured page to the PDF page width, preserving aspect ratio.
      const imgH = (canvas.height / canvas.width) * pageW;
      if (i > 0) pdf.addPage();
      let drawH = imgH;
      let drawW = pageW;
      if (imgH > pageH) {
        drawH = pageH;
        drawW = (canvas.width / canvas.height) * pageH;
      }
      pdf.addImage(imgData, "JPEG", (pageW - drawW) / 2, 0, drawW, drawH);
    }

    pdf.save(`${fileBase()}.pdf`);
    Format.Toast?.show?.("PDF exported.");
  }

  async function exportPng() {
    Format.Toast?.show?.("Rendering PNG…");
    await loadHtml2Canvas();
    const list = pages();
    const base = fileBase();
    for (let i = 0; i < list.length; i++) {
      const canvas = await capturePage(list[i]);
      const suffix = list.length > 1 ? `-page-${i + 1}` : "";
      download(canvas.toDataURL("image/png"), `${base}${suffix}.png`);
    }
    Format.Toast?.show?.(list.length > 1 ? `Exported ${list.length} PNG pages.` : "PNG exported.");
  }

  // ── Export chooser modal ─────────────────────────────────────────────
  function openMenu() {
    const overlay = document.getElementById("export-modal");
    if (overlay) overlay.classList.remove("hidden");
  }

  function closeMenu() {
    document.getElementById("export-modal")?.classList.add("hidden");
  }

  let selectedExport = "print";

  function selectExport(choice) {
    selectedExport = choice;
    document.querySelectorAll("#export-types .picker-card").forEach((card) => {
      card.classList.toggle("is-selected", card.dataset.export === choice);
    });
  }

  function runSelected() {
    closeMenu();
    const run = { print, pdf: exportPdf, png: exportPng }[selectedExport];
    run?.().catch((err) => {
      console.error("Export failed", err);
      Format.Toast?.show?.("Export failed.", "error");
    });
  }

  function init() {
    document.addEventListener("click", (event) => {
      if (event.target.closest('[data-action="editor-export"]')) {
        openMenu();
        return;
      }
      if (event.target.closest('[data-action="export-close"]')) {
        closeMenu();
        return;
      }
      const card = event.target.closest("#export-types .picker-card");
      if (card) {
        selectExport(card.dataset.export);
        return;
      }
      if (event.target.closest('[data-action="export-run"]')) {
        runSelected();
      }
    });

    document.getElementById("export-modal")?.addEventListener("click", (event) => {
      if (event.target.id === "export-modal") closeMenu();
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  Format.Export = { print, exportPdf, exportPng, openMenu };
})();
