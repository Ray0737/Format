// Format — custom confirm dialog (replaces native confirm())

window.Format = window.Format || {};

(function () {
  let resolver = null;

  function open(message, options = {}) {
    const overlay = document.getElementById("confirm-modal");
    const heading = document.getElementById("confirm-heading");
    const messageEl = document.getElementById("confirm-message");
    const okBtn = overlay?.querySelector('[data-action="confirm-ok"]');

    if (heading) heading.textContent = options.title ?? "Confirm";
    if (messageEl) messageEl.textContent = message ?? "";
    if (okBtn) okBtn.textContent = options.okLabel ?? "Delete";

    overlay?.classList.remove("hidden");
    okBtn?.focus();

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
      if (event.key === "Escape") settle(false);
      if (event.key === "Enter") settle(true);
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  Format.ConfirmDialog = { open };
})();