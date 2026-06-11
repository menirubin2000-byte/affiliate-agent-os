import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(import.meta.dirname, '..')
const envRaw = readFileSync(resolve(root, '.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const D = 'Affiliate disclosure: this post includes an affiliate link.'

const PRODUCTS = {
  'Reditus': {
    problem: 'Managing affiliate programs across dozens of SaaS platforms means juggling separate dashboards, different payout terms, and lost tracking.',
    solution: 'Reditus puts all your B2B SaaS affiliate programs in one dashboard — discover programs, apply, and track earnings from a single profile.',
    audience: 'Built for affiliate marketers, content creators, and SaaS reviewers who promote multiple tools.',
    cta: 'Try Reditus',
  },
  'OWC 11-Port Thunderbolt 4 Dock': {
    problem: 'Running out of ports on your laptop means dongles, adapters, and a messy desk.',
    solution: 'OWC Thunderbolt 4 Dock gives you 11 ports in one hub — Thunderbolt 4, USB-A, SD card, Ethernet, audio — all through a single cable.',
    audience: 'Great for Mac and PC power users, video editors, and anyone with a multi-monitor setup.',
    cta: 'Check it out',
  },
  'Shopify': {
    problem: 'Setting up an online store from scratch is slow — hosting, payments, inventory, shipping all need separate solutions.',
    solution: 'Shopify handles it all in one platform. Build a store, accept payments, manage inventory, and ship — no coding needed.',
    audience: 'Works for solo sellers, small businesses, and anyone launching an ecommerce brand.',
    cta: 'Try Shopify',
  },
  'Ad Turbo': {
    problem: 'Writing ad copy for Meta and Google campaigns takes hours of testing headlines, descriptions, and variations.',
    solution: 'Ad Turbo generates ad creatives with AI — headlines, descriptions, and variations ready to test, in minutes instead of hours.',
    audience: 'Useful for marketers, agencies, and media buyers running paid campaigns.',
    cta: 'Try Ad Turbo',
  },
  'Willo': {
    problem: 'First-round screening calls eat hours of recruiter time, and candidates have to schedule around work.',
    solution: 'Willo lets candidates record video, audio, or text responses on their own time — no scheduling, no live calls needed.',
    audience: 'Built for hiring managers, recruiters, and agencies screening high volumes of candidates.',
    cta: 'Try Willo',
  },
  'Search Atlas': {
    problem: 'Switching between SEO tools for content, rank tracking, and backlinks slows down the workflow.',
    solution: 'Search Atlas combines content optimization, rank tracking, and site audits in one platform — fewer tabs, faster decisions.',
    audience: 'Useful for SEO professionals, content teams, and marketing agencies.',
    cta: 'Try Search Atlas',
  },
  'Woodpecker': {
    problem: 'Cold emails that land in spam waste time, budget, and pipeline opportunities.',
    solution: 'Woodpecker automates cold email outreach with built-in deliverability tools — email warmup, bounce detection, and follow-up sequences that actually reach inboxes.',
    audience: 'Made for sales teams, agencies, and founders doing outbound prospecting.',
    cta: 'Try Woodpecker',
  },
  'Geo Targetly': {
    problem: 'Running a global site but showing the same content to everyone means missed conversions — wrong language, wrong currency, wrong offer.',
    solution: 'Geo Targetly redirects visitors based on location — show the right page, currency, or language automatically based on where they are.',
    audience: 'Useful for ecommerce stores, SaaS companies, and affiliate marketers with multi-region traffic.',
    cta: 'Try Geo Targetly',
  },
  'OBSBOT Tiny 2 Lite 4K Webcam': {
    problem: 'Built-in laptop webcams look grainy, and most external webcams don\'t track your movement.',
    solution: 'OBSBOT Tiny 2 Lite shoots in 4K with AI-powered tracking — it follows you as you move, keeping you centered without manual adjustment.',
    audience: 'Great for streamers, remote workers, and content creators who move during calls or recordings.',
    cta: 'Check it out',
  },
  'Algomo': {
    problem: 'Support tickets pile up overnight, and hiring 24/7 agents isn\'t realistic for most teams.',
    solution: 'Algomo is an AI chatbot that handles routine customer questions and captures leads around the clock — no human needed for the common stuff.',
    audience: 'Works for SaaS companies, ecommerce stores, and service businesses with repetitive support volume.',
    cta: 'Try Algomo',
  },
  'EmailListVerify': {
    problem: 'Sending to bad email addresses kills your sender reputation and lands future campaigns in spam.',
    solution: 'EmailListVerify checks your list before you send — catches invalid, disposable, and risky addresses so your deliverability stays clean.',
    audience: 'Essential for email marketers, cold outreach teams, and anyone sending to large lists.',
    cta: 'Try EmailListVerify',
  },
  'Philips Norelco Head Shaver Pro 9000 Series': {
    problem: 'Shaving your head with a regular razor is slow, uncomfortable, and hard to do evenly.',
    solution: 'Philips Head Shaver Pro 9000 is built specifically for head shaving — 360-degree rotating blades, wet/dry use, and skin protection guard.',
    audience: 'Made for anyone who shaves their head regularly and wants a faster, irritation-free routine.',
    cta: 'Check it out',
  },
  'Leader Leads': {
    problem: 'Building a prospect list manually means hours of research and still no guarantee the data is accurate.',
    solution: 'Leader Leads combines verified prospect data with outbound sequencing — find contacts, verify emails, and launch sequences from one platform.',
    audience: 'Built for sales teams, agencies, and founders running cold outreach campaigns.',
    cta: 'Try Leader Leads',
  },
  'Philips Sonicare 6500 Series Electric Toothbrush': {
    problem: 'Manual brushing misses spots, and most people don\'t brush long enough or with the right pressure.',
    solution: 'Philips Sonicare 6500 has a pressure sensor that alerts you when you\'re pushing too hard, 3 cleaning modes, and a battery that lasts weeks.',
    audience: 'Good for anyone upgrading from a manual toothbrush or replacing an old electric one.',
    cta: 'Check it out',
  },
  'SignEasy': {
    problem: 'Printing, signing, scanning, and emailing contracts back is a waste of time in 2026.',
    solution: 'SignEasy lets you sign and send documents digitally from your phone or desktop — contracts close in minutes, not days.',
    audience: 'Works for freelancers, small businesses, and sales teams closing deals remotely.',
    cta: 'Try SignEasy',
  },
  'AhaSlides': {
    problem: 'Presentations where the audience just watches passively get low engagement and poor retention.',
    solution: 'AhaSlides adds live polls, quizzes, word clouds, and Q&A directly into your slides — the audience participates in real time.',
    audience: 'Great for teachers, trainers, speakers, and team leads running meetings or workshops.',
    cta: 'Try AhaSlides',
  },
  'Pricefy': {
    problem: 'Tracking competitor prices manually across dozens of products is tedious and always out of date.',
    solution: 'Pricefy monitors competitor pricing automatically and alerts you when prices change — so you can adjust your strategy in real time.',
    audience: 'Useful for ecommerce managers, retailers, and brands competing on price.',
    cta: 'Try Pricefy',
  },
  'UptimeRobot': {
    problem: 'Your website goes down and you don\'t know until a customer complains — by then you\'ve already lost traffic and trust.',
    solution: 'UptimeRobot checks your site every few minutes and alerts you instantly when it goes down. Free tier covers up to 50 monitors.',
    audience: 'Essential for developers, SaaS founders, and anyone running a site that can\'t afford downtime.',
    cta: 'Try UptimeRobot',
  },
  'Seagate One Touch 8TB External Hard Drive Desktop HDD': {
    problem: 'Running out of storage means losing files, deleting projects, or buying cloud plans that add up every month.',
    solution: 'Seagate One Touch 8TB gives you massive local storage for backups, media libraries, and project archives — plug in and go.',
    audience: 'Great for creators, photographers, video editors, and anyone with large file collections.',
    cta: 'Check it out',
  },
  'Warmup Inbox': {
    problem: 'New email accounts and cold outreach domains land in spam because the inbox has no sending reputation.',
    solution: 'Warmup Inbox builds your sender reputation by automating realistic email exchanges — so when you start sending real campaigns, they reach the inbox.',
    audience: 'Built for cold email senders, sales teams, and agencies setting up new outbound domains.',
    cta: 'Try Warmup Inbox',
  },
  'GetResponse': {
    problem: 'Stitching together separate tools for email, landing pages, and automation creates complexity and extra costs.',
    solution: 'GetResponse bundles email marketing, landing pages, webinars, and automation in one platform — from free to full-featured plans.',
    audience: 'Works for creators, small businesses, and marketers who want everything in one place.',
    cta: 'Try GetResponse',
  },
  'GrapeLeads': {
    problem: 'Finding the right B2B prospects takes time, and bad data wastes outreach budget.',
    solution: 'GrapeLeads helps teams find targeted prospect data for outbound sales pipelines, so outreach can start with cleaner lists and better-fit leads.',
    audience: 'Useful for founders, agencies, and sales teams building cold email campaigns.',
    cta: 'Try GrapeLeads',
  },
  'Systeme.io': {
    problem: 'Building an online business means paying for separate tools — funnel builder, email, courses, payments — and connecting them all.',
    solution: 'Systeme.io puts funnels, email marketing, online courses, and payment processing in one platform. Free plan included.',
    audience: 'Built for solopreneurs, coaches, and creators launching digital products without a big tech stack.',
    cta: 'Try Systeme.io',
  },
  'Guideflow': {
    problem: 'Prospects want to try your product before booking a demo, but live demos don\'t scale.',
    solution: 'Guideflow lets you create interactive product walkthroughs that visitors can click through on their own — no call needed.',
    audience: 'Great for SaaS companies, product teams, and sales teams that want to qualify leads before the first meeting.',
    cta: 'Try Guideflow',
  },
  'Joiin': {
    problem: 'Pulling financial reports from multiple platforms into one view means spreadsheets, manual exports, and wasted hours.',
    solution: 'Joiin connects to your accounting tools and consolidates financial data into automated reports and dashboards — no more copy-paste.',
    audience: 'Made for finance teams, CFOs, and agencies managing reporting across multiple clients or entities.',
    cta: 'Try Joiin',
  },
  'Waterpik Cordless Gem Water Flosser 5100': {
    problem: 'String floss is hard to use consistently, and most people skip it — leading to plaque buildup between teeth.',
    solution: 'Waterpik Gem 5100 is a cordless water flosser with a 360-degree rotating tip — cleans between teeth in 60 seconds, no string needed.',
    audience: 'Good for anyone who wants better dental hygiene with less effort.',
    cta: 'Check it out',
  },
  'FIFINE AmpliTank TANK6S Vocal Dynamic Microphone': {
    problem: 'Condenser mics pick up every background noise in your room — keyboard, fan, traffic.',
    solution: 'FIFINE TANK6S is a dynamic XLR microphone that rejects ambient noise and focuses on your voice — clean audio without soundproofing.',
    audience: 'Built for podcasters, streamers, and vocal creators recording in untreated rooms.',
    cta: 'Check it out',
  },
  'GTPLAYER GT800A Gaming Chair with Footrest': {
    problem: 'Sitting for long gaming or work sessions in a bad chair leads to back pain and poor posture.',
    solution: 'GTPLAYER GT800A has a built-in footrest, high back support, and adjustable recline — designed for long hours at the desk.',
    audience: 'Great for gamers, students, and remote workers who spend 6+ hours sitting daily.',
    cta: 'Check it out',
  },
  'HUANUO FlowLift Dual Monitor Stand': {
    problem: 'Two monitors on separate stands eat up desk space and never line up at the right height.',
    solution: 'HUANUO FlowLift holds both monitors on one mount — adjustable height, tilt, and rotation with a single desk clamp.',
    audience: 'Perfect for developers, traders, designers, and anyone running a dual-screen setup.',
    cta: 'Check it out',
  },
  'Writecream': {
    problem: 'Writing cold emails, blog posts, and ad copy from scratch every time is slow and repetitive.',
    solution: 'Writecream generates cold outreach emails, blog content, voiceovers, and images in one workspace — powered by AI, ready to edit and send.',
    audience: 'Useful for marketers, freelancers, and agencies handling multiple content types daily.',
    cta: 'Try Writecream',
  },
  'Audiorista': {
    problem: 'Distributing audio content across platforms means uploading separately, formatting differently, and tracking each one.',
    solution: 'Audiorista handles audio publishing and distribution from one place — upload once, publish everywhere.',
    audience: 'Built for independent podcasters, narrators, and audio creators who want reach without the admin work.',
    cta: 'Try Audiorista',
  },
  'Logitech MX Vertical Wireless Mouse': {
    problem: 'Standard mice force your wrist into an unnatural flat position — after hours of use, you feel it.',
    solution: 'Logitech MX Vertical positions your hand at a 57-degree angle, reducing wrist strain and muscle tension during long work sessions.',
    audience: 'Ideal for developers, designers, writers, and anyone using a mouse 8+ hours a day.',
    cta: 'Check it out',
  },
  'Logitech MX Master 4 Wireless Mouse': {
    problem: 'Most wireless mice feel imprecise, charge slowly, and can\'t switch between devices without a dongle.',
    solution: 'Logitech MX Master 4 has haptic scroll feedback, 8K DPI precision, USB-C quick charge (1 min = 3 hrs), and switches between 3 devices instantly.',
    audience: 'The go-to mouse for power users, designers, and anyone who works across multiple machines.',
    cta: 'Check it out',
  },
  'Synthesia': {
    problem: 'Producing professional videos requires cameras, lighting, editing, and on-screen talent — expensive and slow.',
    solution: 'Synthesia creates AI-generated videos with realistic avatars — type a script, pick an avatar, get a finished video in minutes.',
    audience: 'Made for training teams, marketing departments, and businesses that need video content at scale.',
    cta: 'Try Synthesia',
  },
  'ElevenLabs': {
    problem: 'Hiring voice actors is expensive, slow, and doesn\'t scale when you need audio in multiple languages.',
    solution: 'ElevenLabs generates human-quality AI voices — text-to-speech, voice cloning, and 29+ languages with natural pronunciation.',
    audience: 'Built for video creators, podcasters, app developers, and anyone who needs professional voice audio fast.',
    cta: 'Try ElevenLabs',
  },
}

const NO_DIRECT_LINK = new Set(['reddit', 'quora'])

function buildPost(product, link, platform) {
  const p = PRODUCTS[product]
  if (!p) return null

  let cta
  if (NO_DIRECT_LINK.has(platform)) {
    cta = `Search for "${product}" to learn more.`
  } else {
    cta = `${p.cta}:\n${link}`
  }

  // Reddit/Quora use a different disclosure wording
  const disc = (platform === 'reddit')
    ? 'Affiliate disclosure: this post mentions a product I may earn a commission from.'
    : (platform === 'quora')
    ? 'Affiliate disclosure: this answer mentions a product I may earn a commission from.'
    : D

  return `${disc}\n\n${p.problem}\n\n${p.solution}\n\n${p.audience}\n\n${cta}`
}

async function main() {
  const SHORT_PLATFORMS = ['facebook_page', 'instagram_professional', 'tiktok', 'pinterest', 'youtube', 'reddit', 'quora']

  const { data } = await sb.from('final_copies')
    .select('id, platform, language, body, affiliate_link, products(name)')
    .in('platform', SHORT_PLATFORMS)
    .eq('language', 'en')
    .in('status', ['ready_for_operator_approval', 'operator_approved'])

  let updated = 0, skipped = 0, failed = 0
  for (const row of data) {
    const name = row.products?.name
    if (!PRODUCTS[name]) { skipped++; continue }

    // Extract link from body if affiliate_link is null
    let link = row.affiliate_link
    if (!link) {
      const urls = row.body.match(/https?:\/\/[^\s]+/g)
      if (urls) link = urls[urls.length - 1]
    }
    if (!link && !NO_DIRECT_LINK.has(row.platform)) { skipped++; continue }

    const newBody = buildPost(name, link, row.platform)
    if (!newBody) { skipped++; continue }

    const { error } = await sb.from('final_copies').update({ body: newBody }).eq('id', row.id)
    if (error) { console.error('FAIL ' + name + '/' + row.platform + ': ' + error.message); failed++ }
    else { console.log('OK ' + row.platform + '/' + name); updated++ }
  }
  console.log(`\nUpdated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`)
}
main()
