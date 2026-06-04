const DEFAULT_APP_ORIGIN = "https://affiliate-agent-os.vercel.app";
const EXTENSION_INSTANCE_ID_KEY = "affiliate_agent_os_helper_instance_id";
const APP_ORIGIN_KEY = "affiliate_agent_os_app_origin";
const EXECUTOR_ALARM_NAME = "affiliate_agent_os_executor_poll";
const EXECUTOR_POLL_MINUTES = 1;

async function getInstanceId() {
  const stored = await chrome.storage.local.get(EXTENSION_INSTANCE_ID_KEY);
  if (stored[EXTENSION_INSTANCE_ID_KEY]) return stored[EXTENSION_INSTANCE_ID_KEY];

  const id = crypto.randomUUID();
  await chrome.storage.local.set({ [EXTENSION_INSTANCE_ID_KEY]: id });
  return id;
}

async function getAppOrigin() {
  const stored = await chrome.storage.local.get(APP_ORIGIN_KEY);
  return stored[APP_ORIGIN_KEY] || DEFAULT_APP_ORIGIN;
}

async function postJson(path, body) {
  const appOrigin = await getAppOrigin();
  const response = await fetch(`${appOrigin}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`App request failed: ${response.status}`);
  }

  return response.json();
}

async function getJson(path) {
  const appOrigin = await getAppOrigin();
  const response = await fetch(`${appOrigin}${path}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`App request failed: ${response.status}`);
  }

  return response.json();
}

function detectBlocker(url, title) {
  const text = `${url || ""} ${title || ""}`.toLowerCase();
  if (text.includes("login") || text.includes("signin")) return "login_required";
  if (text.includes("captcha")) return "captcha_required";
  if (text.includes("2fa") || text.includes("challenge")) return "two_factor_required";
  if (text.includes("passkey")) return "passkey_required";
  return null;
}

function detectPlatform(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname.endsWith("linkedin.com")) return "linkedin";
    if (hostname.endsWith("medium.com")) return "medium";
    if (hostname.endsWith("substack.com")) return "substack";
    if (hostname.endsWith("tiktok.com")) return "tiktok";
    if (hostname.endsWith("quora.com")) return "quora";
    if (hostname.endsWith("reddit.com")) return "reddit";
  } catch {}
  return "unknown";
}

function isLikelyPublishedPostUrl(url, platform) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    const segments = pathname.split("/").filter(Boolean);

    if (platform === "medium") {
      return (
        pathname !== "/new-story" &&
        !pathname.endsWith("/edit") &&
        !pathname.includes("/edit/") &&
        segments.length >= 2
      );
    }

    if (platform === "substack") {
      return segments[0] === "p" && segments.length >= 2;
    }

    if (platform === "linkedin") {
      return pathname.includes("/feed/update/") || pathname.includes("/posts/");
    }

    return false;
  } catch {
    return false;
  }
}

async function startExecutorPolling() {
  await chrome.alarms.create(EXECUTOR_ALARM_NAME, {
    delayInMinutes: EXECUTOR_POLL_MINUTES,
    periodInMinutes: EXECUTOR_POLL_MINUTES,
  });
}

async function openConfirmedPublishJob(job) {
  if (job.platform !== "medium") {
    await postJson(`/api/browser-helper/jobs/${job.id}`, {
      status: "failed",
      blockerReason: "confirmed_publish_platform_not_enabled",
      message: "Confirmed publish execution is enabled only for Medium.",
    });
    return { ok: false, message: "Confirmed publish is not enabled for this platform." };
  }

  const matchingTabs = await chrome.tabs.query({ url: job.targetUrl });
  const tab = matchingTabs[0] || await chrome.tabs.create({ url: job.targetUrl, active: true });
  if (!tab.id) return { ok: false, message: "Unable to open prepared Medium draft." };

  await chrome.tabs.update(tab.id, { active: true });
  await chrome.storage.session.set({ currentBrowserJob: { ...job, tabId: tab.id } });

  setTimeout(async () => {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "AFFILIATE_AGENT_PUBLISH_CONFIRMED",
        job,
      });
    } catch (error) {
      await postJson(`/api/browser-helper/jobs/${job.id}`, {
        status: "failed",
        blockerReason: "confirmed_publish_content_script_unreachable",
        errorMessage: String(error?.message || error),
      });
    }
  }, 2500);

  return { ok: true, message: "Opened confirmed Medium publish job." };
}

