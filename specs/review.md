# Review

## Overview

Resurface forgotten notes for daily review — rediscover what you captured.

## User Stories

- As a user, I want to see random old notes so I don't forget important thoughts
- As a user, I want to quickly archive notes that are no longer relevant

## Requirements

- [ ] Show 5 random notes older than 24 hours, not archived
- [ ] Each note displayed as a full card with complete text
- [ ] Two action buttons per card: Keep (leave as-is) and Archive (move to archive)
- [ ] Archiving removes the card reactively via useLiveQuery
- [ ] Empty state: "All caught up — no notes older than 24 hours to review."
- [ ] Loading state while query resolves

## Acceptance Criteria

- [ ] Review shows different random notes each visit
- [ ] Archiving a note removes it from the review list immediately
- [ ] Keeping a note leaves it for potential future review
- [ ] Only non-archived notes older than 24h appear

## Out of Scope

- Spaced repetition algorithms
- Note editing from review view
- Review scheduling/reminders
