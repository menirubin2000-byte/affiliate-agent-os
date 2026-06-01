import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const newProducts = [
  // From existing programs (need product records)
  { name: 'Surfer SEO', slug: 'surfer-seo', brand: 'Surfer', category: 'SEO', url: 'https://surferseo.com', description: 'AI-powered on-page SEO optimization tool for content writers and marketers.', target_keyword: 'surfer seo review', price_range: '$49-$199/mo' },
  { name: 'Riverside.fm', slug: 'riverside-fm', brand: 'Riverside', category: 'Video/Audio', url: 'https://riverside.fm', description: 'High-quality remote podcast and video recording studio in the browser.', target_keyword: 'riverside fm review', price_range: '$0-$24/mo' },
  { name: 'Grammarly', slug: 'grammarly', brand: 'Grammarly', category: 'Writing', url: 'https://grammarly.com', description: 'AI writing assistant for grammar, clarity, tone, and style improvements.', target_keyword: 'grammarly review', price_range: '$0-$30/mo' },
  { name: 'Zapier', slug: 'zapier', brand: 'Zapier', category: 'Automation', url: 'https://zapier.com', description: 'No-code automation platform connecting 6000+ apps with workflows.', target_keyword: 'zapier review', price_range: '$0-$69/mo' },
  { name: 'Descript', slug: 'descript', brand: 'Descript', category: 'Video/Audio', url: 'https://descript.com', description: 'All-in-one video and podcast editor with AI transcription and editing.', target_keyword: 'descript review', price_range: '$0-$33/mo' },
  { name: 'Loom', slug: 'loom', brand: 'Loom', category: 'Video', url: 'https://loom.com', description: 'Async video messaging tool for screen recording and team communication.', target_keyword: 'loom review', price_range: '$0-$15/mo' },
  // New products
  { name: 'ConvertKit', slug: 'convertkit', brand: 'ConvertKit', category: 'Email Marketing', url: 'https://convertkit.com', description: 'Email marketing platform built for creators, bloggers, and online businesses.', target_keyword: 'convertkit review', price_range: '$0-$50/mo' },
  { name: 'Teachable', slug: 'teachable', brand: 'Teachable', category: 'Online Courses', url: 'https://teachable.com', description: 'Platform for creating and selling online courses and coaching programs.', target_keyword: 'teachable review', price_range: '$0-$199/mo' },
  { name: 'Kajabi', slug: 'kajabi', brand: 'Kajabi', category: 'Online Business', url: 'https://kajabi.com', description: 'All-in-one platform for online courses, memberships, coaching, and marketing.', target_keyword: 'kajabi review', price_range: '$149-$399/mo' },
  { name: 'Podia', slug: 'podia', brand: 'Podia', category: 'Digital Products', url: 'https://podia.com', description: 'Simple platform for selling digital downloads, courses, and memberships.', target_keyword: 'podia review', price_range: '$0-$75/mo' },
  { name: 'Thinkific', slug: 'thinkific', brand: 'Thinkific', category: 'Online Courses', url: 'https://thinkific.com', description: 'Course creation platform with customizable storefronts and student management.', target_keyword: 'thinkific review', price_range: '$0-$199/mo' },
  { name: 'ActiveCampaign', slug: 'activecampaign', brand: 'ActiveCampaign', category: 'Email/CRM', url: 'https://activecampaign.com', description: 'Email marketing, automation, and CRM platform for growing businesses.', target_keyword: 'activecampaign review', price_range: '$29-$149/mo' },
  { name: 'GetResponse', slug: 'getresponse', brand: 'GetResponse', category: 'Email Marketing', url: 'https://getresponse.com', description: 'Email marketing platform with landing pages, webinars, and automation.', target_keyword: 'getresponse review', price_range: '$0-$99/mo' },
  { name: 'AWeber', slug: 'aweber', brand: 'AWeber', category: 'Email Marketing', url: 'https://aweber.com', description: 'Email marketing and automation for small businesses and entrepreneurs.', target_keyword: 'aweber review', price_range: '$0-$25/mo' },
  { name: 'HubSpot', slug: 'hubspot', brand: 'HubSpot', category: 'CRM/Marketing', url: 'https://hubspot.com', description: 'All-in-one CRM, marketing, sales, and service platform for scaling businesses.', target_keyword: 'hubspot review', price_range: '$0-$800/mo' },
  { name: 'Shopify', slug: 'shopify', brand: 'Shopify', category: 'Ecommerce', url: 'https://shopify.com', description: 'Leading ecommerce platform for building online stores and selling products.', target_keyword: 'shopify review', price_range: '$29-$299/mo' },
  { name: 'BigCommerce', slug: 'bigcommerce', brand: 'BigCommerce', category: 'Ecommerce', url: 'https://bigcommerce.com', description: 'Enterprise-ready ecommerce platform with built-in SEO and multi-channel selling.', target_keyword: 'bigcommerce review', price_range: '$29-$299/mo' },
  { name: 'Wix', slug: 'wix', brand: 'Wix', category: 'Website Builder', url: 'https://wix.com', description: 'Drag-and-drop website builder with AI tools, ecommerce, and hosting.', target_keyword: 'wix review', price_range: '$0-$159/mo' },
  { name: 'Squarespace', slug: 'squarespace', brand: 'Squarespace', category: 'Website Builder', url: 'https://squarespace.com', description: 'Design-focused website builder with templates, ecommerce, and domains.', target_keyword: 'squarespace review', price_range: '$16-$49/mo' },
  { name: 'Hostinger', slug: 'hostinger', brand: 'Hostinger', category: 'Web Hosting', url: 'https://hostinger.com', description: 'Affordable web hosting with AI website builder, domains, and email.', target_keyword: 'hostinger review', price_range: '$2-$15/mo' },
  { name: 'Bluehost', slug: 'bluehost', brand: 'Bluehost', category: 'Web Hosting', url: 'https://bluehost.com', description: 'WordPress-recommended web hosting with free domain and SSL certificates.', target_keyword: 'bluehost review', price_range: '$3-$14/mo' },
  { name: 'SiteGround', slug: 'siteground', brand: 'SiteGround', category: 'Web Hosting', url: 'https://siteground.com', description: 'Premium managed WordPress hosting with speed optimization and support.', target_keyword: 'siteground review', price_range: '$3-$14/mo' },
  { name: 'Fiverr', slug: 'fiverr', brand: 'Fiverr', category: 'Freelance', url: 'https://fiverr.com', description: 'Global freelance marketplace for digital services starting at $5.', target_keyword: 'fiverr review', price_range: '$5+' },
  { name: 'TubeBuddy', slug: 'tubebuddy', brand: 'TubeBuddy', category: 'YouTube', url: 'https://tubebuddy.com', description: 'Browser extension for YouTube channel management, SEO, and growth tools.', target_keyword: 'tubebuddy review', price_range: '$0-$49/mo' },
  { name: 'vidIQ', slug: 'vidiq', brand: 'vidIQ', category: 'YouTube', url: 'https://vidiq.com', description: 'YouTube growth tool with AI-powered video ideas, SEO, and analytics.', target_keyword: 'vidiq review', price_range: '$0-$99/mo' },
  { name: 'Buffer', slug: 'buffer', brand: 'Buffer', category: 'Social Media', url: 'https://buffer.com', description: 'Social media scheduling and analytics tool for growing organic reach.', target_keyword: 'buffer review', price_range: '$0-$100/mo' },
  { name: 'Hootsuite', slug: 'hootsuite', brand: 'Hootsuite', category: 'Social Media', url: 'https://hootsuite.com', description: 'Social media management platform for scheduling, monitoring, and analytics.', target_keyword: 'hootsuite review', price_range: '$99-$249/mo' },
  { name: 'Later', slug: 'later', brand: 'Later', category: 'Social Media', url: 'https://later.com', description: 'Visual social media planner and scheduler for Instagram, TikTok, and more.', target_keyword: 'later review', price_range: '$0-$40/mo' },
  { name: 'Tailwind', slug: 'tailwind', brand: 'Tailwind', category: 'Social Media', url: 'https://tailwindapp.com', description: 'Smart scheduling and design tool for Pinterest and Instagram marketing.', target_keyword: 'tailwind app review', price_range: '$0-$40/mo' },
  { name: 'Mangools', slug: 'mangools', brand: 'Mangools', category: 'SEO', url: 'https://mangools.com', description: 'Affordable SEO toolset with keyword research, SERP analysis, and rank tracking.', target_keyword: 'mangools review', price_range: '$29-$69/mo' },
  { name: 'SE Ranking', slug: 'se-ranking', brand: 'SE Ranking', category: 'SEO', url: 'https://seranking.com', description: 'All-in-one SEO platform with rank tracking, audits, and competitor analysis.', target_keyword: 'se ranking review', price_range: '$39-$189/mo' },
  { name: 'Pictory', slug: 'pictory', brand: 'Pictory', category: 'AI Video', url: 'https://pictory.ai', description: 'AI video creation tool that turns text, scripts, and blog posts into videos.', target_keyword: 'pictory review', price_range: '$19-$99/mo' },
  { name: 'Synthesia', slug: 'synthesia', brand: 'Synthesia', category: 'AI Video', url: 'https://synthesia.io', description: 'AI video generator with realistic avatars for training, marketing, and demos.', target_keyword: 'synthesia review', price_range: '$22-$67/mo' },
  { name: 'Copy.ai', slug: 'copy-ai', brand: 'Copy.ai', category: 'AI Writing', url: 'https://copy.ai', description: 'AI-powered copywriting tool for marketing copy, blog posts, and social content.', target_keyword: 'copy ai review', price_range: '$0-$49/mo' },
  { name: 'Frase', slug: 'frase', brand: 'Frase', category: 'AI SEO', url: 'https://frase.io', description: 'AI content optimization tool for SEO research, writing, and SERP analysis.', target_keyword: 'frase review', price_range: '$15-$115/mo' },
  { name: 'NordVPN', slug: 'nordvpn', brand: 'NordVPN', category: 'VPN/Security', url: 'https://nordvpn.com', description: 'Leading VPN service for online privacy, security, and accessing global content.', target_keyword: 'nordvpn review', price_range: '$3-$15/mo' },
  { name: 'Skillshare', slug: 'skillshare', brand: 'Skillshare', category: 'Online Learning', url: 'https://skillshare.com', description: 'Online learning community with thousands of creative and business classes.', target_keyword: 'skillshare review', price_range: '$0-$14/mo' },
  { name: 'Envato Elements', slug: 'envato-elements', brand: 'Envato', category: 'Digital Assets', url: 'https://elements.envato.com', description: 'Unlimited downloads of templates, photos, fonts, and creative assets.', target_keyword: 'envato elements review', price_range: '$16/mo' },
  { name: 'AppSumo', slug: 'appsumo', brand: 'AppSumo', category: 'Deals/Marketplace', url: 'https://appsumo.com', description: 'Marketplace for lifetime deals on software tools for entrepreneurs.', target_keyword: 'appsumo review', price_range: 'Varies' },
  { name: 'Calendly', slug: 'calendly', brand: 'Calendly', category: 'Scheduling', url: 'https://calendly.com', description: 'Automated scheduling tool that eliminates back-and-forth meeting coordination.', target_keyword: 'calendly review', price_range: '$0-$16/mo' },
];

