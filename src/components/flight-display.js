// Format — study mode: Lufthansa-style flight card route visual

window.Format = window.Format || {};

(function () {
  // Renders the route row: FROM code/subject, progress bar + plane, TO code/subject.
  function renderVisual(session) {
    const fromCode = Format.escapeHtml(session.from.code);
    const fromName = Format.escapeHtml(session.from.name);
    const toCode = Format.escapeHtml(session.to.code);
    const toName = Format.escapeHtml(session.to.name);

    return `
      <div class="flight-route">
        <div class="flight-route__endpoint">
          <span class="flight-route__code">${fromCode}</span>
          <span class="flight-route__subject">${fromName}</span>
        </div>
        <div class="flight-route__progress">
          <div class="flight-route__plane" data-el="plane" style="left: 0%">${Format.icons.plane}</div>
        </div>
        <div class="flight-route__endpoint">
          <span class="flight-route__code">${toCode}</span>
          <span class="flight-route__subject">${toName}</span>
        </div>
      </div>
    `;
  }

  // Updates the plane position from a timer tick state.
  function update(container, state) {
    const percent = Math.min(100, Math.max(0, state.progress * 100));
    const plane = container.querySelector('[data-el="plane"]');
    if (plane) plane.style.left = `${percent}%`;
  }

  Format.FlightDisplay = { renderVisual, update };
})();
