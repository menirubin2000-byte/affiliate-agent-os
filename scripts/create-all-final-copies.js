require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg');
const crypto = require('crypto');

const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false }
});

function cleanBody(body, affiliateLink, platform) {
  let clean = body;

  // Remove internal notes
  clean = clean.replace(/No fake personal experience.*$/gm, '');
  clean = clean.replace(/^CTA:.*$/gm, '');
  clean = clean.trim();

  // Ensure disclosure at top
  if (!clean.toLowerCase().includes('affiliate disclosure') && !clean.toLowerCase().includes('disclosure')) {
    clean = '*Affiliate disclosure: This article includes an affiliate link. If you sign up through the link, I may earn a commission at no extra cost to you.*\n\n' + clean;
  }

  // Remove duplicate raw URLs at bottom (keep only the markdown link)
  const lines = clean.split('\n');
  const filtered = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('CTA:')) return false;
    if (trimmed.startsWith('No fake')) return false;
    return true;
  });
  clean = filtered.join('\n').trim();

  return clean;
}

function contentHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
}

async function main() {
  await c.connect();

  // Get all platform adaptations with product info
  const adaptations = await c.query(`
    SELECT pa.id as pa_id, pa.platform, pa.title, pa.body,
           pa.source_content_id, sc.product_id, p.name as product_name
    FROM platform_adaptations pa
    JOIN source_contents sc ON pa.source_content_id = sc.id
    JOIN products p ON sc.product_id = p.id
    ORDER BY p.name, pa.platform
  `);

  let created = 0;
  let skipped = 0;

  for (const row of adaptations.rows) {
    // Check if final copy already exists
    const existing = await c.query(
      'SELECT id FROM final_copies WHERE platform_adaptation_id = $1', [row.pa_id]
    );

    if (existing.rows.length) {
      console.log('SKIP:', row.product_name, row.platform, '(already exists)');
      skipped++;
      continue;
    }

    // Get affiliate link
    const ap = await c.query(
      'SELECT id, affiliate_link FROM affiliate_programs WHERE product_id = $1 AND affiliate_link IS NOT NULL LIMIT 1',
      [row.product_id]
    );

    const affiliateLink = ap.rows[0]?.affiliate_link || '';
    const affiliateId = ap.rows[0]?.id || null;

    // Clean the body
    const cleanedBody = cleanBody(row.body, affiliateLink, row.platform);
    const hash = contentHash(cleanedBody);

    // Determine validation status
    const hasDisclosure = cleanedBody.toLowerCase().includes('disclosure');
    const hasLink = cleanedBody.includes(affiliateLink) || affiliateLink === '';
    const isValid = hasDisclosure && affiliateLink;

    const blockingReasons = [];
    if (!hasDisclosure) blockingReasons.push('missing_disclosure');
    if (!affiliateLink) blockingReasons.push('no_affiliate_link');

    const status = isValid ? 'ready_for_operator_approval' : 'draft_internal';
    const validationStatus = isValid ? 'valid' : 'blocked';

    await c.query(`
      INSERT INTO final_copies (product_id, affiliate_program_id, affiliate_link,
        source_content_id, platform_adaptation_id, platform, title, body,
        content_hash, version, status, validation_status, blocking_reasons)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,$10,$11,$12)
    `, [row.product_id, affiliateId, affiliateLink,
        row.source_content_id, row.pa_id, row.platform,
        row.title, cleanedBody, hash, status, validationStatus,
        '{' + blockingReasons.join(',') + '}']);

    console.log('CREATE:', row.product_name, row.platform, '|', status);
    created++;
  }

  console.log('\n=== DONE ===');
  console.log('Created:', created);
  console.log('Skipped:', skipped);

  // Summary
  const summary = await c.query(`
    SELECT status, count(*) as cnt FROM final_copies GROUP BY status ORDER BY status
  `);
  console.log('\nFinal copies by status:');
  summary.rows.forEach(r => console.log(' ', r.status, ':', r.cnt));

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
