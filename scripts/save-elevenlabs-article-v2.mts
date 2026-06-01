import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const AFFILIATE_URL = "https://try.elevenlabs.io/bcwxftu128a9"
const TITLE = "ElevenLabs Review: AI Voice and Text-to-Speech for Creators and Businesses"

const BODY = `Affiliate disclosure: This article contains an affiliate link. If you sign up or buy through it, I may earn a commission at no extra cost to you.

## What ElevenLabs is

ElevenLabs is an AI voice platform built for text-to-speech, voice cloning, and audio content production. It is used by content creators, podcasters, audiobook producers, game developers, and businesses that need realistic synthetic voices at scale.

## Key features

- Realistic text-to-speech in over 30 languages
- Voice cloning from a short audio sample
- A library of pre-made AI voices in different tones and accents
- Multilingual dubbing and translation tools
- API access for developers who want to add AI voice generation to apps or workflows
- Tools for long-form narration, podcasts, video voiceovers, and character voices

## Who ElevenLabs is useful for

ElevenLabs can be useful for creators and teams who need high-quality audio without recording every line manually.

Examples include:

- YouTubers creating voiceovers
- Podcasters producing intros, ads, or scripted segments
- Course creators turning written lessons into narrated content
- Indie game developers creating character voices
- Authors and publishers producing audiobook drafts
- Businesses creating training content or product explainers
- Developers building voice features into apps

## Why it stands out

The main reason people look at ElevenLabs is voice quality. The voices can sound natural, expressive, and flexible compared with many older text-to-speech tools.

It also supports different workflows. You can use the web app for simple voice generation, or use the API if you want to build voice generation into a product or automation.

## Important note

AI voice tools should be used responsibly. Do not clone someone's voice without permission, and do not use synthetic audio to mislead people. For business or public content, it is best to be transparent when AI-generated voice is used.

## Bottom line

If you create videos, podcasts, courses, audiobooks, games, or apps that need realistic voice audio, ElevenLabs is worth checking out.

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
    content_type: "review",
    template_type: "review",
    title: TITLE,
    body: BODY,
    meta_title: TITLE.slice(0, 60),
    meta_description: "ElevenLabs review — AI voice and text-to-speech for creators, podcasters, audiobook producers, and businesses.".slice(0, 155),
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
    approval_notes: "Operator-corrected article. Status: draft. Real affiliate link inserted.",
  })
  .select("id")
  .single()

if (error) { console.error("Failed:", error.message); process.exit(1) }

console.log(`CREATED ElevenLabs article draft (${created.id})`)
console.log(`  Title: ${TITLE}`)
console.log(`  Body: ${BODY.length} chars`)
console.log(`  Affiliate link: ${AFFILIATE_URL}`)
console.log(`  Status: draft — waiting for approval`)
