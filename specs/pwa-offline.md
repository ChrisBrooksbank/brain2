# PWA & Offline

## Overview

Progressive Web App setup for installability, offline access, and mobile-native feel.

## User Stories

- As a user, I want to install the app on my phone home screen
- As a user, I want the app to work offline
- As a user, I want automatic daily backups of my data

## Requirements

### PWA
- [ ] Web manifest with app name, icons, theme color, standalone display
- [ ] Service worker via Serwist (@serwist/next) with precache + runtime cache
- [ ] Apple touch icon and splash screen meta tags
- [ ] Install prompt or browser-native install support

### Offline
- [ ] All views work without network connection
- [ ] Note capture works offline
- [ ] IndexedDB data persists across sessions

### Navigation
- [ ] Bottom tab bar: Capture (/), Notes (/notes), Review (/review), Settings (/settings)
- [ ] Active tab highlighted
- [ ] Safe area padding for iPhone home indicator (env(safe-area-inset-bottom))
- [ ] Mobile-optimized touch targets (min 44px)

### Backups
- [ ] Daily auto-snapshot in IndexedDB (on app open, if last backup >24h ago)
- [ ] Rolling 7-day backup history
- [ ] Manual "Download Backup" button in Settings

### Polish
- [ ] Haptic feedback on save/archive: navigator.vibrate?.(10)
- [ ] Mobile viewport: h-dvh, no zoom (maximumScale: 1)
- [ ] Dark theme (bg-neutral-950, text-white)

## Acceptance Criteria

- [ ] App installs as PWA on Android and iOS
- [ ] Service worker registers and caches app shell
- [ ] All features work in airplane mode
- [ ] Bottom nav shows correct active state
- [ ] Backups are created automatically daily

## Out of Scope

- Push notifications
- Background sync
- Cloud backup
