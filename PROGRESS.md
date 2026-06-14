# Format — Progress Tracker

> Last updated: 2026-06-13

---

## Status: ALL phases (0–14) complete · Flashcards refactored to a standalone feature

---

## All Decisions Confirmed

| Decision | Value |
|---|---|
| App name | **Format** |
| App icon | SVG pen-mark — **no emoji anywhere** |
| Framework | **Vanilla JS PWA** — no build step, open index.html |
| Platform | **Windows + Tablet equally** (iPad, Android) |
| CSS approach | **Vanilla CSS custom properties** + optional Tailwind pre-generated |
| Theme base | `#051224` dark navy |
| Navy deep (study bg) | `#020c1a` |
| Navy primary (nav) | `#051224` |
| CTA button | `#de7914` amber → hover `#e89520` (shifts more yellow) |
| Font | **Inter WOFF2 self-hosted** — `assets/fonts/inter/` — no CDN |
| Toolbar style | Floating panel (Canva-style, dark navy pill) |
| Ink layer | GoodNotes-style overlay canvas above typed page |
| Study mode | Lufthansa flight status card — accessible from **Home and Editor** |
| Study mode bg | Static dark navy `#020c1a` — no animation |
| Multi-page model | Scrollable A4 blocks (Word-style) |
| Ink-to-text OCR | No OCR — keep truly offline and simple |
| Flashcard study | Simple flip cards first — SRS (spaced repetition) added later |
| Equation editor | LaTeX input + live KaTeX preview |
| Libraries | **ALL bundled locally in `lib/`** — zero CDN, zero network at runtime |

---

## Production Folder Structure

```
format/
│
├── index.html                  ← App shell
├── manifest.json               ← PWA manifest
├── sw.js                       ← Service worker (offline)
│
├── css/
│   ├── main.css                ← CSS variables (colors, type, spacing)
│   ├── nav.css
│   ├── home.css
│   ├── editor.css              ← Toolbar, A4 canvas, ink overlay
│   ├── study.css               ← Flight card, timer, setup
│   ├── modals.css
│   └── responsive.css
│
├── src/
│   ├── app.js                  ← Entry: view router, init
│   ├── views/
│   │   ├── home.js
│   │   ├── editor.js
│   │   └── study.js
│   ├── components/
│   │   ├── toolbar.js
│   │   ├── doc-card.js
│   │   ├── flight-display.js   ← Study theme 1: Lufthansa flight card
│   │   ├── transit-display.js  ← Study theme 2: BTS/MRT Bangkok transit map
│   │   └── modal.js
│   ├── engine/
│   │   ├── doc-store.js        ← localStorage + IndexedDB
│   │   ├── editor-cmd.js       ← execCommand + keyboard map
│   │   ├── timer.js
│   │   ├── export.js
│   │   ├── ink-canvas.js       ← Pointer Events, pressure, palm reject
│   │   └── templates.js
│   └── utils/
│       ├── date.js
│       └── dom.js
│
├── lib/                        ← All third-party, bundled — NO CDN ever
│   ├── pdf.min.js              ← PDF.js (Mozilla)
│   ├── pdf.worker.min.js
│   ├── katex.min.js            ← KaTeX equations
│   ├── katex.min.css
│   ├── fonts/                  ← KaTeX font files (woff2/woff/ttf, 60 files)
│   ├── jspdf.min.js            ← PDF export
│   ├── html2canvas.min.js      ← PNG export
│   └── tailwind.css            ← Pre-generated Tailwind v4 output (navy/amber theme)
│
├── tools/                       ← Build-only, not part of shipped app
│   ├── tailwindcss.exe          ← Tailwind v4 standalone CLI (Windows)
│   └── input.css                ← Tailwind @theme source → builds lib/tailwind.css
│
└── assets/
    ├── icons/
    │   ├── logo.svg
    │   ├── icon-192.png
    │   ├── icon-512.png
    │   └── apple-touch.png
    └── fonts/
        └── inter/
            ├── inter-200.woff2
            ├── inter-300.woff2
            ├── inter-400.woff2
            ├── inter-500.woff2
            ├── inter-600.woff2
            └── inter-700.woff2
```

---

## Phase Roadmap

---

### Phase 0 — Planning & Scaffold `[COMPLETE]`

- [x] Define concept and features
- [x] Confirm app name: Format
- [x] Confirm framework: Vanilla JS PWA
- [x] Confirm color palette: `#051224` navy + `#de7914` amber
- [x] Confirm font: Inter self-hosted
- [x] Confirm fully offline — no CDN
- [x] Confirm production folder structure
- [x] Resolve all open design questions
- [x] Create empty folder scaffold (`css/`, `src/`, `lib/`, `assets/`)
- [x] Download and place library files into `lib/`:
  - [x] PDF.js (`pdf.min.js` + `pdf.worker.min.js`)
  - [x] KaTeX (`katex.min.js` + `katex.min.css` + `fonts/`)
  - [x] jsPDF (`jspdf.min.js`)
  - [x] html2canvas (`html2canvas.min.js`)
- [x] Download Inter WOFF2 files into `assets/fonts/inter/` (6 weights)
- [x] Create `logo.svg` — pen-mark SVG icon (clean, no emoji)
- [x] Generate PWA icons: `icon-192.png`, `icon-512.png`, `apple-touch.png` from `logo.svg`
- [x] Write `manifest.json`
- [x] Write `sw.js` skeleton (cache-first strategy)
- [x] Set up Tailwind v4 standalone CLI (`tools/tailwindcss.exe` + `tools/input.css`) → generated `lib/tailwind.css` with navy/amber theme tokens (rebuild with `tools/tailwindcss.exe -i tools/input.css -o lib/tailwind.css --minify` as views are added)

---

### Phase 1 — Shell & Navigation `[COMPLETE]`

Files: `index.html` · `css/main.css` · `css/nav.css` · `src/app.js`

> **Architecture note:** `<script type="module">` is blocked by CORS when `index.html`
> is opened via `file://` in Chromium browsers (verified during this phase). All
> `src/` files are therefore plain `<script>` files loaded in dependency order via
> `index.html`, using an IIFE + shared `window.Format` namespace instead of
> `import`/`export`. This applies to every future phase's JS files.

#### Tokens & typography (`tools/input.css` @theme + `css/main.css`)
- [x] All color tokens (navy range, amber, white, neutrals) — defined as Tailwind v4 `@theme` vars in `tools/input.css`, generates `bg-navy-800`, `text-amber`, etc.
- [x] Typography scale (size + weight per role) — `.text-display`, `.text-heading`, `.text-card-title`, `.text-label`, `.text-iata` in `css/main.css`
- [x] Spacing / radius / shadows — handled via Tailwind utilities directly (no separate tokens needed)
- [x] Inter font-face declarations (all 6 weights from `assets/fonts/inter/`) + `--default-font-family` set to Inter

#### Home top nav
- [x] Dark navy `#051224` bar, 56px (`h-14`) height
- [x] Left: SVG pen logo + "Format" wordmark
- [x] Center: nav links — My Documents · Templates · Study Mode
- [x] Right: search icon (SVG) + amber "+ New" button
- [x] Active link: amber bottom-border accent + 600 weight (`.topnav__link.is-active` in `css/nav.css`)
- [x] Study Mode nav link opens study mode view directly from home

#### View routing (`app.js`)
- [x] `showView(name)` — toggles `hidden` class, hides others
- [x] Views: `home`, `editor`, `study`
- [x] Browser back button support (History API)
- [x] Document title updates per view
- [x] Verified via headless Edge screenshot: `#study` hash correctly hides home view and activates Study Mode nav link

#### Home hero
- [x] Deep navy bg, full-width
- [x] Display heading: weight 200, large, white (`.text-display`)
- [x] Subheading: weight 300, muted (navy-100 on navy-800)
- [x] Search bar: underline style (not boxed), white text on navy (`.hero-search`)

#### App footer
- [x] Navy bg, pen logo + "Format", offline note (inside `#view-home`)

#### Stub files created for later phases
- [x] `css/home.css`, `css/editor.css`, `css/study.css`, `css/modals.css`, `css/responsive.css` — empty placeholders with phase-reference comments, linked from `index.html` so the shell is final

---

### Phase 2 — Home Content `[COMPLETE]`

Files: `css/home.css` · `src/views/home.js` · `src/components/doc-card.js` · `src/engine/doc-store.js` · `src/utils/date.js` · `src/utils/dom.js`

