# brain2

A local-first second brain PWA. Type or dictate Markdown notes, fully Obsidian-compatible. Offline semantic search powered by a real neural embedding model running entirely in-browser — no API, no data leaving your device.

**Live:** https://brain2-app.netlify.app

## Features

- **Offline semantic search** — Transformers.js runs a neural embedding model in-browser. No external API needed, no data sent anywhere.
- **Obsidian-compatible** — Standard Markdown with `[[wikilinks]]`, tags, and frontmatter. Import/export your existing vault.
- **Dictation** — Voice-to-text note entry.
- **Google Docs backup** — Optional sync to Google Drive.
- **AI auto-tagging** — Optional: bring your own Anthropic API key.
- **Private by architecture** — All data stays in IndexedDB on your device.

## Tech Stack

- Next.js + React + TypeScript
- Transformers.js (@huggingface/transformers) — in-browser neural embeddings
- Dexie (IndexedDB)
- @serwist/next (PWA / service worker)
- Anthropic SDK (optional AI tagging)
- ESLint + Prettier + Husky + Vitest + Playwright

## Development

```bash
npm install
npm run dev        # Start Next.js dev server
npm run build      # Production build
npm run check      # Run all checks (lint, typecheck, test, format)
npm run test:e2e   # Playwright end-to-end tests
```

## Deployment

Deployed on Netlify. Auto-deploys from main branch.
