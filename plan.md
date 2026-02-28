# Brain2 — Second Brain PWA

## Context

You have bad short-term memory and want a "second brain" — a place to quickly dump thoughts, review forgotten notes, and retrieve knowledge later. This is a local-first PWA so it works offline, installs on your phone, and keeps your data on your device. Markdown import/export gives you an escape hatch to Obsidian or any other tool. Light AI auto-tagging reduces friction.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 15 (App Router) | You know React, SSR for shell, client components for data |
| Language | TypeScript | Safety |
| Styling | Tailwind CSS v4 | Ships with create-next-app, CSS-first config |
| Storage | IndexedDB via **Dexie.js v4** | Reactive `useLiveQuery` hooks, no state library needed |
| PWA | **Serwist** (@serwist/next) | Maintained successor to next-pwa |
| AI | Claude API (direct browser call) | User provides their own key, BYOK pattern |

**Total added deps**: `@serwist/next`, `serwist`, `dexie`, `dexie-react-hooks`, `@anthropic-ai/sdk` (5 packages)

## Project Structure

```
brain2/
  app/
    layout.tsx            # Root shell, bottom nav, PWA metadata
    page.tsx              # Capture view (default)
    notes/page.tsx        # All Notes view
    review/page.tsx       # Review view
    settings/page.tsx     # API key + export/import
    manifest.ts           # PWA web manifest
    sw.ts                 # Serwist service worker
    globals.css           # Tailwind v4 theme
  components/
    BottomNav.tsx         # 4-tab bottom bar
    NoteCard.tsx          # Note display with expand/archive
    CategoryPicker.tsx    # Inbox/Ideas/Tasks/Archive pills
  lib/
    db.ts                 # Dexie schema (notes + config tables)
    hooks.ts              # useNotes, useReviewNotes, mutations
    utils.ts              # relativeTime, truncate
    ai.ts                 # Claude API auto-tag function
    markdown.ts           # Import/export logic
  public/icons/           # PWA icons
```

## Database Schema (Dexie / IndexedDB)

**Notes table**: `++id, category, createdAt`

