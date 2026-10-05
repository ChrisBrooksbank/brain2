# AGENTS.md - Operational Guide

Keep this file under 60 lines. It's loaded every iteration.

## Tech Stack

- Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- Dexie.js v4 (IndexedDB), Serwist (PWA), Claude API (BYOK)

## Build Commands

```bash
npm run build          # Production build
npm run dev            # Development server
```

## Test Commands

```bash
npm test               # Run tests (watch mode)
npm run test:run       # Run tests once
```

## Validation (run before committing)

```bash
npm run check          # Run ALL checks (typecheck, lint, format, tests)
```

## Key References

- plan.md — Full project plan with code snippets and architecture
- interview.md — MVP decisions (tags-only, no categories, voice capture, auto-backups)
- specs/ — JTBD specifications for each feature area

## Project Conventions

- Tags only, no fixed categories (interview decision)
- AI features are optional — app works 100% without API key
- Mobile-first PWA, bottom nav, large touch targets
- Fire-and-forget auto-tagging (never blocks capture)
- Obsidian-compatible markdown import/export

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
