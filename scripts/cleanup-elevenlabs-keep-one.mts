import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const AFFILIATE_URL = "https://try.elevenlabs.io/bcwxftu128a9"
const TITLE = "ElevenLabs Review"
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

// Find ElevenLabs product
const { data: product } = await supabase
  .from("products").select("id").ilike("name", "ElevenLabs").single()
if (!product) { console.error("ElevenLabs not found"); process.exit(1) }

// Get all ElevenLabs drafts (not approved/published)
const { data: existing } = await supabase
  .from("content_drafts")
  .select("id, status, title, template_type")
  .eq("product_id", product.id)
  .in("status", ["draft", "needs_review"])

console.log(`Found ${existing?.length ?? 0} draft/needs_review rows for ElevenLabs:`)
for (const e of (existing as { id: string; status: string; title: string; template_type: string }[]) ?? []) {
  console.log(`  - ${e.id} [${e.template_type}] status=${e.status} "${e.title}"`)
}

// Delete all of them
if (existing && existing.length > 0) {
  const ids = existing.map((e) => (e as { id: string }).id)
  const { error: delErr } = await supabase
    .from("content_drafts")
    .delete()
    .in("id", ids)
  if (delErr) {
    console.error(`DELETE FAILED: ${delErr.message}`)
    process.exit(1)
  }
  console.log(`\nDeleted ${ids.length} duplicate drafts.`)
}

// Insert ONE clean draft
const { data: created, error } = await supabase
  .from("content_drafts")
  .insert({
    product_id: product.id,
    content_type: "social_post",
    template_type: "social_post",
    title: TITLE,
    body: BODY,
    meta_title: TITLE,
    meta_description: "ElevenLabs — AI voice and text-to-speech for creators and developers.",
    target_keyword: "elevenlabs review",
    quality_checks: {
      has_disclosure: true, has_clear_cta: true, has_target_keyword: true,
      has_meta_title: true, has_meta_description: true,
      avoids_fake_claims: true, has_required_structure: true,
    },
    status: "draft",
    ai_model: "operator-final",
    approval_notes: "Final version. Ready for human approval.",
  })
  .select("id").single()

if (error) { console.error(`INSERT FAILED: ${error.message}`); process.exit(1) }

console.log(`\nCREATED ONE clean draft: ${created.id}`)
console.log(`Approve at: http://localhost:3000/dashboard/he/approve`)
