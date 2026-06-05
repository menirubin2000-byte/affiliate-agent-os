require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg');
const { requireDirectPublishOverride } = require('./safety-guard');

const MEDIUM_TOKEN = process.env.MEDIUM_INTEGRATION_TOKEN;

async function getMediumUserId(token) {
  const res = await fetch('https://api.medium.com/v1/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  if (!data.data) throw new Error('Medium auth failed: ' + JSON.stringify(data));
  return data.data.id;
}

async function publishToMedium(token, userId, title, body, canonicalUrl) {
  const res = await fetch(`https://api.medium.com/v1/users/${userId}/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title,
      contentFormat: 'markdown',
      content: `# ${title}\n\n${body}`,
      publishStatus: 'draft',
      canonicalUrl
    })
  });
  const data = await res.json();
  if (!data.data) throw new Error('Publish failed: ' + JSON.stringify(data));
  return data.data;
}

async function main() {
  requireDirectPublishOverride('scripts/publish-to-medium.js');

  if (!MEDIUM_TOKEN) {
    console.error('Missing MEDIUM_INTEGRATION_TOKEN in environment');
    console.error('Get it from: https://medium.com/me/settings/security');
    console.error('Then add to .env.local: MEDIUM_INTEGRATION_TOKEN=your_token');
    process.exit(1);
  }

  const db = new Client({
    host: 'db.gbkwydsodondarccqyet.supabase.co',
    port: 5432, database: 'postgres', user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  await db.connect();

  // Get Medium user ID
  const userId = await getMediumUserId(MEDIUM_TOKEN);
  console.log('Medium user:', userId);

  // Get all approved Medium final copies that haven't been published
  const copies = await db.query(`
    SELECT fc.id, fc.title, fc.body, fc.affiliate_link, p.name as product
    FROM final_copies fc
    JOIN products p ON fc.product_id = p.id
    LEFT JOIN published_records pr ON pr.final_copy_id = fc.id
    WHERE fc.platform = 'medium'
    AND fc.status = 'operator_approved'
    AND pr.id IS NULL
  `);

  console.log('Posts to publish:', copies.rows.length);

  for (const copy of copies.rows) {
    console.log('Publishing:', copy.product, '→ Medium...');
    const result = await publishToMedium(MEDIUM_TOKEN, userId, copy.title, copy.body);
    console.log('Published:', result.url);

    // Save published record
    await db.query(`
      INSERT INTO published_records (final_copy_id, platform, published_url, published_at)
      VALUES ($1, 'medium', $2, now())
    `, [copy.id, result.url]);

    // Update final copy status
    await db.query(`
      UPDATE final_copies SET status = 'published_verified', updated_at = now()
      WHERE id = $1
    `, [copy.id]);

    console.log('Saved:', result.url);
  }

  console.log('DONE');
  await db.end();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
