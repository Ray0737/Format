// Format — keyboard shortcut help overlay (Phase 12)
//
// Pressing "?" (outside a text field) toggles a cheatsheet of shortcuts.

window.Format = window.Format || {};

(function () {
  const SHORTCUTS = [
    ["Ctrl + B / I / U", "Bold · Italic · Underline"],
    ["Ctrl + Z / Y", "Undo · Redo"],
    ["Ctrl + S", "Save document"],
    ["Ctrl + P", "Print / export"],
    ["Ctrl + Scroll", "Zoom the page"],
    ["Tab / Shift + Tab", "Indent · Outdent (and table cell navigation)"],
    ["Enter", "New row in to-do lists"],
    ["Ctrl + Enter", "Insert equation (in the equation editor)"],
    ["?", "Show / hide this help"],
  ];

  function modal() {
    return document.getElementById("shortcuts-modal");
  }

  function isTyping() {
    const el = document.activeElement;
    if (!el) return false;
    return (
      el.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)
    );
  }

  function buildBody() {
    const body = document.getElementById("shortcuts-list");
    if (!body || body.childElementCount) return;
    body.innerHTML = SHORTCUTS.map(
      ([keys, desc]) =>
        `<div class="shortcut-row"><kbd class="shortcut-keys">${keys}</kbd><span class="shortcut-desc">${desc}</span></div>`
    ).join("");
  }

  function toggle(force) {
    const m = modal();
    if (!m) return;
    buildBody();
    const willOpen = force ?? m.classList.contains("hidden");
    m.classList.toggle("hidden", !willOpen);
  }

  function init() {
    document.addEventListener("keydown", (event) => {
      if (event.key === "?" && !isTyping()) {
        event.preventDefault();
        toggle();
      } else if (event.key === "Escape" && !modal()?.classList.contains("hidden")) {
        toggle(false);
      }
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest('[data-action="shortcuts-close"]') || event.target.id === "shortcuts-modal") {
        toggle(false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  Format.Shortcuts = { toggle };
})();
