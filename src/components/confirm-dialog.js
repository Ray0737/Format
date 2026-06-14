// Format — custom confirm dialog (replaces native confirm())

window.Format = window.Format || {};

(function () {
  let resolver = null;

  function open(message, options = {}) {
    const overlay = document.getElementById("confirm-modal");
    const heading = document.getElementById("confirm-heading");
    const messageEl = document.getElementById("confirm-message");
    const okBtn = overlay?.querySelector('[data-action="confirm-ok"]');
    const cancelBtn = overlay?.querySelector('[data-action="confirm-cancel"]');

    if (heading) heading.textContent = options.title ?? "Delete";
    if (messageEl) messageEl.textContent = message ?? "";
    if (okBtn) okBtn.textContent = options.okLabel ?? "Yes, delete!";
    if (cancelBtn) cancelBtn.textContent = options.cancelLabel ?? "No, keep it.";

    overlay?.classList.remove("hidden");
    // Focus the safe (cancel) action by default.
    cancelBtn?.focus();

    return new Promise((resolve) => {
      resolver = resolve;
    });
  }

  function settle(result) {
    document.getElementById("confirm-modal")?.classList.add("hidden");
    if (resolver) {
      resolver(result);
      resolver = null;
    }
  }

  function isOpen() {
    return !document.getElementById("confirm-modal")?.classList.contains("hidden");
  }

  function init() {
    document.addEventListener("click", (event) => {
      if (!isOpen()) return;

      if (event.target.closest('[data-action="confirm-ok"]')) {
        settle(true);
        return;
      }

      if (event.target.closest('[data-action="confirm-cancel"]') || event.target.id === "confirm-modal") {
        settle(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!isOpen()) return;
      // Escape cancels. Enter is intentionally NOT a global confirm (destructive
      // action) — it just activates whichever button has focus.
      if (event.key === "Escape") settle(false);
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  Format.ConfirmDialog = { open };
})();