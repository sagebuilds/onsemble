/**
 * Onsemble — content script.
 * Injected into streaming pages. Finds the native <video> element,
 * broadcasts play / pause / seeked events, and applies remote events.
 */

const SERVICES = [
  { match: "youtube.com", name: "YouTube" },
  { match: "netflix.com", name: "Netflix" },
  { match: "disneyplus.com", name: "Disney+" },
  { match: "tv.apple.com", name: "Apple TV+" },
  { match: "primevideo.com", name: "Prime Video" },
  { match: "amazon.", name: "Prime Video" },
];

const SERVICE =
  SERVICES.find((s) => location.hostname.includes(s.match))?.name ?? "Unknown";

const DRIFT_TOLERANCE = 0.75; // seconds
let video = null;
let applyingRemote = false;

function log(...args) {
  console.log("[Onsemble]", ...args);
}

/* ---------------- find the player ---------------- */

function findVideo() {
  const candidates = Array.from(document.querySelectorAll("video"));
  return (
    candidates.find((v) => v.readyState > 0 && v.duration > 0) ??
    candidates[0] ??
    null
  );
}

function attach(el) {
  if (!el || el === video) return;
  video = el;
  log("video attached on", SERVICE);

  chrome.runtime.sendMessage({
    type: "ONSEMBLE_VIDEO_DETECTED",
    service: SERVICE,
    duration: video.duration,
  });

  video.addEventListener("play", () => emit("play"));
  video.addEventListener("pause", () => emit("pause"));
  video.addEventListener("seeked", () => emit("seeked"));
}

function emit(action) {
  if (applyingRemote || !video) return;
  chrome.runtime.sendMessage({
    type: "ONSEMBLE_LOCAL_EVENT",
    action,
    currentTime: video.currentTime,
    service: SERVICE,
  });
}

/* ---------------- apply remote events ---------------- */

function applyRemote(payload) {
  if (!video || payload?.type !== "playback") return;
  applyingRemote = true;

  const { action, currentTime } = payload;
  if (typeof currentTime === "number") {
    if (Math.abs(video.currentTime - currentTime) > DRIFT_TOLERANCE) {
      video.currentTime = currentTime;
    }
  }
  if (action === "play") video.play().catch(() => {});
  if (action === "pause") video.pause();

  setTimeout(() => {
    applyingRemote = false;
  }, 300);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "ONSEMBLE_REMOTE_EVENT") applyRemote(message.payload);
  if (message?.type === "ONSEMBLE_PING") {
    sendResponse({ service: SERVICE, hasVideo: !!video });
  }
  return true;
});

/* ---------------- keep looking (SPA navigation) ---------------- */

const observer = new MutationObserver(() => {
  const found = findVideo();
  if (found && found !== video) attach(found);
});

observer.observe(document.documentElement, { childList: true, subtree: true });
attach(findVideo());
setInterval(() => attach(findVideo()), 3000);
