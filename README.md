# Format

> GoodNotes × MS Word × Canva — a fully offline, local-first document and note-taking PWA.

Cross-platform for Windows and tablets (iOS / Android). Rich-text editing, stylus/pen canvas, document templates, and a flight-board study timer. Zero internet dependency at runtime — double-click `index.html` and it works.

---

## App Identity

| Property | Value |
|---|---|
| **Name** | Format |
| **Icon** | SVG pen-mark (no emoji anywhere in the UI) |
| **Type** | Progressive Web App (PWA) |
| **Platforms** | Windows · iPad (iOS) · Android tablet |
| **Platform weight** | Tablet and Windows equally — no compromise |
| **Offline** | 100% offline — no CDN, no network calls at runtime |
| **Install** | Windows: "Install app" in Chrome/Edge · Tablet: "Add to Home Screen" |

---

## Design Language

### Color Palette

Built around `#051224` as the primary dark navy.

| Token | Hex | Usage |
|---|---|---|
| `--navy-950` | `#020c1a` | Study mode full-screen bg, deepest surfaces |
| `--navy-900` | `#030f20` | Deep bg, modals backdrop |
| `--navy-800` | `#051224` | **Primary** — top nav, editor nav |
| `--navy-700` | `#071832` | Hover, side panels |
| `--navy-600` | `#0a2040` | Cards in dark context |
| `--navy-100` | `#dce8f0` | Light surfaces, borders on white |
| `--navy-50`  | `#f0f5f9` | Page/content bg |
| `--white`    | `#ffffff` | Document pages, cards |
| `--amber`    | `#de7914` | **CTA / standout buttons** |
| `--amber-hover` | `#e89520` | Button hover — shifts more yellow |
| `--amber-light` | `#f5d28a` | Highlight tint, selection bg |
| `--text-dark` | `#051224` | Navy as text on white |
| `--text-muted` | `#5a7080` | Secondary text |
| `--border` | `#dde5ea` | Card borders, dividers |
| `--success` | `#1a7a4a` | Confirmed states |
| `--danger` | `#c0392b` | Errors |

### Typography

| Use | Weight | Size | Notes |
|---|---|---|---|
| Display hero | 200 | 48–64px | Thin — Lufthansa large headline feel |
| Section heading | 300 | 28–36px | |
| Card title | 500 | 16–18px | |
| Body | 400 | 15–16px | |
| UI labels / nav | 500–600 | 12–14px | Sometimes uppercase + letter-spacing |
| IATA codes (study) | 700 | 56–72px | Bold, spaced |

Font: **Inter** — self-hosted WOFF2, all weights loaded from `assets/fonts/inter/`. No Google Fonts CDN.

### Component Rules

- **Icons**: SVG only — no emoji, no icon fonts
- **Buttons**: Amber `#de7914` for standout CTAs; hover shifts to `#e89520`; ghost/outline style for secondary actions
- **Toolbar**: Floating panel — dark navy pill, centered above the document page (Canva-style)
- **Active nav**: Left-border accent in amber, bold text
- **Cards**: White bg, `1px solid var(--border)`, `border-radius: 10px`, subtle shadow on hover

### Secondary Reference: Bluebook (College Board)

For the **editor page** specifically, also draw from Bluebook's (digital SAT app) clean,
distraction-free testing-interface feel — using the **same navy/amber/white palette** above:

- Generous whitespace around the page/content area
- Thin, minimal navy header bar — flat, no heavy shadows
- Simple flat buttons, clear borders instead of skeuomorphic depth
- High-contrast, comfortable reading typography with calm line spacing
- Subtle dividers instead of boxes to separate toolbar sections
- Minimal chrome overall — the document content is the focus, UI recedes

---

## Core Features

### App Flow
```
Home  →  New document (preset picker)  →  Document editor
      →  Study mode (accessible from Home too)
```

Study mode is reachable from **both** the Home top-nav and the Editor top-nav.

### Document Presets

| Preset | Initial content |
|---|---|
| Blank A4 | Empty page, cursor ready |
| Table Doc | 4×4 bordered HTML table with header row |
| To-Do / Routine | Checkbox list with sample rows |
| Flashcard Deck | Front/back card structure with flip animation |
| PDF Import | File picker → PDF.js renders PDF pages as background |

### Rich Text Toolbar (MS Word parity)

