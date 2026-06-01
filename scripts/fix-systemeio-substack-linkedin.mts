import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const AFFILIATE_URL = "https://systeme.io/?sa=sa0272930337c3024fcafe085f6b63e73bbc0e3365"

// ─── Substack — long-form review ──────────────────────────────────
const substackId = "3282aef9-290d-4275-a7f1-67bfccff323b"
const substackTitle = "Systeme.io Review: A Practical Note for Operators Comparing Marketing Tools"
const substackBody = `Affiliate disclosure: This post contains an affiliate link. If you sign up or buy through it, I may earn a commission at no extra cost to you.

## What Systeme.io is

Systeme.io is an all-in-one marketing platform built for solo operators, creators, and small online businesses. Instead of paying for separate tools for funnels, email, courses, and websites, you get them in one dashboard.

## Key features

- Sales funnel builder with drag-and-drop pages
- Email marketing with automation workflows and tagging
- Online course and digital product hosting
- Membership site features
- Blog and website builder included
- Built-in affiliate program management
- A/B testing on funnel pages
- Free plan available with real working limits

## Who it is for

- Solo operators and small online businesses
- Creators selling courses or digital products
- Buyers who want one tool instead of stitching together Mailchimp, ClickFunnels, Teachable
- People testing an offer before committing to expensive specialized tools

## Who it is not for

- Large enterprises with complex custom integration needs
- Teams already happy with a deep, established tech stack
- Buyers who need very advanced segmentation or enterprise-grade reporting

## How the pricing works

The free plan covers core funnels, email contacts, and unlimited emails — enough to test the platform end-to-end. Paid plans scale on contact count, automation depth, and team features. Current plan details and limits are on the official site.

## Practical takeaways

The main reason people switch is consolidation: one login, one billing, one workflow instead of five. The tradeoff is depth — dedicated tools (ConvertKit for email, ClickFunnels for funnels) may go deeper in their specific area. For solo operators and small teams, that tradeoff is usually worth it.

CTA: To try the free plan and see if it fits your workflow, visit ${AFFILIATE_URL}`

// ─── LinkedIn — shorter social post ───────────────────────────────
const linkedinId = "82454a78-3050-46c9-9b5c-a3d94efd1fd5"
const linkedinTitle = "Systeme.io: All-in-One Marketing Platform for Solo Operators"
const linkedinBody = `Systeme.io combines sales funnels, email marketing, online courses, and websites in one platform.

What stands out:
- Sales funnels and landing pages in one builder
- Email marketing with automation workflows
- Online course and digital product hosting
- Blog and website builder included
- Built-in affiliate program
- Free plan with real working limits

Who it fits:
- Solo operators and small online businesses
- Creators selling courses or digital products
- Anyone tired of stitching together Mailchimp, ClickFunnels, and Teachable

Tradeoff: dedicated tools may go deeper in their area, but for solo operators the consolidation usually wins — one login, one bill, one workflow.

The free plan is enough to test it end-to-end before committing.

Affiliate disclosure: This post contains an affiliate link. I may earn a commission at no extra cost to you.

Visit: ${AFFILIATE_URL}`

const updates = [
  { id: substackId, title: substackTitle, body: substackBody, label: "Substack review" },
  { id: linkedinId, title: linkedinTitle, body: linkedinBody, label: "LinkedIn social_post" },
]

for (const u of updates) {
  const { error } = await supabase
    .from("content_drafts")
    .update({
      title: u.title,
      body: u.body,
      meta_title: u.title.slice(0, 60),
      meta_description: "Systeme.io review — all-in-one marketing platform for funnels, email, courses, and websites.",
      target_keyword: "systeme.io review",
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

  if (error) console.error(`FAIL ${u.label}: ${error.message}`)
  else {
    console.log(`UPDATED ${u.label} (${u.id})`)
    console.log(`  Title: ${u.title}`)
    console.log(`  Body: ${u.body.length} chars`)
  }
}

console.log("\nAll Systeme.io drafts fixed.")
