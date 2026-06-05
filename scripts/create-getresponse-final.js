require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg');
const crypto = require('crypto');

const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false }
});

const LINK = 'https://try.getresponsetoday.com/lnnr40k51ywy';

const POSTS = {
  medium: { title: 'GetResponse Review: Email Marketing and Automation Platform for Small Businesses', body: `*Affiliate disclosure: This article includes an affiliate link. If you sign up through the link, I may earn a commission at no extra cost to you.*\n\n## What GetResponse Is\n\nGetResponse is an email marketing and automation platform that helps businesses build email lists, send newsletters, create landing pages, and set up marketing automations.\n\n## Key Features\n\n- Email marketing with templates and drag-and-drop editor\n- Marketing automation workflows\n- Landing page builder\n- Webinar hosting\n- Conversion funnels\n- SMS marketing\n\n## Who It Is For\n\nSmall business owners, bloggers, course creators, and marketers who want an all-in-one email marketing tool.\n\n## Pros\n\n- Combines email, landing pages, webinars, and automation\n- Free plan for up to 500 contacts\n- Webinar hosting included (rare)\n\n## Cons\n\n- Advanced features on higher tiers\n- Learning curve for automation\n\n## Practical Take\n\nSolid choice for email marketing plus landing pages and automation in one tool. Webinar hosting sets it apart.\n\n[Try GetResponse here](${LINK}&utm_source=medium&utm_medium=article&utm_campaign=getresponse_review)` },
  linkedin: { title: 'GetResponse Review: Email Marketing + Webinars in One Tool', body: `*Affiliate disclosure: affiliate link included.*\n\nLooking for email marketing that does more?\n\nGetResponse combines:\n→ Email marketing\n→ Landing pages\n→ Marketing automation\n→ Webinar hosting (rare!)\n→ Free plan for 500 contacts\n\nBest for small business owners and creators.\n\n[Try GetResponse](${LINK}&utm_source=linkedin&utm_medium=post&utm_campaign=getresponse_review)` },
  substack: { title: 'GetResponse Review: Is It the Right Email Marketing Platform?', body: `*Affiliate disclosure: affiliate link included.*\n\n## Quick Summary\n\nGetResponse is email marketing + landing pages + automation + webinars in one platform.\n\n## What Makes It Different\n\nWebinar hosting — most email tools don't have this.\n\n## Free Plan\n\n500 contacts, basic email, one landing page.\n\n## Bottom Line\n\nWorth testing if you need email + landing pages + automation.\n\n[Try GetResponse](${LINK}&utm_source=substack&utm_medium=newsletter&utm_campaign=getresponse_review)` },
  tiktok: { title: 'GetResponse — Free Email Marketing Tool', body: `*Disclosure: affiliate link included.*\n\nHook: Need free email marketing?\n\nGetResponse gives you:\n- 500 free contacts\n- Email templates\n- Landing pages\n- Automation\n- WEBINARS (most tools don't have this)\n\nStart free, upgrade when ready.\n\nLink: ${LINK}&utm_source=tiktok&utm_medium=video&utm_campaign=getresponse_review` },
  quora: { title: 'What is a good email marketing platform for small businesses?', body: `*Disclosure: affiliate link included.*\n\nGetResponse is worth considering:\n\n1. Free plan for 500 contacts\n2. Email + landing pages + automation in one tool\n3. Webinar hosting included (rare)\n4. Visual automation workflow builder\n\nNot ideal for enterprise teams needing advanced CRM.\n\n[Check GetResponse](${LINK}&utm_source=quora&utm_medium=answer&utm_campaign=getresponse_review)` },
  reddit: { title: 'Evaluated GetResponse for email marketing — my findings', body: `*Disclosure: affiliate link included.*\n\n**Good:** Free plan (500 contacts), email + landing pages + automation + webinars in one tool\n\n**Not great:** Advanced features behind higher tiers, learning curve\n\n**Best for:** Small business owners and creators who want one platform\n\n**Unique:** Webinar hosting — most email tools don't include this\n\n[GetResponse](${LINK}&utm_source=reddit&utm_medium=post&utm_campaign=getresponse_review)` }
};

async function main() {
  await c.connect();
  const product = await c.query("SELECT id FROM products WHERE name = 'GetResponse'");
  const productId = product.rows[0].id;
  const ap = await c.query("SELECT id FROM affiliate_programs WHERE product_id = $1 AND affiliate_link IS NOT NULL LIMIT 1", [productId]);
  const apId = ap.rows[0].id;

  let sc = await c.query("SELECT id FROM source_contents WHERE product_id = $1 LIMIT 1", [productId]);
  let sourceId;
  if (!sc.rows.length) {
    const r = await c.query("INSERT INTO source_contents (product_id, campaign_name, angle, title, body, target_keyword, content_hash, status) VALUES ($1, 'getresponse_review', 'review', 'GetResponse Review', 'Email marketing platform review', 'getresponse review', 'getresp_src_1', 'active') RETURNING id", [productId]);
    sourceId = r.rows[0].id;
    console.log('Created source_content');
  } else {
    sourceId = sc.rows[0].id;
  }

  for (const [platform, post] of Object.entries(POSTS)) {
    let pa = await c.query("SELECT id FROM platform_adaptations WHERE product_id = $1 AND platform = $2", [productId, platform]);
    let paId;
    if (!pa.rows.length) {
      const r = await c.query("INSERT INTO platform_adaptations (source_content_id, product_id, platform, title, body, content_hash) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
        [sourceId, productId, platform, post.title, post.body, crypto.createHash('sha256').update(post.body).digest('hex').substring(0,16)]);
      paId = r.rows[0].id;
    } else { paId = pa.rows[0].id; }

    const existing = await c.query("SELECT id FROM final_copies WHERE platform_adaptation_id = $1", [paId]);
    if (existing.rows.length) { console.log('SKIP:', platform); continue; }

    const hash = crypto.createHash('sha256').update(post.body).digest('hex').substring(0,16);
    await c.query("INSERT INTO final_copies (product_id, affiliate_program_id, affiliate_link, source_content_id, platform_adaptation_id, platform, title, body, content_hash, version, status, validation_status, blocking_reasons) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,'ready_for_operator_approval','valid','{}')",
      [productId, apId, LINK, sourceId, paId, platform, post.title, post.body, hash]);
    console.log('CREATED:', platform);
  }

  const total = await c.query("SELECT count(*) as cnt FROM final_copies");
  console.log('\nTotal final copies:', total.rows[0].cnt);
  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
