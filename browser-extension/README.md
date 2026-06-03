# Affiliate Agent OS Browser Helper

Chrome extension for controlled publishing execution after MENI approval.

## What it does

- Connects to Affiliate Agent OS.
- Reads only the active page URL, title, and basic blocker state.
- Opens approved `publish_jobs`.
- Sends approved content only to supported executor flows.
- Polls for approved executor jobs after the helper is connected.
- Stops on login, CAPTCHA, 2FA, passkey, password fields, or payment fields.
- Fills supported Medium/Substack editor surfaces and waits for final operator confirmation when required.
- Reports unsupported final publish automation as a system blocker.
- Captures and verifies a real post URL only after publication.

## What it does not do

- It does not read passwords.
- It does not store cookies.
- It does not read payment fields.
- It does not bypass platform login, CAPTCHA, 2FA, passkeys, legal prompts, or payment fields.
- It does not create fake post URLs or fake metrics.
- It does not move copy/paste/publish tasks back to MENI.

## Install locally

1. Open Chrome Extensions.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select this `browser-extension` folder.
5. Make sure you are logged into Affiliate Agent OS in the same Chrome profile.
6. Open the extension popup and click "Connect / heartbeat".

## Execution flow

1. MENI approves final copy in Affiliate Agent OS.
2. The app creates or updates a `publish_jobs` record.
3. The helper pulls the next approved job.
4. If auth/CAPTCHA/2FA/passkey blocks execution, the app marks the job `requires_auth`.
5. If the helper fills content but the platform requires final confirmation, the app marks the job `pending_operator_confirmation`.
6. A `published_record` is created only after a real live URL is verified.
