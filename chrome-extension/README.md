# Onsemble Sync — Chrome Extension (MV3)

Relays play / pause / seek events between the Onsemble web app and your streaming tab.

## Install (unpacked)

1. Download and unzip `onsemble-extension.zip` (or use this folder directly).
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and select this folder.

## Files

- `manifest.json` — MV3 manifest with host permissions for YouTube, Netflix, Disney+, Apple TV+, Prime Video.
- `background.js` — service worker; websocket relay + message router between the web app and streaming tabs.
- `content.js` — injected into streaming pages; finds the `<video>` element, emits `play` / `pause` / `seeked`, applies remote events with drift correction.
- `popup.html` / `popup.js` — join a room by code.

Point `RELAY_URL` in `background.js` at your realtime websocket relay.
