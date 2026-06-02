const { Client } = require('pg');
const crypto = require('crypto');

const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: '5552223332RRuu', ssl: { rejectUnauthorized: false }
});

const LINK = 'https://www.willo.ai/?ref=meni';

const POSTS = {
  medium: { title: 'Willo Review: AI-Powered Video Interview Platform for Hiring Teams', body: `*Affiliate disclosure: This article includes an affiliate link. If you sign up through the link, I may earn a commission at no extra cost to you.*\n\n## What Willo Is\n\nWillo is an asynchronous video interview platform that lets hiring teams screen candidates without scheduling live calls. Candidates record video answers on their own time, and recruiters review them when it suits them.\n\n## Key Features\n\n- One-way video interviews\n- Customizable question sets per role\n- Team collaboration — share and rate responses\n- Automated candidate invitations\n- ATS integrations\n- AI-assisted screening tools\n\n## Who It Is For\n\nHiring managers, recruiters, and HR teams who screen many candidates and want to save time on early-stage interviews.\n\n## Pros\n\n- Saves hours of scheduling\n- Candidates record at their convenience\n- Easy team collaboration\n- Works across time zones\n\n## Cons\n\n- One-way interviews may feel impersonal\n- Best value at higher hiring volumes\n\n## Practical Take\n\nIf your team spends too much time scheduling screening calls, Willo cuts that down significantly. Worth trying if you hire regularly.\n\n[Try Willo here](${LINK}&utm_source=medium&utm_medium=article&utm_campaign=willo_review)` },
  linkedin: { title: 'Willo Review: Async Video Interviews for Faster Hiring', body: `*Affiliate disclosure: This post includes an affiliate link.*\n\nSpending hours scheduling screening calls?\n\nWillo is an async video interview platform — candidates record answers on their own time, you review when it suits you.\n\n→ No scheduling back-and-forth\n→ Candidates record at their convenience\n→ Share responses with your hiring team\n→ Works across time zones\n→ 20% affiliate commission\n\nBest for: Recruiters and hiring managers doing high-volume screening.\n\n[Try Willo here](${LINK}&utm_source=linkedin&utm_medium=post&utm_campaign=willo_review)` },
  substack: { title: 'Willo Review: Should You Use Async Video Interviews?', body: `*Affiliate disclosure: This article includes an affiliate link.*\n\n## The Problem\n\nScheduling screening interviews is a time sink.\n\n## The Solution\n\nWillo lets you set up video interview questions once. Candidates record answers whenever they want. You review at your own pace.\n\n## What I Like\n\n- Time savings — skip scheduling entirely\n- Better for candidates\n- Team collaboration\n- Works globally\n\n## What Could Be Better\n\n- Some candidates find one-way interviews impersonal\n- Best ROI at volume\n\n## Bottom Line\n\nIf you screen more than a few candidates per month, async video interviews make sense. Willo does this well.\n\n[Try Willo here](${LINK}&utm_source=substack&utm_medium=newsletter&utm_campaign=willo_review)` },
  tiktok: { title: 'Willo — Skip Scheduling, Hire Faster', body: `*Disclosure: affiliate link included.*\n\nHook: Tired of scheduling 50 screening calls a week?\n\nWillo lets candidates record video answers on THEIR time.\nYou review when YOU have time.\n\nNo scheduling. No time zone headaches.\n\nSet questions → send link → watch answers.\n\nLink in bio: ${LINK}&utm_source=tiktok&utm_medium=video&utm_campaign=willo_review` },
  quora: { title: 'What are good tools for screening job candidates remotely?', body: `*Disclosure: This answer includes an affiliate link.*\n\nFor remote candidate screening, async video interview platforms save a lot of time. One worth looking at is Willo.\n\nHow it works:\n1. Create interview questions\n2. Send candidates a link\n3. They record video answers on their own time\n4. You review whenever you want\n\nPros: No scheduling, works across time zones, team can review together\nCons: Some candidates prefer live conversation, best at volume\n\n[Check Willo here](${LINK}&utm_source=quora&utm_medium=answer&utm_campaign=willo_review)` },
  reddit: { title: 'Looked into Willo for async video interviews — sharing what I found', body: `*Disclosure: affiliate link included.*\n\nEvaluated Willo for candidate screening.\n\n**What it does:** Set interview questions, send link, candidates record answers, you review.\n\n**Good:** Eliminates scheduling, clean interface, team collaboration, works across time zones\n\n**Not great:** Some candidates don't love one-way video, best at volume\n\n**Who should look:** Recruiters and hiring managers who screen regularly.\n\nThey have a 20% commission affiliate program.\n\n[Willo](${LINK}&utm_source=reddit&utm_medium=post&utm_campaign=willo_review)` }
};

async function main() {
  await c.connect();
  const product = await c.query("SELECT id FROM products WHERE name = 'Willo'");
  const productId = product.rows[0].id;
  const ap = await c.query("SELECT id FROM affiliate_programs WHERE product_id = $1 AND affiliate_link IS NOT NULL LIMIT 1", [productId]);
  const apId = ap.rows[0].id;

  // Create source content
  let sc = await c.query("SELECT id FROM source_contents WHERE product_id = $1 LIMIT 1", [productId]);
  let sourceId;
  if (!sc.rows.length) {
    const r = await c.query("INSERT INTO source_contents (product_id, campaign_name, angle, title, body, target_keyword, content_hash, status) VALUES ($1, 'willo_review', 'review', 'Willo Review', 'Async video interview platform review', 'willo review', 'willo_src_1', 'active') RETURNING id", [productId]);
    sourceId = r.rows[0].id;
    console.log('Created source_content');
  } else {
    sourceId = sc.rows[0].id;
  }

  for (const [platform, post] of Object.entries(POSTS)) {
    // Create platform adaptation
    let pa = await c.query("SELECT id FROM platform_adaptations WHERE product_id = $1 AND platform = $2", [productId, platform]);
    let paId;
    if (!pa.rows.length) {
      const r = await c.query("INSERT INTO platform_adaptations (source_content_id, product_id, platform, title, body, content_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [sourceId, productId, platform, post.title, post.body, crypto.createHash('sha256').update(post.body).digest('hex').substring(0,16)]);
      paId = r.rows[0].id;
      console.log('Created adaptation:', platform);
    } else {
      paId = pa.rows[0].id;
    }

    // Create final copy
    const existing = await c.query("SELECT id FROM final_copies WHERE platform_adaptation_id = $1", [paId]);
    if (existing.rows.length) {
      console.log('SKIP final copy:', platform);
      continue;
    }

    const hash = crypto.createHash('sha256').update(post.body).digest('hex').substring(0,16);
    await c.query(`INSERT INTO final_copies (product_id, affiliate_program_id, affiliate_link, source_content_id, platform_adaptation_id, platform, title, body, content_hash, version, status, validation_status, blocking_reasons) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,'ready_for_operator_approval','valid','{}')`,
      [productId, apId, LINK, sourceId, paId, platform, post.title, post.body, hash]);
    console.log('CREATED final copy:', platform);
  }

  const summary = await c.query("SELECT p.name, fc.platform, fc.status FROM final_copies fc JOIN products p ON fc.product_id = p.id ORDER BY p.name, fc.platform");
  console.log('\n=== All Final Copies (' + summary.rows.length + ') ===');
  summary.rows.forEach(r => console.log(r.name, '|', r.platform, '|', r.status));

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
