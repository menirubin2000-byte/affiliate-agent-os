-- Affiliate Agent OS demo seed
-- Run this manually against a local or staging Supabase project when you want
-- enough realistic sample data to exercise the operator workflow.
--
-- This file is intentionally NOT automatic.
--
-- To remove the demo seed later, run:
--   delete from public.products
--   where slug like 'demo-%' or notes ilike '%[demo-seed]%';
--
-- Related drafts, publishing jobs, and performance records will be removed by
-- existing foreign-key cascade rules.

begin;

insert into public.products (
  id,
  name,
  slug,
  brand,
  category,
  affiliate_url,
  price,
  commission_rate,
  notes,
  target_keyword,
  secondary_keywords,
  search_intent,
  content_angle,
  status
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'Demo SEO Suite',
    'demo-seo-suite',
    'DemoStack',
    'SEO software',
    'https://example.com/demo-seo-suite?ref=affiliate-demo',
    99.00,
    30.00,
    '[demo-seed] Demo product for dashboard and workflow verification.',
    'best seo software for lean teams',
    array['seo audit','rank tracking','workflow automation'],
    'commercial investigation',
    'Practical operator review for small teams',
    'active'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Demo Inbox Intel',
    'demo-inbox-intel',
    'MailNorth',
    'Email analytics',
    'https://example.com/demo-inbox-intel?ref=affiliate-demo',
    59.00,
    25.00,
    '[demo-seed] Demo product with mixed draft and publishing states.',
    'email analytics platform review',
    array['deliverability','campaign reporting','email dashboards'],
    'commercial investigation',
    'Operational comparison for newsletter teams',
    'active'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Demo Course Builder',
    'demo-course-builder',
    'Creator Forge',
    'Course platform',
    'https://example.com/demo-course-builder?ref=affiliate-demo',
    149.00,
    35.00,
    '[demo-seed] Demo product that still needs iteration and performance tracking.',
    'course platform buying guide',
    array['creator tools','student checkout','digital course platform'],
    'commercial investigation',
    'Buying guide for first-time course creators',
    'inactive'
  )
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  brand = excluded.brand,
  category = excluded.category,
  affiliate_url = excluded.affiliate_url,
  price = excluded.price,
  commission_rate = excluded.commission_rate,
  notes = excluded.notes,
  target_keyword = excluded.target_keyword,
  secondary_keywords = excluded.secondary_keywords,
  search_intent = excluded.search_intent,
  content_angle = excluded.content_angle,
  status = excluded.status;

insert into public.content_drafts (
  id,
  product_id,
  content_type,
  template_type,
  title,
  body,
  meta_title,
  meta_description,
  target_keyword,
  quality_checks,
  status,
  ai_model,
  approval_notes
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111111',
    'review',
    'review',
    '[demo-seed] Demo SEO Suite review draft',
    '[demo-seed] Demo SEO Suite review draft.

Who it is for:
- Lean SEO teams that need a clear workflow baseline.

Who it is not for:
- Operators who need verified claims beyond the current source data.

Affiliate disclosure: This draft may include affiliate links, and a commission may be earned at no extra cost to the buyer.
CTA: Visit https://example.com/demo-seo-suite?ref=affiliate-demo to review the official product details.',
    'Demo SEO Suite Review for Lean Teams',
    'Demo review draft for staging verification. Verify product details before any real publication.',
    'best seo software for lean teams',
    '{"has_disclosure": true, "has_clear_cta": true, "has_target_keyword": true, "has_meta_title": true, "has_meta_description": true, "avoids_fake_claims": true, "has_required_structure": true}'::jsonb,
    'approved',
    'stub-demo-seed',
    '[demo-seed] Approved for staging queue verification.'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '11111111-1111-4111-8111-111111111111',
    'social_post',
    'social_post',
    '[demo-seed] Demo SEO Suite social draft',
    '[demo-seed] Demo social post.
Affiliate disclosure: This post may include affiliate links, and a commission may be earned at no extra cost to the buyer.
CTA: Visit https://example.com/demo-seo-suite?ref=affiliate-demo for the official product page.',
    'Demo SEO social draft',
    'Demo social post for verification flows.',
    'best seo software for lean teams',
    '{"has_disclosure": true, "has_clear_cta": true, "has_target_keyword": true, "has_meta_title": true, "has_meta_description": true, "avoids_fake_claims": true, "has_required_structure": true}'::jsonb,
    'draft',
    'stub-demo-seed',
    null
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    '22222222-2222-4222-8222-222222222222',
    'review',
    'comparison',
    '[demo-seed] Demo Inbox Intel comparison draft',
    '[demo-seed] Demo comparison draft.

How it compares:
- Operator should verify pricing and feature claims on the vendor site.

Best fit:
- Newsletter teams comparing reporting tools.

Affiliate disclosure: This draft may include affiliate links, and a commission may be earned at no extra cost to the buyer.
CTA: Visit https://example.com/demo-inbox-intel?ref=affiliate-demo to review the official product details.',
    'Demo Inbox Intel Comparison',
    'Demo comparison draft for approval and performance views.',
    'email analytics platform review',
    '{"has_disclosure": true, "has_clear_cta": true, "has_target_keyword": true, "has_meta_title": true, "has_meta_description": true, "avoids_fake_claims": true, "has_required_structure": true}'::jsonb,
    'rejected',
    'stub-demo-seed',
    '[demo-seed] Rejected to preserve mixed draft states.'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    '22222222-2222-4222-8222-222222222222',
    'review',
    'buying_guide',
    '[demo-seed] Demo Inbox Intel buying guide',
    '[demo-seed] Demo buying guide draft.

What to look for:
- Reporting clarity
- Deliverability visibility

Best for:
- Operators who need manual campaign review steps.

Affiliate disclosure: This draft may include affiliate links, and a commission may be earned at no extra cost to the buyer.
CTA: Visit https://example.com/demo-inbox-intel?ref=affiliate-demo to review the official product details.',
    'Demo Inbox Intel Buying Guide',
    'Demo buying guide used for publishing and recommendation views.',
    'email analytics platform review',
    '{"has_disclosure": true, "has_clear_cta": true, "has_target_keyword": true, "has_meta_title": true, "has_meta_description": true, "avoids_fake_claims": true, "has_required_structure": true}'::jsonb,
    'approved',
    'stub-demo-seed',
    '[demo-seed] Approved for WordPress queue verification.'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    '33333333-3333-4333-8333-333333333333',
    'review',
    'review',
    '[demo-seed] Demo Course Builder review draft',
    '[demo-seed] Demo review draft with intentionally incomplete quality coverage.',

    null,
    null,
    null,
    '{"has_disclosure": false, "has_clear_cta": false, "has_target_keyword": false, "has_meta_title": false, "has_meta_description": false, "avoids_fake_claims": true, "has_required_structure": false}'::jsonb,
    'draft',
    'stub-demo-seed',
    null
  )
