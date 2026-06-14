// Format — Service Worker
// Cache-first, fully offline. No network calls ever leave the cache layer.
// Bump CACHE_VERSION whenever any cached file changes to force a refresh.

const CACHE_VERSION = "v5";
const CACHE_NAME = `format-${CACHE_VERSION}`;

const KATEX_FONTS = [
  "AMS-Regular", "Caligraphic-Bold", "Caligraphic-Regular", "Fraktur-Bold",
  "Fraktur-Regular", "Main-Bold", "Main-BoldItalic", "Main-Italic",
  "Main-Regular", "Math-BoldItalic", "Math-Italic", "SansSerif-Bold",
  "SansSerif-Italic", "SansSerif-Regular", "Script-Regular", "Size1-Regular",
  "Size2-Regular", "Size3-Regular", "Size4-Regular", "Typewriter-Regular",
].map((name) => `./lib/fonts/KaTeX_${name}.woff2`);

// Core app shell — every file the app needs to run with zero network access.
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",

  // Styles
  "./css/main.css",
  "./css/nav.css",
  "./css/home.css",
  "./css/editor.css",
  "./css/study.css",
  "./css/modals.css",
  "./css/responsive.css",

  // App scripts
  "./src/app.js",
  "./src/views/home.js",
  "./src/views/editor.js",
  "./src/views/study.js",
  "./src/views/flashcards.js",
  "./src/components/toolbar.js",
  "./src/components/doc-card.js",
  "./src/components/modal.js",
  "./src/components/confirm-dialog.js",
  "./src/components/element-panel.js",
  "./src/components/table-tools.js",
  "./src/components/template-runtime.js",
  "./src/components/shortcuts.js",
  "./src/components/review.js",
  "./src/components/flight-display.js",
  "./src/engine/doc-store.js",
  "./src/engine/editor-cmd.js",
  "./src/engine/ink-canvas.js",
  "./src/engine/export.js",
  "./src/engine/equation.js",
  "./src/engine/timer.js",
  "./src/engine/study-stats.js",
  "./src/engine/srs.js",
  "./src/engine/deck-store.js",
  "./src/engine/templates.js",
  "./src/utils/date.js",
  "./src/utils/dom.js",
  "./src/utils/toast.js",

  // Bundled libraries
  "./lib/tailwind.css",
  "./lib/katex.min.js",
  "./lib/katex.min.css",
  "./lib/pdf.min.js",
  "./lib/pdf.worker.min.js",
  "./lib/jspdf.min.js",
  "./lib/html2canvas.min.js",
  ...KATEX_FONTS,

  // Fonts
  "./assets/fonts/inter/inter-200.woff2",
  "./assets/fonts/inter/inter-300.woff2",
  "./assets/fonts/inter/inter-400.woff2",
  "./assets/fonts/inter/inter-500.woff2",
  "./assets/fonts/inter/inter-600.woff2",
  "./assets/fonts/inter/inter-700.woff2",
  "./assets/fonts/sarabun/sarabun-400.woff2",
  "./assets/fonts/sarabun/sarabun-600.woff2",
  "./assets/fonts/sarabun/sarabun-700.woff2",

  // Icons
  "./assets/icons/logo.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // Use individual put() so one missing optional asset can't abort the
      // whole install (addAll rejects atomically).
      .then((cache) =>
        Promise.all(
          CORE_ASSETS.map((url) =>
            cache.add(url).catch((err) => console.warn("SW: failed to cache", url, err))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function putInCache(request, response) {
  caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
}

// Strategy:
//  • Big, rarely-changing assets (libraries, fonts, icons) → cache-first
//    (fast, and they're version-stable).
//  • The app shell (HTML, CSS, JS, manifest) → network-first with a cache
//    fallback, so a new deploy shows up as soon as the device is online while
//    still working fully offline.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const cacheFirst =
    sameOrigin &&
    (url.pathname.includes("/lib/") ||
      url.pathname.includes("/assets/fonts/") ||
      url.pathname.includes("/assets/icons/"));

  if (cacheFirst) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((resp) => {
            if (resp && resp.status === 200) putInCache(req, resp.clone());
            return resp;
          })
      )
    );
    return;
  }

  // Network-first for everything else (app shell).
  event.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp && resp.status === 200 && sameOrigin) putInCache(req, resp.clone());
        return resp;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match("./index.html"))
      )
  );
});