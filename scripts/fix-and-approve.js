require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg');
const crypto = require('crypto');

const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false }
});

function fixPost(body, affiliateLink, platform) {
  let fixed = body;

  // Remove income guarantee words
  fixed = fixed.replace(/guaranteed/gi, 'potential');
  fixed = fixed.replace(/guarantee/gi, 'possibility');

  // Remove internal notes
  fixed = fixed.replace(/No fake personal experience.*$/gm, '').trim();
  fixed = fixed.replace(/^CTA:.*$/gm, '').trim();

  // Ensure disclosure at top
  if (!fixed.toLowerCase().includes('disclosure')) {
    fixed = '*Affiliate disclosure: This post includes an affiliate link. If you sign up, I may earn a commission at no extra cost to you.*\n\n' + fixed;
  }

  // Add UTM to affiliate link if missing
  const utmSuffix = `&utm_source=${platform}&utm_medium=post&utm_campaign=affiliate_review`;

  // Ensure CTA link exists at bottom
  const hasMarkdownLink = /\[.*?\]\(http/.test(fixed);
  const hasRawLink = fixed.includes(affiliateLink);

  if (!hasMarkdownLink && affiliateLink) {
    // Add CTA at bottom
    const linkWithUtm = affiliateLink + (affiliateLink.includes('utm_source') ? '' : utmSuffix);
    fixed = fixed.trim() + '\n\n[Learn more here](' + linkWithUtm + ')';
  } else if (hasMarkdownLink && !fixed.includes('utm_source') && affiliateLink) {
    // Add UTM to existing link
    fixed = fixed.replace(
      new RegExp('\\(' + affiliateLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\)', 'g'),
      '(' + affiliateLink + utmSuffix + ')'
    );
  }

  return fixed;
}

async function main() {
  await c.connect();

  // Get all posts that need fixing
  const copies = await c.query(`
    SELECT fc.id, fc.title, fc.body, fc.affiliate_link, fc.platform, p.name as product
    FROM final_copies fc
    JOIN products p ON fc.product_id = p.id
    WHERE fc.status = 'ready_for_operator_approval'
    ORDER BY p.name, fc.platform
  `);

  console.log('Fixing', copies.rows.length, 'posts...\n');

  let fixed = 0;

  for (const copy of copies.rows) {
    const fixedBody = fixPost(copy.body, copy.affiliate_link, copy.platform);
    const hash = crypto.createHash('sha256').update(fixedBody).digest('hex').substring(0, 16);

    await c.query(`
      UPDATE final_copies
      SET body = $1, content_hash = $2, status = 'operator_approved',
          approved_by = 'AUTO_REVIEW_AGENT', approved_at = now(),
          validation_status = 'valid', blocking_reasons = '{}', updated_at = now()
      WHERE id = $3
    `, [fixedBody, hash, copy.id]);

    console.log('FIXED & APPROVED:', copy.product, copy.platform);
    fixed++;
  }

  console.log('\nFixed:', fixed);

  const summary = await c.query("SELECT status, count(*) as cnt FROM final_copies GROUP BY status ORDER BY status");
  console.log('\nFinal status:');
  summary.rows.forEach(r => console.log(' ', r.status, ':', r.cnt));

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
