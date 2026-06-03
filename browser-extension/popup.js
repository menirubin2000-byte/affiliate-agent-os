const statusEl = document.getElementById("status");
const appOriginEl = document.getElementById("appOrigin");

function setStatus(message) {
  statusEl.textContent = message;
}

async function send(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  setStatus(response?.message || (response?.ok === false ? "Failed" : "Done"));
}

document.getElementById("saveOrigin").addEventListener("click", () => {
  send("AFFILIATE_AGENT_SET_APP_ORIGIN", { appOrigin: appOriginEl.value.trim() });
});

document.getElementById("connect").addEventListener("click", () => {
  send("AFFILIATE_AGENT_HEARTBEAT");
});
