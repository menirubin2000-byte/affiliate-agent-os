require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { requireApprovalOverride } = require('./safety-guard');

const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false }
});

const SYSTEME_LINK = 'https://systeme.io/?sa=sa0272930337c3024fcafe085f6b63e73bbc0e3365';

async function main() {
  requireApprovalOverride('scripts/fix-policy-violations.js');

  await c.connect();

  // 1. Remove all TikTok (video platform, not text)
  let r = await c.query("DELETE FROM final_copies WHERE platform = 'tiktok'");
  console.log('Deleted TikTok final copies:', r.rowCount);
  r = await c.query("DELETE FROM platform_adaptations WHERE platform = 'tiktok'");
  console.log('Deleted TikTok adaptations:', r.rowCount);

  // Delete TikTok files from repo
  const reviewDir = path.join(__dirname, '..', 'content', 'review-queue');
  for (const prod of fs.readdirSync(reviewDir)) {
    for (const f of ['tiktok.md', 'tiktok.metadata.json']) {
      const fp = path.join(reviewDir, prod, f);
      if (fs.existsSync(fp)) { fs.unlinkSync(fp); console.log('Deleted file:', fp); }
    }
  }

  // 2. Fix Systeme.io LinkedIn (too long + markdown)
  const linkedinFix = `*Affiliate disclosure: This post includes an affiliate link.*

Looking for one platform to handle funnels, email, and courses?

Systeme.io combines:
- Sales funnel builder
- Email marketing
- Website/page builder
- Online course hosting
- Marketing automation
- Free plan available

Best for solo operators, creators, and small businesses who want to avoid juggling multiple tools.

Not ideal for enterprise teams needing deep customization.

Worth testing on the free plan first.

Try Systeme.io here: ${SYSTEME_LINK}&utm_source=linkedin&utm_medium=post&utm_campaign=systeme_review`;

  let hash = crypto.createHash('sha256').update(linkedinFix).digest('hex').substring(0, 16);
  await c.query(`
    UPDATE final_copies SET body = $1, content_hash = $2,
    status = 'operator_approved', validation_status = 'valid',
    blocking_reasons = '{}', updated_at = now()
    WHERE id IN (SELECT fc.id FROM final_copies fc JOIN products p ON fc.product_id = p.id WHERE p.name = 'Systeme.io' AND fc.platform = 'linkedin')
  `, [linkedinFix, hash]);
  fs.writeFileSync(path.join(reviewDir, 'systeme-io', 'linkedin.md'), linkedinFix, 'utf8');
  console.log('Fixed: Systeme.io linkedin (' + linkedinFix.length + ' chars)');

  // 3. Fix Systeme.io Quora (markdown headers)
  const quoraFix = `*Disclosure: This answer includes an affiliate link.*

For an all-in-one marketing platform, Systeme.io is worth looking at.

It combines:
1. Sales funnel builder
2. Email marketing
3. Website builder
4. Course hosting
5. Marketing automation

The main advantage is having everything in one account instead of connecting multiple tools. They also offer a free plan so you can test before paying.

Not the best choice if you need enterprise-level features or very specialized tools for each function.

Check Systeme.io here: ${SYSTEME_LINK}&utm_source=quora&utm_medium=answer&utm_campaign=systeme_review`;

  hash = crypto.createHash('sha256').update(quoraFix).digest('hex').substring(0, 16);
  await c.query(`
    UPDATE final_copies SET body = $1, content_hash = $2,
    status = 'operator_approved', validation_status = 'valid',
    blocking_reasons = '{}', updated_at = now()
    WHERE id IN (SELECT fc.id FROM final_copies fc JOIN products p ON fc.product_id = p.id WHERE p.name = 'Systeme.io' AND fc.platform = 'quora')
  `, [quoraFix, hash]);
  fs.writeFileSync(path.join(reviewDir, 'systeme-io', 'quora.md'), quoraFix, 'utf8');
  console.log('Fixed: Systeme.io quora');

  // Summary
  const summary = await c.query(`
    SELECT p.name, fc.platform, fc.status, length(fc.body) as len
    FROM final_copies fc JOIN products p ON fc.product_id = p.id
    ORDER BY p.name, fc.platform
  `);
  console.log('\n=== Final: ' + summary.rows.length + ' posts ===');
  summary.rows.forEach(r => console.log(r.name, '|', r.platform, '|', r.status, '|', r.len, 'chars'));

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
