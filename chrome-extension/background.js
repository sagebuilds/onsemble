/**
 * Onsemble — background service worker.
 * Acts as the websocket / messaging relay between the Onsemble web app
 * and the active streaming tab running content.js.
 */

const RELAY_URL = "wss://relay.onsemble.app/rooms"; // replace with your realtime relay

let socket = null;
let roomCode = null;
let streamTabId = null;
let selfId = crypto.randomUUID();

function log(...args) {
  console.log("[Onsemble bg]", ...args);
}

/* ---------------- socket relay ---------------- */

function connect(code) {
  roomCode = code;
  if (socket) socket.close();

  try {
    socket = new WebSocket(`${RELAY_URL}/${encodeURIComponent(code)}`);
  } catch (err) {
    log("socket failed, running in local-only mode", err);
    return;
  }

  socket.onopen = () => {
    log("connected to room", code);
    chrome.storage.local.set({ roomCode: code, connected: true });
  };

  socket.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (msg.senderId === selfId) return; // ignore our own echo
    // Remote playback command -> forward to the streaming tab
    sendToStreamTab({ type: "ONSEMBLE_REMOTE_EVENT", payload: msg });
  };

  socket.onclose = () => {
    log("relay closed");
    chrome.storage.local.set({ connected: false });
  };
}

function broadcast(payload) {
  const msg = { ...payload, senderId: selfId, roomCode, at: Date.now() };
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  } else {
    log("broadcast (offline)", msg);
  }
}

/* ---------------- tab messaging ---------------- */

function sendToStreamTab(message) {
  if (streamTabId == null) return;
  chrome.tabs.sendMessage(streamTabId, message).catch(() => {
    streamTabId = null;
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message?.type) {
    // From the Onsemble web app / popup
    case "ONSEMBLE_JOIN_ROOM":
      connect(message.roomCode);
      sendResponse({ ok: true, roomCode: message.roomCode });
      break;

    case "ONSEMBLE_LEAVE_ROOM":
      socket?.close();
      socket = null;
      roomCode = null;
      chrome.storage.local.set({ connected: false, roomCode: null });
      sendResponse({ ok: true });
      break;

    case "ONSEMBLE_STATUS":
      sendResponse({
        roomCode,
        connected: socket?.readyState === WebSocket.OPEN,
        streamTabId,
      });
      break;

    // From content.js: a video was found on a streaming page
    case "ONSEMBLE_VIDEO_DETECTED":
      streamTabId = sender.tab?.id ?? null;
      chrome.storage.local.set({
        service: message.service,
        videoDetected: true,
      });
      broadcast({ type: "video-detected", service: message.service });
      sendResponse({ ok: true, roomCode });
      break;

    // From content.js: local user played / paused / seeked
    case "ONSEMBLE_LOCAL_EVENT":
      broadcast({
        type: "playback",
        action: message.action, // "play" | "pause" | "seeked"
        currentTime: message.currentTime,
        service: message.service,
      });
      sendResponse({ ok: true });
      break;

    default:
      sendResponse({ ok: false, error: "unknown message" });
  }
  return true; // async response channel
});

/* Allow the Onsemble web app page to talk to the extension directly. */
chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type === "ONSEMBLE_JOIN_ROOM") connect(message.roomCode);
  sendResponse({ ok: true, roomCode });
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === streamTabId) {
    streamTabId = null;
    chrome.storage.local.set({ videoDetected: false, service: null });
  }
});
