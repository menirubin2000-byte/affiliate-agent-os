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

function findLinkedInComposerButton() {
  const candidates = Array.from(document.querySelectorAll("button, div[role='button']"));
  return candidates.find((element) => {
    const text = (element.textContent || "").trim().toLowerCase();
    return (
      text.includes("start a post") ||
      text.includes("write a post") ||
      text.includes("כתבו פוסט") ||
      text.includes("כתוב פוסט")
    );
  });
}

async function fillLinkedIn(job) {
  if (pageHasSensitiveBlocker()) {
    return { status: "blocked", blockerReason: "Login, CAPTCHA, 2FA, passkey, password, or payment field detected." };
  }

  const composerButton = findLinkedInComposerButton();
  if (!composerButton) {
    return { status: "blocked", blockerReason: "LinkedIn composer button was not found." };
  }

  composerButton.click();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const editor =
    document.querySelector("[contenteditable='true'][role='textbox']") ||
    document.querySelector("[contenteditable='true']");

  if (!editor) {
    return { status: "blocked", blockerReason: "LinkedIn composer editor was not found." };
  }

  editor.focus();
  document.execCommand("insertText", false, job.content);

  return {
    status: "waiting_user",
    message: "LinkedIn content filled. User must review and click Publish manually.",
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