#### Document card grid
- [x] Grid: auto-fit, min 200px per card, gap 16px
- [x] Document card: white bg, border, 10px radius, shadow on hover
- [x] Card content: type icon (SVG) · title · last-modified date · template type badge
- [x] "New document" card: dashed border, centered plus icon
- [x] Empty state: friendly message + prompt to create first doc
- [x] Load cards from localStorage on mount (`Format.DocStore.getAll()`)

#### Template grid ("Start something new")
- [x] 5 template cards — Blank A4, Table Doc, To-Do/Routine, Flashcard Deck, PDF Import
- [x] Light surface bg, centered SVG icon, label, short desc
- [x] Hover: amber bottom-border accent

#### Search
- [x] Filter doc grid in real-time on input (`.hero-search`)
- [x] No match: empty state message (`#doc-no-results`)

---

### Phase 3 — New Document Flow `[COMPLETE]`

Files: `src/components/modal.js` · `src/engine/doc-store.js` · `src/engine/templates.js` · `css/modals.css`

- [x] Modal: "New document" overlay — 5 preset cards
- [x] Modal open/close, overlay click dismiss, Escape key
- [x] `doc-store.js`:
  - [x] `createDoc(type, title)` → generates ID, saves to localStorage
  - [x] `getAll()` → returns sorted array (most recent first)
  - [x] `getDoc(id)` → returns doc metadata
  - [x] `saveContent(id, html)` → saves to IndexedDB
  - [x] `loadContent(id)` → retrieves from IndexedDB
  - [x] `deleteDoc(id)` → removes from both stores
  - [x] `renameDoc(id, title)`
- [x] `templates.js`: generates initial HTML per preset:
  - [x] `blank` → `<p><br></p>`
  - [x] `table` → 4×4 HTML table with `<th>` header row
  - [x] `todo` → checkbox list with 3 sample rows
  - [x] `flashcard` → front/back card HTML wrapper
  - [x] `pdf` → file picker trigger placeholder

---

### Phase 4 — Editor Shell `[COMPLETE]`

Files: `css/editor.css` · `src/views/editor.js` · `src/engine/editor-cmd.js`

> **Visual reference:** Bluebook (College Board digital SAT app) — clean, distraction-free,
> minimal navy chrome, generous whitespace, flat buttons, subtle dividers. Same navy/amber/white
> palette as the rest of the app, applied with a calmer, more "testing interface" feel.

#### Editor top nav
- [x] White bar, 52px, `border-bottom: 1px solid var(--border)`
- [x] Left: back button (arrow SVG + "Format") + breadcrumb "/" + inline-editable title
- [x] Center: auto-save indicator ("Saved" / "Saving…" / "Unsaved")
- [x] Right: Study Mode btn · Export btn · amber "Save" btn
- [x] Title blur → save doc rename to localStorage

#### A4 page canvas
- [x] Light gray canvas bg (`--navy-50`)
- [x] White A4 pages: `794px × 1123px`, 32px padding, 10px radius, subtle shadow
- [x] Pages stack vertically with 32px gap
- [x] New page added when content overflow detected
- [x] `contenteditable="true"`, `spellcheck="true"`
- [x] Placeholder text on empty page

#### Keyboard shortcut layer (`editor-cmd.js`)
- [x] Ctrl+B Bold · Ctrl+I Italic · Ctrl+U Underline
- [x] Ctrl+Z Undo · Ctrl+Y / Ctrl+Shift+Z Redo
- [x] Ctrl+A Select all · Ctrl+S Save · Ctrl+P Print/Export
- [x] Tab → indent · Shift+Tab → outdent
- [x] Ctrl+C/V/X Copy/Paste/Cut (browser default, ensure no override)

---

### Phase 5 — Floating Toolbar `[COMPLETE]`

Files: `css/editor.css` · `src/components/toolbar.js` · `src/engine/editor-cmd.js`

#### Visual
- [x] Dark navy `#051224` pill, centered, sticky below editor nav
- [x] White/light SVG icons, 32px button hit targets
- [x] Amber left/bottom border on active formatting state
- [x] Groups separated by `1px` vertical dividers

#### Controls
- [x] Font family dropdown (Inter, Georgia, Consolas, Times New Roman, Arial, Courier New)
- [x] Font size: `−` / number input / `+`
- [x] Bold · Italic · Underline · Strikethrough · Subscript · Superscript
- [x] Change case: cycles UPPERCASE → lowercase → Title Case
- [x] Clear all formatting
- [x] Align: Left · Center · Right · Justify
- [x] Bullet list · Numbered list
- [x] Indent decrease · Indent increase
- [x] Text color: SVG "A" icon with color swatch strip → color picker
- [x] Highlight color: SVG marker icon → color picker
- [x] Insert table (opens row×col picker)
- [x] Insert image (local file only)
- [x] Page break

#### State sync
- [x] `selectionchange` event → read active formatting, highlight toolbar buttons
- [x] Font family/size read from selection and update dropdowns

---

### Phase 6 — Document Persistence `[COMPLETE]`

Files: `src/engine/doc-store.js`

- [x] Auto-save on input, debounced 1.5s
- [x] Save indicator: "Saving…" → "Saved"
- [x] Doc content (HTML) saved to IndexedDB
- [x] Ink strokes saved to IndexedDB (separate object store) — store + `saveStrokes`/`loadStrokes` CRUD ready; populated once Phase 8 adds the ink canvas
- [x] Load on editor open
- [x] Rename from inline title
- [x] Delete from home card (confirm dialog)
- [x] Duplicate doc

---

### Phase 7 — Study Mode `[COMPLETE]`

Files: `css/study.css` · `src/views/study.js` · `src/components/flight-display.js` · `src/components/transit-display.js` · `src/engine/timer.js`

#### Access
- [x] Home top-nav "Study Mode" link → opens study view directly
- [x] Editor top-nav "Study Mode" button → same

#### Setup panel
- [x] Full dark `#020c1a` background
- [x] "From" field: code input (uppercase enforced, max 5 chars) + full subject name
- [x] "To" field: same
- [x] Duration chips: 25 / 45 / 60 / 90 min + custom number input
- [x] Amber "Board flight" CTA button

#### Flight card (session active)
- [x] Card: `#051224` bg, `1px solid rgba(255,255,255,.1)` border, `16px` radius
- [x] Header row: green dot + "SESSION ACTIVE" · session duration
- [x] Route row: `FROM_CODE` (72px, weight 700) · progress bar with plane SVG · `TO_CODE`
- [x] Subject names below codes in `--text-muted`
- [x] Countdown: `HH : MM : SS` large, weight 700, slightly green-tinted
- [x] Colon blink at 1Hz while running — stops when paused
- [x] Footer meta: Departed time · ETA · Status (green "On time")
- [x] Progress bar fills amber left→right; plane icon moves with `left` CSS %

#### `timer.js` engine
- [x] `start(totalSeconds)` / `pause()` / `resume()` / `reset()` / `onComplete(cb)`
- [x] Ticks every 1s via `setInterval`
- [x] Emits `tick` event with remaining seconds
- [x] Plane position = `(elapsed / total) * 100`%

#### Session controls
- [x] Pause / Resume · Reset · End session
- [x] "End session" → "Arrived" complete screen

#### Arrived screen
- [x] Plane SVG + "You've arrived." heading
- [x] Subject route + total time spent
- [x] "New session" button → back to setup

---

#### Study Mode Theme 2 — BTS / MRT Transit Map `[REMOVED — see Phase 7 follow-up #3]`

> Superseded: the Transit theme, theme toggle, and "Stations" field were removed in
> the "long-haul itinerary" follow-up below. `transit-display.js` was deleted.
> Section kept for history.

Inspired by Bangkok Skytrain (BTS) / Metro (MRT) station maps as a meme.  
Same timer engine, different visual skin. Theme selector on the setup panel.

**Visual concept:**
```
  ●━━━━━━━━━━━━━●━━━━━━━━━━━━━●━━━━━━━━━━━━━●
 MTH            e              π             PHY
Mathematics   Euler          Pi (π)        Physics
  [START]     sub-topic      sub-topic      [END]
```

