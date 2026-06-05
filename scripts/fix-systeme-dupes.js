require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false }
});

const LINK = 'https://systeme.io/?sa=sa0272930337c3024fcafe085f6b63e73bbc0e3365';

const substackBody = `*Affiliate disclosure: This article includes an affiliate link. If you sign up through the link, I may earn a commission at no extra cost to you.*

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

[Try Systeme.io here](${LINK}&utm_source=substack&utm_medium=newsletter&utm_campaign=systeme_review)`;

const redditBody = `*Disclosure: affiliate link included.*

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

[Systeme.io](${LINK}&utm_source=reddit&utm_medium=post&utm_campaign=systeme_review)`;

async function main() {
  await c.connect();
  const reviewDir = path.join(__dirname, '..', 'content', 'review-queue', 'systeme-io');

  for (const [platform, body] of [['substack', substackBody], ['reddit', redditBody]]) {
    const hash = crypto.createHash('sha256').update(body).digest('hex').substring(0, 16);
    await c.query(`
      UPDATE final_copies SET body = $1, content_hash = $2, updated_at = now()
      WHERE id IN (SELECT fc.id FROM final_copies fc JOIN products p ON fc.product_id = p.id WHERE p.name = 'Systeme.io' AND fc.platform = $3)
    `, [body, hash, platform]);
    fs.writeFileSync(path.join(reviewDir, platform + '.md'), body, 'utf8');
    console.log('Fixed:', platform, '(' + body.length + ' chars)');
  }

  // Final check
  const all = await c.query(`
    SELECT p.name, fc.platform, length(fc.body) as len FROM final_copies fc
    JOIN products p ON fc.product_id = p.id WHERE p.name = 'Systeme.io' ORDER BY fc.platform
  `);
  all.rows.forEach(r => console.log(r.name, r.platform, r.len, 'chars'));

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
