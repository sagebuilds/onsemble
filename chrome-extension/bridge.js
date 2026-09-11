/**
 * Onsemble — page bridge.
 * Runs on the Onsemble web app itself and passes messages between the page
 * (window.postMessage) and the extension's background worker.
 */

const PAGE = "onsemble-app";
const EXT = "onsemble-extension";

function toPage(message) {
  window.postMessage({ source: EXT, ...message }, window.location.origin);
}

/* page -> extension */
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== PAGE) return;

  if (data.type === "JOIN") {
    chrome.runtime.sendMessage({ type: "ONSEMBLE_JOIN_ROOM", roomCode: data.roomCode }, (res) => {
      void chrome.runtime.lastError;
      toPage({ type: "STATUS", ...(res ?? {}) });
    });
  }

  if (data.type === "LEAVE") {
    chrome.runtime.sendMessage({ type: "ONSEMBLE_LEAVE_ROOM" }, () => void chrome.runtime.lastError);
  }

  // A friend's playback event arrived over the room's realtime channel.
  if (data.type === "REMOTE_EVENT") {
    chrome.runtime.sendMessage(
      { type: "ONSEMBLE_REMOTE_EVENT", payload: data.payload },
      () => void chrome.runtime.lastError,
    );
  }

  if (data.type === "STATUS_REQUEST") {
    chrome.runtime.sendMessage({ type: "ONSEMBLE_STATUS" }, (res) => {
      void chrome.runtime.lastError;
      toPage({ type: "STATUS", ...(res ?? {}) });
    });
  }
});

/* extension -> page */
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "ONSEMBLE_LOCAL_EVENT") {
    toPage({ type: "LOCAL_EVENT", payload: message.payload });
  }
  if (message?.type === "ONSEMBLE_VIDEO_DETECTED") {
    toPage({ type: "VIDEO_DETECTED", service: message.service });
  }
  if (message?.type === "ONSEMBLE_VIDEO_LOST") {
    toPage({ type: "VIDEO_LOST" });
  }
});

/* announce ourselves so the page knows the extension is installed */
chrome.runtime.sendMessage({ type: "ONSEMBLE_BRIDGE_HELLO" }, (res) => {
  void chrome.runtime.lastError;
  toPage({ type: "INSTALLED", ...(res ?? {}) });
});

window.addEventListener("load", () => toPage({ type: "INSTALLED" }));
