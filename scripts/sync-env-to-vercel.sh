#!/bin/bash
# Sync missing FB / IG / Pinterest / Meta env vars from .env.local to Vercel
# production. Only adds vars that aren't already in Vercel.
set -e

# Vars to ensure exist in Vercel production. Read values from .env.local.
VARS=(
  FB_PAGE_ACCESS_TOKEN
  FB_PAGE_ID
  FB_PAGE_NAME
  FB_API_ACCESS_READY
  FB_LINKED_IG_BUSINESS_ID
  IG_ACCESS_TOKEN
  IG_BUSINESS_ACCOUNT_ID
  IG_API_ACCESS_READY
  IG_APP_ID
  IG_APP_SECRET
  IG_APP_NAME
  IG_USERNAME
  IG_REDIRECT_URI
  META_APP_ID
  META_APP_SECRET
  META_APP_NAME
  META_USER_ACCESS_TOKEN
  META_BUSINESS_NAME
  PINTEREST_ACCESS_TOKEN
  PINTEREST_APP_ID
  PINTEREST_APP_SECRET
  PINTEREST_APP_NAME
  PINTEREST_CLIENT_ID
  PINTEREST_REDIRECT_URI
  PINTEREST_API_ACCESS_READY
  PINTEREST_TRIAL_STATUS
  ANTHROPIC_API_KEY
  AI_PROVIDER
)

# Get current Vercel env names (without values).
EXISTING=$(npx vercel env ls production 2>/dev/null | awk 'NR>4 && NF>2 {print $1}' | sort -u)

for V in "${VARS[@]}"; do
  # Skip if already set.
  if echo "$EXISTING" | grep -qx "$V"; then
    echo "  SKIP $V (already in Vercel)"
    continue
  fi
  # Read value from .env.local.
  VALUE=$(grep -E "^${V}=" .env.local | head -1 | sed -E "s/^${V}=//; s/^['\"]//; s/['\"]\$//")
  if [ -z "$VALUE" ]; then
    echo "  MISS $V (not in .env.local)"
    continue
  fi
  # Add to Vercel via stdin.
  printf "%s" "$VALUE" | npx vercel env add "$V" production --force >/dev/null 2>&1 && echo "  ADD  $V" || echo "  ERR  $V"
done

echo
echo "DONE — trigger a redeploy for changes to take effect."
