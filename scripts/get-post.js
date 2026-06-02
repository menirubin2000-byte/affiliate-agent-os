const { Client } = require('pg');
const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: '5552223332RRuu', ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();

  // Get Systeme.io Medium adaptation
  const r = await c.query(`
    SELECT pa.id, pa.platform, pa.title, pa.body, pa.source_content_id, sc.product_id
    FROM platform_adaptations pa
    JOIN source_contents sc ON pa.source_content_id = sc.id
    JOIN products p ON sc.product_id = p.id
    WHERE p.name LIKE '%Systeme%' AND pa.platform = 'medium'
  `);

  if (!r.rows.length) { console.log('No adaptation found'); await c.end(); return; }

  const row = r.rows[0];
  console.log('PA_ID:', row.id);
  console.log('TITLE:', row.title);
  console.log('PRODUCT_ID:', row.product_id);
  console.log('SOURCE_ID:', row.source_content_id);

  // Get affiliate link
  const link = await c.query(`
    SELECT ap.id, ap.affiliate_link FROM affiliate_programs ap
    JOIN products p ON ap.product_id = p.id
    WHERE p.name LIKE '%Systeme%' AND ap.affiliate_link IS NOT NULL
    LIMIT 1
  `);

  const affLink = link.rows[0]?.affiliate_link || '';
  const affId = link.rows[0]?.id || null;
  console.log('AFFILIATE_LINK:', affLink);
  console.log('AFFILIATE_PROGRAM_ID:', affId);
  console.log('---BODY---');
  console.log(row.body);

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
