require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg');
const crypto = require('crypto');

const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false }
});

const LINK = 'https://www.willo.ai/?ref=meni';

const POSTS = {
  medium: {
    title: 'Willo Review: AI-Powered Video Interview Platform for Hiring Teams',
    body: `*Affiliate disclosure: This article includes an affiliate link. If you sign up through the link, I may earn a commission at no extra cost to you.*

## What Willo Is

Willo is an asynchronous video interview platform that lets hiring teams screen candidates without scheduling live calls. Candidates record video answers on their own time, and recruiters review them when it suits them.

## Key Features

- One-way video interviews — candidates record answers to pre-set questions
- Customizable question sets per role
- Team collaboration — share and rate responses with hiring team
- Automated candidate invitations
- Integration with ATS platforms
- Mobile-friendly for candidates
- AI-assisted screening tools

## Who It Is For

Willo is built for hiring managers, recruiters, and HR teams who screen many candidates and want to save time on early-stage interviews. It works well for remote hiring, high-volume recruitment, and teams across time zones.

## Who It Is Not For

Companies that prefer live, conversational interviews for every candidate, or very small businesses that hire rarely and don't need a structured screening tool.

## Pros

- Saves hours of scheduling for initial screening rounds
- Candidates can record at their convenience — better candidate experience
- Easy to share candidate responses with the team
- Works across time zones without coordination

## Cons

- One-way interviews may feel impersonal to some candidates
- Best value comes with higher-volume hiring
- Some candidates may be uncomfortable recording themselves

## Pricing

Willo offers different tiers based on team size and features. Check the official website for current pricing.

## Practical Take

If your team spends too much time scheduling screening calls, Willo can cut that down significantly. The async format means candidates and recruiters both save time. Worth trying if you hire regularly.

[Try Willo here](${LINK}&utm_source=medium&utm_medium=article&utm_campaign=willo_review)`
  },
  linkedin: {
    title: 'Willo Review: Async Video Interviews for Faster Hiring',
    body: `*Affiliate disclosure: This post includes an affiliate link.*

Spending hours scheduling screening calls? Willo might help.

Willo is an async video interview platform — candidates record answers on their own time, you review when it suits you.

Why it works:
→ No scheduling back-and-forth
→ Candidates record at their convenience
→ Share responses with your hiring team
→ Works across time zones
→ AI-assisted screening

Best for: Recruiters and hiring managers doing high-volume screening.

Earn 20% commission as an affiliate — the program is straightforward.

[Try Willo here](${LINK}&utm_source=linkedin&utm_medium=post&utm_campaign=willo_review)`
  },
  substack: {
    title: 'Willo Review: Should You Use Async Video Interviews?',
    body: `*Affiliate disclosure: This article includes an affiliate link. If you sign up through the link, I may earn a commission at no extra cost to you.*

## The Problem

Scheduling screening interviews is a time sink. Coordinating calendars, rescheduling no-shows, spending 30 minutes per candidate for basic questions.

## The Solution

Willo lets you set up video interview questions once. Candidates record their answers whenever they want. You review the responses at your own pace.

## What I Like

- **Time savings** — skip the scheduling dance entirely
- **Better for candidates** — they record when they're ready, not when you're available
- **Team collaboration** — share candidate responses and rate together
- **Works globally** — no time zone coordination needed

## What Could Be Better

- Some candidates find one-way interviews impersonal
- Best ROI when hiring at volume
- Recording can be stressful for camera-shy candidates

## Bottom Line

If you're screening more than a few candidates per month, async video interviews make sense. Willo does this well with a clean interface and useful team features.

[Try Willo here](${LINK}&utm_source=substack&utm_medium=newsletter&utm_campaign=willo_review)`
  },
  tiktok: {
    title: 'Willo — Skip Scheduling, Hire Faster',
    body: `*Disclosure: affiliate link included.*

Hook: Tired of scheduling 50 screening calls a week?

Willo lets candidates record video answers on THEIR time.
You review when YOU have time.

No scheduling.
No time zone headaches.
No 30-minute calls for basic questions.

Just set your questions → send the link → watch the answers.

Perfect for recruiters and hiring teams.

Link in bio: ${LINK}&utm_source=tiktok&utm_medium=video&utm_campaign=willo_review`
  },
  quora: {
    title: 'What are good tools for screening job candidates remotely?',
    body: `*Disclosure: This answer includes an affiliate link.*

For remote candidate screening, async video interview platforms save a lot of time. One I've been looking at is Willo.

How it works:
1. You create a set of interview questions
2. Send candidates a link
3. They record video answers on their own time
4. You review the responses whenever you want

The main advantage is eliminating the scheduling problem. Instead of coordinating calendars with dozens of candidates, you just send a link and review responses in batch.

Pros:
- No scheduling needed
- Candidates can record when they're comfortable
- Team can review and rate together
- Works across time zones

Cons:
- Some candidates prefer live conversation
- One-way format can feel less personal
- Best value at higher hiring volumes

Worth trying if you screen candidates regularly.

[Check Willo here](${LINK}&utm_source=quora&utm_medium=answer&utm_campaign=willo_review)`
  },
  reddit: {
    title: 'Looked into Willo for async video interviews — sharing what I found',
    body: `*Disclosure: affiliate link included below.*

Been evaluating async video interview tools for candidate screening. Tested Willo and wanted to share.

**What it does:** You create interview questions, send candidates a link, they record video answers on their own time. You review when you want.

**What's good:**
- Eliminates scheduling completely for screening rounds
- Candidates record when they're ready (better experience)
- Team can review and discuss responses together
- Clean, simple interface
- Works well across time zones

**What's not great:**
- Some candidates don't love one-way video
- Makes most sense when hiring at volume
- No replacement for final-round live interviews

**Who should look at this:**
Recruiters, HR teams, or hiring managers who do regular screening. If you're hiring one person a year, probably overkill.

**Affiliate note:** They have a 20% commission program if you're into that.

Link: [Willo](${LINK}&utm_source=reddit&utm_medium=post&utm_campaign=willo_review)`
  }
};

async function main() {
  await c.connect();

  // Get Willo product
  const product = await c.query("SELECT id FROM products WHERE name = 'Willo'");
  if (!product.rows.length) {
    console.error('Willo not in products table');
    await c.end();
    return;
  }
  const productId = product.rows[0].id;

  // Update or create affiliate program
  const existingAp = await c.query("SELECT id FROM affiliate_programs WHERE product_id = $1", [productId]);
  let apId;
  if (existingAp.rows.length) {
    await c.query("UPDATE affiliate_programs SET affiliate_link = $1, status = 'link_ready', network = 'Tolt', updated_at = now() WHERE product_id = $2", [LINK, productId]);
    apId = existingAp.rows[0].id;
    console.log('Updated affiliate program');
  } else {
    const newAp = await c.query("INSERT INTO affiliate_programs (product_id, program_name, network, status, affiliate_link) VALUES ($1, 'Willo Affiliate', 'Tolt', 'link_ready', $2) RETURNING id", [productId, LINK]);
    apId = newAp.rows[0].id;
    console.log('Created affiliate program');
  }

  // Check schema of source_contents
  const cols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='source_contents' ORDER BY ordinal_position");
  console.log('source_contents columns:', cols.rows.map(r => r.column_name).join(', '));

  // Check schema of platform_adaptations
  const paCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='platform_adaptations' ORDER BY ordinal_position");
  console.log('platform_adaptations columns:', paCols.rows.map(r => r.column_name).join(', '));

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
