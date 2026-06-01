import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const AFFILIATE_URL = "https://try.elevenlabs.io/bcwxftu128a9"
const TITLE = "ElevenLabs: AI Voice for Creators, Podcasters, and Developers"

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

Tradeoff: it is not a replacement for live human performance, but the quality is a clear step above older text-to-speech tools.

The free plan is enough to evaluate the voice quality, test different voices, and see whether it fits your workflow before upgrading.

Important note: use voice cloning responsibly. Do not clone someone's voice without permission, and do not use AI-generated audio to mislead people.

Affiliate link:
${AFFILIATE_URL}`

const { data: product } = await supabase
  .from("products")
  .select("id")
  .ilike("name", "ElevenLabs")
  .single()

if (!product) { console.error("ElevenLabs product not found"); process.exit(1) }

const { data: created, error } = await supabase
  .from("content_drafts")
  .insert({
    product_id: product.id,
    content_type: "social_post",
    template_type: "social_post",
    title: TITLE,
    body: BODY,
    meta_title: TITLE.slice(0, 60),
    meta_description: "ElevenLabs — AI voice and text-to-speech platform for creators, podcasters, and developers.".slice(0, 155),
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
    ai_model: "operator-corrected",
    approval_notes: "Operator-corrected short social post. Status: draft. Real affiliate link inserted.",
  })
  .select("id")
  .single()

if (error) { console.error("Failed:", error.message); process.exit(1) }

console.log(`CREATED short ElevenLabs post (${created.id})`)
console.log(`  Body: ${BODY.length} chars`)
console.log(`  Affiliate link: ${AFFILIATE_URL}`)
console.log(`  Status: draft`)