- Thick horizontal line (amber `#de7914`) connecting all stations
- Stations = large filled circles (18–24px) on the line
- **First and last station** = the FROM / TO subjects set in the setup form
- **Middle stations** = optional sub-topics the user names (e.g. `e`, `π`, `σ`, any label)
- Station name above the dot (short code) + full name below
- Current position: a filled train-car rectangle slides along the line
- As time passes, the train moves proportionally toward the destination station
- When train reaches a middle station dot → that station pulses / highlights
- Dark navy `#020c1a` background, amber line, white station dots with amber border

**BTS/MRT aesthetic details:**
- Station dots: `border: 3px solid #de7914`, white fill, `border-radius: 50%`
- Line: `height: 4px`, amber, with a subtle glow `box-shadow: 0 0 8px #de7914`
- Station labels: uppercase, weight 600, 11px, letter-spacing `.1em` — matches real BTS signage feel
- Full name below in weight 300, muted color
- Terminal stations (start/end) slightly larger dots and bold name
- Train icon: small rounded rectangle in amber with a subtle shadow moving left → right

**Setup panel additions for transit theme:**
- [x] Theme toggle on setup: "Flight" / "Transit" — two chip buttons
- [x] When "Transit" selected: extra field "Stations (optional)" — comma-separated sub-topic labels
  - e.g. input: `e, π, σ` → renders 3 intermediate station dots between FROM and TO
  - Max 5 intermediate stations
  - Blank = just FROM and TO as the two terminal stations

**Implementation:**
- [x] `src/components/transit-display.js` — separate component file for the transit skin
- [x] `css/study.css` — `.theme-transit` class block for transit-specific styles
- [x] Station positions = evenly spaced % across the line based on station count
- [x] Train position CSS `left` % derived from `(elapsed / total) * 100`
- [x] Station highlight trigger: when train passes a station's `left` % → add `.passed` class → amber fill, pulse keyframe animation
- [x] Intermediate station labels editable in setup → stored in session state, not persisted

**Arrived screen for transit theme:**
- Train SVG reaching final station with a "doors open" pulse effect
- "You've reached [TO station]." heading instead of "You've arrived."

---

#### Phase 7 follow-up — Home streak/total stats, layover, minimal full-page Study Mode

Files: `src/engine/study-stats.js` (new) · `src/views/home.js` · `src/views/study.js` · `src/components/flight-display.js` · `src/app.js` · `css/home.css` · `css/study.css` · `utils/dom.js`

- [x] New `.hero-stats` row in the home hero: flame icon + "N day streak" and clock icon + "Xm/Xh studied" (hero itself scrolls normally with the page — not pinned/sticky)
- [x] `Format.StudyStats` (`localStorage["format-study-stats"]`) — `recordSession(seconds)` adds elapsed time to today's bucket; `getStats()` returns `{ streak, totalSeconds, studiedToday }` (streak = consecutive days with recorded time, ending today or yesterday)
- [x] `home.js` `renderStats()` populates `#hero-stat-streak` / `#hero-stat-total`; called on init and whenever `app.js` `showView()` navigates to "home"
- [x] Study Mode is now a single flat `#020c1a` page with **no global nav** (`app.js` `showView()` toggles `<header>` `.hidden` based on `target === "study"`) — replaced by a minimal fixed "← Return to home" link (`.study-home-link`, top-left, `data-view="home"`) across setup/session/arrived/layover screens
- [x] Session screen redesigned as a borderless Lufthansa flight-board: `.flight-card` has no background/border/padding; compact countdown (`.study-countdown--compact` — small muted thin text, no blink, no tint) sits above a 1px route line with the plane icon; route codes below at weight 500; amber progress-fill bar removed (`flight-display.js` `update()` only moves the plane); two-column `.flight-meta` footer below a thin divider shows "Started"/"Est. finish" in large green (`#7ee2a8`) clock-style time
- [x] Removed the "SESSION ACTIVE" pulsing-dot header row and `@keyframes study-pulse` entirely
- [x] Session time is recorded to `Format.StudyStats` both on natural completion and on early "End session"
- [x] **Layover (break) feature**: arrived screen gains a "Layover before next session" section — duration chips (5/10/15 min) + custom-minutes input + "Start layover" button
- [x] Layover screen: theme-appropriate icon (plane/train, from the just-completed session), route `FROM → TO`, HH:MM:SS countdown (reuses `.study-countdown` base styling — large, thin, no blink), "Skip layover" button; on completion or skip, returns to setup with all retained field values (theme, from/to, duration)
- [x] Added `flame` and `clock` icons to `Format.icons`
- [x] Verified end-to-end via headless Chromium across two passes: stats (0 streak / 0m → updates after a session), layover start/route/skip, header hidden in Study Mode and visible again after "Return to home", Flight and Transit session screens render the minimal flight-board layout with zero console errors.

---

#### Phase 7 follow-up #3 — Long-haul itinerary replaces Transit theme

Files: `src/views/study.js` · `css/study.css` · `index.html` · `utils/dom.js` · `src/components/transit-display.js` (deleted)

- [x] Removed the Transit (BTS/MRT) theme entirely: deleted `transit-display.js`, the `train` icon, `.theme-transit`/`.transit-*` CSS, and `study-station-pulse`/`study-doors-open` keyframes
- [x] Setup screen ("Plan your day") replaces the From/To + theme toggle with a single `.study-origin` "Starting point" field plus a repeatable `.study-itinerary` list of stops (`.study-leg`), modeled as a long-haul flight with multiple connecting legs
- [x] Each leg has its own subject (code + name) and its own duration (25/45/60/90 min chips or custom minutes), independently selectable per stop — up to `MAX_LEGS = 5`, with "+ Add stop" / per-row remove button
- [x] One shared "Layover between stops" duration (chips + custom) applies to every connection in the itinerary
- [x] `readSetupFields()` syncs all live input values into state before any add/remove-leg re-render, so unsaved typed values survive list edits
- [x] New session data model: `{ origin, legs: [{code, name, totalSeconds}], layoverSeconds, currentLeg, completedSeconds, legStartedAt }`; `currentFrom()`/`currentTo()` derive the active leg's route from `origin`/`legs`/`currentLeg`
- [x] Session screen now always uses the flight-board display (no theme branching); when `legs.length > 1` an `.study-itinerary-strip` shows every stop code with `.is-done` / `.is-current` (amber) / upcoming states
- [x] Automatic progression: finishing a leg starts a between-leg layover (`startBetweenLegLayover`) using the shared layover duration, then auto-advances to the next leg (`startLeg`) until all legs are complete
- [x] `renderLayover()` is now a generic `{ totalSeconds, fromCode, toCode }` renderer shared by both automatic between-leg layovers and the existing post-arrival "layover before next session" feature
- [x] "Arrived" screen route is multi-stop: `finishItinerary()` builds `routeCodes` from `[origin, ...legs]` sliced to the completed/reached stop, so early-ending mid-leg correctly shows `ORIGIN → CURRENT-LEG-DESTINATION` rather than just the origin
- [x] Verified via headless Chromium: multi-leg setup with persisted field values across add/remove, leg-to-layover-to-leg auto-advance, itinerary strip done/current states, and correct multi-stop route on early-ended sessions — zero console errors

---

### Phase 8 — Pen / Ink Overlay `[COMPLETE]`

Files: `src/engine/ink-canvas.js` (new) · `src/views/editor.js` · `css/editor.css` · `index.html` · `src/utils/dom.js`

- [x] `<canvas class="ink-canvas">` overlaid on each A4 page (`position: absolute; inset: 0; z-index: 5`, `pointer-events: none` in type mode, `auto` only when `.editor-canvas.ink-active`)
- [x] Draw mode toggle button in editor topbar (`data-action="toggle-ink"`, "Draw"); toggles a floating ink toolbar and makes pages `contentEditable=false`
- [x] In pen mode: canvas intercepts pointer events, page is non-editable (caret hidden)
- [x] Pointer Events: `pointerdown` → `pointermove` (with `getCoalescedEvents` for smoothness) → `pointerup`/`pointercancel`
- [x] Reads `event.pointerType`; coordinates mapped to page CSS px and compensated for the editor's CSS `zoom` so strokes stay aligned
- [x] Palm rejection: ignores `pointerType === 'touch'` while a pen is in contact
- [x] Pressure → line width (`minWidth + (maxWidth − minWidth) * pressure`, falls back to 0.5 for mouse)
- [x] Tools: Pen (solid) · Highlighter (semi-transparent, wide) · Eraser (`destination-out`), plus a 6-color palette + per-page Clear
- [x] Strokes stored per page as `[ { tool, color, points: [{x,y,p}] } ]`, keyed by page index
- [x] Ink rendered to each page's canvas from stored data on load; persisted to IndexedDB via `DocStore.saveStrokes`/`loadStrokes`; `ResizeObserver` refits + redraws when a page grows. The ink `<canvas>` is stripped from the serialized HTML in `getContent()` so it never pollutes the saved document.
- [ ] Lasso select + shape recognition (closed ellipse → circle, 4-corner → rectangle): **deferred** — not implemented in this pass; core pen/highlighter/eraser + persistence shipped. Tracked for a later follow-up.

