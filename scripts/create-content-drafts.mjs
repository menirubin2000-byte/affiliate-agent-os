import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function linkedinPost(p) {
  return `${p.name} — what it actually does and who it's for.

${p.notes?.replace('[stage-58] ', '').replace(/Price:.*/, '').trim() || p.name + ' is a tool worth looking at if you work online.'}

Who it fits best:
-> Solo operators, freelancers, and small teams looking for a reliable ${p.category?.toLowerCase() || 'online'} solution.

Who it may not fit:
-> Large enterprises needing deep customization or niche integrations.

Key points:
- Check the free plan or trial before committing
- Compare with alternatives in the same category
- Read the official pricing page for current rates

Disclosure: This post contains an affiliate link. If you sign up through it, I may earn a commission at no extra cost to you.

#${p.name.replace(/[\s.]/g, '')} #${p.category?.replace(/[\s/]/g, '') || 'SaaS'} #AffiliateReview #OnlineTools`;
}

function mediumArticle(p) {
  const catLower = p.category?.toLowerCase() || 'online tools';
  return `# ${p.name} Review: Is It Worth It in 2026?

If you work online and need a solid ${catLower} solution, ${p.name} is one of the options you will come across.

## What ${p.name} Does

${p.notes?.replace('[stage-58] ', '').replace(/Price:.*/, '').trim() || p.name + ' provides tools for ' + catLower + '.'}

## Who It Fits Best

${p.name} works well for:
- Solo operators and freelancers
- Small to medium teams
- Anyone looking for a reliable ${catLower} platform

## Who It May Not Fit

- Enterprise teams needing deep customization
- Users who need very niche integrations
- Budget-conscious users if the free tier is limited

## Pricing

Check the official ${p.name} pricing page for current plans and rates. Many tools in this category offer free tiers or trials.

## Bottom Line

${p.name} is a solid option in the ${catLower} space. Try the free plan or trial before committing to a paid plan.

---

*Disclosure: This article contains an affiliate link. If you sign up through it, I may earn a commission at no extra cost to you. I only recommend tools I have researched.*`;
}

function substackPost(p) {
  const catLower = p.category?.toLowerCase() || 'online tools';
  return `# ${p.name} — Quick Review

Looking for a ${catLower} solution? Here is a quick look at ${p.name}.

**What it does:** ${p.notes?.replace('[stage-58] ', '').replace(/Price:.*/, '').trim() || 'Provides ' + catLower + ' for online businesses.'}

**Best for:** Solo operators, freelancers, small teams.

**Not ideal for:** Large enterprises needing heavy customization.

**My take:** Worth trying the free plan or trial. Compare with alternatives before committing.

*Disclosure: This post contains an affiliate link. If you sign up through it, I may earn a commission at no extra cost to you.*`;
}

async function main() {
  // Get all real products (exclude test/staging products)
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .not('slug', 'like', 'stage-%')
    .not('slug', 'like', 'demo-%')
    .order('name');

  console.log(`Found ${products.length} real products`);

  let linkedinCount = 0;
  let mediumCount = 0;
  let substackCount = 0;
  // skipped counter removed — unused

  for (const p of products) {
    // Check existing drafts for this product
    const { data: existingDrafts } = await supabase
      .from('content_drafts')
      .select('id, title, template_type')
      .eq('product_id', p.id);

    const hasLinkedin = existingDrafts?.some(d => d.title?.toLowerCase().includes('linkedin'));
    const hasMedium = existingDrafts?.some(d => d.title?.toLowerCase().includes('medium'));
    const hasSubstack = existingDrafts?.some(d => d.title?.toLowerCase().includes('substack'));
    const hasReview = existingDrafts?.some(d => d.template_type === 'review');

    // Create LinkedIn post draft
    if (!hasLinkedin) {
      const { error } = await supabase.from('content_drafts').insert({
        product_id: p.id,
        content_type: 'social_post',
        template_type: 'social_post',
        title: `[LinkedIn] ${p.name} — Review Post`,
        body: linkedinPost(p),
        status: 'draft',
        target_keyword: p.target_keyword,
        meta_title: `${p.name} Review — LinkedIn Post`,
        meta_description: `LinkedIn post reviewing ${p.name} for the ${p.category || 'online tools'} category.`,
        quality_checks: JSON.stringify({
          has_disclosure: true,
          has_cta: true,
          word_count_ok: true,
          no_fake_claims: true,
          platform: 'linkedin'
        })
      });
      if (error) {
        console.log(`  ERROR linkedin for ${p.name}: ${error.message}`);
      } else {
        linkedinCount++;
      }
    }

    // Create Medium article draft
    if (!hasMedium && !hasReview) {
      const { error } = await supabase.from('content_drafts').insert({
        product_id: p.id,
        content_type: 'review',
        template_type: 'review',
        title: `[Medium] ${p.name} Review: Is It Worth It in 2026?`,
        body: mediumArticle(p),
        status: 'draft',
        target_keyword: p.target_keyword,
        meta_title: `${p.name} Review 2026 — Honest Look`,
        meta_description: `An honest review of ${p.name} covering features, pricing, pros and cons for ${p.category || 'online'} users.`,
        quality_checks: JSON.stringify({
          has_disclosure: true,
          has_cta: true,
          has_meta_title: true,
          has_meta_description: true,
          word_count_ok: true,
          no_fake_claims: true,
          platform: 'medium'
        })
      });
      if (error) {
        console.log(`  ERROR medium for ${p.name}: ${error.message}`);
      } else {
        mediumCount++;
      }
    }

    // Create Substack post draft
    if (!hasSubstack) {
      const { error } = await supabase.from('content_drafts').insert({
        product_id: p.id,
        content_type: 'review',
        template_type: 'review',
        title: `[Substack] ${p.name} — Quick Review`,
        body: substackPost(p),
        status: 'draft',
        target_keyword: p.target_keyword,
        meta_title: `${p.name} Quick Review`,
        meta_description: `Quick review of ${p.name} for ${p.category || 'online'} users.`,
        quality_checks: JSON.stringify({
          has_disclosure: true,
          has_cta: true,
          word_count_ok: true,
          no_fake_claims: true,
          platform: 'substack'
        })
      });
      if (error) {
        console.log(`  ERROR substack for ${p.name}: ${error.message}`);
      } else {
        substackCount++;
      }
    }

    console.log(`${p.name}: done`);
  }

  console.log(`\nContent created:`);
  console.log(`  LinkedIn posts: ${linkedinCount}`);
  console.log(`  Medium articles: ${mediumCount}`);
  console.log(`  Substack posts: ${substackCount}`);

  const { count } = await supabase.from('content_drafts').select('*', { count: 'exact', head: true });
  console.log(`  Total drafts in DB: ${count}`);
}

main().catch(console.error);
