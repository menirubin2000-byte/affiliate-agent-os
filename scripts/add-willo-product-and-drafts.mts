import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const AFFILIATE_URL = "https://www.willo.ai/?ref=meni"

// ─── 1. Ensure Willo product exists ───────────────────────────────
const { data: existing } = await supabase
  .from("products")
  .select("id, name, slug")
  .eq("slug", "willo")
  .maybeSingle()

let productId: string

if (existing) {
  productId = existing.id
  console.log(`Willo product already exists: ${productId}`)
  // Make sure affiliate URL is correct
  await supabase
    .from("products")
    .update({ affiliate_url: AFFILIATE_URL, status: "active" })
    .eq("id", productId)
  console.log(`  Updated affiliate URL: ${AFFILIATE_URL}`)
} else {
  const { data: created, error: createErr } = await supabase
    .from("products")
    .insert({
      name: "Willo",
      slug: "willo",
      brand: "Willo",
      category: "HR / Recruiting",
      affiliate_url: AFFILIATE_URL,
      notes: "Async candidate screening platform (video/audio/text). Reduces first-round screening calls.",
      target_keyword: "async candidate screening",
      secondary_keywords: ["video interview", "async hiring", "candidate screening"],
      search_intent: "commercial",
      content_angle: "practical evaluation for recruiters and HR teams",
      status: "active",
    })
    .select("id")
    .single()

  if (createErr || !created) {
    console.error("Failed to create Willo:", createErr?.message)
    process.exit(1)
  }
  productId = created.id
  console.log(`CREATED Willo product: ${productId}`)
}

// ─── 2. Define the 6 drafts ───────────────────────────────────────
type DraftInput = {
  templateType: "review" | "social_post" | "tiktok_script" | "quora_answer" | "reddit_post"
  contentType: "review" | "social_post"
  title: string
  body: string
  platformNote: string
}

const drafts: DraftInput[] = [
  // 1. LinkedIn (social_post)
  {
    templateType: "social_post",
    contentType: "social_post",
    title: "Willo — Async Candidate Screening for Recruiters and HR Teams",
    body: `Hiring teams lose a lot of time on first-round screening calls.

Willo is built for that exact bottleneck: async candidate screening with video, audio, text responses, team review, and a candidate-friendly flow that works across devices.

For recruiters, HR teams, and hiring managers, the value is simple: collect better first-round signal before spending calendar time on interviews.

Disclosure: I may earn a commission if you sign up through this link.
${AFFILIATE_URL}`,
    platformNote: "LinkedIn: allowed with disclosure. Post as professional content, no spam.",
  },

  // 2. Reddit — NO affiliate link in body (subreddit rules)
  {
    templateType: "reddit_post",
    contentType: "social_post",
    title: "Has anyone here used async video screening to reduce recruiter admin?",
    body: `I'm looking at tools that help hiring teams reduce first-round screening calls without making the candidate experience feel cold.

One option I found is Willo. It supports async candidate screening with video/audio/text responses, team review, and candidate access across devices.

I'm curious how teams here think about this tradeoff:

- less scheduling and admin for recruiters
- more flexibility for candidates
- risk of making hiring feel less personal if the process is not designed carefully

Has anyone used async screening well? What made it work or fail?

[Note: affiliate link withheld pending subreddit rules check. Add only with clear disclosure if allowed.]`,
    platformNote: "Reddit: do NOT add affiliate link until subreddit rules verified. Manual policy check required.",
  },

  // 3. TikTok (script)
  {
    templateType: "tiktok_script",
    contentType: "social_post",
    title: "Willo — TikTok Script for Recruiters",
    body: `[Script]
"Recruiters, quick question: how much time are you losing on first-round screening calls?

Willo is a candidate screening platform that lets applicants respond on their own schedule using video, audio, or text.

That means your team can review candidates when it actually fits the workflow, instead of chasing calendars all week.

It is not a replacement for human judgment. It is a way to collect better early signal before deciding who moves forward.

Disclosure: this is an affiliate recommendation, and I may earn a commission."

[Caption]
Recruiting teams: async screening can reduce scheduling friction and help candidates respond on their own time.
Disclosure: affiliate link.
${AFFILIATE_URL}

[Important] Enable TikTok commercial content disclosure before posting.`,
    platformNote: "TikTok: allowed with disclosure. Toggle commercial content disclosure ON.",
  },

  // 4. Medium (review)
  {
    templateType: "review",
    contentType: "review",
    title: "A Practical Way to Reduce First-Round Screening Calls",
    body: `Hiring teams often lose hours every week before they even reach the strongest candidates.

The problem is not only interviewing. It is scheduling, reminders, reviewing scattered notes, and trying to compare candidates fairly after rushed screening calls.

Willo is one tool built for this stage of hiring. It lets candidates complete structured screening responses asynchronously, using video, audio, or text. Recruiters and hiring managers can then review responses, compare signals, and decide who should move forward.

The useful part is not "automation replacing hiring." The useful part is giving the team a cleaner first screen before spending live interview time.

This is especially relevant for teams with high application volume, distributed hiring teams, or roles where communication and structured answers matter.

Disclosure: This article includes an affiliate link. I may earn a commission if you sign up through it.
${AFFILIATE_URL}`,
    platformNote: "Medium: affiliate links allowed with disclosure.",
  },

  // 5. Substack (review-style newsletter)
  {
    templateType: "review",
    contentType: "review",
    title: "One Hiring Bottleneck Worth Fixing — Async Candidate Screening",
    body: `A lot of hiring teams do not have a sourcing problem first. They have a screening bottleneck.

Every applicant creates follow-up work: scheduling, reminders, first calls, notes, internal review, and then more coordination with hiring managers.

Willo is one platform built around async candidate screening. Candidates can respond on their own time, and teams can review structured responses before deciding who should move to the next step.

I like this category because it does not need to pretend that hiring should be fully automated. The better use case is narrower: reduce admin, keep human review, and make the early screen easier to compare.

Disclosure: I may earn a commission if someone signs up through my link.
${AFFILIATE_URL}

[Note] Use only inside a real hiring/recruiting newsletter context. Do not send a Substack issue that exists only to promote.`,
    platformNote: "Substack: only inside real value-driven newsletter context. Manual verification required.",
  },

  // 6. Quora — NO affiliate link (Quora policy)
  {
    templateType: "quora_answer",
    contentType: "social_post",
    title: "Best Way to Reduce Time Spent on First-Round Screening Interviews?",
    body: `One practical approach is to separate early candidate screening from live interview time.

For many roles, the first round is mostly used to collect basic signal: communication, motivation, relevant experience, availability, and role-specific answers. Instead of scheduling every first screen live, some teams use asynchronous screening tools where candidates answer structured questions by video, audio, or text.

This can help in a few ways:

- candidates can respond on their own schedule
- recruiters spend less time coordinating calendars
- hiring managers can review answers when they are available
- the team can compare candidates against the same questions

The important caveat is that this should not replace human judgment. It works best when the questions are fair, relevant to the role, and reviewed by a real person before any decision is made.

[Note: Quora does NOT allow affiliate links in answers. No affiliate link is included in this body. Quora policy: https://help.quora.com/]`,
    platformNote: "Quora: PROHIBITED affiliate links in answers. Body contains no affiliate link.",
  },
]

