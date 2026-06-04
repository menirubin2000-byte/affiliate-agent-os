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

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isVisible(element) {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
}

async function fillLinkedIn() {
  if (pageHasSensitiveBlocker()) {
    return { status: "requires_auth", blockerReason: "login_required" };
  }

  return {
    status: "failed",
    blockerReason: "executor_publish_automation_not_implemented_for_linkedin",
    message: "LinkedIn executor cannot safely complete publish automatically yet.",
  };
}

function setEditableText(element, text) {
  element.focus();
  document.execCommand("selectAll", false, null);
  const inserted = document.execCommand("insertText", false, text);
  if (!inserted) {
    element.textContent = text;
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  }
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function getEditableFields() {
  const fields = Array.from(document.querySelectorAll('[contenteditable="true"], textarea, input[type="text"]'))
    .filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    });

  return fields;
}

async function fillEditorSurface(job) {
  if (pageHasSensitiveBlocker()) {
    return { status: "requires_auth", blockerReason: "login_required" };
  }

  const fields = getEditableFields();
  if (fields.length < 1) {
    return {
      status: "failed",
      blockerReason: `${job.platform}_editor_fields_not_found`,
      message: "Executor could not find editable title/body fields.",
    };
  }

  const title = job.title || "Approved affiliate post";
  const body = job.content || "";
  const [first, second] = fields;

  if (second) {
    setEditableText(first, title);
    setEditableText(second, body);
  } else {
    setEditableText(first, `${title}\n\n${body}`);
  }

  return {
    status: "pending_operator_confirmation",
    blockerReason: "executor_waiting_final_confirmation",
    message: `${job.platform} content filled. Waiting for final publish confirmation and live URL verification.`,
  };
}

async function fillCurrentPage(job) {
  if (job.platform === "linkedin") return fillLinkedIn(job);
  if (job.platform === "medium" || job.platform === "substack") return fillEditorSurface(job);
  return { status: "blocked", blockerReason: `${job.platform} filling is not implemented yet.` };
}

async function publishConfirmedMedium(job) {
  if (job.platform !== "medium" || !location.hostname.endsWith("medium.com")) {
    return {
      status: "failed",
      blockerReason: "confirmed_medium_editor_not_open",
      message: "Prepared Medium editor is not open.",
    };
  }

  if (pageHasSensitiveBlocker()) {
    return { status: "requires_auth", blockerReason: "login_required" };
  }

  const editorText = Array.from(document.querySelectorAll('[contenteditable="true"]'))
    .map((element) => element.innerText || "")
    .join("\n")
    .trim();
  if (editorText.length < 100) {
    return {
      status: "failed",
      blockerReason: "prepared_medium_content_missing",
      message: "Prepared Medium content is missing.",
    };
  }

  const publishButtons = () => Array.from(document.querySelectorAll("button"))
    .filter((button) => /^publish(?: now)?$/i.test((button.innerText || button.textContent || "").trim()))
    .filter(isVisible);

  const firstPublish = publishButtons()[0];
  if (!firstPublish) {
    return {
      status: "failed",
      blockerReason: "medium_publish_button_not_found",
      message: "Medium Publish button was not found.",
    };
  }

  firstPublish.click();
  await wait(1200);

  const finalPublishButtons = publishButtons();
  const finalPublish = finalPublishButtons[finalPublishButtons.length - 1];
  if (!finalPublish || finalPublish === firstPublish) {
    return {
      status: "failed",
      blockerReason: "medium_final_publish_button_not_found",
      message: "Medium final Publish confirmation was not found.",
    };
  }

  finalPublish.click();
  return {
    status: "waiting_url_verification",
    blockerReason: null,
    message: "Medium Publish clicked after MENI final confirmation. Waiting for verified live URL.",
  };
}

async function getAppOrigin() {
  const stored = await chrome.storage.local.get("affiliate_agent_os_app_origin");
  return stored.affiliate_agent_os_app_origin || "https://affiliate-agent-os.vercel.app";
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "AFFILIATE_AGENT_FILL_JOB" && message?.type !== "AFFILIATE_AGENT_PUBLISH_CONFIRMED") {
    return false;
  }

  const operation = message.type === "AFFILIATE_AGENT_PUBLISH_CONFIRMED"
    ? publishConfirmedMedium(message.job)
    : fillCurrentPage(message.job);

  operation
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
