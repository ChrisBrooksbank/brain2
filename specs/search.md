# Search

## Overview

Full-text search across all notes to quickly find anything.

## User Stories

- As a user, I want to search my notes by keyword so I can find things I forgot about
- As a user, I want search results highlighted so I can see why they matched

## Requirements

- [ ] Search input field (accessible from notes view or dedicated search view)
- [ ] Full-text search across note text content
- [ ] Search results show matching notes with highlighted match terms
- [ ] Search is instant/debounced (no submit button needed)
- [ ] Search includes archived notes (with visual indicator)
- [ ] Empty state when no results: "No notes match your search."

## Acceptance Criteria

- [ ] Typing in search box filters notes in real-time
- [ ] Matches are case-insensitive
- [ ] Results update as user types (debounced ~200ms)
- [ ] Clearing search shows all notes again

## Out of Scope

- Fuzzy matching / typo tolerance
- AI-powered semantic search
- Search history