const affiliateSignupUrls = {
  'convertkit': 'https://convertkit.com/affiliate',
  'teachable': 'https://teachable.com/affiliates',
  'kajabi': 'https://kajabi.com/affiliates',
  'podia': 'https://podia.com/affiliates',
  'thinkific': 'https://thinkific.com/affiliates',
  'activecampaign': 'https://activecampaign.com/partner/affiliate',
  'getresponse': 'https://getresponse.com/affiliate-programs',
  'aweber': 'https://aweber.com/affiliate-program',
  'hubspot': 'https://hubspot.com/partners/affiliates',
  'shopify': 'https://shopify.com/affiliates',
  'bigcommerce': 'https://bigcommerce.com/affiliates',
  'wix': 'https://wix.com/about/affiliates',
  'squarespace': 'https://squarespace.com/affiliates',
  'hostinger': 'https://hostinger.com/affiliates',
  'bluehost': 'https://bluehost.com/affiliates',
  'siteground': 'https://siteground.com/affiliates',
  'fiverr': 'https://affiliates.fiverr.com',
  'tubebuddy': 'https://tubebuddy.com/affiliate',
  'vidiq': 'https://vidiq.com/affiliates',
  'buffer': 'https://buffer.com/affiliates',
  'hootsuite': 'https://hootsuite.com/partners/affiliate',
  'later': 'https://later.com/affiliate',
  'tailwind': 'https://tailwindapp.com/affiliate',
  'mangools': 'https://mangools.com/affiliate',
  'se-ranking': 'https://seranking.com/affiliate',
  'pictory': 'https://pictory.ai/affiliates',
  'synthesia': 'https://synthesia.io/affiliates',
  'copy-ai': 'https://copy.ai/affiliate',
  'frase': 'https://frase.io/affiliate',
  'nordvpn': 'https://nordvpn.com/affiliates',
  'skillshare': 'https://skillshare.com/affiliates',
  'envato-elements': 'https://envato.com/affiliates',
  'appsumo': 'https://appsumo.com/partners',
  'calendly': 'https://calendly.com/partners',
};