async function heartbeat() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;

  const blockerStatus = detectBlocker(tab.url, tab.title);
  const extensionInstanceId = await getInstanceId();

  return postJson("/api/browser-helper/session", {
    extensionInstanceId,
    activeTabUrl: tab.url,
    activeTabTitle: tab.title || null,
    blockerStatus,
  });
}

async function openAndFillNextJob() {
  await heartbeat();
  const { job } = await getJson("/api/browser-helper/jobs");
  if (!job) return { ok: true, message: "No queued jobs." };

  if (job.executorCommand === "publish_confirmed") {
    return openConfirmedPublishJob(job);
  }

  if (!job.targetUrl) {
    await postJson(`/api/browser-helper/jobs/${job.id}`, {
      status: "blocked",
      blockerReason: "No target URL for this platform.",
      message: "Job blocked because no platform target URL exists.",
    });
    return { ok: false, message: "No target URL for this platform." };
  }

  const tab = await chrome.tabs.create({ url: job.targetUrl, active: true });
  await postJson(`/api/browser-helper/jobs/${job.id}`, {
    status: "opened",
    activeTabUrl: job.targetUrl,
    message: "Opened platform target URL.",
  });

  await chrome.storage.session.set({ currentBrowserJob: { ...job, tabId: tab.id } });

  setTimeout(async () => {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "AFFILIATE_AGENT_FILL_JOB", job });
    } catch (error) {
      await postJson(`/api/browser-helper/jobs/${job.id}`, {
        status: "failed",
        blockerReason: "content_script_unreachable",
        errorMessage: String(error?.message || error),
      });
    }
  }, 2500);

  return { ok: true, message: `Opened ${job.platform} job.` };
}

async function captureCurrentPostUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const stored = await chrome.storage.session.get("currentBrowserJob");
  const job = stored.currentBrowserJob;
  if (!tab?.url || !job?.id) return { ok: false, message: "No active job to capture." };

  await postJson(`/api/browser-helper/jobs/${job.id}`, {
    status: "published",
    postUrl: tab.url,
    activeTabUrl: tab.url,
    message: "Captured published post URL from active tab.",
  });
  await chrome.storage.session.remove("currentBrowserJob");
  return { ok: true, message: "Published URL captured." };
}

async function maybeCapturePublishedUrl(tabId, url) {
  const stored = await chrome.storage.session.get("currentBrowserJob");
  const job = stored.currentBrowserJob;
  if (!job?.id || job.tabId !== tabId || !url) return;
  if (detectPlatform(url) !== job.platform) return;
  if (!isLikelyPublishedPostUrl(url, job.platform)) return;

  await postJson(`/api/browser-helper/jobs/${job.id}`, {
    status: "published",
    postUrl: url,
    activeTabUrl: url,
    message: "Browser helper detected and verified the live post URL.",
  });
  await chrome.storage.session.remove("currentBrowserJob");
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === "AFFILIATE_AGENT_HEARTBEAT") {
      const result = await heartbeat();
      await startExecutorPolling();
      return result;
    }
    if (message?.type === "AFFILIATE_AGENT_OPEN_NEXT_JOB") return openAndFillNextJob();
    if (message?.type === "AFFILIATE_AGENT_CAPTURE_URL") return captureCurrentPostUrl();
    if (message?.type === "AFFILIATE_AGENT_SET_APP_ORIGIN") {
      await chrome.storage.local.set({ [APP_ORIGIN_KEY]: message.appOrigin || DEFAULT_APP_ORIGIN });
      return { ok: true };
    }
    return { ok: false, message: "Unknown command." };
  })()
    .then((result) => sendResponse(result))
    .catch((error) => sendResponse({ ok: false, message: String(error?.message || error) }));
  return true;
});

chrome.tabs.onActivated.addListener(() => {
  heartbeat().catch(() => {});
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.status === "complete") heartbeat().catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  maybeCapturePublishedUrl(tabId, tab.url).catch(() => {});
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== EXECUTOR_ALARM_NAME) return;
  openAndFillNextJob().catch(() => {});
});
