function pageHasSensitiveBlocker() {
  const text = document.body?.innerText?.toLowerCase() || "";
  const url = location.href.toLowerCase();
  return (
    url.includes("login") ||
    url.includes("signin") ||
    text.includes("captcha") ||
    text.includes("two-factor") ||
    text.includes("2fa") ||
    text.includes("passkey") ||
    document.querySelector('input[type="password"], input[autocomplete="current-password"], input[name*="card"]')
  );
}

async function fillLinkedIn() {
  if (pageHasSensitiveBlocker()) {
    return { status: "blocked", blockerReason: "Login, CAPTCHA, 2FA, passkey, password, or payment field detected." };
  }

  return {
    status: "failed",
    blockerReason: "executor_publish_automation_not_implemented_for_linkedin",
    message: "LinkedIn executor cannot safely complete publish automatically yet.",
  };
}

async function fillCurrentPage(job) {
  if (job.platform === "linkedin") return fillLinkedIn(job);
  return { status: "blocked", blockerReason: `${job.platform} filling is not implemented yet.` };
}

async function getAppOrigin() {
  const stored = await chrome.storage.local.get("affiliate_agent_os_app_origin");
  return stored.affiliate_agent_os_app_origin || "https://affiliate-agent-os.vercel.app";
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "AFFILIATE_AGENT_FILL_JOB") return false;

  fillCurrentPage(message.job)
    .then(async (result) => {
      const appOrigin = await getAppOrigin();
      await fetch(`${appOrigin}/api/browser-helper/jobs/${message.job.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: result.status,
          activeTabUrl: location.href,
          blockerReason: result.blockerReason || null,
          message: result.message || result.blockerReason || "Browser helper updated job.",
        }),
      });
      sendResponse({ ok: true, ...result });
    })
    .catch((error) => sendResponse({ ok: false, message: String(error?.message || error) }));

  return true;
});