| Group | Controls |
|---|---|
| **Text** | Font family · Size (−/+) · Bold · Italic · Underline · Strikethrough · Subscript · Superscript · Change case · Clear format |
| **Color** | Text color (picker + swatch) · Highlight color |
| **Paragraph** | Align L/C/R/Justify · Bullets · Numbered list · Indent +/− · Line spacing · Paragraph spacing |
| **Page** | Blank page · Cover page · Page break · Header · Footer · Page number · Date & Time |
| **Insert** | Table · Image · Shape · Text box · WordArt · Equation (LaTeX + KaTeX preview) · Symbol · Signature line |
| **Keyboard** | All standard shortcuts: Ctrl+B/I/U/Z/Y/A/S/C/V/X/P, Tab/Shift+Tab for indent |

### Pen / Ink Layer

- Overlay canvas (GoodNotes-style) — ink layer sits above the typed page
- Tools: Pen · Highlighter · Eraser · Lasso
- Pressure sensitivity via Pointer Events API (`pointerEvent.pressure`)
- Palm rejection — ignores touch when stylus is detected on the same frame
- Shape recognition — rough closed shapes snap to clean geometry
- Strokes saved as SVG path arrays per page in IndexedDB

### Study Mode

Lufthansa flight status card aesthetic. Opens from Home or Editor.

```
        ● SESSION ACTIVE  ·  25 MIN SESSION

  MTH  ───────── ✈ ─────────  PHY
  Mathematics              Physics

        01 : 23 : 45
         Time remaining

  Departed 14:00    ETA 14:25    Status: On time
```

- Full-screen `#020c1a` background (static — clean, no distraction)
- IATA-style subject codes, large bold white
- Animated progress bar with plane icon (left → right as time passes)
- Colon blink animation while running, stops when paused
- Session controls: Pause · Reset · End session
- "Arrived" completion screen

#### Study Mode Theme 2 — Bangkok Transit Map (BTS / MRT)

Same timer, different visual skin. Selectable on the setup panel.

```
  ●━━━━━━━━━━━━━●━━━━━━━━━━━━━●━━━━━━━━━━━━━●
 MTH            e              π             PHY
Mathematics   Euler          Pi (π)        Physics
```

