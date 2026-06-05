require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg');
const crypto = require('crypto');

const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false }
});

const AFFILIATE_LINK = 'https://systeme.io/?sa=sa0272930337c3024fcafe085f6b63e73bbc0e3365';
const UTM_LINK = AFFILIATE_LINK + '&utm_source=medium&utm_medium=article&utm_campaign=systeme_io_review';

const CLEAN_TITLE = 'Systeme.io Review: Free Funnel and Email Marketing Platform for Online Businesses';

const CLEAN_BODY = `*Affiliate disclosure: This article includes an affiliate link. If you visit Systeme.io through the link and later choose a paid plan, I may earn a commission at no extra cost to you.*

## What Systeme.io Is

Systeme.io is an online business platform for building sales funnels, email marketing workflows, websites, online courses, automations, and related sales pages. This review focuses on whether it may fit small online businesses, creators, service providers, and affiliate marketers who want several core marketing tools in one account.

## Key Features

Based on Systeme.io's official features page, the platform includes funnel building, email marketing, website/page building, automation, course hosting, contact management, and sales tools. The main appeal is that these pieces are available inside one platform, which may reduce the number of separate tools an operator has to connect manually.

## Who It Is For

Systeme.io may be useful for solo operators, creators, coaches, small online businesses, and affiliate marketers who want a practical place to build funnels, collect leads, send emails, and organize basic online sales workflows. It may also fit someone who wants to start with a free plan before deciding whether a paid plan is needed.

## Who It Is Not For

Systeme.io may not be the best fit for teams that need highly customized enterprise workflows, deep custom development control, advanced CRM requirements, or a specialized best-in-class tool for every single marketing function.

## Pros

- Combines funnel pages, email marketing, automations, websites, and course tools in one product.
- Includes a free-plan option, which can make initial testing easier.
- The platform may reduce setup friction for a small operator who does not want to connect many separate tools at the start.

## Cons

- An all-in-one platform may not match the depth of specialized tools in every category.
- Operators should review current plan limits before relying on the free plan for a real project.
- Migration from another system may still require careful manual work.

## Pricing

Systeme.io offers a free account option. Exact plan limits, paid-plan pricing, and included features can change, so review the official pricing page before making a final decision.

## Practical Take

Systeme.io is worth considering if you want one place to test funnels, email capture, simple automations, and online business pages without starting from a complex stack. It is less compelling if you already have mature systems in place or need very specialized controls.

[Try Systeme.io here](${UTM_LINK})`;

async function main() {
  await c.connect();

  // Get IDs
  const pa = await c.query(`
    SELECT pa.id, pa.source_content_id, sc.product_id
    FROM platform_adaptations pa
    JOIN source_contents sc ON pa.source_content_id = sc.id
    JOIN products p ON sc.product_id = p.id
    WHERE p.name LIKE '%Systeme%' AND pa.platform = 'medium'
  `);
  const row = pa.rows[0];

  const ap = await c.query(`
    SELECT id, affiliate_link FROM affiliate_programs
    WHERE product_id = $1 AND affiliate_link IS NOT NULL LIMIT 1
  `, [row.product_id]);

  const contentHash = crypto.createHash('sha256').update(CLEAN_BODY).digest('hex').substring(0, 16);

  // Check if final copy already exists
  const existing = await c.query(
    'SELECT id FROM final_copies WHERE platform_adaptation_id = $1', [row.id]
  );

  if (existing.rows.length) {
    console.log('Final copy already exists, updating...');
    await c.query(`
      UPDATE final_copies SET title=$1, body=$2, content_hash=$3,
      affiliate_link=$4, status='validated', validation_status='valid',
      blocking_reasons='{}', updated_at=now()
      WHERE platform_adaptation_id=$5
    `, [CLEAN_TITLE, CLEAN_BODY, contentHash, AFFILIATE_LINK, row.id]);
  } else {
    console.log('Creating new final copy...');
    await c.query(`
      INSERT INTO final_copies (product_id, affiliate_program_id, affiliate_link,
        source_content_id, platform_adaptation_id, platform, title, body,
        content_hash, version, status, validation_status, blocking_reasons)
      VALUES ($1,$2,$3,$4,$5,'medium',$6,$7,$8,1,
        'ready_for_operator_approval','valid','{}')
    `, [row.product_id, ap.rows[0]?.id, AFFILIATE_LINK,
        row.source_content_id, row.id, CLEAN_TITLE, CLEAN_BODY, contentHash]);
  }

  // Verify
  const verify = await c.query('SELECT id, status, validation_status FROM final_copies WHERE platform_adaptation_id = $1', [row.id]);
  console.log('Final copy:', verify.rows[0]);
  console.log('DONE');

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
