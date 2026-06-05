require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg');
const crypto = require('crypto');

const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false }
});

const AFFILIATE_LINK = 'https://try.getresponsetoday.com/lnnr40k51ywy';

const POSTS = {
  medium: {
    title: 'GetResponse Review: Email Marketing and Automation Platform for Small Businesses',
    body: `*Affiliate disclosure: This article includes an affiliate link. If you sign up through the link, I may earn a commission at no extra cost to you.*

## What GetResponse Is

GetResponse is an email marketing and automation platform that helps businesses build email lists, send newsletters, create landing pages, and set up marketing automations. It serves small businesses, creators, and marketers who need email marketing without complex enterprise tools.

## Key Features

- Email marketing with templates and drag-and-drop editor
- Marketing automation workflows
- Landing page builder
- Webinar hosting
- Conversion funnels
- SMS marketing
- E-commerce integrations

## Who It Is For

GetResponse works for small business owners, bloggers, course creators, and marketers who want an all-in-one email marketing tool. It fits users who need more than basic email sending but don't need enterprise-level complexity.

## Who It Is Not For

Large enterprises needing advanced CRM, teams requiring complex multi-department workflows, or businesses that only need a simple contact form.

## Pros

- Combines email, landing pages, webinars, and automation in one platform
- Marketing automation is available on mid-tier plans
- Free plan available for up to 500 contacts
- Conversion funnel builder included

## Cons

- Advanced features locked behind higher-tier plans
- Free plan has limited features compared to competitors
- Learning curve for automation workflows

## Pricing

GetResponse offers a free plan for up to 500 contacts. Paid plans start with Email Marketing, then Marketing Automation, and Ecommerce Marketing tiers. Check the official pricing page for current rates.

## Practical Take

GetResponse is a solid choice if you want email marketing, landing pages, and basic automation in one tool. It stands out with webinar hosting, which most competitors don't include. Worth trying on the free plan first.

[Try GetResponse here](${AFFILIATE_LINK}&utm_source=medium&utm_medium=article&utm_campaign=getresponse_review)`
  },
  linkedin: {
    title: 'GetResponse Review: Email Marketing and Automation for Small Businesses',
    body: `*Affiliate disclosure: This post includes an affiliate link.*

Looking for an email marketing platform that does more than just send emails?

GetResponse combines email marketing, landing pages, marketing automation, and even webinar hosting in one platform.

Key highlights:
→ Free plan for up to 500 contacts
→ Drag-and-drop email editor
→ Marketing automation workflows
→ Built-in webinar hosting (rare for email platforms)
→ Conversion funnel builder

Best for: Small business owners, creators, and marketers who want multiple tools in one place.

Not ideal for: Enterprise teams needing advanced CRM or highly custom workflows.

Worth trying on the free plan to see if it fits your workflow.

[Try GetResponse here](${AFFILIATE_LINK}&utm_source=linkedin&utm_medium=post&utm_campaign=getresponse_review)`
  },
  substack: {
    title: 'GetResponse Review: Is It the Right Email Marketing Platform for You?',
    body: `*Affiliate disclosure: This article includes an affiliate link. If you sign up through the link, I may earn a commission at no extra cost to you.*

## Quick Summary

GetResponse is an email marketing platform that also includes landing pages, automation workflows, webinar hosting, and conversion funnels. It targets small businesses and creators who want several marketing tools in one account.

## What Makes It Different

Most email marketing tools focus on sending emails. GetResponse adds webinar hosting, which is unusual in this category. It also includes a conversion funnel builder that connects landing pages, emails, and payment pages.

## Features Worth Noting

- Email campaigns with templates
- Marketing automation (visual workflow builder)
- Landing pages with A/B testing
- Webinar hosting (up to 1,000 attendees on higher plans)
- E-commerce integrations (Shopify, WooCommerce)

## Free Plan

GetResponse offers a free plan for up to 500 contacts with basic email sending and one landing page. Enough to test the platform before committing.

## Bottom Line

If you need email marketing plus landing pages and automation in one tool, GetResponse is worth testing. The webinar feature is a bonus that most competitors don't offer.

[Try GetResponse here](${AFFILIATE_LINK}&utm_source=substack&utm_medium=newsletter&utm_campaign=getresponse_review)`
  },
  tiktok: {
    title: 'GetResponse Review — Free Email Marketing Tool',
    body: `*Affiliate disclosure: affiliate link included.*

Hook: Looking for a free email marketing tool that actually works?

GetResponse gives you:
- Free plan for 500 contacts
- Email templates
- Landing pages
- Marketing automation
- Even webinar hosting

Most email tools charge for automation. GetResponse includes it.

Best part? Start free, upgrade when you need more.

Link in bio: ${AFFILIATE_LINK}&utm_source=tiktok&utm_medium=video&utm_campaign=getresponse_review`
  },
  quora: {
    title: 'What is a good email marketing platform for small businesses?',
    body: `*Disclosure: This answer includes an affiliate link.*

I've been looking at email marketing platforms for small business use, and GetResponse is one worth considering.

What stood out to me:

1. **Free plan** — You get up to 500 contacts for free, which is enough to start testing
2. **All-in-one** — Email marketing, landing pages, automation, and even webinar hosting in one tool
3. **Automation** — Visual workflow builder that lets you set up email sequences based on user behavior
4. **Webinars** — This is rare for an email platform. Most competitors don't include it.

Where it falls short:
- Advanced features require higher-tier plans
- The free plan is more limited than some competitors
- There's a learning curve for the automation features

If you're a small business owner or creator who wants email marketing plus a few extra tools without juggling multiple platforms, GetResponse is worth trying on the free plan.

[Check GetResponse here](${AFFILIATE_LINK}&utm_source=quora&utm_medium=answer&utm_campaign=getresponse_review)`
  },
  reddit: {
    title: 'My experience evaluating GetResponse for email marketing',
    body: `*Disclosure: affiliate link included below.*

Been researching email marketing platforms and spent some time evaluating GetResponse. Sharing what I found in case it helps anyone.

**The good:**
- Has a free plan (500 contacts) so you can test before paying
- Combines email, landing pages, automation, and webinars in one tool
- The automation workflow builder is visual and relatively easy to use
- Webinar hosting included — most email platforms don't have this

**The not so good:**
- Free plan is quite limited compared to something like Mailchimp's free tier
- Some features are locked behind higher-priced plans
- Takes some time to learn the automation features

**Who it's best for:**
Small business owners, course creators, or solo marketers who want one platform for email + landing pages + basic automation. Not ideal if you need enterprise CRM or very advanced segmentation.

**Bottom line:**
Worth trying on the free plan. The webinar feature is genuinely unique in this space.

If interested: [GetResponse](${AFFILIATE_LINK}&utm_source=reddit&utm_medium=post&utm_campaign=getresponse_review)

Happy to answer questions if anyone's looked at this too.`
  }
};