on conflict (id) do update set
  product_id = excluded.product_id,
  content_type = excluded.content_type,
  template_type = excluded.template_type,
  title = excluded.title,
  body = excluded.body,
  meta_title = excluded.meta_title,
  meta_description = excluded.meta_description,
  target_keyword = excluded.target_keyword,
  quality_checks = excluded.quality_checks,
  status = excluded.status,
  ai_model = excluded.ai_model,
  approval_notes = excluded.approval_notes;

insert into public.publishing_jobs (
  id,
  content_draft_id,
  target_platform,
  status,
  wordpress_post_id,
  wordpress_post_url,
  error_message
)
values
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'wordpress',
    'sent_to_wordpress',
    'demo-401',
    'https://example.com/wp-admin/post.php?post=demo-401&action=edit',
    null
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'wordpress',
    'pending',
    null,
    null,
    null
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd3',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'wordpress',
    'failed',
    null,
    null,
    '[demo-seed] WordPress test credentials were intentionally rejected during demo setup.'
  )
on conflict (id) do update set
  content_draft_id = excluded.content_draft_id,
  target_platform = excluded.target_platform,
  status = excluded.status,
  wordpress_post_id = excluded.wordpress_post_id,
  wordpress_post_url = excluded.wordpress_post_url,
  error_message = excluded.error_message;

insert into public.performance_metrics (
  id,
  product_id,
  draft_id,
  channel,
  campaign_name,
  clicks,
  conversions,
  revenue,
  notes,
  recorded_at
)
values
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'Blog',
    'demo-seed-review-push',
    84,
    5,
    495.00,
    '[demo-seed] Stronger long-form performance sample.',
    now() - interval '3 days'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
    '11111111-1111-4111-8111-111111111111',
    null,
    'Email',
    'demo-seed-followup',
    18,
    1,
    99.00,
    '[demo-seed] Manual campaign sample.',
    now() - interval '2 days'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3',
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'X',
    'demo-seed-social-trial',
    9,
    0,
    0,
    '[demo-seed] Low-click sample used for recommendation visibility.',
    now() - interval '9 days'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4',
    '33333333-3333-4333-8333-333333333333',
    null,
    'Pinterest',
    'demo-seed-pinterest-test',
    4,
    0,
    0,
    '[demo-seed] Sparse sample for low-volume and stale record views.',
    now() - interval '38 days'
  )
on conflict (id) do update set
  product_id = excluded.product_id,
  draft_id = excluded.draft_id,
  channel = excluded.channel,
  campaign_name = excluded.campaign_name,
  clicks = excluded.clicks,
  conversions = excluded.conversions,
  revenue = excluded.revenue,
  notes = excluded.notes,
  recorded_at = excluded.recorded_at;

commit;
