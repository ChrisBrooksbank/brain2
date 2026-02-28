# Capture

## Overview

Quick, frictionless note capture — the primary entry point for the app.

## User Stories

- As a user, I want to open the app and immediately start typing so that capture is instant
- As a user, I want to save with one tap or Ctrl+Enter so that I don't lose my thought
- As a user, I want voice capture so that I can dictate notes on mobile

## Requirements

- [ ] Auto-focused textarea filling available space
- [ ] Save button (disabled when empty)
- [ ] Keyboard shortcut: Ctrl+Enter to save
- [ ] On save: persist to IndexedDB, clear input, re-focus textarea
- [ ] Subtle save confirmation (brief flash or toast)
- [ ] Microphone button using Web Speech API for speech-to-text
- [ ] Fire-and-forget auto-tag via Claude API after save (if API key set)
- [ ] New notes default to no tags (tags added async by AI)

## Acceptance Criteria

- [ ] App opens directly to capture view
- [ ] Typing and saving takes < 2 taps
- [ ] Note appears in All Notes immediately after save
- [ ] Voice input transcribes and fills textarea
- [ ] Works fully offline (save works without network)

## Out of Scope

- Rich text editing (plain text only)
- Image/file attachments
- Note templates