async function main() {
  await c.connect();

  // Get GetResponse product ID and affiliate program ID
  const product = await c.query("SELECT id FROM products WHERE name = 'GetResponse'");
  if (!product.rows.length) {
    console.log('GetResponse not found in products, creating...');
    // It should exist, but just in case
    console.error('ERROR: GetResponse product not found');
    await c.end();
    return;
  }
  const productId = product.rows[0].id;

  const ap = await c.query("SELECT id FROM affiliate_programs WHERE product_id = $1 AND affiliate_link IS NOT NULL LIMIT 1", [productId]);
  const apId = ap.rows[0]?.id || null;

  // Check if source_content exists for GetResponse
  let sourceContent = await c.query("SELECT id FROM source_contents WHERE product_id = $1 LIMIT 1", [productId]);
  let sourceId;

  if (!sourceContent.rows.length) {
    // Create source content
    const scResult = await c.query(`
      INSERT INTO source_contents (product_id, content_type, title, body, status)
      VALUES ($1, 'review', 'GetResponse Review', 'Auto-generated source content for GetResponse', 'approved')
      RETURNING id
    `, [productId]);
    sourceId = scResult.rows[0].id;
    console.log('Created source_content:', sourceId);
  } else {
    sourceId = sourceContent.rows[0].id;
  }

  for (const [platform, post] of Object.entries(POSTS)) {
    // Check if platform adaptation exists
    let pa = await c.query(
      "SELECT id FROM platform_adaptations WHERE source_content_id = $1 AND platform = $2",
      [sourceId, platform]
    );
    let paId;

    if (!pa.rows.length) {
      const paResult = await c.query(`
        INSERT INTO platform_adaptations (source_content_id, platform, title, body, status)
        VALUES ($1, $2, $3, $4, 'approved')
        RETURNING id
      `, [sourceId, platform, post.title, post.body]);
      paId = paResult.rows[0].id;
      console.log('Created adaptation:', platform);
    } else {
      paId = pa.rows[0].id;
    }

    // Check if final copy exists
    const existing = await c.query(
      "SELECT id FROM final_copies WHERE platform_adaptation_id = $1", [paId]
    );

    if (existing.rows.length) {
      console.log('SKIP:', platform, '(already exists)');
      continue;
    }

    const hash = crypto.createHash('sha256').update(post.body).digest('hex').substring(0, 16);

    await c.query(`
      INSERT INTO final_copies (product_id, affiliate_program_id, affiliate_link,
        source_content_id, platform_adaptation_id, platform, title, body,
        content_hash, version, status, validation_status, blocking_reasons)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,'ready_for_operator_approval','valid','{}')
    `, [productId, apId, AFFILIATE_LINK, sourceId, paId, platform, post.title, post.body, hash]);

    console.log('CREATED:', platform);
  }

  // Summary
  const summary = await c.query(`
    SELECT fc.platform, fc.status, p.name
    FROM final_copies fc JOIN products p ON fc.product_id = p.id
    ORDER BY p.name, fc.platform
  `);
  console.log('\n=== All Final Copies ===');
  summary.rows.forEach(r => console.log(r.name, '|', r.platform, '|', r.status));

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
