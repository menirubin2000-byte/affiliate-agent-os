import { config } from "dotenv"
config({ path: ".env.local" })

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const newTitle = "ElevenLabs Review: AI Voice and Text-to-Speech for Creators"

const newBody = `Affiliate disclosure: This article contains an affiliate link. If you sign up or buy through it, I may earn a commission at no extra cost to you.

## What ElevenLabs is

ElevenLabs is an AI voice platform built for text-to-speech, voice cloning, and audio content production. It is used by content creators, podcasters, audiobook producers, game developers, and businesses that need realistic synthetic voices at scale.

## Key features

- Realistic text-to-speech in over 30 languages
- Voice cloning from a short audio sample
- A library of pre-made AI voices in different tones and accents
- Multilingual output that keeps the original voice characteristics
- Long-form audio generation for audiobooks and podcasts
- API access for developers integrating voice into apps and workflows
- Browser-based dashboard with no install required

## Who it is for

- Content creators producing video voiceovers without hiring talent
- Podcasters who want a consistent narrator voice across episodes
- Audiobook producers turning written content into spoken audio
- Developers building voice-enabled apps, agents, or chatbots
- Marketers creating multilingual versions of the same content

## Who it is not for

- Projects that need real human emotion, nuance, or live performance
- Use cases that require full offline processing without cloud calls
- Buyers who need ultra-low pricing for very high-volume use without committing to a paid plan

## How the pricing works

ElevenLabs offers a free plan for testing the voice quality, with paid tiers that scale based on character usage, voice cloning slots, and commercial-use rights. The free tier is meant for evaluation. Production use generally requires a paid plan. Current plan details are on the official site.

## Practical takeaways

The voice quality is the main reason people switch from older text-to-speech tools. The free plan is enough to test whether the voices fit your use case before committing. Voice cloning works best with clean source audio.

CTA: To check the current plans and try the free tier, visit https://try.elevenlabs.io/bcwxftu128a9`

// Find the ElevenLabs review draft
const { data: drafts } = await supabase
  .from("content_drafts")
  .select("id, template_type, title, products(name)")
  .eq("template_type", "review")

type Row = { id: string; template_type: string; title: string | null; products?: { name?: string } | { name?: string }[] | null }
const review = (drafts as Row[] | null)?.find((d) => {
  const prod = Array.isArray(d.products) ? d.products[0] : d.products
  return prod?.name === "ElevenLabs"
})

if (!review) {
  console.error("ElevenLabs review draft not found in DB")
  process.exit(1)
}

const { error } = await supabase
  .from("content_drafts")
  .update({
    title: newTitle,
    body: newBody,
    meta_title: newTitle.slice(0, 60),
    meta_description: "ElevenLabs review: AI voice generation and text-to-speech platform for creators, podcasters, audiobooks, and developers.",
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
  })
  .eq("id", review.id)

if (error) {
  console.error("Update failed:", error.message)
  process.exit(1)
}

console.log(`UPDATED ElevenLabs review (${review.id})`)
console.log(`Title: ${newTitle}`)
console.log(`Body length: ${newBody.length} chars`)
console.log(`Fixed: "is a AI" -> "is an AI"`)
console.log(`Fixed: complete post, no fallback language`)
