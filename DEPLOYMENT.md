# Format — Deployment & Install Guide

Format is a **fully offline, local-first PWA**. There is **no build step, no backend,
and no dependencies to install** — every library lives in `lib/` and all your data is
stored locally in the browser (`localStorage` + `IndexedDB`). You can run it by simply
opening a file, or host it as a static site.

> **Browser:** Use a current Chromium browser (Microsoft Edge or Google Chrome).
> Format relies on Chromium features (the CSS `zoom` property, Pointer Events for the
> pen). Other browsers may work but are not tested.

---

## Option A — Run locally (quickest)

Just open the app file:

1. Download / clone this folder.
2. Double-click **`index.html`** (it opens in your default browser).

This runs everything except the installable-PWA / service-worker offline cache (those
require a real `http(s)` origin — see Option B). Documents, decks, ink and study stats
all still save locally.

---

## Option B — Serve it (recommended, enables PWA install + offline cache)

Serving over `http://localhost` activates the service worker so the app is installable
and works offline after the first load. Pick any one static server:

```bash
# Python 3 (no install needed on most machines)
python -m http.server 8080

# Node
npx serve .
#   or
npx http-server -p 8080
```

Then open **http://localhost:8080** in Edge/Chrome.

### Install it as an app (PWA)
1. Open the served URL in Edge/Chrome.
2. Click the **install icon** in the address bar (or menu → *Apps → Install Format*).
3. Format opens in its own window and works offline.

---

## Option C — Host it on the web (static hosting)

Because it's plain static files, you can deploy the folder as-is to any static host —
**no build command, output directory = the project root.**

- **GitHub Pages:** push to GitHub → repo *Settings → Pages* → deploy from `main` /
  root. (For a Pages **project** site served under `/<repo>/`, the relative paths and
  `sw.js` scope already work since everything is relative.)
- **Netlify / Vercel / Cloudflare Pages:** "deploy a static site", build command:
  *(none)*, publish directory: `.` (the project root).
- **Any web server / S3 / file share:** upload the whole folder.

Always serve **over HTTPS** in production so the service worker and PWA install work.

---

## What gets deployed

Ship the entire folder. Required at runtime:

```
index.html  manifest.json  sw.js
css/   src/   lib/   assets/
```

`tools/` (the Tailwind CLI used to regenerate `lib/tailwind.css`) and the project docs
(`README.md`, `PROGRESS.md`, `DEPLOYMENT.md`) are **not needed at runtime** and can be
omitted from a deploy if you like.

---

## Updating a deployed copy

The service worker caches everything with a version string. When you change any file,
bump `CACHE_VERSION` near the top of **`sw.js`** (e.g. `"v4"` → `"v5"`) and redeploy —
clients will fetch the new version on next load. (If you're testing locally, a hard
refresh — Ctrl+Shift+R — also picks up changes.)

---

## Data & privacy

All content (documents, ink strokes, flashcard decks, study stats) is stored **only in
the browser on that device**. Nothing is uploaded. Clearing the browser's site data, or
using a different browser/profile, starts fresh. To back up, use the in-app **Export**
(PDF/PNG) for documents.