- Thick amber line (`#de7914`) connecting all station dots
- Stations = filled circles with amber border — BTS/MRT map aesthetic
- **Terminal stations** (FROM / TO) = the two main subjects
- **Intermediate stations** = optional sub-topics typed by the user (e.g. `e, π, σ`) — max 5
- Small train-car rectangle slides left → right along the line as time passes
- When train passes a station dot → it pulses and fills amber (you've "covered" that topic)
- Station labels: short code above dot, full name below — uppercase, letter-spaced, BTS signage feel
- Line has subtle amber glow `box-shadow`
- Arrived screen: "You've reached [destination]."

### Other Design Decisions (resolved)

| Question | Decision |
|---|---|
| Multi-page model | Scrollable A4 blocks — Word-style, most familiar |
| OCR (ink-to-text) | No OCR at launch — keep it simple and truly offline |
| Flashcard study | Simple flip cards first; SRS (spaced repetition) added later |
| Study mode background | Static dark navy only — no animation |
| Equation editor | LaTeX input with live KaTeX preview |

---

## Tech Stack

All dependencies are **bundled locally** — no CDN, no internet at runtime.

| Layer | Choice | Offline method |
|---|---|---|
| UI styling | Tailwind v4 (pre-generated) + small custom CSS layer | `lib/tailwind.css` built via standalone CLI in `tools/` — no Node, no CDN |
| JavaScript | Plain `<script>` files, IIFE + `window.Format` namespace — **no ES modules** | `type="module"` is blocked by CORS over `file://`, which breaks double-click launch |
| Icon system | Inline SVG only | No external icon font |
| Font | Inter WOFF2 | Self-hosted in `assets/fonts/inter/` |
| Rich text | `contenteditable` + `document.execCommand` + custom engine | Native browser API |
| Ink / drawing | Canvas API + Pointer Events API | Native browser API |
| PDF rendering | PDF.js (Mozilla) | Bundled in `lib/pdf.min.js` |
| Equations | KaTeX | Bundled in `lib/katex.min.js` + `lib/katex.min.css` |
| Export to PDF | CSS `@media print` + jsPDF fallback | Bundled in `lib/jspdf.min.js` |
| Export to PNG | html2canvas | Bundled in `lib/html2canvas.min.js` |
| Storage | `localStorage` (index/metadata) + `IndexedDB` (content + ink) | Native browser API |
| PWA | Service Worker + `manifest.json` | `sw.js` caches all assets |
| Optional styling helper | Tailwind CSS (pre-generated static CSS) | `lib/tailwind.css` — no CDN |

> **Tailwind note:** If used, run `tailwind CLI` once to generate `lib/tailwind.css`. The generated file ships with the project — no runtime network call. The CDN play script is never used.

---

## Production Folder Structure

```
format/                         ← project root, served directly (no build step required)
│
├── index.html                  ← App shell — single HTML entry point
├── manifest.json               ← PWA manifest
├── sw.js                       ← Service worker (cache-first, full offline)
│
├── css/                        ← All stylesheets (linked in index.html)
│   ├── main.css                ← CSS custom properties, reset, base typography
│   ├── nav.css                 ← Top nav, editor nav
│   ├── home.css                ← Hero, doc grid, template grid
│   ├── editor.css              ← Floating toolbar, A4 page, canvas
│   ├── study.css               ← Flight card, timer, setup form
│   ├── modals.css              ← Modal overlays
│   └── responsive.css          ← Tablet + desktop breakpoints
│
├── src/                        ← JavaScript (ES modules)
│   ├── app.js                  ← Entry point: view router, global init
│   ├── views/
│   │   ├── home.js             ← Home page — cards, search, recent list
│   │   ├── editor.js           ← Editor — page management, keyboard shortcuts
│   │   └── study.js            ← Study mode — setup, session state
│   ├── components/
│   │   ├── toolbar.js          ← Floating toolbar: command dispatch, active state sync
│   │   ├── doc-card.js         ← Document card renderer
│   │   ├── flight-display.js   ← Flight card: progress bar, IATA display, plane animation
│   │   └── modal.js            ← Modal open/close
│   ├── engine/
│   │   ├── doc-store.js        ← Document CRUD (localStorage index + IndexedDB body)
│   │   ├── editor-cmd.js       ← Rich text command wrappers + keyboard shortcut map
│   │   ├── timer.js            ← Countdown: tick, pause/resume, complete callback
│   │   ├── export.js           ← PDF (print CSS / jsPDF) + PNG (html2canvas)
│   │   ├── ink-canvas.js       ← Pen overlay: draw, erase, pressure, palm reject, lasso
│   │   └── templates.js        ← New doc content generators per preset
│   └── utils/
│       ├── date.js             ← Date/time formatting
│       └── dom.js              ← querySelector helpers, class toggles
│
├── lib/                        ← Third-party libraries, ALL bundled locally (no CDN)
│   ├── pdf.min.js              ← PDF.js — render PDF pages in canvas
│   ├── katex.min.js            ← KaTeX — render LaTeX equations
│   ├── katex.min.css
│   ├── jspdf.min.js            ← jsPDF — programmatic PDF export fallback
│   ├── html2canvas.min.js      ← PNG export
│   └── tailwind.css            ← (optional) pre-generated Tailwind output
│
└── assets/
    ├── icons/
    │   ├── logo.svg            ← Pen-mark icon (SVG, scalable)
    │   ├── icon-192.png        ← PWA manifest icon
    │   ├── icon-512.png        ← PWA manifest icon (large)
    │   └── apple-touch.png     ← iOS home screen (180×180)
    └── fonts/
        └── inter/              ← Self-hosted Inter — loaded offline
            ├── inter-200.woff2
            ├── inter-300.woff2
            ├── inter-400.woff2
            ├── inter-500.woff2
            ├── inter-600.woff2
            └── inter-700.woff2
```

---

## Getting Started

No build step. No Node.js. No internet required.

```
1. Clone or download the repository
2. Download library files into lib/ (one-time, see PROGRESS.md Phase 0)
3. Open format/index.html in Chrome, Edge, or Safari
4. Tablet install: Share → Add to Home Screen
5. Windows install: address bar → Install app icon
```

---

## Platform Notes

| Platform | Pen input API | Touch gestures | PWA install |
|---|---|---|---|
| Windows (Chrome / Edge) | Pointer Events — Surface Pen, Wacom | Trackpad pinch | Browser "Install app" prompt |
| iPad (Safari 16+) | Pointer Events — Apple Pencil | Pinch-zoom, two-finger swipe | Add to Home Screen |
| Android tablet (Chrome) | Pointer Events — S-Pen, stylus | Standard touch | Add to Home Screen |

---

## Roadmap

See [PROGRESS.md](PROGRESS.md) for phase-by-phase tracking.

---

## License

TBD