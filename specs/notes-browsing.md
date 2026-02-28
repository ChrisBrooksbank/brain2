# Notes Browsing

## Overview

Browse, filter, and manage all saved notes.

## User Stories

- As a user, I want to see all my notes in reverse chronological order
- As a user, I want to filter notes by tag
- As a user, I want to expand a note to see full text
- As a user, I want to archive notes I no longer need active

## Requirements

- [ ] Scrollable list of notes, newest first
- [ ] Each note shows: truncated text preview, relative time, tags as pills
- [ ] Tap to expand/collapse full text (whitespace-pre-wrap)
- [ ] Tag filter: tap a tag pill to filter by that tag
- [ ] Archive button on each non-archived note
- [ ] Delete note option (with confirmation)
- [ ] Empty state: "No notes yet."
- [ ] Loading state while useLiveQuery resolves

## Acceptance Criteria

- [ ] Notes list updates reactively when notes are added/modified
- [ ] Tag filtering works correctly
- [ ] Archiving removes note from active list
- [ ] Deleted notes are permanently removed
- [ ] Smooth scrolling on mobile

## Out of Scope

- Drag-and-drop reordering
- Bulk actions (multi-select)
- Nested folders
