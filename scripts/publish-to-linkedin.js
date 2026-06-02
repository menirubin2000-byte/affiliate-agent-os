const { Client } = require('pg');

// LinkedIn requires OAuth2 - need access token
const LINKEDIN_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;

async function getLinkedInProfile(token) {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  if (!data.sub) throw new Error('LinkedIn auth failed: ' + JSON.stringify(data));
  return data.sub;
}

async function publishToLinkedIn(token, personId, title, body) {
  const text = `${title}\n\n${body}`;

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify({
      author: `urn:li:person:${personId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('LinkedIn publish failed: ' + err);
  }

  const locationHeader = res.headers.get('x-restli-id');
  return { id: locationHeader, url: `https://www.linkedin.com/feed/update/${locationHeader}` };
}

async function main() {
  if (!LINKEDIN_TOKEN) {
    console.error('Missing LINKEDIN_ACCESS_TOKEN in environment');
    console.error('LinkedIn requires OAuth2 app setup');
    process.exit(1);
  }

  const db = new Client({
    host: 'db.gbkwydsodondarccqyet.supabase.co',
    port: 5432, database: 'postgres', user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD || '5552223332RRuu',
    ssl: { rejectUnauthorized: false }
  });

  await db.connect();

  const personId = await getLinkedInProfile(LINKEDIN_TOKEN);
  console.log('LinkedIn person:', personId);

  const copies = await db.query(`
    SELECT fc.id, fc.title, fc.body, p.name as product
    FROM final_copies fc
    JOIN products p ON fc.product_id = p.id
    LEFT JOIN published_records pr ON pr.final_copy_id = fc.id
    WHERE fc.platform = 'linkedin'
    AND fc.status = 'operator_approved'
    AND pr.id IS NULL
  `);

  console.log('Posts to publish:', copies.rows.length);

  for (const copy of copies.rows) {
    console.log('Publishing:', copy.product, '→ LinkedIn...');
    const result = await publishToLinkedIn(LINKEDIN_TOKEN, personId, copy.title, copy.body);
    console.log('Published:', result.url);

    await db.query(`
      INSERT INTO published_records (final_copy_id, platform, published_url, published_at)
      VALUES ($1, 'linkedin', $2, now())
    `, [copy.id, result.url]);

    await db.query(`
      UPDATE final_copies SET status = 'published_verified', updated_at = now()
      WHERE id = $1
    `, [copy.id]);
  }

  console.log('DONE');
  await db.end();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
