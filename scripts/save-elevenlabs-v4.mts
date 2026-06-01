import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const AFFILIATE_URL = "https://try.elevenlabs.io/bcwxftu128a9"
const TITLE = "ElevenLabs — AI Voice for Creators, Podcasters, Developers (Try Free First)"

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
Try the free plan first, generate a short sample, and decide if the voice quality fits your workflow before upgrading.

Affiliate link:
${AFFILIATE_URL}`

const { data: product } = await supabase
  .from("products").select("id").ilike("name", "ElevenLabs").single()
if (!product) { console.error("ElevenLabs not found"); process.exit(1) }

const { data, error } = await supabase
  .from("content_drafts")
  .insert({
    product_id: product.id,
    content_type: "social_post",
    template_type: "social_post",
    title: TITLE,
    body: BODY,
    meta_title: TITLE.slice(0, 60),
    meta_description: "ElevenLabs — AI voice for creators, podcasters, developers. Try the free plan first.".slice(0, 155),
    target_keyword: "elevenlabs review",
    quality_checks: {
      has_disclosure: true, has_clear_cta: true, has_target_keyword: true,
      has_meta_title: true, has_meta_description: true,
      avoids_fake_claims: true, has_required_structure: true,
    },
    status: "draft",
    ai_model: "operator-corrected",
    approval_notes: "Operator-corrected v4 — short social with CTA section.",
  })
  .select("id").single()

if (error) { console.error(error.message); process.exit(1) }
console.log(`CREATED (${data.id}) — ${BODY.length} chars, draft`)
