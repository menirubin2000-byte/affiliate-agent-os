require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg');

const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDDIT_USERNAME = process.env.REDDIT_USERNAME;
const REDDIT_PASSWORD = process.env.REDDIT_PASSWORD;

async function getRedditToken() {
  const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'AffiliateAgentOS/1.0'
    },
    body: `grant_type=password&username=${REDDIT_USERNAME}&password=${REDDIT_PASSWORD}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Reddit auth failed: ' + JSON.stringify(data));
  return data.access_token;
}

async function publishToReddit(token, subreddit, title, body) {
  const res = await fetch('https://oauth.reddit.com/api/submit', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'AffiliateAgentOS/1.0'
    },
    body: `kind=self&sr=${subreddit}&title=${encodeURIComponent(title)}&text=${encodeURIComponent(body)}`
  });
  const data = await res.json();
  return data;
}

async function main() {
  if (!REDDIT_CLIENT_ID) {
    console.error('Missing Reddit credentials in environment');
    console.error('Need: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD');
    console.error('Create app at: https://www.reddit.com/prefs/apps');
    process.exit(1);
  }

  const db = new Client({
    host: 'db.gbkwydsodondarccqyet.supabase.co',
    port: 5432, database: 'postgres', user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  await db.connect();

  const token = await getRedditToken();
  console.log('Reddit authenticated');

  const copies = await db.query(`
    SELECT fc.id, fc.title, fc.body, p.name as product
    FROM final_copies fc
    JOIN products p ON fc.product_id = p.id
    LEFT JOIN published_records pr ON pr.final_copy_id = fc.id
    WHERE fc.platform = 'reddit'
    AND fc.status = 'operator_approved'
    AND pr.id IS NULL
  `);

  console.log('Posts to publish:', copies.rows.length);

  for (const copy of copies.rows) {
    // Post to user profile
    console.log('Publishing:', copy.product, '→ Reddit...');
    const result = await publishToReddit(token, 'u_Ok_Neighborhood1699', copy.title, copy.body);
    const url = result?.jquery?.[10]?.[3]?.[0] || 'https://reddit.com';
    console.log('Published:', url);

    await db.query(`
      INSERT INTO published_records (final_copy_id, platform, published_url, published_at)
      VALUES ($1, 'reddit', $2, now())
    `, [copy.id, url]);

    await db.query(`
      UPDATE final_copies SET status = 'published_verified', updated_at = now()
      WHERE id = $1
    `, [copy.id]);
  }

  console.log('DONE');
  await db.end();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
