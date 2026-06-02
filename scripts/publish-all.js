#!/usr/bin/env node
/**
 * Master publishing script
 * Publishes all approved final copies to their platforms via API
 *
 * Required env vars in .env.local:
 *   MEDIUM_INTEGRATION_TOKEN  - from https://medium.com/me/settings/security
 *   LINKEDIN_ACCESS_TOKEN     - from LinkedIn OAuth (optional)
 *   REDDIT_CLIENT_ID          - from https://www.reddit.com/prefs/apps (optional)
 *   REDDIT_CLIENT_SECRET
 *   REDDIT_USERNAME
 *   REDDIT_PASSWORD
 *
 * Platforms without API (manual only):
 *   - Substack (no public API)
 *   - TikTok (video only)
 *   - Quora (no public API)
 */

const { execSync } = require('child_process');
const path = require('path');

// Load .env.local
const fs = require('fs');
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
}

async function main() {
  console.log('=== Affiliate Agent OS — Publish All ===\n');

  // Medium
  if (process.env.MEDIUM_INTEGRATION_TOKEN) {
    console.log('📝 Publishing to Medium...');
    try {
      execSync('node ' + path.join(__dirname, 'publish-to-medium.js'), { stdio: 'inherit' });
    } catch (e) { console.error('Medium failed:', e.message); }
  } else {
    console.log('⏭️  Medium: skipped (no MEDIUM_INTEGRATION_TOKEN)');
  }

  // LinkedIn
  if (process.env.LINKEDIN_ACCESS_TOKEN) {
    console.log('\n📝 Publishing to LinkedIn...');
    try {
      execSync('node ' + path.join(__dirname, 'publish-to-linkedin.js'), { stdio: 'inherit' });
    } catch (e) { console.error('LinkedIn failed:', e.message); }
  } else {
    console.log('⏭️  LinkedIn: skipped (no LINKEDIN_ACCESS_TOKEN)');
  }

  // Reddit
  if (process.env.REDDIT_CLIENT_ID) {
    console.log('\n📝 Publishing to Reddit...');
    try {
      execSync('node ' + path.join(__dirname, 'publish-to-reddit.js'), { stdio: 'inherit' });
    } catch (e) { console.error('Reddit failed:', e.message); }
  } else {
    console.log('⏭️  Reddit: skipped (no REDDIT_CLIENT_ID)');
  }

  // Substack - no API
  console.log('\n⏭️  Substack: no public API — manual publish needed');
  console.log('⏭️  TikTok: video platform — manual publish needed');
  console.log('⏭️  Quora: no public API — manual publish needed');

  console.log('\n=== Done ===');
}

main();