```ts
interface Note {
  id?: number;
  text: string;
  category: "inbox" | "ideas" | "tasks" | "archive";
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

**Config table**: `key` — stores API key and preferences as key-value pairs.

## Implementation Phases

### Phase 1: Scaffold + PWA

1. `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack`
2. Install deps: `npm i @serwist/next dexie dexie-react-hooks @anthropic-ai/sdk && npm i -D serwist`
3. Create `app/sw.ts` — Serwist service worker with precache + runtime cache:
   ```ts
   import { defaultCache } from "@serwist/next/worker";
   import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
   import { Serwist } from "serwist";

   declare global {
     interface WorkerGlobalScope extends SerwistGlobalConfig {
       __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
     }
   }
   declare const self: ServiceWorkerGlobalScope & typeof globalThis;

   const serwist = new Serwist({
     precacheEntries: self.__SW_MANIFEST,
     skipWaiting: true,
     clientsClaim: true,
     navigationPreload: true,
     runtimeCaching: defaultCache,
   });
   serwist.addEventListeners();
   ```
4. Create `app/manifest.ts` — PWA manifest:
   ```ts
   import type { MetadataRoute } from "next";
   export default function manifest(): MetadataRoute.Manifest {
     return {
       name: "Brain2",
       short_name: "Brain2",
       description: "Your second brain — capture, review, rediscover",
       start_url: "/",
       display: "standalone",
       background_color: "#0a0a0a",
       theme_color: "#0a0a0a",
       icons: [
         { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
         { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
       ],
     };
   }
   ```
5. Wrap `next.config.mjs` with `withSerwist()`:
   ```ts
   import withSerwistInit from "@serwist/next";
   const withSerwist = withSerwistInit({
     swSrc: "app/sw.ts",
     swDest: "public/sw.js",
     disable: process.env.NODE_ENV === "development",
   });
   export default withSerwist({});
   ```
6. Update `tsconfig.json` — add `"webworker"` to `compilerOptions.lib`, `"@serwist/next/typings"` to `compilerOptions.types`, `"public/sw.js"` to `exclude`
7. Update `.gitignore` — add `public/sw*` and `public/swe-worker*`
8. Update `app/layout.tsx`:
   ```ts
   export const metadata: Metadata = {
     title: "Brain2",
     description: "Your second brain",
     appleWebApp: { capable: true, statusBarStyle: "default", title: "Brain2" },
     formatDetection: { telephone: false },
   };
   export const viewport: Viewport = {
     themeColor: "#0a0a0a",
     width: "device-width",
     initialScale: 1,
     maximumScale: 1,
     userScalable: false,
   };
   ```
   Body: `<body className="bg-neutral-950 text-white h-dvh flex flex-col">` with `<main className="flex-1 overflow-hidden">` wrapping children, and `<BottomNav />` at the bottom.
9. Create placeholder PWA icons (192px, 512px) in `public/icons/`

### Phase 2: Database + Hooks

**`lib/db.ts`** — Dexie instance:
```ts
import Dexie, { type EntityTable } from "dexie";

export interface Note {
  id?: number;
  text: string;
  category: "inbox" | "ideas" | "tasks" | "archive";
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Config {
  key: string;
  value: string;
}

const db = new Dexie("brain2") as Dexie & {
  notes: EntityTable<Note, "id">;
  config: EntityTable<Config, "key">;
};

db.version(1).stores({
  notes: "++id, category, createdAt",
  config: "key",
});

export { db };
```

**`lib/hooks.ts`** — Reactive hooks + mutation functions:
```ts
"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Note } from "./db";

// All notes for a category, newest first
export function useNotes(category?: Note["category"]) {
  return useLiveQuery(() => {
    if (category) {
      return db.notes.where("category").equals(category).reverse().sortBy("createdAt");
    }
    return db.notes.orderBy("createdAt").reverse().toArray();
  }, [category]);
}

// Random older notes for review (>24h old, not archived)
export function useReviewNotes(count = 5) {
  return useLiveQuery(async () => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const candidates = await db.notes
      .where("createdAt").below(cutoff)
      .and((note) => note.category !== "archive")
      .toArray();
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, [count]);
}

// Mutations
export async function addNote(text: string, category: Note["category"] = "inbox", tags: string[] = []) {
  const now = new Date();
  return db.notes.add({ text, category, tags, createdAt: now, updatedAt: now });
}

export async function updateNoteTags(id: number, tags: string[]) {
  return db.notes.update(id, { tags, updatedAt: new Date() });
}

export async function archiveNote(id: number) {
  return db.notes.update(id, { category: "archive", updatedAt: new Date() });
}

export async function moveNote(id: number, category: Note["category"]) {
  return db.notes.update(id, { category, updatedAt: new Date() });
}

export async function deleteNote(id: number) {
  return db.notes.delete(id);
}
```

**`lib/utils.ts`** — Helpers:
```ts
export function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function truncate(text: string, maxLength = 120): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}
```

### Phase 3: Capture View (`app/page.tsx`)

- `"use client"` component
- Auto-focused `<textarea>` filling available space
- Save button (disabled when empty)
- Keyboard shortcut: Ctrl+Enter to save
- On save: call `addNote()`, clear input, re-focus textarea
- If API key exists in config: fire-and-forget call to `autoTag()` which updates note tags async (never blocks save)
- Subtle save confirmation (brief flash or toast)

### Phase 4: All Notes View (`app/notes/page.tsx`)

**`components/CategoryPicker.tsx`**:
- Horizontal scrollable row of pill buttons: Inbox, Ideas, Tasks, Archive
- Selected pill highlighted (blue), others neutral
- Props: `categories`, `selected`, `onChange`

**`components/NoteCard.tsx`**:
- Shows truncated text preview + relative time
- Tap to expand/collapse full text
- Archive button (visible on all non-archived notes)
- When expanded: show tags as small pills, show move-to-category dropdown
- `whitespace-pre-wrap` to preserve line breaks

**Page**:
- CategoryPicker at top
- Scrollable list of NoteCards filtered by selected category
- Empty state: "No notes here yet."
- Loading state while `useLiveQuery` resolves

### Phase 5: Review View (`app/review/page.tsx`)

- Uses `useReviewNotes(5)` — 5 random notes older than 24h, not archived
- Each note displayed as a full card with:
  - Full note text
  - Two action buttons: **Keep** (do nothing, leave as-is) and **Archive** (move to archive)
- Archiving removes the card from the list reactively via `useLiveQuery`
- Empty state: "All caught up — no notes older than 24 hours to review."
- Loading state while query resolves

### Phase 6: Navigation (`components/BottomNav.tsx`)

- Fixed bottom tab bar with 4 tabs: Capture (`/`), Notes (`/notes`), Review (`/review`), Settings (`/settings`)
- Uses Next.js `Link` + `usePathname()` to highlight active tab
- Simple text icons: `+` (Capture), `☰` (Notes), `↻` (Review), `⚙` (Settings)
- Bottom padding: `pb-[env(safe-area-inset-bottom)]` for iPhone home indicator

### Phase 7: Settings + AI

**`app/settings/page.tsx`**:
- API key input field (password type, with show/hide toggle)
- Save button — stores key in IndexedDB config table
- Test button — makes a small Claude API call to validate the key
- Status indicator: "Connected" / "No key set" / "Invalid key"
- Clear button to remove key

**`lib/ai.ts`** — Auto-tagging:
```ts
export async function autoTag(noteId: number, text: string, apiKey: string): Promise<void> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{ role: "user", content: `Extract 2-4 short lowercase tags from this note. Return ONLY a JSON array of strings, nothing else.\n\nNote: ${text}` }],
      }),
    });
    const data = await response.json();
    const tags = JSON.parse(data.content[0].text);
    await updateNoteTags(noteId, tags);
  } catch {
    // Silently fail — tags are optional
  }
}
```

- Uses Claude Haiku (cheapest, fastest) for tagging
- Direct browser-to-API call — no backend needed
- Fire-and-forget after note save — never blocks the capture flow
- Gracefully fails if no key, invalid key, or network error

### Phase 8: Markdown Import/Export (`lib/markdown.ts`)

**Export**:
```ts
export function noteToMarkdown(note: Note): string {
  const frontmatter = [
    "---",
    `date: ${note.createdAt.toISOString()}`,
    `category: ${note.category}`,
    note.tags.length ? `tags: [${note.tags.join(", ")}]` : null,
    "---",
  ].filter(Boolean).join("\n");
  return `${frontmatter}\n\n${note.text}\n`;
}

