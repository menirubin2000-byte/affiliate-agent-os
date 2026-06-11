const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => { const m = env.match(new RegExp('^' + key + '=(.+)$', 'm')); return m ? m[1].trim() : null; };

const CONSUMER_KEY = getEnv('X_CLIENT_ID');
const CONSUMER_SECRET = getEnv('X_CLIENT_SECRET');
const ACCESS_TOKEN = getEnv('X_ACCESS_TOKEN');
const ACCESS_TOKEN_SECRET = getEnv('X_ACCESS_TOKEN_SECRET');

const sb = createClient('https://gbkwydsodondarccqyet.supabase.co', 'sb_secret_tUUQOrDuqwcBLY47054zhA_aZdTOQ6S', { auth: { autoRefreshToken: false, persistSession: false } });

function percentEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function generateOAuthHeader(method, url, bodyParams = {}) {
  const nonce = crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: ACCESS_TOKEN,
    oauth_version: '1.0',
  };

  // Combine oauth params with body params for signature
  const allParams = { ...oauthParams, ...bodyParams };
  const paramString = Object.keys(allParams)
    .sort()
    .map(k => percentEncode(k) + '=' + percentEncode(allParams[k]))
    .join('&');

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join('&');

  const signingKey = percentEncode(CONSUMER_SECRET) + '&' + percentEncode(ACCESS_TOKEN_SECRET);
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  const authParams = { ...oauthParams, oauth_signature: signature };
  const header = 'OAuth ' + Object.keys(authParams)
    .sort()
    .map(k => percentEncode(k) + '="' + percentEncode(authParams[k]) + '"')
    .join(', ');

  return header;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  // Test: verify credentials
  console.log('Testing X API credentials...');
  const verifyUrl = 'https://api.twitter.com/2/users/me';
  const auth1 = generateOAuthHeader('GET', verifyUrl);
  const res1 = await fetch(verifyUrl, { headers: { Authorization: auth1 } });
  console.log('Verify status:', res1.status);
  const me = await res1.json();
  console.log('User:', JSON.stringify(me));

  if (res1.status !== 200) {
    // Try v1.1 verify
    console.log('\nTrying v1.1 verify...');
    const v1Url = 'https://api.twitter.com/1.1/account/verify_credentials.json';
    const auth1v = generateOAuthHeader('GET', v1Url);
    const res1v = await fetch(v1Url, { headers: { Authorization: auth1v } });
    console.log('v1.1 status:', res1v.status);
    const v1data = await res1v.json();
    console.log('v1.1 response:', JSON.stringify(v1data).substring(0, 200));

    if (res1v.status !== 200) {
      console.log('\nBoth APIs failed. Checking if tokens need OAuth 2.0 PKCE flow...');
      // The Client ID format suggests OAuth 2.0 - try that
      // Try app-only auth with client credentials
      const basicAuth = Buffer.from(CONSUMER_KEY + ':' + CONSUMER_SECRET).toString('base64');
      const tokenRes = await fetch('https://api.twitter.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + basicAuth,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      console.log('App-only token status:', tokenRes.status);
      const tokenData = await tokenRes.json();
      console.log('App-only response:', JSON.stringify(tokenData).substring(0, 200));
      return;
    }
  }

  if (res1.status === 200 || true) {
    // Get approved X posts
    const { data: fcs } = await sb.from('final_copies')
      .select('id, product_id, title, body, source_content_id, platform_adaptation_id')
      .eq('status', 'operator_approved')
      .eq('platform', 'x_twitter');

    const { data: prods } = await sb.from('products').select('id, name');
    const prodMap = {};
    prods.forEach(p => { prodMap[p.id] = p.name; });

    console.log('\nApproved X posts to publish:', fcs.length);

    let published = 0;
    for (const fc of fcs) {
      const tweetUrl = 'https://api.twitter.com/2/tweets';
      const tweetBody = JSON.stringify({ text: fc.body });
      const auth = generateOAuthHeader('POST', tweetUrl);

      const res = await fetch(tweetUrl, {
        method: 'POST',
        headers: {
          Authorization: auth,
          'Content-Type': 'application/json',
        },
        body: tweetBody,
      });

      const result = await res.json();
      if (result.data && result.data.id) {
        const liveUrl = 'https://x.com/' + getEnv('X_USERNAME') + '/status/' + result.data.id;
        await sb.from('publish_jobs').update({ status: 'verified', live_url: liveUrl, verified_at: new Date().toISOString(), blocking_reason: null }).eq('final_copy_id', fc.id);
        await sb.from('published_records').upsert({ product_id: fc.product_id, source_content_id: fc.source_content_id, platform_adaptation_id: fc.platform_adaptation_id, platform: 'x_twitter', live_url: liveUrl, verification_status: 'verified', verified_at: new Date().toISOString(), final_copy_id: fc.id, media_status: 'ready', needs_media_repair: false }, { onConflict: 'platform,live_url' });
        await sb.from('final_copies').update({ status: 'published_verified' }).eq('id', fc.id);
        published++;
        console.log(published + '. OK:', prodMap[fc.product_id], '->', liveUrl);
      } else {
        console.log('FAIL:', prodMap[fc.product_id], '-', JSON.stringify(result).substring(0, 200));
      }
      await sleep(3000);
    }
    console.log('Done. Published:', published);
  }
})();
