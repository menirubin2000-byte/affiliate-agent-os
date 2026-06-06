// Build per-post UTM campaign_links so each ready LinkedIn / Medium / Substack
// post gets a measurable URL.
//
// Mapping (per MENI):
//   utm_source   = platform key   (linkedin | medium | substack)
//   utm_medium   = organic
//   utm_campaign = <product_slug>_<platform>         (e.g. ahaslides_linkedin)
//   utm_content  = <language>_v<version>             (e.g. en_v1, he_v1)
//
// Affiliate link stays the original affiliate_link. The final_url is the
// affiliate_link with UTM appended. The base_url stored equals the
// affiliate_link.
//
// Rules MENI set:
//   - Do NOT publish.
//   - Do NOT approve.
//   - Do NOT create publish_jobs / published_records.
//   - Do NOT mutate posts.
//   - Just create campaign_links (idempotent — re-running skips existing).
//
// Reach is limited to:
//   final_copies.status='ready_for_operator_approval'
//   AND platform IN ('linkedin','medium','substack')

require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")

const PLATFORMS = ["linkedin", "medium", "substack"]
const UTM_MEDIUM = "organic"

const c = new Client({
  host: "db.gbkwydsodondarccqyet.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\./g, "")          // "systeme.io" -> "systemeio"
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function buildFinalUrl(baseUrl, utm) {
  let url
  try {
    url = new URL(baseUrl)
  } catch {
    throw new Error(`Invalid affiliate_link: ${baseUrl}`)
  }
  // Remove any pre-existing UTM keys so we don't double up.
  ;["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) =>
    url.searchParams.delete(k),
  )
  for (const [k, v] of Object.entries(utm)) {
    if (v) url.searchParams.set(k, v)
  }
  return url.toString()
}

async function main() {
  await c.connect()

  // Pull every ready post on LI/M/SS with its product slug + affiliate_link.
  // We dedup at the (product_id, platform, language, version) level — only
  // one campaign_link per that key.
  const rows = (await c.query(
    `
    SELECT
      fc.id                   AS final_copy_id,
      fc.product_id,
      p.name                  AS product_name,
      coalesce(p.slug, '')    AS product_slug,
      fc.platform,
      fc.language,
      fc.version,
      fc.affiliate_link
    FROM final_copies fc
    JOIN products p ON p.id = fc.product_id
    WHERE fc.status = 'ready_for_operator_approval'
      AND fc.platform = ANY($1::text[])
      AND coalesce(fc.affiliate_link, '') <> ''
    ORDER BY p.name, fc.platform, fc.language, fc.version DESC
    `,
    [PLATFORMS],
  )).rows
  console.log(`Found ${rows.length} ready posts on linkedin/medium/substack`)

  let created = 0
  let skipped = 0
  let errored = 0

  for (const r of rows) {
    const slug = r.product_slug || slugify(r.product_name)
    const utm = {
      utm_source: r.platform,
      utm_medium: UTM_MEDIUM,
      utm_campaign: `${slug}_${r.platform}`,
      utm_content: `${r.language}_v${r.version}`,
    }
    const finalUrl = buildFinalUrl(r.affiliate_link, utm)
    const name = `${r.product_name} ${r.platform} ${r.language}`

    // Skip if a campaign_link already exists for this exact intent — keyed by
    // product+source+campaign+content so re-runs are stable even if name
    // formatting changes.
    const existing = await c.query(
      `SELECT id FROM campaign_links
       WHERE product_id = $1
         AND source   = $2
         AND coalesce(campaign_name, '') = $3
         AND coalesce(content, '')       = $4
       LIMIT 1`,
      [r.product_id, utm.utm_source, utm.utm_campaign, utm.utm_content],
    )
    if (existing.rows.length > 0) {
      skipped++
      continue
    }
    try {
      await c.query(
        `INSERT INTO campaign_links
           (product_id, name, channel, campaign_name, source, medium, content,
            base_url, final_url, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')`,
        [
          r.product_id,
          name,
          r.platform,                                       // channel
          utm.utm_campaign,                                 // campaign_name
          utm.utm_source,                                   // source
          UTM_MEDIUM,                                       // medium
          utm.utm_content,                                  // content
          r.affiliate_link,                                 // base_url
          finalUrl,                                         // final_url
          `Auto-created for measurement on ${r.platform} (${r.language}). Do not publish without MENI approval.`,
        ],
      )
      created++
      console.log(`  ✓ ${r.product_name.padEnd(18)} ${r.platform.padEnd(9)} ${r.language}`)
    } catch (err) {
      errored++
      console.error(`  ✗ ${r.product_name} ${r.platform} ${r.language}: ${err.message}`)
    }
  }

  console.log(`\n=== summary ===`)
  console.log(`processed: ${rows.length}`)
  console.log(`created:   ${created}`)
  console.log(`skipped (already existed): ${skipped}`)
  console.log(`errors:    ${errored}`)

  // Coverage check: how many (product, platform, language) pairs still lack a campaign_link?
  const coverage = (await c.query(
    `
    SELECT fc.platform, fc.language, count(*)::int AS ready_count,
           count(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM campaign_links cl
             WHERE cl.product_id = fc.product_id
               AND cl.source     = fc.platform
               AND cl.content    = fc.language || '_v' || fc.version
           ))::int AS with_link
    FROM final_copies fc
    WHERE fc.status = 'ready_for_operator_approval'
      AND fc.platform = ANY($1::text[])
    GROUP BY fc.platform, fc.language
    ORDER BY fc.platform, fc.language
    `,
    [PLATFORMS],
  )).rows
  console.log(`\ncoverage of ready posts:`)
  for (const r of coverage) {
    console.log(`  ${r.platform.padEnd(9)} ${r.language}: ${r.with_link}/${r.ready_count}`)
  }

  await c.end()
}
main().catch(async (e) => {
  console.error(e)
  try { await c.end() } catch {}
  process.exit(1)
})
