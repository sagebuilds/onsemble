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
// Whoever last played, paused or seeked leads; their player sends a position
// heartbeat and everyone else gently catches up to it.
let leading = false;
const HEARTBEAT_MS = 3000;
const NUDGE_RATE = 0.05; // speed up / slow down by 5% to close small gaps
const SEEK_THRESHOLD = 2; // seconds — beyond this, jump instead of nudging
const SETTLED = 0.25; // seconds — close enough, play at normal speed

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
  if (action !== "tick") leading = true;
  chrome.runtime.sendMessage({
    type: "ONSEMBLE_LOCAL_EVENT",
    action,
    currentTime: video.currentTime,
    paused: video.paused,
    service: SERVICE,
  });
}

setInterval(() => {
  if (leading && video && !video.paused) emit("tick");
}, HEARTBEAT_MS);

/** Close a small gap by playing slightly faster or slower for a moment. */
function nudgeTowards(target) {
  const gap = target - video.currentTime;
  if (Math.abs(gap) > SEEK_THRESHOLD) {
    video.currentTime = target;
    video.playbackRate = 1;
  } else if (Math.abs(gap) > SETTLED) {
    video.playbackRate = gap > 0 ? 1 + NUDGE_RATE : 1 - NUDGE_RATE;
  } else {
    video.playbackRate = 1;
  }
}

/* ---------------- apply remote events ---------------- */

function applyRemote(payload) {
  if (!video || payload?.type !== "playback") return;
  if (payload.action === "tick") {
    leading = false;
    if (typeof payload.currentTime === "number" && !video.paused) nudgeTowards(payload.currentTime);
    return;
  }
  leading = false;
  video.playbackRate = 1;
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
