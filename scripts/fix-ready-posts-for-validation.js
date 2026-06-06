// Rewrite every ready_for_operator_approval LinkedIn / Medium / Substack
// final_copy so it passes the validator at /dashboard/he/approve. Rules:
//
//   1. disclosureAtTop  - Line 1 must START with "Affiliate disclosure:"
//                         (case-insensitive). For Hebrew posts the English
//                         "Affiliate disclosure:" prefix stays line 1, with
//                         the Hebrew translation on line 2.
//   2. oneCtaOnly       - Exactly ONE "## Call to Action" heading, followed
//                         by exactly ONE occurrence of the final URL.
//   3. noDuplicateUrl   - The product URL signature (origin + path of the
//                         final_link) must appear EXACTLY once in the body.
//   4. LinkedIn / Medium / Substack always use the matching campaign_link's
//                         final_url (UTM-tagged) as the single URL. The
//                         affiliate_link column on final_copies is updated to
//                         the same URL so the validator's finalLink matches
//                         what appears in the body.
//
// Does NOT publish, approve, or create publish_jobs. Only updates final_copies
// rows: body, affiliate_link, content_hash, validation_status, blocking_reasons.
// status stays ready_for_operator_approval.

require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")
const crypto = require("crypto")

const PLATFORMS = ["linkedin", "medium", "substack"]

