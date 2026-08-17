const codeInput = document.getElementById("code");
const status = document.getElementById("status");

chrome.storage.local.get(["roomCode", "connected", "service"], (data) => {
  if (data.roomCode) codeInput.value = data.roomCode;
  status.textContent = data.connected
    ? `Connected${data.service ? ` — ${data.service} detected` : ""}`
    : "Not connected";
});

document.getElementById("join").addEventListener("click", () => {
  const roomCode = codeInput.value.trim().toUpperCase();
  if (!roomCode) return;
  chrome.runtime.sendMessage({ type: "ONSEMBLE_JOIN_ROOM", roomCode }, () => {
    status.textContent = `Joined ${roomCode}`;
  });
});
