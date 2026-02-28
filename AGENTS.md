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
