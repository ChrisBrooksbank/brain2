# CLAUDE.md

## Project Overview

brain2 — a local-first second brain PWA. Markdown notes with Obsidian-compatible format, offline semantic search via in-browser neural embeddings (Transformers.js), optional Google Docs backup, and optional AI auto-tagging with Anthropic SDK.

**Live:** https://brain2-app.netlify.app

## Tech Stack

- Next.js + React + TypeScript
- @huggingface/transformers — runs embedding models in-browser via WebAssembly
- Dexie (IndexedDB wrapper)
- @serwist/next (PWA service worker)
- @anthropic-ai/sdk (optional AI features)
- ESLint + Prettier + Husky + Knip
- Vitest (unit tests) + Playwright (e2e)
- Deployed on Netlify

## Development Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run check        # Run all checks
npm run test         # Vitest watch mode
npm run test:e2e     # Playwright e2e tests
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npm run format       # Prettier format
npm run knip         # Find unused exports
```

## Architecture

- `app/` — Next.js App Router pages and API routes
- `components/` — React components
- `lib/` — Core logic (embeddings, search, storage, sync)
- `hooks/` — Custom React hooks
- `specs/` — JTBD specification files (Ralph Wiggum loop)
- `e2e/` — Playwright tests

## Key Technical Notes

- Transformers.js loads ML models lazily on first search. The initial load may take several seconds.
- Embeddings are computed in a Web Worker to avoid blocking the UI.
- All notes and embeddings are stored in IndexedDB via Dexie.
- The PWA service worker (Serwist) caches the app shell and model files for offline use.

## Deployment

Deployed on Netlify. The `AGENTS.md` file documents the Ralph Wiggum autonomous build loop used during development.
