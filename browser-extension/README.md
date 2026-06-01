# Affiliate Agent OS Browser Helper

Chrome extension for controlled, human-supervised publishing.

## What it does

- Connects to Affiliate Agent OS.
- Reads only the active page URL, title, and basic blocker state.
- Opens queued publishing jobs.
- Fills approved content into supported composer pages.
- Stops on login, CAPTCHA, 2FA, passkey, password fields, or payment fields.
- Requires the operator to review and publish manually.
- Captures a real post URL only after publication.

## What it does not do

- It does not read passwords.
- It does not store cookies.
- It does not read payment fields.
- It does not click final Publish automatically.
- It does not create fake post URLs or fake metrics.

## Install locally

1. Open Chrome Extensions.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select this `browser-extension` folder.
5. Make sure you are logged into Affiliate Agent OS in the same Chrome profile.
6. Open the extension popup and click "Connect / heartbeat".

## First supported flow

ElevenLabs LinkedIn publish:

1. Queue the approved LinkedIn item from `/dashboard/he/publish-ready`.
2. Click "Open next queued job" in the extension popup.
3. Review the filled LinkedIn composer.
4. Click LinkedIn Publish manually.
5. Open the resulting post URL.
6. Click "Capture current post URL" in the extension popup.
