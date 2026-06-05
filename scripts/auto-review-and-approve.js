require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg');

const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false }
});

function reviewPost(title, body, affiliateLink, platform) {
  const issues = [];
  const checks = [];

  // 1. Disclosure check
  if (body.toLowerCase().includes('disclosure') || body.toLowerCase().includes('affiliate')) {
    checks.push('✅ Disclosure present');
  } else {
    issues.push('❌ Missing affiliate disclosure');
  }

  // 2. Affiliate link check
  if (affiliateLink && body.includes(affiliateLink.split('?')[0])) {
    checks.push('✅ Affiliate link present');
  } else if (affiliateLink && body.includes('ref=')) {
    checks.push('✅ Affiliate link present (ref param)');
  } else if (affiliateLink) {
    issues.push('❌ Affiliate link missing from body');
  }

  // 3. UTM check
  if (body.includes('utm_source=')) {
    checks.push('✅ UTM tracking present');
  } else {
    issues.push('⚠️ No UTM tracking');
  }

  // 4. CTA check - should have exactly one link/CTA area
  const linkCount = (body.match(/\[.*?\]\(http/g) || []).length;
  const rawUrlCount = (body.match(/^https?:\/\//gm) || []).length;
  const totalCTAs = linkCount + rawUrlCount;
  if (totalCTAs === 1) {
    checks.push('✅ Single CTA');
  } else if (totalCTAs === 0) {
    issues.push('❌ No CTA link');
  } else if (totalCTAs > 2) {
    issues.push('⚠️ Multiple CTAs (' + totalCTAs + ')');
  } else {
    checks.push('✅ CTA present (' + totalCTAs + ' links)');
  }

  // 5. No internal notes
  if (body.includes('No fake') || body.includes('INTERNAL') || body.includes('TODO')) {
    issues.push('❌ Internal notes found');
  } else {
    checks.push('✅ No internal notes');
  }

  // 6. Title not empty
  if (title && title.length > 10) {
    checks.push('✅ Title OK');
  } else {
    issues.push('❌ Title too short or missing');
  }

  // 7. Body length check
  if (platform === 'tiktok' && body.length > 100) {
    checks.push('✅ Body length OK for TikTok');
  } else if (body.length > 200) {
    checks.push('✅ Body length OK');
  } else {
    issues.push('⚠️ Body too short');
  }

  // 8. No guaranteed income claims
  const banned = ['guaranteed', 'make money fast', 'get rich', 'passive income guaranteed', 'earn $'];
  const hasBanned = banned.some(b => body.toLowerCase().includes(b));
  if (hasBanned) {
    issues.push('❌ Contains income/guarantee claims');
  } else {
    checks.push('✅ No income guarantees');
  }

  const passed = issues.filter(i => i.startsWith('❌')).length === 0;
  return { passed, checks, issues };
}

async function main() {
  await c.connect();

  const copies = await c.query(`
    SELECT fc.id, fc.title, fc.body, fc.affiliate_link, fc.platform, fc.status, p.name as product
    FROM final_copies fc
    JOIN products p ON fc.product_id = p.id
    WHERE fc.status = 'ready_for_operator_approval'
    ORDER BY p.name, fc.platform
  `);

  console.log('Reviewing', copies.rows.length, 'posts...\n');

  let approved = 0;
  let rejected = 0;

  for (const copy of copies.rows) {
    const review = reviewPost(copy.title, copy.body, copy.affiliate_link, copy.platform);

    console.log(copy.product, '|', copy.platform, '|', review.passed ? 'APPROVED' : 'NEEDS FIX');
    review.checks.forEach(c => console.log('  ', c));
    review.issues.forEach(i => console.log('  ', i));

    if (review.passed) {
      await c.query(`
        UPDATE final_copies
        SET status = 'operator_approved', approved_by = 'AUTO_REVIEW_AGENT',
            approved_at = now(), validation_status = 'valid', updated_at = now()
        WHERE id = $1
      `, [copy.id]);
      approved++;
    } else {
      await c.query(`
        UPDATE final_copies
        SET validation_status = 'fix_requested',
            blocking_reasons = $1, updated_at = now()
        WHERE id = $2
      `, ['{' + review.issues.filter(i => i.startsWith('❌')).join(',') + '}', copy.id]);
      rejected++;
    }
    console.log('');
  }

  console.log('=== DONE ===');
  console.log('Approved:', approved);
  console.log('Rejected:', rejected);

  const summary = await c.query("SELECT status, count(*) as cnt FROM final_copies GROUP BY status ORDER BY status");
  console.log('\nFinal status:');
  summary.rows.forEach(r => console.log(' ', r.status, ':', r.cnt));

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
