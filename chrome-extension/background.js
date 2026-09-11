/**
 * Onsemble — background service worker.
 *
 * The Onsemble web app is the transport: it already has a realtime connection
 * to everyone in the room. This worker simply relays playback events between
 * the streaming tab (content.js) and the open Onsemble tab (bridge.js).
 *
 *   streaming tab  <-->  background  <-->  onsemble tab  <-->  room realtime
 */

let roomCode = null;
let streamTabId = null;
let streamService = null;
const bridgeTabs = new Set();

function log(...args) {
  console.log("[Onsemble bg]", ...args);
}

function persist() {
  chrome.storage.local.set({
    roomCode,
    connected: bridgeTabs.size > 0 && !!roomCode,
    videoDetected: streamTabId != null,
    service: streamService,
  });
}

function sendToStreamTab(message) {
  if (streamTabId == null) return;
  chrome.tabs.sendMessage(streamTabId, message).catch(() => {
    streamTabId = null;
    streamService = null;
    persist();
  });
}

function sendToBridges(message) {
  for (const tabId of [...bridgeTabs]) {
    chrome.tabs.sendMessage(tabId, message).catch(() => bridgeTabs.delete(tabId));
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message?.type) {
    /* ---- from bridge.js (the Onsemble tab) ---- */
    case "ONSEMBLE_BRIDGE_HELLO":
      if (sender.tab?.id != null) bridgeTabs.add(sender.tab.id);
      roomCode = message.roomCode ?? roomCode;
      persist();
      sendResponse({ ok: true, roomCode, service: streamService, videoDetected: streamTabId != null });
      break;

    case "ONSEMBLE_JOIN_ROOM":
      if (sender.tab?.id != null) bridgeTabs.add(sender.tab.id);
      roomCode = message.roomCode ?? null;
      persist();
      sendResponse({ ok: true, roomCode });
      break;

    case "ONSEMBLE_LEAVE_ROOM":
      if (sender.tab?.id != null) bridgeTabs.delete(sender.tab.id);
      roomCode = null;
      persist();
      sendResponse({ ok: true });
      break;

    // A friend played / paused / seeked — apply it to our streaming tab.
    case "ONSEMBLE_REMOTE_EVENT":
      sendToStreamTab({ type: "ONSEMBLE_REMOTE_EVENT", payload: message.payload });
      sendResponse({ ok: true, applied: streamTabId != null });
      break;

    case "ONSEMBLE_STATUS":
      sendResponse({
        roomCode,
        connected: bridgeTabs.size > 0 && !!roomCode,
        videoDetected: streamTabId != null,
        service: streamService,
      });
      break;

    /* ---- from content.js (the streaming tab) ---- */
    case "ONSEMBLE_VIDEO_DETECTED":
      streamTabId = sender.tab?.id ?? null;
      streamService = message.service ?? null;
      persist();
      sendToBridges({ type: "ONSEMBLE_VIDEO_DETECTED", service: streamService });
      sendResponse({ ok: true, roomCode });
      break;

    case "ONSEMBLE_LOCAL_EVENT":
      sendToBridges({
        type: "ONSEMBLE_LOCAL_EVENT",
        payload: {
          type: "playback",
          action: message.action, // "play" | "pause" | "seeked"
          currentTime: message.currentTime,
          service: message.service,
          at: Date.now(),
        },
      });
      sendResponse({ ok: true });
      break;

    default:
      sendResponse({ ok: false, error: "unknown message" });
  }
  return true; // keep the async response channel open
});

chrome.tabs.onRemoved.addListener((tabId) => {
  bridgeTabs.delete(tabId);
  if (tabId === streamTabId) {
    streamTabId = null;
    streamService = null;
    sendToBridges({ type: "ONSEMBLE_VIDEO_LOST" });
  }
  persist();
});

log("service worker ready");
