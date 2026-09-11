# Together Stream

Project Overview: Build a web application and accompanying Chrome extension scaffolding called "Onsemble" (spelled exactly like that). Onsemble is designed for long-distance friends to create virtual rooms, video chat, and synchronize video playback across major streaming platforms (YouTube, Netflix, Disney+, Apple TV, Amazon Prime) via a Chrome extension.

Target Device: Strict desktop experience. Do not optimize for mobile screens.

Design System & Theme:

Landing/Dashboard: Very friendly, energetic, and colorful. Use bright, vibrant colors (think warm yellows, electric blues, and playful pinks) with soft, rounded UI components.

Theater Mode (The "Quirk"): When a user enters a "Friendship Room" or "Date Room", the UI must smoothly transition into a "Theater Mode." The bright colors should fade out into a sleek, dark mode (deep charcoals, blacks, and subtle neon accents) to simulate the lights dimming in a movie theater.

Core Features & Architecture to Generate:

1. The Web Application (React/Tailwind):

Landing Page: A bright, welcoming screen where users can either "Create a Room" or "Join a Room" using a room code.

Room UI (Theater Mode): Once inside a room, dim the lights (switch to dark theme). The room UI should feature:

A central placeholder indicating "Waiting for stream sync..." or displaying the active streaming service.

A live video chat sidebar (mock WebRTC implementation for the MVP) so users can see each other.

A prominent "Pop-Out Video" button that triggers the browser's Picture-in-Picture (PiP) API for the video feed, allowing the video chat to float over other browser tabs.

Room connection status (e.g., "Friend connected", "Sync active").

2. Chrome Extension Scaffolding:

Please generate a specific folder in the project structure called chrome-extension.

Include a manifest.json (Manifest V3) configured for host permissions on major streaming sites (*://*[.youtube.com/](https://.youtube.com/)*, *://*[.netflix.com/](https://.netflix.com/)*, *://*[.disneyplus.com/](https://.disneyplus.com/)*, etc.).

Create a background.js script that acts as the websocket/messaging relay between the web app and the active streaming tab.

Create a content.js script designed to inject into streaming pages, find the native <video> HTML5 tag, and listen for play, pause, and seeked events to broadcast to the room, as well as receive those events to control the local video player.

User Flow:

User opens the Onsemble web app (bright/colorful).

User creates a room. The lights dim (dark mode animation).

User shares the generated room link/code with a friend.

Friend joins. Their video feeds appear on the web app.

User clicks "Pop-Out Video" to float the video chat.

User navigates to a new tab (e.g., Netflix), and the Chrome extension (simulated in this MVP) detects the video and prepares for sync.

Please generate the full React web application, the interactive UI for the room, the dimming light transition, and the raw JavaScript files required for the Chrome Extension.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/66f01136-3dfe-4886-be00-561601d15238).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
