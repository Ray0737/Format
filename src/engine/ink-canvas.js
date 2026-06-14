// Format — pen / ink overlay (Phase 8)
//
// A <canvas> is overlaid on every .a4-page. In type mode the canvas has
// pointer-events: none so the page stays editable. Toggling "Draw" mode makes
// the canvases interactive (and the pages non-editable) so pointer input is
// captured as ink strokes via Pointer Events. Pen pressure drives line width,
// touch input is rejected while a pen is in contact (palm rejection), and a
// highlighter and eraser are provided alongside the pen.
//
// Strokes are stored per page as
//   [ { tool, color, points: [ {x, y, p} ] } ]
// in page-CSS-pixel coordinates (zoom-independent), keyed by page index, and
// persisted to IndexedDB's `strokes` store through Format.DocStore.

window.Format = window.Format || {};

(function () {
  // Per-tool rendering parameters.
  //  - pen: pressure-variable width, drawn per-segment, fully opaque
  //  - highlighter: constant width, semi-transparent, drawn as ONE path so the
  //    alpha is applied once (per-segment stroking compounds alpha at every
  //    join and produces dark blotches)
  //  - eraser: constant width, destination-out
  const TOOLS = {
    pen: { erase: false, flat: false, alpha: 1, minWidth: 1.4, maxWidth: 4 },
    highlighter: { erase: false, flat: true, alpha: 0.4, width: 16 },
    eraser: { erase: true, flat: true, width: 22 },
  };

  // Default colour presets: black, red, blue, then pastels.
  const COLORS = [
    "#1a1a1a", // black
    "#e23b3b", // red
    "#2f6fed", // blue
    "#f6a5c0", // pastel pink
    "#f7df8b", // pastel yellow
    "#a8e0b8", // pastel green
    "#a9cdf5", // pastel blue
    "#c7b3ec", // pastel purple
  ];
  // Line-weight multipliers (applied per stroke, stored on the stroke so past
  // strokes keep their weight when re-rendered).
  const WEIGHTS = [0.5, 1, 2, 3.5];
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  // Hard cap on a single canvas's pixel width so deep zoom can't blow up memory.
  const MAX_BACKING_WIDTH = 4096;

  let enabled = false;
  let tool = "pen";
  let color = COLORS[0];
  let weight = 1; // current line-weight multiplier
  let zoomScale = 1; // current editor zoom; raises ink backing resolution

  // In-progress stroke state.
  let drawing = false;
  let activePointerId = null;
  let penContact = false; // a pen is currently touching — reject touch (palm)
  let penSeen = false; // a stylus has been used this session → reject finger/palm touches
  let currentStroke = null;
  let currentCanvas = null;

  function canvasContainer() {
    return document.getElementById("editor-canvas");
  }

  function strokesOf(canvas) {
    if (!canvas.__strokes) canvas.__strokes = [];
    return canvas.__strokes;
  }

  function widthFor(stroke, pressure) {
    const t = TOOLS[stroke.tool] || TOOLS.pen;
    const m = stroke.weight || 1;
    if (t.flat) return t.width * m;
    const p = pressure > 0 ? pressure : 0.5;
    return (t.minWidth + (t.maxWidth - t.minWidth) * p) * m;
  }

  function renderStroke(ctx, stroke) {
    const points = stroke.points;
    if (!points.length) return;
    const t = TOOLS[stroke.tool] || TOOLS.pen;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = t.erase ? "destination-out" : "source-over";
    ctx.globalAlpha = t.erase ? 1 : t.alpha;
    ctx.strokeStyle = t.erase ? "#000" : stroke.color;

    // Single point → a dot.
    if (points.length === 1) {
      const w = widthFor(stroke, points[0].p);
      ctx.beginPath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.arc(points[0].x, points[0].y, w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (t.flat) {
      // Constant width → one continuous path stroked once, so a translucent
      // highlighter composites uniformly instead of darkening at every join.
      ctx.lineWidth = t.width;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
    } else {
      // Pressure-variable pen → per-segment widths (fully opaque, so the
      // overlapping joins don't cause visible build-up).
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        ctx.beginPath();
        ctx.lineWidth = widthFor(stroke, (a.p + b.p) / 2);
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Backing-store scale for a page: device pixels per page CSS pixel. Scales
  // up with zoom (so strokes stay sharp when magnified), never below DPR, and
  // is capped so a single canvas can't exceed MAX_BACKING_WIDTH.
  function backingScale(w) {
    const desired = DPR * Math.max(zoomScale, 1);
    return Math.min(desired, MAX_BACKING_WIDTH / w);
  }

  function redraw(canvas) {
    const ctx = canvas.getContext("2d");
    const scale = canvas.__scale || DPR;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, canvas.width / scale, canvas.height / scale);
    strokesOf(canvas).forEach((stroke) => renderStroke(ctx, stroke));
  }

  function fitCanvas(canvas) {
    const page = canvas.parentElement;
    if (!page) return;
    const w = page.offsetWidth;
    const h = page.offsetHeight;
    const scale = backingScale(w);
    const bw = Math.round(w * scale);
    const bh = Math.round(h * scale);
    if (canvas.width === bw && canvas.height === bh && canvas.__scale === scale) return;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = bw;
    canvas.height = bh;
    canvas.__scale = scale;
    redraw(canvas);
  }

  // Called by the editor when its zoom changes — re-rasterizes every page's
  // ink at the new resolution.
  function setZoom(scale) {
    zoomScale = scale || 1;
    canvasContainer()?.querySelectorAll(".ink-canvas").forEach((c) => fitCanvas(c));
  }

  // Maps a pointer event to canvas CSS-pixel coordinates, compensating for the
  // editor's CSS `zoom` (which scales the element's on-screen rect).
  function pointFor(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width ? canvas.offsetWidth / rect.width : 1;
    const sy = rect.height ? canvas.offsetHeight / rect.height : 1;
    return {
      x: (event.clientX - rect.left) * sx,
      y: (event.clientY - rect.top) * sy,
      p: event.pressure,
    };
  }

  function onPointerDown(event) {
    if (!enabled) return;
    const canvas = event.currentTarget;

    if (event.pointerType === "pen") {
      penContact = true;
      penSeen = true;
    }
    // Palm rejection: once a stylus has been used, ignore all touch input (so a
    // resting hand never draws or pans); otherwise (finger-only devices) allow
    // touch, but still reject touch while a pen is actively in contact.
    if (event.pointerType === "touch" && (penSeen || penContact)) return;
    if (drawing) return;

    event.preventDefault();
    drawing = true;
    activePointerId = event.pointerId;
    currentCanvas = canvas;
    currentStroke = { tool, color, weight, points: [pointFor(canvas, event)] };
    strokesOf(canvas).push(currentStroke);
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {}
    redraw(canvas);
  }

  function onPointerMove(event) {
    if (!drawing || event.pointerId !== activePointerId || !currentStroke) return;
    event.preventDefault();
    // Coalesced events give smoother strokes on high-rate pens/tablets.
    const events = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];
    events.forEach((e) => currentStroke.points.push(pointFor(currentCanvas, e)));
    redraw(currentCanvas);
  }

  function onPointerUp(event) {
    if (event.pointerType === "pen") penContact = false;
    if (!drawing || event.pointerId !== activePointerId) return;
    drawing = false;
    activePointerId = null;
    try {
      currentCanvas.releasePointerCapture(event.pointerId);
    } catch {}
    currentStroke = null;
    currentCanvas = null;
    Format.Editor?.markUnsaved?.();
  }

  // Creates and wires an ink canvas inside a freshly created .a4-page.
  function attachToPage(page) {
    if (!page || page.querySelector(".ink-canvas")) return;
    const canvas = document.createElement("canvas");
    canvas.className = "ink-canvas";
    page.appendChild(canvas);

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerUp);

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => fitCanvas(canvas));
      ro.observe(page);
    }
    if (enabled) page.contentEditable = "false";
    // Defer fit until layout settles.
    requestAnimationFrame(() => fitCanvas(canvas));
    return canvas;
  }

  // Assigns loaded stroke data (array per page index) onto the existing page
  // canvases and renders them. Called by the editor after content load.
  function loadInto(strokesByPage) {
    const container = canvasContainer();
    if (!container) return;
    const pages = container.querySelectorAll(".a4-page");
    pages.forEach((page, i) => {
      const canvas = page.querySelector(".ink-canvas") || attachToPage(page);
      canvas.__strokes = Array.isArray(strokesByPage?.[i]) ? strokesByPage[i] : [];
      requestAnimationFrame(() => fitCanvas(canvas));
    });
  }

  // Collects strokes from every page canvas, in page order, for persistence.
  function collectStrokes() {
    const container = canvasContainer();
    if (!container) return [];
    return Array.from(container.querySelectorAll(".a4-page")).map((page) => {
      const canvas = page.querySelector(".ink-canvas");
      return canvas ? strokesOf(canvas) : [];
    });
  }

  function clearCurrentPage() {
    const container = canvasContainer();
    const pages = container?.querySelectorAll(".a4-page");
    if (!pages?.length) return;
    // Clear the page nearest the viewport centre.
    const mid = window.innerHeight / 2;
    let target = pages[0];
    let best = Infinity;
    pages.forEach((p) => {
      const r = p.getBoundingClientRect();
      const d = Math.abs((r.top + r.bottom) / 2 - mid);
      if (d < best) {
        best = d;
        target = p;
      }
    });
    const canvas = target.querySelector(".ink-canvas");
    if (canvas) {
      canvas.__strokes = [];
      redraw(canvas);
      Format.Editor?.markUnsaved?.();
    }
  }

  function setEnabled(on) {
    enabled = on;
    const container = canvasContainer();
    container?.classList.toggle("ink-active", on);
    container?.querySelectorAll(".a4-page").forEach((page) => {
      page.contentEditable = on ? "false" : "true";
      const canvas = page.querySelector(".ink-canvas");
      if (canvas) fitCanvas(canvas);
    });
    document.getElementById("ink-toolbar")?.classList.toggle("is-open", on);
    const toggle = document.querySelector('[data-action="toggle-ink"]');
    toggle?.classList.toggle("is-active", on);
    if (on) Format.ElementPanel?.deselect?.();
  }

  function buildToolbar() {
    if (document.getElementById("ink-toolbar")) return;
    const bar = document.createElement("div");
    bar.className = "ink-toolbar";
    bar.id = "ink-toolbar";

    const toolBtn = (name, label, iconKey) =>
      `<button type="button" class="ink-tool ${name === tool ? "is-active" : ""}" data-ink-tool="${name}" title="${label}">${Format.icons[iconKey] || ""}</button>`;

    const swatches = COLORS.map(
      (c) =>
        `<button type="button" class="ink-swatch ${c === color ? "is-active" : ""}" data-ink-color="${c}" style="background:${c}" title="${c}"></button>`
    ).join("");

    const weights = WEIGHTS.map((w) => {
      const dot = Math.round(4 + w * 3); // visual dot size for the weight
      return `<button type="button" class="ink-weight ${w === weight ? "is-active" : ""}" data-ink-weight="${w}" title="Line weight"><span class="ink-weight__dot" style="width:${dot}px;height:${dot}px"></span></button>`;
    }).join("");

    bar.innerHTML = `
      <div class="ink-group">
        ${toolBtn("pen", "Pen", "pen")}
        ${toolBtn("highlighter", "Highlighter", "highlighter")}
        ${toolBtn("eraser", "Eraser", "eraser")}
      </div>
      <div class="ink-divider"></div>
      <div class="ink-group ink-weights">${weights}</div>
      <div class="ink-divider"></div>
      <div class="ink-group ink-colors">
        ${swatches}
        <label class="ink-custom" title="Custom colour">
          ${Format.icons.plus}
          <input type="color" data-ink-custom value="${color}">
        </label>
      </div>
      <div class="ink-divider"></div>
      <button type="button" class="ink-tool" data-ink-cmd="clear" title="Clear this page">${Format.icons.trash}</button>
      <button type="button" class="ink-done" data-ink-cmd="done">Done</button>
    `;
    document.getElementById("view-editor")?.appendChild(bar);

    bar.addEventListener("click", (event) => {
      const toolEl = event.target.closest("[data-ink-tool]");
      if (toolEl) {
        tool = toolEl.dataset.inkTool;
        bar.querySelectorAll("[data-ink-tool]").forEach((b) => b.classList.toggle("is-active", b === toolEl));
        return;
      }
      const weightEl = event.target.closest("[data-ink-weight]");
      if (weightEl) {
        weight = Number(weightEl.dataset.inkWeight);
        bar.querySelectorAll("[data-ink-weight]").forEach((b) => b.classList.toggle("is-active", b === weightEl));
        return;
      }
      const colorEl = event.target.closest("[data-ink-color]");
      if (colorEl) {
        setColor(colorEl.dataset.inkColor, colorEl);
        return;
      }
      const cmd = event.target.closest("[data-ink-cmd]")?.dataset.inkCmd;
      if (cmd === "clear") clearCurrentPage();
      if (cmd === "done") setEnabled(false);
    });

    // Custom colour picker.
    bar.addEventListener("input", (event) => {
      if (event.target.matches("[data-ink-custom]")) setColor(event.target.value, null);
    });

    function setColor(value, swatchEl) {
      color = value;
      bar.querySelectorAll("[data-ink-color]").forEach((b) => b.classList.toggle("is-active", b === swatchEl));
      // Picking a colour while erasing switches back to the pen.
      if (tool === "eraser") {
        tool = "pen";
        bar.querySelectorAll("[data-ink-tool]").forEach((b) => b.classList.toggle("is-active", b.dataset.inkTool === "pen"));
      }
    }
  }

  function init() {
    buildToolbar();

    document.addEventListener("click", (event) => {
      if (event.target.closest('[data-action="toggle-ink"]')) {
        setEnabled(!enabled);
      }
    });

    // Refit canvases when the window resizes.
    window.addEventListener("resize", () => {
      canvasContainer()?.querySelectorAll(".ink-canvas").forEach((c) => fitCanvas(c));
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  Format.Ink = {
    attachToPage,
    loadInto,
    collectStrokes,
    setEnabled,
    setZoom,
    isEnabled: () => enabled,
  };
})();
