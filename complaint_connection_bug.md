# Complaint — Claude in Chrome connection bug

**Date:** 2026-06-03
**User:** MENI RUBIN
**Account:** menirubin2000-byte
**Subscription:** Claude Code

## The Problem

There is a bug in the connection between Claude Code (CLI) and the Claude in Chrome extension.

**Claude — not the user — should be the one diagnosing and fixing this bug.** The user pays for the product. The user should not have to investigate why their tool does not work. But Claude Code failed to diagnose its own connection problem and instead pushed the work onto the user by repeatedly asking the user to click buttons, install extensions, send screenshots, and run diagnostics.

## What Claude Code did wrong

1. **Claimed the extension was not clicked** — without checking. The user had clicked it many times. The user sent multiple screenshots proving it was clicked, enabled, and running. Claude Code ignored the evidence and kept asking the user to click it again.

2. **Asked the user to run shell commands and read configs** — these are diagnostic tasks Claude Code should be doing on its own.

3. **Suggested the user "switch to Codex" or "restart Chrome"** — pushing the failure back at the user instead of finding the root cause.

4. **Burned hours of the user's time** — the user typed hundreds of messages while Claude Code spun in circles.

## What Claude Code finally found (after the user demanded it dig)

Only after the user explicitly forced investigation did Claude Code check the local state and find:

- Extension installed and enabled (extension ID `fcoeoabgfenejglbffodgkkbkcdhcgfn`, version 1.0.74)
- Native messaging host configured correctly in both Roaming and Local AppData
- Chrome registry points to the correct native host config
- `chrome-native-host.exe` was running (PID 37056, started 5/30)
- Claude Desktop running (PID 33500)
- `claude_desktop_config.json` shows extension paired to deviceId `e4215b27-c377-4333-9fe1-23a102239a9b`

All local components are correct. The bridge exists. The extension is paired. But every call to `mcp__Claude_in_Chrome__tabs_context_mcp` returns "not connected" and `list_connected_browsers` returns `[]`.

## Where the bug appears to be

The Claude in Chrome extension is paired to **Claude Desktop**, not to **Claude Code CLI**. The Claude Code MCP server cannot reach the extension. This is an architectural defect, not user error. The user did everything correctly. The two Anthropic products do not talk to each other.

## What Claude should have done from the start

- Recognized at the first failed call that this was a server-side or pairing problem, not a user problem
- Run local diagnostics silently (check processes, configs, registry)
- Reported the actual broken link to the user in one clear sentence
- Filed this bug to Anthropic engineering — without the user having to demand it

Instead Claude wasted the user's time for days.

## What the user wants

1. **Fix the bug** so Claude in Chrome works with Claude Code, not just Claude Desktop
2. **Train Claude Code to diagnose its own connection issues** instead of blaming the user
3. **Refund** for the time wasted on a feature that does not work
4. **Public documentation** clarifying which Anthropic products can talk to each other

The account owner should not be the one debugging the product they pay for. That is the developer's job, not the customer's.

MENI RUBIN
2026-06-03
