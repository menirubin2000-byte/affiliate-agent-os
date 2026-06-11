const fs = require('fs');
const crypto = require('crypto');

const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => { const m = env.match(new RegExp('^' + key + '=(.+)$', 'm')); return m ? m[1].trim() : null; };

const apiKey = getEnv('X_CLIENT_ID');
const apiSecret = getEnv('X_CLIENT_SECRET');
const accessToken = getEnv('X_ACCESS_TOKEN');
const accessTokenSecret = getEnv('X_ACCESS_TOKEN_SECRET');

function oauthSign(method, url, params, consumerKey, consumerSecret, tokenKey, tokenSecret) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: tokenKey,
    oauth_version: '1.0',
    ...params
  };

  const sorted = Object.keys(oauthParams).sort().map(k => encodeURIComponent(k) + '=' + encodeURIComponent(oauthParams[k])).join('&');
  const baseString = method.toUpperCase() + '&' + encodeURIComponent(url) + '&' + encodeURIComponent(sorted);
  const signingKey = encodeURIComponent(consumerSecret) + '&' + encodeURIComponent(tokenSecret);
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  return 'OAuth oauth_consumer_key="' + encodeURIComponent(consumerKey) + '", oauth_nonce="' + encodeURIComponent(nonce) + '", oauth_signature="' + encodeURIComponent(signature) + '", oauth_signature_method="HMAC-SHA1", oauth_timestamp="' + timestamp + '", oauth_token="' + encodeURIComponent(tokenKey) + '", oauth_version="1.0"';
}

(async () => {
  console.log('Testing X API...');
  const url = 'https://api.twitter.com/2/users/me';
  const auth = oauthSign('GET', url, {}, apiKey, apiSecret, accessToken, accessTokenSecret);

  const res = await fetch(url, { headers: { 'Authorization': auth } });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
})();
