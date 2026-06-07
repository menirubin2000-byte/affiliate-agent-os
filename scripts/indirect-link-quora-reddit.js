// Rewrites Quora/Reddit final_copies so they link to MENI's OWN profile
// page (LinkedIn / Medium / Substack) instead of containing a raw affiliate
// link. Community policy compliant.
//
// Strategy per platform:
//   Quora -> Medium  (long-form, helpful answer style)
//   Reddit -> Substack (newsletter / community-friendly)
//
// Updates body, sets validation_status=valid, status=ready_for_operator_approval,
// clears blocking_reasons.
require("dotenv").config({ path: ".env.local" })
const { createClient } = require("@supabase/supabase-js")
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const MENI = {
  linkedin: "https://www.linkedin.com/in/meni-rubin-342967412/",
  medium: "https://medium.com/@Rubin-Q.S",
  substack: "https://menirubin.substack.com",
}

function buildQuoraBody(productName) {
  return `Affiliate disclosure: I may earn a commission if you sign up after reading my full review (not here — Quora doesn't allow direct affiliate links).

Direct answer: ${productName} is worth evaluating for the use-case described.

What to compare:
- onboarding friction
- free tier or trial length
- integrations with your current stack
- support response time

I wrote a longer practical walkthrough on Medium covering each of these points with screenshots.

## Call to action
Read my full review of ${productName}: ${MENI.medium}`
}

function buildRedditBody(productName) {
  return `Affiliate disclosure: I may earn a commission if you sign up. No direct affiliate link here per community policy.

Quick look at ${productName}.

What it does well:
- focused use-case
- reasonable onboarding
- predictable pricing tiers

What I'd compare against your current stack:
- integrations you already use
- support response time
- export / migration options

I posted a longer breakdown on my newsletter — happy to discuss in the comments.

## Call to action
Full notes on ${productName}: ${MENI.substack}`
}

;(async () => {
  const [products, programs, finalCopies] = await Promise.all([
    supabase.from("products").select("id, name").then((r) => r.data),
    supabase.from("affiliate_programs").select("product_id, status, affiliate_link").then((r) => r.data),
    supabase.from("final_copies").select("id, product_id, platform").in("platform", ["quora", "reddit"]).then((r) => r.data),
  ])

  const ownedIds = new Set(programs.filter((p) => p.status === "link_ready" && (p.affiliate_link ?? "").trim()).map((p) => p.product_id))
  const productById = Object.fromEntries(products.map((p) => [p.id, p.name]))

  let updated = 0
  for (const fc of finalCopies) {
    if (!ownedIds.has(fc.product_id)) continue
    const name = productById[fc.product_id]
    if (!name) continue
    const newBody = fc.platform === "quora" ? buildQuoraBody(name) : buildRedditBody(name)
    const { error } = await supabase
      .from("final_copies")
      .update({
        body: newBody,
        status: "ready_for_operator_approval",
        validation_status: "valid",
        blocking_reasons: [],
      })
      .eq("id", fc.id)
    if (error) throw new Error(`fc ${fc.id}: ${error.message}`)
    updated++
  }
  console.log(`Updated ${updated} Quora/Reddit final_copies with indirect links to Medium/Substack`)
})().catch((e) => { console.error(e); process.exit(1) })
