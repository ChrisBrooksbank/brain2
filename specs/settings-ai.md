# Settings & AI

## Overview

App settings including optional AI configuration (BYOK Claude API key).

## User Stories

- As a user, I want to enter my Claude API key so notes get auto-tagged
- As a user, I want to test my API key to make sure it works
- As a user, I want the app to work perfectly without an API key

## Requirements

- [ ] API key input field (password type, show/hide toggle)
- [ ] Save button — stores key in IndexedDB config table
- [ ] Test button — makes a small Claude API call to validate the key
- [ ] Status indicator: "Connected" / "No key set" / "Invalid key"
- [ ] Clear button to remove key
- [ ] Auto-tagging: extracts 2-4 lowercase tags from note text via Claude Haiku
- [ ] Auto-tagging is fire-and-forget — never blocks note save
- [ ] Auto-tagging uses direct browser-to-API call (anthropic-dangerous-direct-browser-access header)
- [ ] Graceful failure: no errors shown if auto-tag fails

## Acceptance Criteria

- [ ] API key persists across sessions (stored in IndexedDB)
- [ ] Test button confirms key validity
- [ ] Notes get tags added async after save when key is set
- [ ] App works 100% without an API key set
- [ ] No API key is ever sent to any server except api.anthropic.com

## Out of Scope

- Multiple AI provider support
- Custom tag prompts
- AI-powered search or summarization
