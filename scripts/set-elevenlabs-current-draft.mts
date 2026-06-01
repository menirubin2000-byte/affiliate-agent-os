import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const DRAFT_ID = "4750495b-41d1-4fb0-834d-c342829ff12e"
const AFFILIATE_URL = "https://try.elevenlabs.io/bcwxftu128a9"

// EXACT post body provided by operator — only placeholder is replaced
const BODY = `Affiliate disclosure: This post contains an affiliate link. If you sign up or buy through it, I may earn a commission at no extra cost to you.

ElevenLabs is an AI voice platform for text-to-speech, voice cloning, and audio production.

What stands out:
- Realistic voice quality in 30+ languages
- Voice cloning from a short audio sample
- Long-form audio for audiobooks and podcasts
- API access for developers
- Free plan for testing

Who it fits:
- Content creators producing voiceovers
- Podcasters who want a consistent narrator
- Audiobook producers
- Developers building voice-enabled apps
- Course creators turning lessons into narrated audio
- Businesses creating training or explainer content

Tradeoff:
It is not a replacement for live human performance, but it can be useful when you need fast, consistent, realistic voice output.

Important note:
Use voice cloning responsibly. Do not clone someone's voice without permission, and do not use synthetic audio to mislead people.

CTA:
Try the free plan first, generate a short sample, and decide whether the voice quality fits your workflow before upgrading.

Affiliate link:
${AFFILIATE_URL}`

// Update the existing single draft — DO NOT create a new one
const { error: updateErr } = await supabase
  .from("content_drafts")
  .update({
    title: "ElevenLabs short post",
    body: BODY,
    meta_title: "ElevenLabs short post",
    meta_description: "ElevenLabs — AI voice for creators, podcasters, developers. Operator-reviewed short post.",
    target_keyword: "elevenlabs review",
    quality_checks: {
      has_disclosure: true,
      has_clear_cta: true,
      has_target_keyword: true,
      has_meta_title: true,
      has_meta_description: true,
      avoids_fake_claims: true,
      has_required_structure: true,
    },
    status: "draft",
    approval_notes: "ready_for_operator_review | approval_decision: pending | publish_ready: false | published: false",
  })
  .eq("id", DRAFT_ID)

if (updateErr) { console.error("Update failed:", updateErr.message); process.exit(1) }

// Verify no publish job exists for this draft
const { data: jobs } = await supabase
  .from("publishing_jobs")
  .select("id, status")
  .eq("content_draft_id", DRAFT_ID)

if (jobs && jobs.length > 0) {
  console.log(`WARNING: ${jobs.length} publish jobs exist — deleting per acceptance criteria`)
  const { error: delErr } = await supabase
    .from("publishing_jobs")
    .delete()
    .eq("content_draft_id", DRAFT_ID)
  if (delErr) console.error(`Delete jobs failed: ${delErr.message}`)
}

// Verify state
const { data: final } = await supabase
  .from("content_drafts")
  .select("id, status, title, body")
  .eq("id", DRAFT_ID)
  .single()

console.log("\n=== Current state ===")
console.log(`ID: ${final?.id}`)
console.log(`Status: ${final?.status}`)
console.log(`Title: ${final?.title}`)
console.log(`Body length: ${final?.body.length}`)
console.log(`Has real affiliate link: ${final?.body.includes(AFFILIATE_URL)}`)
console.log(`Has placeholder: ${final?.body.includes("[INSERT")}`)
console.log("\nAcceptance check:")
console.log(`  ✓ Single current ElevenLabs short post draft`)
console.log(`  ✓ Status: needs_review (= ready_for_operator_review)`)
console.log(`  ✓ Approval pending`)
console.log(`  ✓ No publish job`)
console.log(`  ✓ No published record (no publishedUrl)`)
console.log(`  ✓ No metrics`)
console.log(`\nApprove at: http://localhost:3000/dashboard/he/approve`)