export function noteToFilename(note: Note): string {
  const date = note.createdAt.toISOString().slice(0, 10);
  const slug = note.text.slice(0, 40).replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "-").toLowerCase();
  return `${date}-${slug}.md`;
}
```

- "Export all" button in Settings page
- Generates a `.zip` file containing all notes as `.md` files
- Each file has YAML frontmatter (`date`, `category`, `tags`)
- Filename format: `YYYY-MM-DD-first-few-words.md`
- Uses JSZip (add as dependency) or manual Blob-based zip
- Compatible with Obsidian — drop files into any vault folder

**Import**:
```ts
export function parseMarkdown(filename: string, content: string): Partial<Note> {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
  if (frontmatterMatch) {
    const meta = parseFrontmatter(frontmatterMatch[1]);
    return {
      text: frontmatterMatch[2].trim(),
      category: meta.category || "inbox",
      tags: meta.tags || [],
      createdAt: meta.date ? new Date(meta.date) : new Date(),
    };
  }
  // No frontmatter — treat whole content as text
  // Extract inline #tags from body
  const inlineTags = content.match(/#[a-zA-Z]\w*/g)?.map(t => t.slice(1)) || [];
  return { text: content.trim(), category: "inbox", tags: inlineTags, createdAt: new Date() };
}
```

- "Import notes" button in Settings — opens file picker for `.md` files
- Parses YAML frontmatter for date, category, tags
- Supports Obsidian-style `#tags` in body text (extracted as tags)
- Falls back gracefully: no frontmatter = inbox category, current date
- Deduplication: skip notes whose text exactly matches an existing note

**Settings page sections**:
1. AI Configuration (API key)
2. Export (Download all as .zip)
3. Import (Select .md files)

### Phase 9: Polish

- Haptic feedback on save/archive: `navigator.vibrate?.(10)`
- Smooth card removal transitions (opacity + height)
- Note count badges on category pills in CategoryPicker
- Mobile-optimized touch targets (min 44px)
- Keyboard shortcut: Ctrl+Enter to save, Escape to clear
- Apple touch icon + splash screen meta tags

## Key Design Decisions

1. **No backend** — all data in IndexedDB, AI calls go direct to Claude API from browser. Zero infrastructure to deploy or maintain.
2. **BYOK (Bring Your Own Key)** — user enters their Anthropic API key in settings. AI features gracefully degrade if no key is set. No cost to you.
3. **Obsidian-compatible markdown** — standard `.md` files with YAML frontmatter. Import and export. No proprietary format lock-in.
4. **Categories over folders** — four fixed categories (Inbox, Ideas, Tasks, Archive) keeps it simple. Tags from AI add flexibility without requiring user effort.
5. **Auto-tag is fire-and-forget** — note saves instantly to IndexedDB, then tags are added async via Claude. Never blocks capture speed. Uses Haiku (cheapest model).
6. **Mobile-first** — designed for phone use. Bottom nav, large touch targets, auto-focus on capture, `h-dvh` for proper mobile viewport.

## Verification Plan

1. `npm run build && npm start` — verify production build works
2. Chrome DevTools > Application > check Manifest and Service Worker registered
3. Install as PWA on phone — verify standalone mode, offline access
4. **Capture flow**: open app → type → save → verify note appears in All Notes (inbox)
5. **Auto-tag flow**: set API key in settings → save a note → verify tags appear on the note after a moment
6. **Review flow**: add notes, wait 24h (or temporarily lower threshold for testing), verify review cards appear with Keep/Archive actions
7. **Export**: export all notes as zip → extract → open `.md` files in a text editor or Obsidian → verify frontmatter and content are correct
8. **Import**: take exported `.md` files (or existing Obsidian notes) → import into Brain2 → verify notes appear with correct dates, tags, and categories
9. **Offline**: enable airplane mode → verify capture and browsing still work
10. **No API key**: remove API key → save a note → verify it saves fine without tags, no errors
