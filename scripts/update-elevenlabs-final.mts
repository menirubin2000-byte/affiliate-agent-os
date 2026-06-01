import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const AFFILIATE_URL = "https://try.elevenlabs.io/bcwxftu128a9"

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

const { error } = await supabase
  .from("content_drafts")
  .update({
    title: "ElevenLabs Review",
    body: BODY,
    meta_title: "ElevenLabs Review",
    meta_description: "ElevenLabs — AI voice and text-to-speech for creators, podcasters, and developers.",
    target_keyword: "elevenlabs review",
    quality_checks: {
      has_disclosure: true, has_clear_cta: true, has_target_keyword: true,
      has_meta_title: true, has_meta_description: true,
      avoids_fake_claims: true, has_required_structure: true,
    },
    status: "draft",
    approval_notes: "Latest operator-corrected version. Waiting for human approval.",
  })
  .eq("id", "4750495b-41d1-4fb0-834d-c342829ff12e")

if (error) { console.error(error.message); process.exit(1) }

console.log("UPDATED single ElevenLabs draft with latest content.")
console.log("Approve at: http://localhost:3000/dashboard/he/approve")
