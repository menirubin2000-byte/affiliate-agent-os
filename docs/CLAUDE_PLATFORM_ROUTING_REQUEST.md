# Platform Routing Request

Date: 2026-06-05
Owner: MENI

## Goal
Add one central platform routing layer for Affiliate Agent OS.
The app should support many publishing platforms and many products without mixing approval, link, publish, or metric status.

## Required behavior

1. Add or confirm a central platform registry:
   - key
   - Hebrew display name
   - account URL if already known
   - content type
   - publish mode
   - approval required
   - status: active, pending_setup, disabled

2. Keep existing channels from the repo and make the system ready for more channels.
   Add Facebook only as pending_setup unless a real configured account and workflow already exist.

3. Add deterministic routing:
   - No real affiliate link means no publishing route.
   - No approval means route to approval.
   - Approved but not published means route to a publish job or platform-specific publishing flow.
   - Published means display only when a real URL exists.

4. Update the Hebrew dashboard pages:
   - /dashboard/he
   - /dashboard/he/operator
   - /dashboard/he/publish-ready
   - /dashboard/he/browser-control if relevant

5. The dashboard should show in Hebrew:
   - products by next action
   - platform status per product
   - published and missing platforms
   - approval status
   - real published URL when available
   - real metrics only
   - blockers

6. Current link-ready products should show published channels and missing channels clearly.

7. Future link-ready products should automatically get routing tasks for all active platforms, but publishing still requires approval.

## Verification
Run verify, tests/build if needed, update docs, commit and push.

## Report in Hebrew
Report what changed, files changed, migrations, verification result, blockers, and exact next action.