---

### Phase 9 — Templates Fully Wired `[COMPLETE]`

Files: `src/engine/templates.js` · `src/components/template-runtime.js` (new) · `src/views/editor.js` · `css/editor.css`

- [x] **Table Doc**: bordered table (thead `<th>` + tbody cells), editable cells; Tab / Shift+Tab navigate between cells, Tab on the last cell appends a row. Current cell resolved from the **selection** (not `event.target`) because nested contenteditable reports the outer page host as the keydown target; `stopPropagation` prevents the editor-cmd Tab→indent handler from also firing.
- [x] **To-Do**: `<input type="checkbox">` + `.todo-text` span; checking toggles `.is-done` (strike-through), Enter adds a new row (focused), Backspace on an empty row removes it and moves the caret up
- [x] **Flashcard**: deck with a 3D-flip card (`rotateY`), prev/next nav, live `n / N` counter, "+ Card" and "Delete" controls; flips on the Flip button or clicking the card frame (clicking a face edits it). Decks re-initialize after every content render via `TemplateRuntime.initDecks()`.
- [x] **PDF Import**: file picker → PDF.js (lazy-loaded from `lib/pdf.min.js`, worker `lib/pdf.worker.min.js`) renders each page to a 2× canvas → becomes the background `<img class="pdf-bg">` of its own `.a4-page--pdf` page, with an ink canvas on top for annotation

---

### Phase 10 — Export `[COMPLETE]`

Files: `src/engine/export.js` (new) · `css/editor.css` (`@media print`) · `index.html` (export modal) · `css/modals.css`

- [x] **PDF via print**: `@media print` block hides all chrome (nav, topbar, toolbar, zoom, ink toolbar, element panel, footer, modals), shows only A4 pages with `break-after: page`, triggers `window.print()`
- [x] **PDF via jsPDF**: html2canvas captures each `.a4-page` at 2× → JPEG added to a `pt`/A4 `jsPDF` doc, one page each, aspect-fit; saved as `{base}.pdf`. jsPDF + html2canvas lazy-loaded from `lib/`.
- [x] **PNG**: html2canvas captures each page → downloaded as `{title}-{date}-page-{n}.png` (no suffix for single-page docs)
- [x] Ink canvas included in export automatically (it lives inside `.a4-page`, so html2canvas/print capture it on top)
- [x] Filename: `{sanitized-title}-{YYYY-MM-DD}`; Export button wired to a 3-option chooser modal (Print / Download PDF / Download PNG); progress + result surfaced via toasts

---

### Phase 11 — PWA & Offline `[COMPLETE]`

Files: `manifest.json` · `sw.js` · `src/app.js`

- [x] `manifest.json`: name, icons 192+512 (any + maskable), `theme_color`/`background_color: #051224`, `display: standalone` (was already complete from Phase 0)
- [x] `sw.js` rewritten (`v2`): cache-first; **CORE_ASSETS corrected** to the real file set — removed the deleted `transit-display.js`, added every current `src/` file (ink-canvas, export, equation, study-stats, confirm-dialog, element-panel, table-tools, template-runtime, shortcuts, toast), Sarabun fonts, and all 20 KaTeX woff2 fonts. Install uses per-file `cache.add().catch()` so one missing optional asset can't abort the whole install.
- [x] Service worker registered from `app.js` — guarded to `http(s)` only (skipped silently over `file://`, where SW is unsupported but the app still runs fully from local files)
- [x] Cache-first fetch handler (existing) serves from cache, falls back to network then caches the response
- [x] All library files (`lib/`) + fonts pre-cached on install

---

### Phase 12 — Polish & Tablet Optimization `[COMPLETE]`

Files: `css/responsive.css` · `src/views/editor.js` · `src/views/home.js` · `src/components/shortcuts.js` (new) · `src/utils/toast.js` (new) · `css/modals.css` · `index.html`

- [x] Pinch-to-zoom on the canvas (two-finger `touchmove` ratio → `setZoom`) + Ctrl+scroll zoom + `touch-action: manipulation`
- [x] Toolbar reflow: already flex-wraps; narrow-width caps + tightened editor topbar/padding at `≤900px` and `≤640px` breakpoints in `responsive.css`
- [x] Keyboard shortcut overlay: `?` toggles a shortcuts cheatsheet modal (`shortcuts.js`), Escape closes
- [x] Error states: failed save shows "Save failed" status + an error toast (`Format.Toast`)
- [x] Loading skeleton for the home doc grid (shimmer placeholders for one frame before the localStorage read paints)
- [x] Smooth view transition: 200ms `view-fade` animation on `.view:not(.hidden)`
- [x] Accessibility: `:focus-visible` amber focus rings across interactive elements, existing aria-labels on buttons; `prefers-reduced-motion` disables animations
- [x] Safe-area insets (`env(safe-area-inset-*)`) on header, study return-link, ink toolbar, and toasts
- [ ] Swipe between pages: **deferred** (low value; would conflict with vertical page scroll)

---

### Phase 13 — Equation Editor `[COMPLETE]`

Files: `src/engine/equation.js` (new) · `src/components/toolbar.js` · `index.html` (KaTeX CSS link + modal) · `css/modals.css` · `css/editor.css` · `src/utils/dom.js`

- [x] Insert Equation (Σ toolbar button) opens a modal editor; the editor selection range is captured so the equation lands at the caret
- [x] LaTeX textarea with live KaTeX preview (display mode); parse errors shown inline; Ctrl+Enter inserts
- [x] Confirm inserts the rendered math as an inline, non-editable `.doc-equation` span (KaTeX HTML)
- [x] Equation source stored in `data-latex` on the span; **clicking an equation re-opens the editor** prefilled to edit/replace it
- [x] KaTeX lazy-loaded from `lib/katex.min.js` (CSS + fonts from `lib/`) — no CDN

---

### Phase 14 — Flashcard Spaced Repetition `[COMPLETE]`

Files: `src/engine/srs.js` (new) · `src/components/review.js` (new) · `src/engine/templates.js` · `src/components/template-runtime.js` · `src/views/home.js` · `src/views/editor.js` · `src/app.js` · `index.html` · `css/study.css` · `css/home.css` · `css/editor.css`

- [x] Review session: full-screen `#review-overlay` shows due cards one at a time; tap (or Space/Enter) flips front→back to reveal the answer
- [x] Self-rate: Hard / OK / Easy buttons (also keys 1/2/3); Escape closes
- [x] SM-2 scheduling (`Format.SRS`): per-card `{ ease, interval, reps, due, last }` in `localStorage["format-srs"]`; new cards always due; Hard lowers ease + small interval, OK = standard SM-2 progression, Easy boosts ease + interval
- [x] Due-today queue on home (`#review-queue`): scans flashcard docs, parses card ids from each deck's stored HTML, shows decks with due counts + "Review now"; refreshes on home navigation and after each grade
- [x] Progress heatmap per deck: 16-week contribution-style grid on the review "done"/caught-up screen, backed by a daily review log (`localStorage["format-srs-log"]`)
- [x] Stable `data-card-id` on every flashcard (generated in `Templates.card`, backfilled on older decks via `ensureDeckReady`); "Review" button added to the flashcard deck controls; review launchable from the editor (reads live deck, saves first) or the home queue (loads from store)

---

## Decisions Log

