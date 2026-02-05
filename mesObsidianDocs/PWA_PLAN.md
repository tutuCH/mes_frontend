# PWA Baseline Plan (NEXUS MES)

## Goals
- Installable on iOS Safari (Add to Home Screen) and Android (Install app).
- Fast startup, app-like fullscreen feel.
- Offline-friendly for core pages and assets.
- Safe caching (avoid stale API data).
- Minimal risk and no backend changes.

## Required Changes
- Add `vite-plugin-pwa` with Workbox runtime caching and offline fallback.
- Add a web app manifest with icons and theme colors.
- Add service worker registration in production only.
- Add install UX for iOS (A2HS banner) with localStorage suppression.
- Add an offline route and banner inside the app.
- Add iOS meta tags and `viewport-fit=cover`.
- Fix mobile URL bar overlap using dynamic viewport units.

## Caching Strategy
- Precache: app shell assets, JS/CSS, fonts, icons, `offline.html`.
- Runtime cache:
  - Images: Cache-first with expiration.
  - API GET: Network-first with short timeout and a short-lived cache (same-origin only).
- Offline behavior:
  - `offline.html` as navigation fallback.
  - `/offline` route inside the app for user-friendly messaging.

## iOS-Specific Notes
- `apple-touch-icon.png` and iOS meta tags.
- `apple-mobile-web-app-capable` and `status-bar-style`.
- Install guidance banner for iOS Safari.

## Acceptance Checklist
- Lighthouse PWA checks pass.
- iOS A2HS works and launches full-screen.
- Android install prompt appears (if supported).
- Offline: app loads + shows offline message gracefully.
- API GET cache does not serve stale data beyond short TTL.

## Risks & Rollback
- Risk: over-caching API responses.
  - Mitigation: network-first, short TTL, same-origin only.
- Risk: caching SSE/WS.
  - Mitigation: exclude `/sse` and `/socket.io`.
- Rollback: remove SW registration + `vite-plugin-pwa` config and delete manifest/icons.
