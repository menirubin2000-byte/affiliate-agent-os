require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false }
});

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  await c.connect();

  const copies = await c.query(`
    SELECT fc.id, fc.title, fc.body, fc.affiliate_link, fc.platform,
           fc.source_content_id, fc.platform_adaptation_id, fc.content_hash,
           fc.status, fc.validation_status, fc.blocking_reasons,
           p.name as product
    FROM final_copies fc
    JOIN products p ON fc.product_id = p.id
    ORDER BY p.name, fc.platform
  `);

  const baseDir = path.join(__dirname, '..', 'content', 'review-queue');

  for (const copy of copies.rows) {
    const slug = slugify(copy.product);
    const dir = path.join(baseDir, slug);
    fs.mkdirSync(dir, { recursive: true });

    // Write .md file
    const md = copy.body;
    fs.writeFileSync(path.join(dir, copy.platform + '.md'), md, 'utf8');

    // Write metadata
    const metadata = {
      product: copy.product,
      platform: copy.platform,
      status: copy.status,
      affiliate_link: copy.affiliate_link,
      source_content_id: copy.source_content_id,
      platform_adaptation_id: copy.platform_adaptation_id,
      campaign_approval_id: null,
      final_copy_id: copy.id,
      content_hash: copy.content_hash,
      validation_status: copy.validation_status,
      blocking_reasons: copy.blocking_reasons || [],
      reviewer_status: 'ready_for_review',
      reviewer_notes: ''
    };
    fs.writeFileSync(path.join(dir, copy.platform + '.metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

    console.log('EXPORTED:', copy.product, copy.platform);
  }

  console.log('\nTotal exported:', copies.rows.length);
  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
