// Format — lightweight toast notifications (Phase 12)

window.Format = window.Format || {};

(function () {
  let hideTimer = null;

  // type: "" | "success" | "error"
  function show(message, type = "", duration = 2600) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.remove("is-error", "is-success");
    if (type) el.classList.add(`is-${type}`);
    el.classList.add("is-visible");

    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      el.classList.remove("is-visible");
      hideTimer = null;
    }, duration);
  }

  Format.Toast = { show };
})();
