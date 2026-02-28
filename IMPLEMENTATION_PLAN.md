# Implementation Plan

## Status

- Planning iterations: 1
- Build iterations: 1
- Last updated: 2026-02-28

## Tasks

### Phase 1: Scaffold & Foundation

- [x] Scaffold Next.js 15 project with TypeScript, Tailwind CSS v4, App Router (spec: pwa-offline.md)
- [x] Install required dependencies: dexie, dexie-react-hooks, @serwist/next, serwist, @anthropic-ai/sdk (spec: pwa-offline.md)
- [x] Configure Serwist PWA: next.config.ts integration, service worker entry file, precaching setup (spec: pwa-offline.md)
- [x] Create web app manifest with name, icons, theme-color, display:standalone, start_url, background_color (spec: pwa-offline.md)
- [x] Add Apple PWA meta tags: apple-touch-icon, apple-mobile-web-app-capable, apple-mobile-web-app-status-bar-style (spec: pwa-offline.md)

### Phase 2: Database

- [x] Define Dexie database schema: Notes table (++id, text, tags[], createdAt, archived) and Config table (key, value) (spec: capture.md)
- [x] Create database mutation helpers: addNote, updateNote, archiveNote, deleteNote, getConfig, setConfig (spec: capture.md)

### Phase 3: Layout & Navigation

- [x] Create root layout with dark theme (bg-neutral-950 text-white), h-dvh, safe-area padding, bottom nav slot (spec: pwa-offline.md)
- [ ] Build bottom tab navigation component: 4 tabs (Capture, Notes, Review, Settings), 44px touch targets, active state (spec: pwa-offline.md)

### Phase 4: Capture View

- [ ] Build capture view: auto-focused textarea, Save button, Ctrl+Enter shortcut, saves note to Dexie (spec: capture.md)
- [ ] Add voice input to capture view using Web Speech API mic button, appends transcript to textarea (spec: capture.md)

### Phase 5: Notes Browsing View

- [ ] Build notes browsing view: reverse chronological list with note cards, expand/collapse, archive and delete actions (spec: notes-browsing.md)
- [ ] Add tag filter to notes view: display all unique tags as chips, clicking a chip filters the list (spec: notes-browsing.md)

### Phase 6: Review View

- [ ] Build review view: fetch 5 random notes older than 24h, display cards with Keep/Archive buttons, reactive removal, empty state (spec: review.md)

### Phase 7: Search View

- [ ] Build search view: text input, debounced ~200ms full-text case-insensitive search, includes archived notes with visual indicator, highlighted match terms (spec: search.md)

### Phase 8: Settings & AI

- [ ] Build settings view: API key input (password type, show/hide toggle), Save and Clear buttons, persist key in Dexie Config (spec: settings-ai.md)
- [ ] Add AI status indicator and Test button to settings: validates key against Claude API, shows Connected/No key/Invalid (spec: settings-ai.md)
- [ ] Implement fire-and-forget auto-tagging: after note save, call Claude Haiku to generate 2-4 lowercase tags, silently update note (spec: settings-ai.md)

### Phase 9: Import/Export

- [ ] Implement markdown export: generate ZIP of all non-archived notes as .md files with YAML frontmatter (date, tags), filename YYYY-MM-DD-slug.md (spec: import-export.md)
- [ ] Implement markdown import: multi-select .md files, parse YAML frontmatter + #tag extraction from body, deduplicate by exact text match (spec: import-export.md)

### Phase 10: Offline & Backups

- [ ] Implement daily auto-backups: on app open, save rolling 7-day IndexedDB snapshots to Dexie (spec: pwa-offline.md)
- [ ] Add manual "Download Backup" button in settings to export all notes as JSON file (spec: pwa-offline.md)

### Phase 11: Polish

- [ ] Add haptic feedback via navigator.vibrate on note save and archive actions (spec: pwa-offline.md)
- [ ] Final mobile polish: verify 44px touch targets across all views, smooth scroll, page transition animations (spec: pwa-offline.md)

## Completed

<!-- Completed tasks move here -->

## Notes

### Architectural Decisions

- **No backend** — all data in IndexedDB via Dexie.js, AI calls direct from browser (anthropic-dangerous-direct-browser-access header)
- **Tags only, no categories** — flexible AI-generated taxonomy, per interview decision
- **BYOK pattern** — user supplies their own Anthropic API key; app works 100% without it
- **Fire-and-forget auto-tagging** — never blocks capture UX; silently updates note after save
- **Obsidian-compatible markdown** — YAML frontmatter with date and tags for data portability
- **Mobile-first PWA** — h-dvh, bottom nav, 44px touch targets, safe-area-inset padding
- **Serwist** — maintained successor to next-pwa for service worker and precaching
- **Search is a view** — fourth tab in bottom nav, not a modal or overlay
- **Dark theme only** — bg-neutral-950, no light/dark toggle needed for MVP