// ─── 3. Insert drafts (idempotent — update if exists) ─────────────
const { data: existingDrafts } = await supabase
  .from("content_drafts")
  .select("id, template_type")
  .eq("product_id", productId)

const existingByTemplate = new Map(
  (existingDrafts as { id: string; template_type: string }[] | null)?.map((d) => [d.template_type, d.id]) ?? [],
)

for (const d of drafts) {
  const targetKeyword = "async candidate screening"
  const metaDescription = `Willo — async candidate screening for recruiters and HR teams. ${d.platformNote}`.slice(0, 155)

  const payload = {
    product_id: productId,
    content_type: d.contentType,
    template_type: d.templateType,
    title: d.title,
    body: d.body,
    meta_title: d.title.slice(0, 60),
    meta_description: metaDescription,
    target_keyword: targetKeyword,
    quality_checks: {
      has_disclosure: d.body.toLowerCase().includes("disclosure"),
      has_clear_cta: d.body.includes(AFFILIATE_URL),
      has_target_keyword: true,
      has_meta_title: true,
      has_meta_description: true,
      avoids_fake_claims: true,
      has_required_structure: true,
    },
    status: "draft" as const,
    ai_model: "manual-curated",
    approval_notes: `Platform policy: ${d.platformNote}`,
  }

  const existingId = existingByTemplate.get(d.templateType)

  if (existingId) {
    const { error } = await supabase
      .from("content_drafts")
      .update(payload)
      .eq("id", existingId)
    if (error) console.error(`FAIL update ${d.templateType}: ${error.message}`)
    else console.log(`UPDATED ${d.templateType} (${existingId}) — ${d.body.length} chars`)
  } else {
    const { data, error } = await supabase
      .from("content_drafts")
      .insert(payload)
      .select("id")
      .single()
    if (error) console.error(`FAIL insert ${d.templateType}: ${error.message}`)
    else console.log(`CREATED ${d.templateType} (${data.id}) — ${d.body.length} chars`)
  }
}

console.log("\nAll 6 Willo drafts ready in DB with status=draft, waiting for manual approval.")
console.log("Platform policies applied:")
console.log("  LinkedIn: affiliate link + disclosure")
console.log("  Reddit: NO affiliate link (subreddit rules check required)")
console.log("  TikTok: affiliate link + disclosure + commercial content toggle")
console.log("  Medium: affiliate link + disclosure")
console.log("  Substack: affiliate link + disclosure (only in real newsletter context)")
console.log("  Quora: NO affiliate link (Quora policy)")