async function main() {
  let created = 0;
  let skipped = 0;
  let programsCreated = 0;

  for (const p of newProducts) {
    // Check if product already exists
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('slug', p.slug)
      .maybeSingle();

    if (existing) {
      console.log(`SKIP product: ${p.name} (already exists)`);
      skipped++;
      continue;
    }

    // Create product
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name: p.name,
        slug: p.slug,
        brand: p.brand,
        category: p.category,
        affiliate_url: p.url,
        target_keyword: p.target_keyword,
        status: 'inactive',
        notes: `[stage-58] ${p.description} Price: ${p.price_range}.`
      })
      .select('id')
      .single();

    if (error) {
      console.log(`ERROR creating ${p.name}: ${error.message}`);
      continue;
    }

    console.log(`CREATED product: ${p.name} (${product.id})`);
    created++;

    // Check if affiliate program already exists for this product
    const { data: existingProgram } = await supabase
      .from('affiliate_programs')
      .select('id')
      .eq('product_id', product.id)
      .maybeSingle();

    if (existingProgram) {
      console.log(`  SKIP program: already exists`);
      continue;
    }

    // Create affiliate program record
    const signupUrl = affiliateSignupUrls[p.slug];
    if (signupUrl) {
      const { error: progError } = await supabase
        .from('affiliate_programs')
        .insert({
          product_id: product.id,
          program_name: `${p.name} Affiliate Program`,
          status: 'signup_needed',
          signup_url: signupUrl,
          notes: `[stage-58] Affiliate program found. Signup URL researched. Operator needs to apply.`
        });

      if (progError) {
        console.log(`  ERROR creating program: ${progError.message}`);
      } else {
        console.log(`  CREATED program: signup_needed`);
        programsCreated++;
      }
    }
  }

  // Also link existing programs to their products where product exists but no link
  const programsToLink = [
    { slug: 'surfer-seo', programName: 'Surfer SEO Affiliate Program' },
    { slug: 'riverside-fm', programName: 'Riverside.fm Affiliate Program' },
    { slug: 'grammarly', programName: 'Grammarly Affiliate Program' },
    { slug: 'zapier', programName: 'Zapier Affiliate Program' },
    { slug: 'descript', programName: 'Descript Affiliate Program' },
    { slug: 'loom', programName: 'Loom Affiliate Program' },
  ];

  for (const link of programsToLink) {
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('slug', link.slug)
      .maybeSingle();

    if (product) {
      const { data: program } = await supabase
        .from('affiliate_programs')
        .select('id, product_id')
        .ilike('program_name', `%${link.slug.replace('-', '%')}%`)
        .maybeSingle();

      if (program && !program.product_id) {
        await supabase
          .from('affiliate_programs')
          .update({ product_id: product.id })
          .eq('id', program.id);
        console.log(`LINKED program ${link.programName} to product ${link.slug}`);
      }
    }
  }

  console.log(`\nDone: ${created} products created, ${skipped} skipped, ${programsCreated} programs created`);

  // Final count
  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).neq('slug', 'demo-widget');
  console.log(`Total products in DB: ${count}`);
}

main().catch(console.error);
