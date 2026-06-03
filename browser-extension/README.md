# Affiliate Agent OS Browser Helper

Chrome extension for controlled publishing execution after MENI approval.

## What it does

- Connects to Affiliate Agent OS.
- Reads only the active page URL, title, and basic blocker state.
- Opens approved `publish_jobs`.
- Sends approved content only to supported executor flows.
- Stops on login, CAPTCHA, 2FA, passkey, password fields, or payment fields.
- Reports unsupported final publish automation as a system blocker.
- Verifies a real post URL only after publication.

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
4. If the helper cannot complete a platform safely, it marks the job as blocked.
5. A `published_record` is created only after a real live URL is verified.
