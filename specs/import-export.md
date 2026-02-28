# Import / Export

## Overview

Obsidian-compatible markdown import and export for data portability.

## User Stories

- As a user, I want to export all notes as markdown files so I can use them in Obsidian
- As a user, I want to import markdown files so I can bring in existing notes

## Requirements

### Export
- [ ] "Export all" button in Settings
- [ ] Generates a .zip file containing all notes as .md files
- [ ] Each file has YAML frontmatter (date, tags)
- [ ] Filename format: YYYY-MM-DD-first-few-words.md
- [ ] Compatible with Obsidian vault import

### Import
- [ ] "Import notes" button in Settings — opens file picker for .md files
- [ ] Parses YAML frontmatter for date and tags
- [ ] Supports Obsidian-style #tags in body text (extracted as tags)
- [ ] Falls back gracefully: no frontmatter = current date, no tags
- [ ] Deduplication: skip notes whose text exactly matches an existing note

## Acceptance Criteria

- [ ] Exported .md files open correctly in Obsidian
- [ ] Imported notes appear in the notes list with correct metadata
- [ ] Round-trip: export then import produces identical notes
- [ ] Large exports (100+ notes) complete without errors

## Out of Scope

- Sync with Obsidian (one-time import/export only)
- Importing non-markdown formats
- Cloud backup/restore