| Date | Decision | Notes |
|---|---|---|
| 2026-06-13 | Fix "Vercel won't update" (service-worker + CDN caching) | Deploys weren't reaching users because (a) the SW was **cache-first** and `CACHE_VERSION` wasn't bumped, so old assets kept serving, and (b) the CDN could serve a stale `sw.js`. Fixes: bumped `CACHE_VERSION` v4→v5; rewrote the SW fetch strategy to **network-first for the app shell** (HTML/CSS/JS/manifest) with cache fallback, keeping **cache-first only for `lib/` + fonts/icons** (still fully offline); added **`vercel.json`** with `Cache-Control: max-age=0, must-revalidate` on `sw.js`/`index.html`/`/`/`manifest.json` (+ `Service-Worker-Allowed: /`); and `app.js` now **auto-reloads once** on `controllerchange` when an updated worker takes control (skips first install). Net effect: an online reload picks up new deploys automatically while offline use is preserved. Load-tested, zero console errors. |
| 2026-06-09 | Project initialized | Initial planning session |
| 2026-06-09 | App name: **Format** | Working title was NoteForge |
| 2026-06-09 | Framework: **PWA Vanilla JS** | No build tool required |
| 2026-06-09 | Theme: dark navy around `#051224`, amber `#de7914` CTA | Lufthansa-inspired but darker |
| 2026-06-09 | Amber hover shifts more yellow: `#e89520` | User spec: lower toward yellow on hover |
| 2026-06-09 | Inter font self-hosted WOFF2 | No CDN — fully offline |
| 2026-06-09 | Floating toolbar (Canva-style) | Not a fixed ribbon |
| 2026-06-09 | Ink: GoodNotes overlay canvas | Simpler than inline OneNote model |
| 2026-06-09 | Study mode: Lufthansa flight card | IATA codes, progress bar, departure/ETA |
| 2026-06-09 | Study mode: accessible from Home AND Editor | Not locked to editor only |
| 2026-06-09 | Study bg: static dark navy | No animation — clean, no distraction |
| 2026-06-09 | No CDN, no internet at runtime | All libs in `lib/`, fonts in `assets/` |
| 2026-06-09 | Icons: SVG only, no emoji | Consistent, scalable, offline-safe |
| 2026-06-09 | Multi-page: scrollable A4 blocks | Word-style, most familiar |
| 2026-06-09 | No OCR at launch | Keeps app fully offline, simpler |
| 2026-06-09 | Flashcard: flip cards first, SRS later | Ship faster, add SRS in Phase 14 |
| 2026-06-09 | Equation editor: LaTeX + KaTeX | Offline via `lib/katex.min.js` |
| 2026-06-09 | Study mode theme 2: BTS/MRT Bangkok transit map | Stations = subjects + optional sub-topic stops (e, π, etc.), amber line, train slides along |
| 2026-06-10 | Phase 0 scaffold complete | Folders, `lib/` deps (PDF.js, KaTeX+fonts, jsPDF, html2canvas), Inter WOFF2 (6 weights), `logo.svg`, PWA icons, `manifest.json`, `sw.js` skeleton all in place |
| 2026-06-10 | Tailwind v4 standalone CLI added under `tools/` | `tools/input.css` defines `@theme` with navy/amber tokens + Inter font family → builds `lib/tailwind.css` (no Node, no CDN) |
| 2026-06-10 | Phase 1 (Shell & Navigation) complete | `index.html`, `css/main.css`, `css/nav.css`, `src/app.js` — top nav, hero, view routing, footer. Verified visually via headless Edge screenshots. |
| 2026-06-10 | **No ES modules** — all `src/` JS uses plain `<script>` + IIFE + `window.Format` namespace | `type="module"` is blocked by CORS over `file://` in Chromium, which would break "double-click index.html" — discovered and fixed during Phase 1 |
| 2026-06-10 | Nav active state: amber bottom-border accent | User chose this style over left-border, pill, or background-highlight options for `.topnav__link.is-active` |
| 2026-06-10 | Fixed nav double-underline bug | `showView()` was matching `is-active` on every `.topnav__link[data-view="home"]`, which included the "Templates" link (it shares `data-view="home"` with "My Documents" but adds `data-section="templates"`). Fix: `is-active` now also requires `!link.dataset.section`. "Templates" click now scrolls to `#templates` via `scrollIntoView`. |
| 2026-06-10 | Phase 2 (Home Content) complete | `doc-store.js` (`getAll`), `doc-card.js` (doc + new-doc card renderers), `home.js` (render grid, search filter, empty/no-results states), `home.css`, 5 template cards in `index.html`, `utils/date.js` + `utils/dom.js` (icons, escapeHtml). Verified visually via headless Edge — empty state + template grid render correctly. |
| 2026-06-10 | Footer redesigned | Two-column flex footer: logo/Format/offline-note left, "Developed by ปลามึกยักษ์" + GitHub icon link (`github.com/Ray0737`) right. New `github` icon added to `Format.icons` in `utils/dom.js`, styled per `Website - NSC prototype 04` convention. |
| 2026-06-10 | Confirmed top nav already sticky | `<header class="sticky top-0 z-50 ...">` was set during Phase 1 — no change needed for "stick to top banner" request. |
| 2026-06-10 | Phase 3 (New Document Flow) complete | `templates.js` (per-type initial HTML generators), `doc-store.js` extended with full CRUD + IndexedDB (`format-db`/`content` store) for `saveContent`/`loadContent`/`deleteDoc`/`renameDoc`, `modal.js` (event-delegated "New document" modal — template picker grid, name input, Escape/overlay/Cancel close, Enter/Create submits via `DocStore.createDoc` then routes to editor), `modals.css`. Verified visually via headless Edge — modal renders with all 5 type cards, Blank A4 selected by default. |
| 2026-06-10 | Footer redesigned again (Studio-style) | Replaced two-column footer with a centered "Studio"-style layout: logo + uppercase "FORMAT" wordmark, all-caps tagline row (100% Offline / No Account Needed / Your Data Never Leaves This Device) with bullet separators, divider, nav-links row (My Documents / Templates / Study Mode), single GitHub square icon button, dev credit + copyright line. Reference: user-provided "STUDIO" footer screenshot. |
| 2026-06-10 | Project folder renamed `NoteForge/` → `Program - Format/` | User moved/renamed the project directory; no path references inside the app needed changes (all paths are relative). |
| 2026-06-10 | Phase 4 (Editor Shell) complete | `css/editor.css` (sticky topbar below global nav, A4 page styles, placeholder via `.is-empty`), `src/views/editor.js` (`Format.Editor.open/save` — loads doc title + content from `DocStore`, renders `.a4-page` divs split on a page-break marker, debounced-free manual save, "Saved"/"Unsaved" status, auto-adds a new page when the last page's `scrollHeight` exceeds the nominal A4 height), `src/engine/editor-cmd.js` (Ctrl+B/I/U via `execCommand`, Tab/Shift+Tab indent/outdent, Ctrl+S triggers save; undo/redo/select-all/copy/paste/print left to browser defaults). Wired doc-card clicks and modal "Create" to `Format.Editor.open(id)`; `app.js` routing converted to event delegation so dynamically-rendered doc cards work. Verified visually via headless Edge — topbar, breadcrumb, title input, save status, A4 pages, and empty-page placeholder all render correctly. |
| 2026-06-10 | Phase 5 (Floating Toolbar) complete | `src/components/toolbar.js` renders a dark-navy floating pill (`#editor-toolbar`) sticky below the editor topbar: font family select, font size −/input/+, Bold/Italic/Underline/Strikethrough/Sub/Superscript, change-case cycle (UPPER → lower → Title), clear formatting, align L/C/R/justify, bullet/numbered lists, indent/outdent, text-color and highlight-color popovers (preset swatches), insert-table popover (8×8 row×col grid picker), insert-image (local file → data URL via `insertImage`), and insert-page-break. `src/engine/editor-cmd.js` extended with `queryState`/`queryValue`, `setFontSize` (execCommand fontSize=7 + swap `<font size>` for inline px), `changeCase`, `clearFormatting`, `insertTable`, `insertImageFile`. `src/views/editor.js` gained `insertPageBreak()` (splits the current `.a4-page` at the caret into two pages via Range.extractContents). Toolbar preserves the editor selection across control clicks by saving/restoring the Range (`mousedown` preventDefault + `selectionchange` tracking), since clicking toolbar buttons would otherwise collapse the contenteditable selection. `selectionchange` syncs `.is-active` button states and the font family/size controls via `queryCommandState`/`queryCommandValue`. Added 11 new SVG icons to `Format.icons`. Verified visually via headless Edge — toolbar pill, all icon groups, and the table grid popover render correctly. |
| 2026-06-10 | Phase 5 follow-up fixes (pre-Phase 6) | Three polish items requested before starting Phase 6: (1) **Delete document** — `doc-card.js` restructured from a single `<a>` card into a `relative` wrapper `<div>` containing an `absolute inset-0` nav `<a data-view="editor" data-doc-id>` plus a `data-action="delete-doc"` trash button (visible on hover); `home.js` adds a delegated click handler that confirms via `confirm()` and calls the existing `Format.DocStore.deleteDoc(id)`, then re-renders preserving the search query. (2) **Floating element control panel** — inserted images are now wrapped in absolutely-positioned `.doc-element` containers (`contenteditable="false"`, with a `.doc-element__handle` drag grip) inside `.a4-page`; new `src/components/element-panel.js` (`Format.ElementPanel`) handles click-to-select (`.is-selected`), drag-to-move (clamped to page bounds), lock/unlock (`.is-locked`, disables dragging), and bring-forward/send-backward (swaps `z-index` with the adjacent stacked element) via a shared `#element-panel` dark pill positioned above the selection; `Format.EditorCmd.insertImageFile` rebuilt to measure the image and append the `.doc-element` wrapper directly (no longer uses `execCommand("insertImage")`); `Format.Editor.markUnsaved()` exported for non-input mutations (move/lock/reorder/delete) to flag "Unsaved". (3) **Underline-style inputs** — `.modal__input` (`css/modals.css`, used by the "New document" name field) and `.editor-title-input` (`css/editor.css`) converted from bordered boxes to `.hero-search`-style underlines (`border: none; border-bottom: 1px solid var(--color-border)`, amber on focus). Added `trash`, `move`, `lock`, `unlock`, `bring-forward`, `send-backward` icons to `Format.icons`. Verified visually via headless Edge — doc card delete button, new-doc modal underline input, editor title underline input, and the floating element panel (with drag handle, amber selection outline, and panel buttons) all render correctly. |
| 2026-06-10 | Phase 6 (Document Persistence) complete | All persistence behaviors were already implemented incrementally during the two pre-Phase-6 fix batches: debounced (1.5s) autosave with "Unsaved" → "Saving…" → "Saved" indicator (`editor.js` `scheduleSave`/`performSave`), HTML content in IndexedDB `content` store, ink `strokes` object store + `saveStrokes`/`loadStrokes` CRUD in `doc-store.js` (ready for Phase 8's ink canvas to populate), content + title load on `Format.Editor.open()`, inline-title rename on blur, home-card delete via `Format.ConfirmDialog`, and duplicate via `Format.DocStore.duplicateDoc` (copies metadata, content, and strokes). Verified end-to-end with a headless Playwright Chromium run against `index.html` over `file://`: create doc → type → status goes Unsaved → Saving… → Saved → rename → reload → content and title persisted → duplicate → delete (confirm dialog) → cleanup, with zero console errors. |
| 2026-06-10 | Second pre-Phase-6 fix batch | Five more polish items: (1) **Bullet/numbered lists** — Tailwind v4 preflight resets `ol,ul,menu{list-style:none}`, which made `execCommand("insertUnorderedList"/"insertOrderedList")` produce invisible markers; `css/editor.css` now restores `.a4-page ul/ol/li` list-style, padding, and margin (with nested circle/square markers for sub-lists). (2) **Thinner doc-type icons** — the 5 `TYPE_META` icons (`blank`, `table`, `todo`, `flashcard`, `pdf`) in `Format.icons` (`utils/dom.js`) changed from `stroke-width="2"` to `"1.5"`. (3) **Custom confirm dialog** — new `src/components/confirm-dialog.js` (`Format.ConfirmDialog.open(message, options)` returns a Promise<boolean>), `#confirm-modal` markup added to `index.html` (reuses `.modal-overlay`/`.modal` styling, new `.modal--sm`/`.modal__message`/`.modal__btn--danger` in `modals.css`); `home.js`'s delete handler now uses it instead of native `confirm()`. (4) **Floating tables** — `Format.EditorCmd.insertTable(rows, cols)` rewritten to build a `.doc-element.doc-element--table` wrapper (same drag/lock/reorder/delete system as images, "editable island" pattern: wrapper `contenteditable="false"`, inner `<table contenteditable="true">`) with `<colgroup><col>` widths and per-row heights; first-row cells get `.col-resizer` handles and first-column cells get `.row-resizer` handles. New `src/components/table-tools.js` (`Format.TableTools`) drags these to resize `<col>` width / `<tr>` height; resizers show a faint amber line on hover/selection and are hidden via CSS when `.is-locked`. (5) **Image resize + zoom** — `insertImageFile` now adds a `.doc-element__resize` corner handle (amber circle, bottom-right, shown when selected+unlocked); `element-panel.js` gained `startResize()` (aspect-ratio-locked drag) wired into its mousedown delegation. New floating `.editor-zoom` pill (bottom-right of `#view-editor`) with -/percentage/+ controls; `editor.js` gained `setZoom()` (Chromium `zoom` CSS property, clamped 50%-150%, 10% steps), wired to `[data-action="zoom-in"/"zoom-out"]` and reset to 100% on `Format.Editor.open()`. Verified visually via a temporary headless-Edge test harness (deleted after use) — lists, table resizers (visible/hidden by lock state), image resize handle, confirm dialog, and zoom pill all render correctly; home page icons confirmed thinner. |
| 2026-06-10 | Footer redesigned (EDU_hub layout) | Edited footer of `index.html` in `Program - Format` to match the layout of `Website - EDU_hub` (NSC prototype 04), changing text brand from 'Edu_Hub' to 'Format' and spelling of developer name to 'ปลาหมึกยักษ์'. Added inline SVG icons (GitHub + Email), matched background color to the top nav / header (`--color-navy-800`), and tuned padding to match layout height requirements offline-first. |
| 2026-06-10 | Phase 7 (Study Mode) complete | `src/engine/timer.js` (`Format.Timer.create()` — pure countdown engine: `start/pause/resume/reset/stop/isRunning/onTick/onComplete/snapshot`, 1s ticks). `src/components/flight-display.js` and `src/components/transit-display.js` are pluggable visual renderers (`renderVisual(session)` + `update(container, tickState)`), selected at runtime via `session.theme`. `src/views/study.js` (`Format.StudyView`) owns the three-screen state machine — setup (theme toggle, From/To code+name fields with uppercase/5-char enforcement, duration chips 25/45/60/90 + custom input, optional Stations field for Transit) → session (Lufthansa-style flight card with pulsing green "SESSION ACTIVE" dot, amber progress bar + plane icon, green-tinted HH:MM:SS countdown with 1Hz colon blink that pauses via `.is-paused`, Departed/ETA/Status footer, for Transit a BTS/MRT station map with amber line, code-above/name-below station labels, sliding train, `.is-passed` station pulse) → arrived (theme-specific heading/icon, route + total/early time, "New session" resets to setup while retaining form field values). Added `plane`, `train`, `play`, `pause`, `refresh`, `log-out`, `check-circle` icons to `Format.icons`. New `css/study.css` with `study-blink`, `study-pulse`, `study-station-pulse`, `study-doors-open` keyframes. Wired `#study-stage` container + 4 new `<script>` tags into `index.html`. Verified end-to-end via headless Chromium (Playwright): setup field validation, theme toggle show/hide of Stations field, Flight and Transit session rendering, live countdown ticking, progress bar/train movement, Pause/Resume (including blink pause), Reset, End-session → Arrived (early-end label), natural completion → Arrived ("Total time" label, via an accelerated-tick Timer clone for the test only), New-session round trip, and the Editor's Study Mode button — zero console errors throughout. |
| 2026-06-10 | Phase 7 follow-up: home streak/total-time stats + layover feature | New `.hero-stats` row in the home hero shows day-streak (flame icon) and total study time (clock icon), backed by new `src/engine/study-stats.js` (`Format.StudyStats.recordSession/getStats`, `localStorage["format-study-stats"]`, streak = consecutive days with recorded study time). Added a "layover" (break) feature: arrived screen offers duration presets/custom input + "Start layover", leading to a countdown screen (route + theme icon retained from the just-finished session) with "Skip layover", returning to setup with all fields retained. Session time records to `StudyStats` on natural completion and early end. |
| 2026-06-13 | Tablet fixes: portrait nav menu, palm-rejection, no pinch-while-drawing, less cramped | From tablet testing: (1) **Portrait navigation** — the inline nav was hidden below 768px (and cramped 768–834 where most tablets sit in portrait), so Flashcards/Study were unreachable. Switched the breakpoint to **900px**: ≥900 shows the inline nav, <900 shows a new **hamburger dropdown menu** (`#nav-menu` + `[data-action="nav-menu"]`, toggled in `app.js`, closes on nav/outside click; active state synced). Removed the dead search icon to free header space. (2) **Palm = pen / accidental zoom** — pinch-to-zoom is now disabled while Draw mode is on (a resting palm + pen no longer zooms), and ink adds a `penSeen` flag so once a stylus is used, **all touch input is rejected** (true palm rejection); finger-only devices still draw. (3) **Cramped UI** — ink toolbar now wraps (max-width 100vw); editor top bar at ≤900px tightens buttons and drops the inline "Saved" text (auto-save still runs). Verified via headless Chromium 10/10 (portrait hamburger opens + navigates, desktop inline nav, pen draws + palm rejected) zero console errors. |
| 2026-06-13 | New-document + Export modals → "picker" layout | Reworked both modals to a card-picker layout (per a provided reference): title + divider, labelled fields, a row of selectable option cards (icon + title + description + amber check on the selected one), a footnote, and a full-width primary button. **New document**: name input + Type cards (Blank A4 / PDF Import) → "Create document". **Export**: now select a Format card (Print / PDF / PNG) then click "Export" (was direct-action buttons); `export.js` tracks the selected format and runs it on the button. Kept the app's amber accent (not the reference's purple). Shared `.picker-*` styles. Follow-up tweaks: input box + CTA button made a bit smaller; the name input's focus is **neutral grey, not orange** (overrides the global amber `:focus-visible` ring via higher-specificity `.picker-input:focus-visible`). Verified via headless Chromium 8/8 (card select/deselect, create opens editor, export select) + focus colour check, zero console errors. |
| 2026-06-13 | Redesigned delete confirm dialog + new custom-colour icon | (1) **Confirm dialog** restyled to a centred, icon-led card (matching a provided reference): red warning-triangle in a soft-red circle, bold title, muted message, and two equal buttons — "No, keep it." (grey) + "Yes, delete!" (red `#ef4444`). New `.confirm-dialog` markup/CSS replaces the old header/footer modal; `ConfirmDialog.open` now also sets the cancel label and **defaults focus to Cancel**; Enter no longer globally confirms (destructive-safe — only activates the focused button). (2) **Custom-colour icon** in the ink toolbar changed from the rainbow conic-gradient swatch to a dashed **"+" tile**, visually distinct from the round preset swatches. Verified via headless Chromium screenshots (labels "Yes, delete!"/"No, keep it.", zero console errors). Note: `evaluate(() => ConfirmDialog.open(...))` must be wrapped in braces in tests — returning the dialog's pending promise makes Playwright hang. |
| 2026-06-13 | Minimal deck cards + unblocked delete | Reworked both the Flashcards-page deck cards (`.fc-deck-card`) and the home "Due for review" cards (`.review-queue-card`) to a minimal style: removed the heavy amber left-border bar and the big due badge/count circle; the due count now lives in the meta line in amber ("2 due · 2 cards"); buttons are ghost (outline → amber on hover). **Delete fix**: moved "due" out of the top-right corner so the trash button owns it; the delete button is now always visible (subtle, touch-friendly) and sits at `z-index:2` above the full-card open overlay, so it's never blocked (verified `elementFromPoint` returns the delete button, clicking it opens the confirm dialog and does NOT open the deck; clicking the card body still opens the editor). Long titles get right padding so they don't run under the trash button. Verified via headless Chromium 8/8, zero console errors. |
| 2026-06-13 | Ink colour presets + custom picker | Changed the pen/ink default colour presets to **black, red, blue + 5 pastels** (pink/yellow/green/blue/purple); black is the default. Added a rainbow **custom colour swatch** (a hidden `<input type="color">`) so any colour is pickable, not just presets; picking a colour while erasing switches back to the pen. Verified via headless Chromium: 8 presets in order, black default-selected, pastel + custom (#ff8800) strokes record the chosen colour — zero console errors. |
| 2026-06-13 | Pen line-weight + zoom reset button | (1) **Pen line weight** — added a 4-step weight selector (dots, multipliers 0.5/1/2/3.5) to the ink toolbar; the multiplier is stored **per stroke** (`stroke.weight`) and applied in `widthFor`, so changing weight only affects new strokes and past strokes keep theirs (persists to IndexedDB). Applies to pen (scales pressure range), highlighter and eraser. (2) **Zoom reset** — added a home button to the editor zoom bar (`data-action="zoom-reset"` → `setZoom(1)`) to jump back to 100%. Verified via headless Chromium: weight buttons set/persist per stroke (default 1, thick 3.5 saved), zoom-in→home resets to 100% — zero console errors. |
| 2026-06-13 | Resize handles: corners scale, sides stretch | Per feedback, split resize behaviour by handle type in `startResize`: **corner** handles scale proportionally (keep aspect, driven by whichever axis moved more relative to start), **side** handles stretch that single axis freely (independent width/height, distort allowed) — for both images and shapes. Removed the old image-only `lockAspect` blanket. Verified via headless Chromium: SE corner keeps 4:3 (200×150→280×210); E/S/W side handles change only their axis (W also shifts the origin) — zero console errors. |
| 2026-06-13 | Element editing made fully Canva-like (8 handles, body-drag, smaller pill) | (1) **Smaller control pill** — `.element-panel` buttons 38→32px, icons 18→15px, tighter padding/dividers. (2) **8 resize handles** — replaced the single bottom-right handle with 4 corners + 4 edges (`.doc-element__rz--{nw,n,ne,e,se,s,sw,w}`) added dynamically on selection (images/shapes only); `startResize` generalized to any direction (west/north also move the origin), images keep aspect, shapes resize freely, zoom-compensated. (3) **Body drag** — images/shapes now move by dragging anywhere on the body (Canva-style); the old corner move-grip was removed from their markup (tables keep their grip since cells are editable). Handles are stripped from saved HTML in `getContent` (also strips lingering `is-selected`); `addHandles` upgrades older saved elements on select. Bug fixed: `closest('[contenteditable="true"]')` was matching the ancestor `.a4-page` and blocking body-drag — dropped that check since image/shape bodies never contain editable content. Verified via headless Chromium: image + shape body-drag, 8 handles on select, SE corner resize w/ aspect kept, W-edge resize, lock hides handles, save strips handles — zero console errors. |
| 2026-06-13 | Fixes: study plane alignment, Flashcards hero removed, Canva-style element control | (1) **Study Mode progress** — the plane "arrow" was a bare icon floating above/detached from the line; replaced with a proper track (`.study-progress` + `::before`), an amber **progress fill**, and a round **plane chip** that rides the line, vertically centered (verified plane centerY === track midY). (2) **Flashcards hero removed** — dropped the navy "Flashcards" hero banner; the list now uses a normal in-page heading + deck/due summary + New deck button (consistent light layout). (3) **Element control (image/shape) matches the Canva pill** — cleaned the panel to lock · duplicate · delete · **⋯ more**, moving the two look-alike layer-order icons into a "more" dropdown ("Bring forward" / "Send backward") so the bar reads clearly; added a `more` icon. Verified via headless Chromium: 9/9 (select, more-menu open/close, bring-forward raises z-index, lock toggle, duplicate, delete, panel auto-close) with zero console errors. |
| 2026-06-13 | Nav trim, review-queue move, Flashcards polish, Study Mode rebuilt | (1) **Removed "Templates"** from the top nav (the templates section still lives on the home page). (2) **Moved the "Due for review" queue** to below My Documents (before the templates section). (3) **Flashcards page visual polish**: added a navy hero (matching Home), a toolbar row (deck/due summary + New deck), and a cleaner deck editor (labeled Front/Back fields, per-card delete, a dashed "Add card" button, focus ring) — consistent with the rest of the app. (4) **Study Mode rebuilt** as a single focused timer (user chose "simplify"): `study.js` replaced the multi-leg flight itinerary with one Subject (code + name) + Duration (25/45/60/90 or custom) → a big countdown with a plane progress line, Started/Est-finish times, Pause/Reset/End, a "done" screen (subject + total/early time) and an optional Break (5/10/15/custom) countdown that returns to setup. Reuses the existing Timer/StudyStats/FlightDisplay and most study.css. Verified via headless Chromium: 22/22 (setup→session→tick/plane-move→pause→end→done→break→skip→retained fields→stats recorded, header hide/show) with zero console errors. |
| 2026-06-13 | PDF loader: clean upload box, actual-size pages, no A4 frame | (1) **Opens with the upload box** — a PDF-import doc's page now drops the A4 white-card chrome (`.a4-page:has(.pdf-import-placeholder)` → transparent, no shadow/radius) so the dashed upload box is the focus, and the whole box is clickable (not just the button) to open the file picker. (2) **Actual size** — `importPdf` renders each page at its true dimensions (PDF points × 96/72 → CSS px; rendered at 2× for crispness) instead of forcing a fixed 794/1123 width; a 400×225pt slide becomes a 533×300px page. (3) **No A4 background** — `.a4-page--pdf` is transparent with no shadow/border-radius; the page is just the PDF image at real size (`object-fit: contain`). Page dimensions persist on the `<img data-w/data-h>` and are reapplied via the editor's `applyPdfSizing()` on reload, so `Format.Editor.renderPdfPages()` and the normal render path stay consistent. Verified via headless Chromium: 9/9 (upload box + no card, actual 533×300 size, no shadow/radius, ink overlay attached, and size/class/image survive save→reload) with zero console errors. |
| 2026-06-13 | Highlighter fix + landscape PDF import | (1) **Highlighter pen** rendered each segment as a separate alpha-blended `stroke()`, so overlapping joins compounded the alpha into dark blotches. Fixed by giving tools a `flat` flag: the highlighter (and eraser) now draw as **one continuous path stroked once** at a constant width, so the translucent ink composites uniformly (verified: sampled max alpha 102 ≈ 0.40, no build-up); the pen keeps its per-segment pressure-variable widths. (2) **PDF import now respects page orientation** — `importPdf` measures each PDF page's aspect: portrait pages get a 794px-wide page, landscape/presentation pages (16:9, A4-landscape, etc.) get a 1123px-wide page with height from the aspect ratio, sized via inline styles so wide slide decks are no longer squeezed into a portrait A4 frame (rendered at 2× for crispness; ink overlay fits the new size automatically). Verified via headless Chromium: 7/7 (highlighter active/records/translucent, landscape PDF → 1123×632 wide page) with zero console errors. |
| 2026-06-13 | Home/UI refactor: standalone Flashcards, checklist→toolbar, Canva-style element panel | Per user feedback: (1) **Home templates trimmed** — removed the Table Doc and To-Do/Routine template cards and dropped `table`/`todo`/`flashcard` from the new-doc modal + `DocCard.TYPE_META` (legacy generators kept so old docs still open); only **Blank A4** and **PDF Import** remain creatable. (2) **Checklist moved into the toolbar** — new editor toolbar button (`data-cmd="checklist"` → `EditorCmd.insertChecklist`) inserts an interactive checklist at the caret instead of being a doc type; behavior still handled by `template-runtime`. (3) **Flashcards are now standalone, not document-based** — new `src/engine/deck-store.js` (`Format.DeckStore`, `localStorage["format-decks"]`: decks of `{id,name,cards:[{id,front,back}]}`) and `src/views/flashcards.js` (`#view-flashcards`, new "Flashcards" nav link + `flashcards` route) provide a deck list + per-deck card editor (rename, add/edit/delete cards, Review, delete deck). `Format.Review.start(deckId)` now reads from DeckStore; the home "Due for review" queue and SRS key off deck ids. The flashcard-in-document runtime (`onDeckClick`, `initDecks`, `Templates.flashcard/card/cardId`) was removed. (4) **Element selection panel restyled Canva-style** — `#element-panel` is now a rounded dark pill (38px circular icon buttons) and gained a **Duplicate** action (`element-panel.js` `duplicate()` clones the image/shape/table, offsets it, tops the z-order, selects the copy). SW bumped to `v4` (added `deck-store.js`, `flashcards.js`). Verified via headless Chromium: 19/19 checks (template trim, modal types, checklist insert+strike, image insert/select/duplicate, pill style, flashcards deck create/edit/persist, deck review flip-grade-done, home due-queue from decks) with zero console errors. |
| 2026-06-13 | Phase 14 (Flashcard SRS) complete + 3 editor fixes | **Phase 14**: SM-2 engine (`srs.js`) + full-screen review overlay (`review.js`, flip + Hard/OK/Easy, keys 1/2/3, 16-week heatmap), stable `data-card-id` per card, deck "Review" button, and a home "Due for review" queue. **Fixes from user feedback**: (1) **sticky toolbar** — the global `<header>` was not sticky, so the editor topbar (sticky `top:56px`) left a gap and appeared to jump on scroll; added `sticky top-0 z-50` to the header so the topbar stays glued. (2) **deeper + crisper zoom** — raised editor max zoom 150%→300% (0.05 steps) and made the ink layer re-rasterize at `DPR × zoom` backing resolution (capped at 4096px/canvas) via `Format.Ink.setZoom`, so strokes stay sharp when magnified. (3) **true A4** — removed `max-width:100%` from `.a4-page` (under CSS `zoom`, Chromium 148 shrank the page to the zoomed container width, e.g. 794→608px at 2×, breaking A4 proportions); pages now stay exactly 794×1123 (A4 @96dpi) and the canvas uses `align-items: safe center` + `overflow-x:auto` so zoomed pages scroll without clipping the left edge; added `@page { size: A4; margin: 0 }` for true-A4 print/PDF. Verified via headless Chromium: 15/15 Phase-14+fix checks (sticky header, card ids, A4 794×1123, zoom>150% w/ ink backing>2×, editor review flip/grade to done + heatmap, due-queue hide-after-review and reappear-when-due) and a 5/5 Phase 8–13 regression pass (equation + ink + persistence), zero console errors. |
| 2026-06-13 | Phases 8–13 complete | **Phase 8** ink overlay (`ink-canvas.js`): per-page `<canvas>`, Draw toggle, pen/highlighter/eraser + palette, pressure→width, palm rejection, zoom-aware coords, strokes persisted to IndexedDB and stripped from saved HTML. **Phase 9** template runtime (`template-runtime.js`): table Tab-nav (selection-based + `stopPropagation`), to-do strike/Enter/Backspace, flashcard 3D-flip deck w/ counter, PDF import via lazy PDF.js → `.a4-page--pdf` backgrounds. **Phase 10** export (`export.js`): print `@media`, jsPDF + html2canvas PDF, per-page PNG, 3-option modal, toasts, ink included. **Phase 11** PWA: SW `v2` asset list corrected (incl. KaTeX/Sarabun fonts), registered (http(s) only). **Phase 12** polish: `?` shortcuts overlay, toast util, pinch/Ctrl-scroll zoom, view-fade, focus-visible rings, safe-area insets, doc-grid skeleton, reduced-motion. **Phase 13** equation editor (`equation.js`): Σ button → modal w/ live KaTeX preview, inline `.doc-equation[data-latex]`, click-to-edit, KaTeX lazy-loaded. Deferred: ink lasso/shape-recognition, study swipe, Phase 14 SRS. Verified via two headless-Chromium (Playwright) passes over `file://` — 30/30 checks (create/type/equation/draw/save/reload-persistence, shortcuts, flashcards, todo, table Tab-row, PNG download, PDF import) with zero console errors. |
| 2026-06-10 | Phase 7 follow-up #2: Study Mode redesigned as flat full-page minimal flight board | Reverted an earlier sticky-nav/study-topbar attempt per user feedback ("nav bar stick to header" meant normal scroll-away, not pinned). Final design: home hero and global nav scroll normally (not sticky); Study Mode hides the global `<header>` entirely (`app.js` `showView()`) and shows a single `#020c1a` page with a minimal fixed "← Return to home" link top-left (`.study-home-link`, reuses the `data-view` router). Session screen `.flight-card` lost its background/border/padding; new `.study-countdown--compact` shows a small thin muted HH:MM:SS (no blink, no green tint) above a 1px route line + plane icon (amber progress-fill bar removed); new two-column `.flight-meta` footer shows "Started"/"Est. finish" in large green (`#7ee2a8`) clock-style time, replacing the old "SESSION ACTIVE" pulsing-dot header and 3-column Departed/ETA/Status footer. Reference: user-provided Lufthansa flight-info-board screenshot (MUC→BKK). Verified via headless Chromium (header hide/show, route navigation) + 4 screenshots across setup/session/arrived/transit, zero console errors. |

---

## Blockers

None. All planned phases (0–14) are complete and verified end-to-end. Two
opt-in extras remain deferred (not on the critical path): ink **lasso select /
shape recognition** and study **swipe-between-pages**.