const c = new Client({
  host: "db.gbkwydsodondarccqyet.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

function shortHash(s) {
  return crypto.createHash("sha256").update(s).digest("hex").substring(0, 16)
}

function urlSignature(finalLink) {
  try {
    const u = new URL(finalLink)
    return `${u.origin}${u.pathname}`
  } catch {
    return finalLink
  }
}

function disclosureLine(language) {
  if (language === "he") {
    return "Affiliate disclosure: This post contains an affiliate link. גילוי שותפים: הפוסט כולל קישור שותף."
  }
  return "Affiliate disclosure: This post contains an affiliate link."
}

function ctaLabel(language) {
  return language === "he"
    ? { heading: "## Call to Action", lead: "נסו את" }
    : { heading: "## Call to Action", lead: "Try" }
}

/**
 * Strip out anything in the old body that the validator would now reject:
 * - existing disclosure lines
 * - existing CTA sections
 * - any URL that contains the product URL signature
 * - lines that are just a URL (housekeeping)
 */
function stripBody(body, signature) {
  const lines = body.replace(/\r\n/g, "\n").split("\n")
  const out = []
  let inCta = false
  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (!trimmed) {
      out.push("")
      continue
    }
    // Drop CTA sections entirely.
    if (/^##\s*call to action/i.test(trimmed)) {
      inCta = true
      continue
    }
    if (inCta) {
      if (/^#{1,6}\s+/.test(trimmed)) {
        inCta = false  // a new heading ends the CTA section
      } else {
        continue
      }
    }
    // Drop disclosure lines (* and bold variants too).
    const lowered = trimmed.toLowerCase().replace(/^[*_\s>]+/, "")
    if (lowered.startsWith("affiliate disclosure:") || lowered.startsWith("*affiliate disclosure:")) {
      continue
    }
    // Drop lines that contain the product's URL signature anywhere.
    if (signature && trimmed.includes(signature)) {
      continue
    }
    out.push(rawLine)
  }
  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function rebuildBody({ originalBody, language, productName, finalLink }) {
  const signature = urlSignature(finalLink)
  const stripped = stripBody(originalBody, signature)
  const cta = ctaLabel(language)
  const lead = language === "he"
    ? `נסו את ${productName} כאן:`
    : `Try ${productName} here:`
  return [
    disclosureLine(language),
    "",
    stripped,
    "",
    cta.heading,
    "",
    lead,
    "",
    finalLink,
  ].join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

/**
 * Recompute the validator's results inline so we know each row is valid
 * BEFORE we ship it. Mirrors lib/content-review.ts.
 */
function validate(body, finalLink) {
  const signature = urlSignature(finalLink)
  const trimmed = body.trim()
  const firstAffiliateLinkIndex = trimmed.indexOf(signature)
  const disclosureIndex = trimmed.toLowerCase().indexOf("affiliate disclosure:")
  const finalLinkCount = trimmed.split(finalLink).length - 1
  const affiliateUrlCount = trimmed.split(signature).length - 1
  const ctaHeadingCount = trimmed.toLowerCase().split("## call to action").length - 1
  const PERSONAL = [
    /\bi tested\b/i,
    /\bmy results\b/i,
    /\bin my experience\b/i,
    /\bi used\b/i,
    /\bi tried\b/i,
  ]
  const INCOME = [
    /\bguaranteed income\b/i,
    /\bguaranteed results\b/i,
    /\bguarantee[sd]?\b/i,
    /\bearn\s+\$?\d+/i,
    /\bmake\s+\$?\d+/i,
  ]
  const checks = {
    disclosureAtTop:
      disclosureIndex === 0 &&
      (firstAffiliateLinkIndex === -1 || disclosureIndex < firstAffiliateLinkIndex),
    oneCtaOnly: ctaHeadingCount === 1 && finalLinkCount === 1,
    affiliateLinkExists: finalLinkCount === 1,
    noDuplicateUrl: affiliateUrlCount === 1,
    noInternalNotes: !/no fake/i.test(trimmed),
    noPersonalExperienceClaim: !PERSONAL.some((r) => r.test(trimmed)),
    noIncomeOrGuaranteeClaim: !INCOME.some((r) => r.test(trimmed)),
  }
  const blockingReasons = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k)
  return {
    valid: blockingReasons.length === 0,
    blockingReasons,
  }
}

async function main() {
  await c.connect()
  const rows = (await c.query(
    `
    SELECT
      fc.id, fc.product_id, fc.platform, fc.language, fc.version,
      fc.body, fc.title, fc.affiliate_link,
      p.name AS product_name,
      (
        SELECT cl.final_url FROM campaign_links cl
        WHERE cl.product_id = fc.product_id
          AND cl.source   = fc.platform
          AND coalesce(cl.content, '') = fc.language || '_v' || fc.version
        ORDER BY cl.updated_at DESC LIMIT 1
      ) AS campaign_url
    FROM final_copies fc
    JOIN products p ON p.id = fc.product_id
    WHERE fc.status = 'ready_for_operator_approval'
      AND fc.platform = ANY($1::text[])
    ORDER BY p.name, fc.platform, fc.language, fc.version DESC
    `,
    [PLATFORMS],
  )).rows
  console.log(`Found ${rows.length} ready_for_operator_approval LI/M/SS rows`)

  let updated = 0
  let stillInvalid = 0
  const invalidDetails = []
  for (const r of rows) {
    if (!r.campaign_url) {
      console.warn(`  ! ${r.product_name} ${r.platform} ${r.language}: no campaign_url, skipping`)
      continue
    }
    const newBody = rebuildBody({
      originalBody: r.body,
      language: r.language,
      productName: r.product_name,
      finalLink: r.campaign_url,
    })
    const { valid, blockingReasons } = validate(newBody, r.campaign_url)
    if (!valid) {
      stillInvalid++
      invalidDetails.push({
        product: r.product_name,
        platform: r.platform,
        language: r.language,
        reasons: blockingReasons,
        bodyPreview: newBody.slice(0, 200),
      })
      continue
    }
    const newHash = shortHash(newBody)
    await c.query(
      `
      UPDATE final_copies
      SET body = $1,
          affiliate_link = $2,
          content_hash = $3,
          validation_status = 'valid',
          blocking_reasons = '{}',
          updated_at = now()
      WHERE id = $4
      `,
      [newBody, r.campaign_url, newHash, r.id],
    )
    updated++
  }

  console.log(`\nupdated: ${updated}`)
  console.log(`still invalid: ${stillInvalid}`)
  if (invalidDetails.length > 0) {
    console.log(`\ndetails of still-invalid rows:`)
    for (const d of invalidDetails) console.log(JSON.stringify(d, null, 2))
  }

  // Final coverage check.
  const after = (await c.query(
    `
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE validation_status = 'valid')::int AS valid_count
    FROM final_copies
    WHERE status = 'ready_for_operator_approval'
      AND platform = ANY($1::text[])
    `,
    [PLATFORMS],
  )).rows[0]
  console.log(`\nfinal: ${after.valid_count}/${after.total} ready LI/M/SS posts now validation_status='valid'`)

  await c.end()
}
main().catch(async (e) => {
  console.error(e)
  try { await c.end() } catch {}
  process.exit(1)
})
