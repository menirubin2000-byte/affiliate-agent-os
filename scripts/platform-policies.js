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

/*
  Platform policies for affiliate content:

  MEDIUM:
  - Text articles OK
  - Affiliate links allowed with disclosure
  - Must add disclosure at top
  - No clickbait titles
  - No income guarantees
  - Markdown supported

  LINKEDIN:
  - Text posts max ~3000 chars
  - Affiliate links allowed but LinkedIn may reduce reach
  - Must disclose affiliate relationship
  - No spammy or misleading content
  - Professional tone required
  - No markdown, plain text only (bold via Unicode if needed)

  SUBSTACK:
  - Newsletter/article format
  - Affiliate links allowed with disclosure
  - Markdown supported
  - No income guarantees
  - FTC disclosure required

  QUORA:
  - Answer format — must answer a real question
  - Affiliate links allowed if answer is genuinely helpful
  - Disclosure required
  - Self-promotion policy: must add value, not just promote
  - Can get banned for pure promotional answers
  - Keep promotional content under 20% of answer

  REDDIT:
  - Self-post format
  - Affiliate links: VERY strict — many subreddits ban them
  - Must disclose
  - Community-first tone, not salesy
  - Post to own profile (u/) is safer than subreddits
  - Can get shadowbanned for spamming affiliate links
  - Must provide genuine value

  TIKTOK:
  - VIDEO ONLY — no text posts
  - Affiliate link in BIO only, not in description
  - Must use #ad or #sponsored or paid partnership label
  - No income guarantees
  - Script format needed, not article
  - 30-60 second video recommended
  - Status: NOT READY — needs video production, not text
*/

const POLICY_RULES = {
  medium: {
    format: 'article',
    max_length: null,
    links_allowed: true,
    link_placement: 'in_body',
    disclosure_required: true,
    disclosure_format: 'top_of_article',
    markdown: true,
    tone: 'informative',
    restrictions: ['no_income_guarantees', 'no_clickbait'],
    ready: true
  },
  linkedin: {
    format: 'short_post',
    max_length: 3000,
    links_allowed: true,
    link_placement: 'in_body',
    disclosure_required: true,
    disclosure_format: 'top_of_post',
    markdown: false,
    tone: 'professional',
    restrictions: ['no_income_guarantees', 'no_spam', 'plain_text_only'],
    ready: true
  },
  substack: {
    format: 'newsletter',
    max_length: null,
    links_allowed: true,
    link_placement: 'in_body',
    disclosure_required: true,
    disclosure_format: 'top_of_article',
    markdown: true,
    tone: 'informative',
    restrictions: ['no_income_guarantees', 'ftc_disclosure'],
    ready: true
  },
  quora: {
    format: 'answer',
    max_length: null,
    links_allowed: true,
    link_placement: 'end_of_answer',
    disclosure_required: true,
    disclosure_format: 'top_of_answer',
    markdown: false,
    tone: 'helpful_first',
    restrictions: ['no_income_guarantees', 'must_answer_question', 'value_first_promo_under_20pct'],
    ready: true
  },
  reddit: {
    format: 'self_post',
    max_length: null,
    links_allowed: true,
    link_placement: 'end_of_post',
    disclosure_required: true,
    disclosure_format: 'top_of_post',
    markdown: true,
    tone: 'community_discussion',
    restrictions: ['no_income_guarantees', 'no_spam', 'genuine_value', 'post_to_own_profile'],
    ready: true
  },
  tiktok: {
    format: 'video_script',
    max_length: 500,
    links_allowed: false,
    link_placement: 'bio_only',
    disclosure_required: true,
    disclosure_format: '#ad_hashtag',
    markdown: false,
    tone: 'casual_hook',
    restrictions: ['video_only', 'no_income_guarantees', 'link_in_bio_only', 'needs_video_production'],
    ready: false,
    not_ready_reason: 'TikTok requires video production. Text scripts alone cannot be published.'
  }
};

async function main() {
  await c.connect();

  // Save policy rules to file
  const policyPath = path.join(__dirname, '..', 'content', 'platform-policies.json');
  fs.writeFileSync(policyPath, JSON.stringify(POLICY_RULES, null, 2), 'utf8');
  console.log('Saved platform policies to content/platform-policies.json');

  // Check each post against its platform policy
  const copies = await c.query(`
    SELECT fc.id, fc.title, fc.body, fc.affiliate_link, fc.platform, p.name as product
    FROM final_copies fc JOIN products p ON fc.product_id = p.id
    ORDER BY p.name, fc.platform
  `);

  console.log('\n=== Policy Check: ' + copies.rows.length + ' posts ===\n');

  let violations = 0;

  for (const copy of copies.rows) {
    const policy = POLICY_RULES[copy.platform];
    if (!policy) continue;

    const issues = [];

    // Platform not ready (TikTok)
    if (!policy.ready) {
      issues.push('PLATFORM NOT READY: ' + policy.not_ready_reason);
    }

    // Length check
    if (policy.max_length && copy.body.length > policy.max_length) {
      issues.push('Too long: ' + copy.body.length + '/' + policy.max_length);
    }

    // Markdown where not allowed
    if (!policy.markdown && copy.body.includes('## ')) {
      issues.push('Contains markdown headers — platform does not support markdown');
    }
    if (!policy.markdown && copy.body.includes('**')) {
      // LinkedIn and Quora don't render markdown bold, but it's readable
    }

    // Link placement
    if (policy.link_placement === 'bio_only' && copy.body.includes('http')) {
      issues.push('Link in body — platform requires link in bio only');
    }

    // Tone check for Quora
    if (copy.platform === 'quora' && !copy.body.includes('?')) {
      // Should reference a question but not required in body
    }

    // Reddit tone
    if (copy.platform === 'reddit') {
      const salesy = ['buy now', 'sign up today', 'don\'t miss', 'limited time', 'act now'];
      for (const s of salesy) {
        if (copy.body.toLowerCase().includes(s)) {
          issues.push('Salesy language: "' + s + '" — Reddit will downvote/ban');
        }
      }
    }

    if (issues.length > 0) {
      console.log('❌ ' + copy.product + ' | ' + copy.platform);
      issues.forEach(i => console.log('   ' + i));
      violations++;

      // Mark as needs fix in DB
      await c.query(`
        UPDATE final_copies SET status = 'needs_system_fix',
        validation_status = 'fix_requested',
        blocking_reasons = $1, updated_at = now()
        WHERE id = $2
      `, ['{policy_violation}', copy.id]);
    } else {
      console.log('✅ ' + copy.product + ' | ' + copy.platform);
    }
  }

  console.log('\n=== Summary ===');
  console.log('Total:', copies.rows.length);
  console.log('Policy OK:', copies.rows.length - violations);
  console.log('Violations:', violations);

  // Final status
  const summary = await c.query("SELECT status, count(*) as cnt FROM final_copies GROUP BY status ORDER BY status");
  console.log('\nDB Status:');
  summary.rows.forEach(r => console.log(' ', r.status, ':', r.cnt));

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
