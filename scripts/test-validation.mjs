import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(import.meta.dirname, '..')
const envRaw = readFileSync(resolve(root, '.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Replicate the exact validation from lib/content-review.ts
const LONG_FORM_PLATFORMS = new Set(["medium", "substack", "linkedin"])

const INTERNAL_NOTE_PATTERNS = [
  /no fake personal experience[^\n]*/i,
  /no fake rating[^\n]*/i,
  /no fake earnings[^\n]*/i,
  /no fake .*claim[^\n]*/i,
  /this draft does not claim[^\n]*/i,
]

const INCOME_OR_GUARANTEE_PATTERNS = [
  /\bguaranteed income\b/i,
  /\bguaranteed results\b/i,
  /\bguarantee[sd]?\b/i,
  /\bearn\s+\$?\d+/i,
  /\bmake\s+\$?\d+/i,
]

function countOccurrences(value, needle) {
  if (!needle) return 0
  return value.split(needle).length - 1
}

function validateLongForm(body, finalAffiliateLink) {
  const urlSignature = finalAffiliateLink?.includes("https://systeme.io/?sa=")
    ? "https://systeme.io/?sa="
    : finalAffiliateLink
  const firstAffiliateLinkIndex = urlSignature ? body.indexOf(urlSignature) : -1
  const disclosureIndex = body.toLowerCase().indexOf("affiliate disclosure:")
  const finalLinkCount = finalAffiliateLink ? countOccurrences(body, finalAffiliateLink) : 0
  const affiliateUrlCount = urlSignature ? countOccurrences(body, urlSignature) : 0
  const ctaHeadingCount = countOccurrences(body.toLowerCase(), "## call to action")
  const internalNotes = INTERNAL_NOTE_PATTERNS.some((p) => p.test(body))
  const incomeOrGuarantee = INCOME_OR_GUARANTEE_PATTERNS.some((p) => p.test(body))

  const checks = {
    disclosureAtTop: disclosureIndex === 0 && (firstAffiliateLinkIndex === -1 || disclosureIndex < firstAffiliateLinkIndex),
    oneCtaOnly: ctaHeadingCount === 1 && finalLinkCount === 1,
    affiliateLinkExists: finalLinkCount === 1,
    noDuplicateUrl: affiliateUrlCount === 1,
    noInternalNotes: !internalNotes,
    noPersonalExperienceClaim: true,
    noIncomeOrGuaranteeClaim: !incomeOrGuarantee,
  }

  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key)

  return { validationStatus: blockingReasons.length ? "blocked" : "valid", blockingReasons, checks }
}

function validateShortForm(body, platform, finalAffiliateLink) {
  const disclosureIndex = body.toLowerCase().indexOf("affiliate disclosure")
  const internalNotes = INTERNAL_NOTE_PATTERNS.some((p) => p.test(body))
  const incomeOrGuarantee = INCOME_OR_GUARANTEE_PATTERNS.some((p) => p.test(body))
  const hasLink = finalAffiliateLink ? body.includes(finalAffiliateLink) : true

  const blockingReasons = []
  if (disclosureIndex < 0) blockingReasons.push("missingDisclosure")
  if (!hasLink) blockingReasons.push("missingAffiliateLink")
  if (internalNotes) blockingReasons.push("internalNotes")
  if (incomeOrGuarantee) blockingReasons.push("incomeOrGuaranteeClaim")
  if (body.length < 10) blockingReasons.push("bodyTooShort")

  return { validationStatus: blockingReasons.length ? "blocked" : "valid", blockingReasons }
}

function validate(body, platform, affiliateLink) {
  if (LONG_FORM_PLATFORMS.has(platform)) {
    return validateLongForm(body.trim(), affiliateLink ?? undefined)
  }
  return validateShortForm(body.trim(), platform, affiliateLink ?? undefined)
}

// Run on all MX Master 4 posts
const { data: posts } = await sb.from('final_copies')
  .select('id, platform, language, body, affiliate_link')
  .eq('product_id', '856173da-5e3c-47a3-8bd7-807a6d59e167')

console.log(`Testing ${posts.length} posts:\n`)
for (const p of posts) {
  const result = validate(p.body, p.platform, p.affiliate_link)
  const icon = result.validationStatus === 'valid' ? 'PASS' : 'FAIL'
  console.log(`[${icon}] ${p.platform} (${p.language})${result.blockingReasons.length ? ' — ' + result.blockingReasons.join(', ') : ''}`)
  if (result.checks) {
    const failed = Object.entries(result.checks).filter(([,v]) => !v)
    if (failed.length) console.log(`       checks: ${failed.map(([k]) => k).join(', ')}`)
  }
}
