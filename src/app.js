// Format — app entry point: view router
//
// Loaded as a plain <script> (not type="module") — ES modules are blocked
// by CORS when index.html is opened via file://, which would break the
// "double-click to run" requirement. All src/ files use this IIFE +
// shared `window.Format` namespace pattern instead of import/export.

window.Format = window.Format || {};

(function () {
  const VIEWS = ["home", "editor", "study", "flashcards"];

  const TITLES = {
    home: "Format",
    editor: "Format — Editor",
    study: "Format — Study Mode",
    flashcards: "Format — Flashcards",
  };

  function showView(name, { pushState = true } = {}) {
    const target = VIEWS.includes(name) ? name : "home";

    for (const view of VIEWS) {
      document.getElementById(`view-${view}`)?.classList.toggle("hidden", view !== target);
    }

    for (const link of document.querySelectorAll(".topnav__link[data-view], .nav-menu__link[data-view]")) {
      link.classList.toggle("is-active", link.dataset.view === target && !link.dataset.section);
    }

    document.title = TITLES[target];

    document.querySelector("header")?.classList.toggle("hidden", target === "study");

    if (target === "home") {
      Format.HomeView?.renderStats();
      Format.HomeView?.renderReviewQueue?.();
    }

    if (target === "flashcards") {
      Format.FlashcardsView?.render();
    }

    if (pushState) {
      history.pushState({ view: target }, "", `#${target}`);
    }
  }

  function closeNavMenu() {
    const menu = document.getElementById("nav-menu");
    menu?.classList.remove("is-open");
    document.getElementById("nav-menu-btn")?.setAttribute("aria-expanded", "false");
  }

  function initRouting() {
    document.addEventListener("click", (event) => {
      // Mobile menu toggle
      const menuBtn = event.target.closest('[data-action="nav-menu"]');
      if (menuBtn) {
        const menu = document.getElementById("nav-menu");
        const open = menu?.classList.toggle("is-open");
        menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
        return;
      }

      const link = event.target.closest("[data-view]");
      if (!link) {
        // Click elsewhere closes the mobile menu.
        if (!event.target.closest("#nav-menu")) closeNavMenu();
        return;
      }

      event.preventDefault();
      closeNavMenu();

      if (link.dataset.docId) {
        Format.Editor?.open(link.dataset.docId);
        return;
      }

      showView(link.dataset.view);
      if (link.dataset.section) {
        document.getElementById(link.dataset.section)?.scrollIntoView({ behavior: "smooth" });
      }
    });

    window.addEventListener("popstate", (event) => {
      showView(event.state?.view ?? "home", { pushState: false });
    });

    const initial = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "home";
    showView(initial, { pushState: false });
    history.replaceState({ view: initial }, "", `#${initial}`);
  }

  document.addEventListener("DOMContentLoaded", initRouting);

  // Register the service worker for offline support. Only meaningful when the
  // app is served over http(s); over file:// SW registration is unsupported,
  // so we skip it silently (the app still runs fully from local files).
  function initServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "http:" && location.protocol !== "https:") return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((err) => {
        console.warn("Service worker registration failed", err);
      });
    });
  }

  initServiceWorker();

  Format.showView = showView;
})();
