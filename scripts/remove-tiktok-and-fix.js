const { Client } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: '5552223332RRuu', ssl: { rejectUnauthorized: false }
});

const SYSTEME_LINK = 'https://systeme.io/?sa=sa0272930337c3024fcafe085f6b63e73bbc0e3365';

const FIXES = {
  'Systeme.io|linkedin': `*Affiliate disclosure: This post includes an affiliate link.*

Looking for one platform to handle funnels, email, and courses?

Systeme.io combines:
→ Sales funnel builder
→ Email marketing
→ Website/page builder
→ Online course hosting
→ Marketing automation
→ Free plan available

Best for solo operators, creators, and small businesses who want to avoid juggling multiple tools.

Not ideal for enterprise teams needing deep customization.

Worth testing on the free plan first.

[Try Systeme.io here](${SYSTEME_LINK}&utm_source=linkedin&utm_medium=post&utm_campaign=systeme_review)`,

  'Systeme.io|substack': `*Affiliate disclosure: This article includes an affiliate link. If you sign up through the link, I may earn a commission at no extra cost to you.*

## What Systeme.io Does

Systeme.io is an all-in-one platform for building sales funnels, sending emails, hosting courses, and creating websites. One account instead of five separate tools.

## Who It's For

Solo operators, creators, coaches, and small online businesses who want everything in one place without complex integrations.

## Pros

- Funnels, email, courses, automation in one tool
- Free plan available
- Simple to get started

## Cons

- Not as deep as specialized tools in each category
- Check plan limits before committing

## Bottom Line

Good starting point if you want to test funnels and email marketing without a complex stack.

[Try Systeme.io here](${SYSTEME_LINK}&utm_source=substack&utm_medium=newsletter&utm_campaign=systeme_review)`,

  'Systeme.io|quora': `*Disclosure: This answer includes an affiliate link.*

For an all-in-one marketing platform, Systeme.io is worth looking at.

It combines:
1. Sales funnel builder
2. Email marketing
3. Website builder
4. Course hosting
5. Marketing automation

The main advantage is having everything in one account instead of connecting multiple tools. They also offer a free plan so you can test before paying.

Not the best choice if you need enterprise-level features or very specialized tools for each function.

[Check Systeme.io here](${SYSTEME_LINK}&utm_source=quora&utm_medium=answer&utm_campaign=systeme_review)`,

  'Systeme.io|reddit': `*Disclosure: affiliate link included.*

Evaluated Systeme.io as an all-in-one marketing platform. Here's what I found.

**Good:**
- Funnels, email, courses, websites, automation — all in one tool
- Free plan available (good for testing)
- Simple setup for solo operators

**Not great:**
- Each individual feature isn't as deep as specialized tools
- Check plan limits before relying on the free tier
- Migration from other tools takes work

**Best for:** Solo creators, small businesses, affiliates who want one platform instead of five.

[Systeme.io](${SYSTEME_LINK}&utm_source=reddit&utm_medium=post&utm_campaign=systeme_review)`
};

async function main() {
  await c.connect();

  // 1. Delete ALL TikTok final copies
  const deleted = await c.query("DELETE FROM final_copies WHERE platform = 'tiktok'");
  console.log('Deleted TikTok posts:', deleted.rowCount);

  // 2. Delete TikTok platform adaptations
  await c.query("DELETE FROM platform_adaptations WHERE platform = 'tiktok'");
  console.log('Deleted TikTok adaptations');

  // 3. Delete TikTok files from repo
  const reviewDir = path.join(__dirname, '..', 'content', 'review-queue');
  const products = fs.readdirSync(reviewDir);
  for (const prod of products) {
    const tiktokMd = path.join(reviewDir, prod, 'tiktok.md');
    const tiktokJson = path.join(reviewDir, prod, 'tiktok.metadata.json');
    if (fs.existsSync(tiktokMd)) { fs.unlinkSync(tiktokMd); console.log('Deleted:', tiktokMd); }
    if (fs.existsSync(tiktokJson)) { fs.unlinkSync(tiktokJson); console.log('Deleted:', tiktokJson); }
  }

  // 4. Fix Systeme.io duplicate posts
  for (const [key, newBody] of Object.entries(FIXES)) {
    const [product, platform] = key.split('|');
    const hash = crypto.createHash('sha256').update(newBody).digest('hex').substring(0, 16);

    await c.query(`
      UPDATE final_copies SET body = $1, content_hash = $2, updated_at = now()
      WHERE id IN (
        SELECT fc.id FROM final_copies fc
        JOIN products p ON fc.product_id = p.id
        WHERE p.name = $3 AND fc.platform = $4
      )
    `, [newBody, hash, product, platform]);

    // Update repo file
    const slug = product.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    fs.writeFileSync(path.join(reviewDir, slug, platform + '.md'), newBody, 'utf8');
    console.log('FIXED:', product, platform);
  }

  // 5. Summary
  const summary = await c.query(`
    SELECT p.name, fc.platform, fc.status
    FROM final_copies fc JOIN products p ON fc.product_id = p.id
    ORDER BY p.name, fc.platform
  `);
  console.log('\n=== Final: ' + summary.rows.length + ' posts ===');
  summary.rows.forEach(r => console.log(r.name, '|', r.platform, '|', r.status));

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
