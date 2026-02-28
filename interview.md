# Brain2 — Interview Notes

## Session: 2026-02-28

### Q1: Primary goal for this session?
**Answer:** Refine the existing MVP plan (not extend with research enhancements or start fresh)

### Q2: Code status?
**Answer:** No code yet — greenfield project, plan.md is the starting point

### Q3: Target device?
**Answer:** Phone (mobile-first PWA)

### Q4: AI features approach?
**Answer:** Make AI fully optional — app must work 100% without an API key. Auto-tagging is a bonus, not required.

### Q5: Organization model (categories vs tags)?
**Answer:** Tags only (recommended). No fixed categories. Reasoning: categories add friction at capture time ("is this an idea or a task?"), tags are more flexible and don't require upfront decisions.

### Q6: Obsidian-compatible import/export?
**Answer:** Important for MVP — wants to move notes in/out from day one

### Q7: Pain points with current plan?
**Answer:** Missing search feature. Wants a lean path to something usable.

### Q8: Review feature (resurfacing old notes)?
**Answer:** Keep in MVP — wants daily review flow to rediscover forgotten notes

### Q9: Voice capture?
**Answer:** Yes — add microphone button using Web Speech API for speech-to-text on mobile

### Q10: Auto-backups?
**Answer:** Yes. Both internal IndexedDB snapshots (daily, rolling 7-day history) AND a manual "Download Backup" button in Settings. Frequency: daily (on app open, if last backup >24h ago).

---

## Key Decisions Summary

| Decision | Choice |
|----------|--------|
| Organization | Tags only, no categories |
| AI | Optional (BYOK Claude API) |
| Search | Full-text search added to MVP |
| Voice | Web Speech API capture |
| Export/Import | Obsidian-compatible .md with YAML frontmatter |
| Review | 5 random old notes, keep/archive |
| Backups | Daily auto-snapshot in IndexedDB + manual download |
| Device focus | Mobile-first PWA |
| Tech stack | Next.js 15, Tailwind v4, Dexie.js, Serwist |
