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

const POSTS = {
  'Reditus': {
    body: `${D}

Managing affiliate programs across dozens of SaaS platforms means juggling separate dashboards, different payout terms, and lost tracking.

Reditus puts all your B2B SaaS affiliate programs in one dashboard — discover programs, apply, and track earnings from a single profile.

Built for affiliate marketers, content creators, and SaaS reviewers who promote multiple tools.

Try Reditus:
https://www.getreditus.com/?red=rubinq`
  },

  'OWC 11-Port Thunderbolt 4 Dock': {
    body: `${D}

Running out of ports on your laptop means dongles, adapters, and a messy desk.

OWC Thunderbolt 4 Dock gives you 11 ports in one hub — Thunderbolt 4, USB-A, SD card, Ethernet, audio — all through a single cable.

Great for Mac and PC power users, video editors, and anyone with a multi-monitor setup.

Check it out:
https://amzn.to/3RY0sm6`
  },

  'Shopify': {
    body: `${D}

Setting up an online store from scratch is slow — hosting, payments, inventory, shipping all need separate solutions.

Shopify handles it all in one platform. Build a store, accept payments, manage inventory, and ship — no coding needed.

Works for solo sellers, small businesses, and anyone launching an ecommerce brand.

Try Shopify:
https://shopify.com`
  },

  'Ad Turbo': {
    body: `${D}

Writing ad copy for Meta and Google campaigns takes hours of testing headlines, descriptions, and variations.

Ad Turbo generates ad creatives with AI — headlines, descriptions, and variations ready to test, in minutes instead of hours.

Useful for marketers, agencies, and media buyers running paid campaigns.

Try Ad Turbo:
https://adturbo.ai/?red=rubinq`
  },

  'Willo': {
    body: `${D}

First-round screening calls eat hours of recruiter time, and candidates have to schedule around work.

Willo lets candidates record video, audio, or text responses on their own time — no scheduling, no live calls needed.

Built for hiring managers, recruiters, and agencies screening high volumes of candidates.

Try Willo:
https://www.willo.ai/?ref=meni`
  },

  'Search Atlas': {
    body: `${D}

Switching between SEO tools for content, rank tracking, and backlinks slows down the workflow.

Search Atlas combines content optimization, rank tracking, and site audits in one platform — fewer tabs, faster decisions.

Useful for SEO professionals, content teams, and marketing agencies.

Try Search Atlas:
https://searchatlas.com/?red=rubinq`
  },

  'Woodpecker': {
    body: `${D}

Cold emails that land in spam waste time, budget, and pipeline opportunities.

Woodpecker automates cold email outreach with built-in deliverability tools — email warmup, bounce detection, and follow-up sequences that actually reach inboxes.

Made for sales teams, agencies, and founders doing outbound prospecting.

Try Woodpecker:
https://woodpecker.co/?red=rubinq`
  },

  'Geo Targetly': {
    body: `${D}

Running a global site but showing the same content to everyone means missed conversions — wrong language, wrong currency, wrong offer.

Geo Targetly redirects visitors based on location — show the right page, currency, or language automatically based on where they are.

Useful for ecommerce stores, SaaS companies, and affiliate marketers with multi-region traffic.

Try Geo Targetly:
https://geotargetly.com/?red=rubinq`
  },

  'OBSBOT Tiny 2 Lite 4K Webcam': {
    body: `${D}

Built-in laptop webcams look grainy, and most external webcams don't track your movement.

OBSBOT Tiny 2 Lite shoots in 4K with AI-powered tracking — it follows you as you move, keeping you centered without manual adjustment.

Great for streamers, remote workers, and content creators who move during calls or recordings.

Check it out:
https://amzn.to/4g6WGkf`
  },

  'Algomo': {
    body: `${D}

Support tickets pile up overnight, and hiring 24/7 agents isn't realistic for most teams.

Algomo is an AI chatbot that handles routine customer questions and captures leads around the clock — no human needed for the common stuff.

Works for SaaS companies, ecommerce stores, and service businesses with repetitive support volume.

Try Algomo:
https://www.algomo.com/?red=rubinq`
  },

  'EmailListVerify': {
    body: `${D}

Sending to bad email addresses kills your sender reputation and lands future campaigns in spam.

EmailListVerify checks your list before you send — catches invalid, disposable, and risky addresses so your deliverability stays clean.

Essential for email marketers, cold outreach teams, and anyone sending to large lists.

Try EmailListVerify:
https://www.emaillistverify.com/?red=rubinq`
  },

  'Philips Norelco Head Shaver Pro 9000 Series': {
    body: `${D}

Shaving your head with a regular razor is slow, uncomfortable, and hard to do evenly.

Philips Head Shaver Pro 9000 is built specifically for head shaving — 360-degree rotating blades, wet/dry use, and skin protection guard.

Made for anyone who shaves their head regularly and wants a faster, irritation-free routine.

Check it out:
https://amzn.to/4uYZqES`
  },

  'Leader Leads': {
    body: `${D}

Building a prospect list manually means hours of research and still no guarantee the data is accurate.

Leader Leads combines verified prospect data with outbound sequencing — find contacts, verify emails, and launch sequences from one platform.

Built for sales teams, agencies, and founders running cold outreach campaigns.

Try Leader Leads:
https://leader.net/?red=rubinq`
  },

  'Philips Sonicare 6500 Series Electric Toothbrush': {
    body: `${D}

Manual brushing misses spots, and most people don't brush long enough or with the right pressure.

Philips Sonicare 6500 has a pressure sensor that alerts you when you're pushing too hard, 3 cleaning modes, and a battery that lasts weeks.

Good for anyone upgrading from a manual toothbrush or replacing an old electric one.

Check it out:
https://amzn.to/4uuDPTZ`
  },

  'SignEasy': {
    body: `${D}

Printing, signing, scanning, and emailing contracts back is a waste of time in 2026.

SignEasy lets you sign and send documents digitally from your phone or desktop — contracts close in minutes, not days.

Works for freelancers, small businesses, and sales teams closing deals remotely.

Try SignEasy:
https://signeasy.com/?red=rubinq`
  },

  'AhaSlides': {
    body: `${D}

Presentations where the audience just watches passively get low engagement and poor retention.

AhaSlides adds live polls, quizzes, word clouds, and Q&A directly into your slides — the audience participates in real time.

Great for teachers, trainers, speakers, and team leads running meetings or workshops.

Try AhaSlides:
https://ahaslides.com/?red=rubinq&utm_source=rubinq&utm_medium=revshare&utm_affiliate_network=reditus`
  },

  'Pricefy': {
    body: `${D}

Tracking competitor prices manually across dozens of products is tedious and always out of date.

Pricefy monitors competitor pricing automatically and alerts you when prices change — so you can adjust your strategy in real time.

Useful for ecommerce managers, retailers, and brands competing on price.

Try Pricefy:
https://www.pricefy.io/?red=rubinq`
  },

  'UptimeRobot': {
    body: `${D}

Your website goes down and you don't know until a customer complains — by then you've already lost traffic and trust.

UptimeRobot checks your site every few minutes and alerts you instantly when it goes down. Free tier covers up to 50 monitors.

Essential for developers, SaaS founders, and anyone running a site that can't afford downtime.

Try UptimeRobot:
https://uptimerobot.com/?red=rubinq`
  },

  'Seagate One Touch 8TB External Hard Drive Desktop HDD': {
    body: `${D}

Running out of storage means losing files, deleting projects, or buying cloud plans that add up every month.

Seagate One Touch 8TB gives you massive local storage for backups, media libraries, and project archives — plug in and go.

Great for creators, photographers, video editors, and anyone with large file collections.

Check it out:
https://amzn.to/4valYTa`
  },

  'Warmup Inbox': {
    body: `${D}

New email accounts and cold outreach domains land in spam because the inbox has no sending reputation.

Warmup Inbox builds your sender reputation by automating realistic email exchanges — so when you start sending real campaigns, they reach the inbox.

Built for cold email senders, sales teams, and agencies setting up new outbound domains.

Try Warmup Inbox:
https://www.warmupinbox.com/?red=rubinq`
  },

  'GetResponse': {
    body: `${D}

Stitching together separate tools for email, landing pages, and automation creates complexity and extra costs.

GetResponse bundles email marketing, landing pages, webinars, and automation in one platform — from free to full-featured plans.

Works for creators, small businesses, and marketers who want everything in one place.

Try GetResponse:
https://try.getresponsetoday.com/lnnr40k51ywy`
  },

  'GrapeLeads': {
    body: `${D}

Finding the right B2B prospects takes time, and bad data wastes outreach budget.

GrapeLeads helps teams find targeted prospect data for outbound sales pipelines, so outreach can start with cleaner lists and better-fit leads.

Useful for founders, agencies, and sales teams building cold email campaigns.

Try GrapeLeads:
https://grapeleads.com/?gr_pk=mKQ0`
  },

  'Systeme.io': {
    body: `${D}

Building an online business means paying for separate tools — funnel builder, email, courses, payments — and connecting them all.

Systeme.io puts funnels, email marketing, online courses, and payment processing in one platform. Free plan included.

Built for solopreneurs, coaches, and creators launching digital products without a big tech stack.

Try Systeme.io:
https://systeme.io/?sa=sa0272930337c3024fcafe085f6b63e73bbc0e3365`
  },

  'Guideflow': {
    body: `${D}

Prospects want to try your product before booking a demo, but live demos don't scale.

Guideflow lets you create interactive product walkthroughs that visitors can click through on their own — no call needed.

Great for SaaS companies, product teams, and sales teams that want to qualify leads before the first meeting.

Try Guideflow:
https://guideflow.com/?red=rubinq`
  },

  'Joiin': {
    body: `${D}

Pulling financial reports from multiple platforms into one view means spreadsheets, manual exports, and wasted hours.

Joiin connects to your accounting tools and consolidates financial data into automated reports and dashboards — no more copy-paste.

Made for finance teams, CFOs, and agencies managing reporting across multiple clients or entities.

Try Joiin:
https://joiin.co/?red=rubinq&utm_source=rubinq&utm_medium=revshare&utm_affiliate_network=reditus`
  },

  'Waterpik Cordless Gem Water Flosser 5100': {
    body: `${D}

String floss is hard to use consistently, and most people skip it — leading to plaque buildup between teeth.

Waterpik Gem 5100 is a cordless water flosser with a 360-degree rotating tip — cleans between teeth in 60 seconds, no string needed.

Good for anyone who wants better dental hygiene with less effort.

Check it out:
https://amzn.to/4dYyf7m`
  },

  'FIFINE AmpliTank TANK6S Vocal Dynamic Microphone': {
    body: `${D}

Condenser mics pick up every background noise in your room — keyboard, fan, traffic.

FIFINE TANK6S is a dynamic XLR microphone that rejects ambient noise and focuses on your voice — clean audio without soundproofing.

Built for podcasters, streamers, and vocal creators recording in untreated rooms.

Check it out:
https://amzn.to/4ohfkrP`
  },

  'GTPLAYER GT800A Gaming Chair with Footrest': {
    body: `${D}

Sitting for long gaming or work sessions in a bad chair leads to back pain and poor posture.

GTPLAYER GT800A has a built-in footrest, high back support, and adjustable recline — designed for long hours at the desk.

Great for gamers, students, and remote workers who spend 6+ hours sitting daily.

Check it out:
https://www.amazon.com/dp/B0FVXRZJ12?tag=rubinqs-20`
  },

  'HUANUO FlowLift Dual Monitor Stand': {
    body: `${D}

Two monitors on separate stands eat up desk space and never line up at the right height.

HUANUO FlowLift holds both monitors on one mount — adjustable height, tilt, and rotation with a single desk clamp.

Perfect for developers, traders, designers, and anyone running a dual-screen setup.

Check it out:
https://www.amazon.com/dp/B07T5SY43L?tag=rubinqs-20`
  },

  'Writecream': {
    body: `${D}

Writing cold emails, blog posts, and ad copy from scratch every time is slow and repetitive.

Writecream generates cold outreach emails, blog content, voiceovers, and images in one workspace — powered by AI, ready to edit and send.

Useful for marketers, freelancers, and agencies handling multiple content types daily.

Try Writecream:
https://www.writecream.com/?gr_pk=Qg8m`
  },

  'Audiorista': {
    body: `${D}

Distributing audio content across platforms means uploading separately, formatting differently, and tracking each one.

Audiorista handles audio publishing and distribution from one place — upload once, publish everywhere.

Built for independent podcasters, narrators, and audio creators who want reach without the admin work.

Try Audiorista:
https://www.audiorista.com/?red=rubinq`
  },

  'Logitech MX Vertical Wireless Mouse': {
    body: `${D}

Standard mice force your wrist into an unnatural flat position — after hours of use, you feel it.

Logitech MX Vertical positions your hand at a 57-degree angle, reducing wrist strain and muscle tension during long work sessions.

Ideal for developers, designers, writers, and anyone using a mouse 8+ hours a day.

Check it out:
https://www.amazon.com/dp/B07FNJB8TT?tag=rubinqs-20`
  },

  'Logitech MX Master 4 Wireless Mouse': {
    body: `${D}

Most wireless mice feel imprecise, charge slowly, and can't switch between devices without a dongle.

Logitech MX Master 4 has haptic scroll feedback, 8K DPI precision, USB-C quick charge (1 min = 3 hrs), and switches between 3 devices instantly.

The go-to mouse for power users, designers, and anyone who works across multiple machines.

Check it out:
https://amzn.to/3Qm6GLY`
  },

  'Synthesia': {
    body: `${D}

Producing professional videos requires cameras, lighting, editing, and on-screen talent — expensive and slow.

Synthesia creates AI-generated videos with realistic avatars — type a script, pick an avatar, get a finished video in minutes.

Made for training teams, marketing departments, and businesses that need video content at scale.

Try Synthesia:
https://www.synthesia.io/?via=meni`
  },

  'ElevenLabs': {
    body: `${D}

Hiring voice actors is expensive, slow, and doesn't scale when you need audio in multiple languages.

ElevenLabs generates human-quality AI voices — text-to-speech, voice cloning, and 29+ languages with natural pronunciation.

Built for video creators, podcasters, app developers, and anyone who needs professional voice audio fast.

Try ElevenLabs:
https://try.elevenlabs.io/bcwxftu128a9`
  },
}

async function main() {
  const { data } = await sb.from('final_copies')
    .select('id, platform, language, body, products(name)')
    .eq('platform', 'x_twitter')
    .eq('language', 'en')
    .in('status', ['ready_for_operator_approval', 'operator_approved'])

  let updated = 0
  let skipped = 0
  for (const p of data) {
    const name = p.products?.name
    if (!POSTS[name]) { console.log('SKIP (no template): ' + name); skipped++; continue }
    const newBody = POSTS[name].body
    const { error } = await sb.from('final_copies').update({ body: newBody }).eq('id', p.id)
    if (error) console.error('FAIL ' + name + ': ' + error.message)
    else { console.log('OK ' + name); updated++ }
  }
  console.log('\nUpdated: ' + updated + ', Skipped: ' + skipped)
}
main()
