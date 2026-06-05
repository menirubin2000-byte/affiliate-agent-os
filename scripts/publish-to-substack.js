require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg');

// Substack doesn't have a public API
// Options:
// 1. Use Substack's email publishing feature (send email to publish@substack.com)
// 2. Use browser automation (requires login)
// 3. Manual - copy/paste

// This script prepares the post and copies to clipboard for manual publish
async function main() {
  const db = new Client({
    host: 'db.gbkwydsodondarccqyet.supabase.co',
    port: 5432, database: 'postgres', user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  await db.connect();

  const copies = await db.query(`
    SELECT fc.id, fc.title, fc.body, p.name as product
    FROM final_copies fc
    JOIN products p ON fc.product_id = p.id
    LEFT JOIN published_records pr ON pr.final_copy_id = fc.id
    WHERE fc.platform = 'substack'
    AND fc.status = 'operator_approved'
    AND pr.id IS NULL
  `);

  console.log('Substack posts ready:', copies.rows.length);
  console.log('Substack has no public API — these need manual publish or email publishing');
  console.log('');

  for (const copy of copies.rows) {
    console.log('---');
    console.log('Product:', copy.product);
    console.log('Title:', copy.title);
    console.log('URL: https://menirubin.substack.com/publish/post');
    console.log('Status: waiting for manual publish');
  }

  await db.end();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
