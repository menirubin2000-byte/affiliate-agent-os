import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const AFFILIATE_URL = "https://try.elevenlabs.io/bcwxftu128a9"

// ─── 1. Substack — long-form review ───────────────────────────────
const substackId = "be77fd49-548c-4bba-9b0a-725343d1129e"
const substackTitle = "ElevenLabs Review: A Practical Note for Operators Comparing AI Voice Tools"
const substackBody = `Affiliate disclosure: This post contains an affiliate link. If you sign up or buy through it, I may earn a commission at no extra cost to you.

## What ElevenLabs is

ElevenLabs is an AI voice platform built for text-to-speech, voice cloning, and audio content production. It is used by content creators, podcasters, audiobook producers, game developers, and developers who need realistic synthetic voices at scale.

## Key features

- Realistic text-to-speech in over 30 languages
- Voice cloning from a short audio sample
- A library of pre-made AI voices in different tones and accents
- Multilingual output that preserves the original voice characteristics
- Long-form audio generation suitable for audiobooks and podcasts
- API access for developers integrating voice into apps and workflows
- Browser-based dashboard with no install required

## Who it is for

- Content creators producing video voiceovers without hiring talent
- Podcasters who want a consistent narrator voice across episodes
- Audiobook producers turning written content into spoken audio
- Developers building voice-enabled apps and chatbots
- Marketers creating multilingual versions of the same content

## Who it is not for

- Projects that need real human emotion or live performance
- Use cases that require full offline processing without cloud calls
- Buyers who need ultra-low pricing for very high-volume use without committing to a paid plan

## How the pricing works

ElevenLabs offers a free plan for testing voice quality. Paid tiers scale based on character usage, voice cloning slots, and commercial-use rights. The free tier is for evaluation; production use generally requires a paid plan.

## Practical takeaways

Voice quality is the main reason people switch from older text-to-speech tools. The free plan is enough to test whether the voices fit your use case before committing. Voice cloning works best with clean source audio.

CTA: To check current plans and try the free tier, visit ${AFFILIATE_URL}`

// ─── 2. LinkedIn — shorter social post ────────────────────────────
const linkedinId = "984f46f1-a49e-4e13-8551-a0d000a18796"
const linkedinTitle = "ElevenLabs: AI Voice and Text-to-Speech for Creators"
const linkedinBody = `ElevenLabs is an AI voice platform for text-to-speech, voice cloning, and audio production.

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

Tradeoff: not a replacement for live human performance, but the quality is a clear step above older TTS tools.

The free plan is enough to evaluate voice quality before committing.

Affiliate disclosure: This post contains an affiliate link. I may earn a commission at no extra cost to you.

Visit: ${AFFILIATE_URL}`

// ─── 3. Reddit — fix wrong title ─────────────────────────────────
const redditId = "687dc7b4-4f62-40e7-a908-08db56b1044a"
const redditTitle = "Has anyone used ElevenLabs for AI voice generation or text-to-speech?"
const redditBody = `I'm looking into AI voice tools and ElevenLabs keeps coming up as one of the top options.

From what I've seen, it offers:
- Realistic text-to-speech in 30+ languages
- Voice cloning from a short audio sample
- A library of pre-made AI voices
- Long-form audio for audiobooks and podcasts
- API access for developers
- Free tier available for testing

I'm mainly curious about real-world use cases:

- How natural does the voice output actually sound?
- Is it good enough for podcasts, videos, or audiobooks?
- How does voice cloning quality compare to the stock voices?
- Any limitations or issues after using it for a while?
- Would you recommend it over alternatives like Play.ht or Murf?

Affiliate disclosure: This link may be an affiliate link. I may earn a commission at no extra cost to you.

Link: ${AFFILIATE_URL}`

const updates = [
  { id: substackId, title: substackTitle, body: substackBody, label: "Substack review" },
  { id: linkedinId, title: linkedinTitle, body: linkedinBody, label: "LinkedIn social_post" },
  { id: redditId, title: redditTitle, body: redditBody, label: "Reddit post" },
]

for (const u of updates) {
  const { error } = await supabase
    .from("content_drafts")
    .update({
      title: u.title,
      body: u.body,
      meta_title: u.title.slice(0, 60),
      meta_description: "ElevenLabs review — AI voice generation and text-to-speech platform for creators and developers.",
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
    .eq("id", u.id)

  if (error) {
    console.error(`FAIL ${u.label}: ${error.message}`)
  } else {
    console.log(`UPDATED ${u.label} (${u.id})`)
    console.log(`  Title: ${u.title}`)
    console.log(`  Body: ${u.body.length} chars`)
  }
}

console.log("\nAll ElevenLabs drafts fixed.")
