// Read-only export of every final_copy in the system + the context an
// operator needs to review it: product, language, platform, status,
// validation, full body, campaign_link, affiliate_link, image/video asset
// paths, asset readiness, whether a publish_job or published_record exists,
// and any blocking_reasons.
//
// Writes BOTH docs/POST_REVIEW_PACK.md (human-readable) AND
// docs/post-review-pack.json (machine-readable).
//
// DOES NOT publish, approve, create publish_jobs/published_records, or edit
// any row. Purely SELECT.

require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")
const fs = require("fs")
const path = require("path")

const c = new Client({
  host: "db.gbkwydsodondarccqyet.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

// Hostname -> platform routing key, used to attribute a campaign_link to the
// right platform/channel when the campaign_links.channel column is generic.
const PLATFORM_ALIASES = {
  linkedin: ["linkedin"],
  medium: ["medium"],
  substack: ["substack"],
  facebook_page: ["facebook", "facebook_page"],
  instagram_professional: ["instagram", "instagram_professional"],
  pinterest: ["pinterest"],
  x_twitter: ["x", "twitter", "x_twitter"],
  youtube: ["youtube"],
  quora: ["quora"],
  reddit: ["reddit"],
  tiktok: ["tiktok"],
}

function assetStatus(imageStatus, videoStatus) {
  const i = imageStatus ?? "missing"
  const v = videoStatus ?? "missing"
  if (i === "ready" && v === "ready") return "image+video ready"
  if (i === "ready") return "image ready"
  if (v === "ready") return "video ready"
  return "missing"
}

function pickImagePath(language, image_url, image_url_he) {
  if (language === "he" && image_url_he) return image_url_he
  return image_url ?? image_url_he ?? null
}

const IMAGE_REQUIRED_FOR_READY = new Set([
  "linkedin",
  "facebook_page",
  "medium",
  "substack",
  "instagram_professional",
  "pinterest",
  "x_twitter",
])
const VIDEO_REQUIRED_FOR_READY = new Set(["tiktok", "youtube"])
const MANUAL_ONLY_NOT_AUTO_READY = new Set(["quora", "reddit"])

function mediaReadiness(row) {
  const imageRequired = IMAGE_REQUIRED_FOR_READY.has(row.platform)
  const videoRequired = VIDEO_REQUIRED_FOR_READY.has(row.platform)
  const manualOnly = MANUAL_ONLY_NOT_AUTO_READY.has(row.platform)
  const hasImage =
    row.image_status === "ready" ||
    Boolean(row.image_url) ||
    Boolean(row.image_url_he)
  const hasVideo =
    row.video_status === "ready" ||
    Boolean(row.video_url) ||
    (Array.isArray(row.video_suitable_for) && row.video_suitable_for.includes(row.platform))
  const blockingReasons = []
  if (manualOnly) blockingReasons.push("manual_platform_not_auto_ready")
  if (imageRequired && !hasImage) blockingReasons.push("image_required_for_ready")
  if (videoRequired && !hasVideo) blockingReasons.push("video_required_for_ready")
  return {
    media_required: imageRequired || videoRequired,
    media_ready: blockingReasons.length === 0,
    publish_media_mode: manualOnly ? "manual_only" : videoRequired ? "video" : "image",
    image_required: imageRequired,
    video_required: videoRequired,
    media_blocking_reasons: blockingReasons,
    next_action: blockingReasons.includes("manual_platform_not_auto_ready")
      ? "manual_policy_review_required"
      : blockingReasons.includes("image_required_for_ready")
        ? "add_product_image"
        : blockingReasons.includes("video_required_for_ready")
          ? "add_product_video"
          : "ready",
  }
}

async function main() {
  await c.connect()

  // Pull every final_copy. We join the product and language flag and pull
  // the most recent campaign_link per (product, channel).
  const rows = (await c.query(`
    SELECT
      fc.id            AS final_copy_id,
      fc.product_id,
      p.name           AS product_name,
      p.image_url,
      p.image_url_he,
      p.video_url,
      p.image_status,
      p.video_status,
      p.video_suitable_for,
      fc.platform,
      fc.language,
      fc.status,
      fc.validation_status,
      fc.title         AS post_title,
      fc.body          AS post_body,
      fc.affiliate_link,
      fc.blocking_reasons,
      fc.version,
      fc.created_at    AS final_copy_created_at,
      fc.updated_at    AS final_copy_updated_at,
      EXISTS (
        SELECT 1 FROM publish_jobs pj
        WHERE pj.final_copy_id = fc.id
      ) AS publish_job_exists,
      EXISTS (
        SELECT 1 FROM published_records pr
        WHERE pr.product_id = fc.product_id
          AND pr.platform   = fc.platform
          AND pr.verification_status = 'verified'
          AND coalesce(pr.live_url, '') <> ''
      ) AS published_record_exists,
      (
        SELECT pr.live_url FROM published_records pr
        WHERE pr.product_id = fc.product_id
          AND pr.platform   = fc.platform
          AND pr.verification_status = 'verified'
          AND coalesce(pr.live_url, '') <> ''
        ORDER BY pr.verified_at DESC NULLS LAST
        LIMIT 1
      ) AS published_record_live_url
    FROM final_copies fc
    JOIN products p ON p.id = fc.product_id
    ORDER BY p.name, fc.platform, fc.language, fc.version DESC
  `)).rows

  // Pull all active campaign_links separately, then match per (product, channel).
  const links = (await c.query(`
    SELECT product_id, channel, final_url, name
    FROM campaign_links
    WHERE coalesce(status, 'active') = 'active'
    ORDER BY updated_at DESC
  `)).rows
  const linksByPair = new Map()
  for (const link of links) {
    const ch = (link.channel ?? "").trim().toLowerCase()
    if (!ch) continue
    const key = `${link.product_id}::${ch}`
    if (!linksByPair.has(key)) linksByPair.set(key, link)
  }
  function lookupCampaignLink(productId, platform) {
    for (const alias of PLATFORM_ALIASES[platform] ?? [platform]) {
      const link = linksByPair.get(`${productId}::${alias}`)
      if (link) return link
    }
    return null
  }

  const pack = rows.map((r) => {
    const link = lookupCampaignLink(r.product_id, r.platform)
    const media = mediaReadiness(r)
    const blockingReasons = Array.from(new Set([
      ...(Array.isArray(r.blocking_reasons) ? r.blocking_reasons : []),
      ...media.media_blocking_reasons,
    ]))
    return {
      final_copy_id: r.final_copy_id,
      product: r.product_name,
      product_id: r.product_id,
      language: r.language,
      platform: r.platform,
      status: r.status,
      validation_status: r.validation_status,
      post_title: r.post_title,
      full_post_text: r.post_body,
      campaign_link: link ? { final_url: link.final_url, name: link.name } : null,
      affiliate_link: r.affiliate_link,
      image_asset_path: pickImagePath(r.language, r.image_url, r.image_url_he),
      video_asset_path: r.video_url,
      asset_status: assetStatus(r.image_status, r.video_status),
      video_suitable_for: Array.isArray(r.video_suitable_for) ? r.video_suitable_for : [],
      media_required: media.media_required,
      media_ready: media.media_ready,
      publish_media_mode: media.publish_media_mode,
      image_required: media.image_required,
      video_required: media.video_required,
      next_action: media.next_action,
      published_record_exists: r.published_record_exists,
      published_record_live_url: r.published_record_live_url,
      publish_job_exists: r.publish_job_exists,
      blocking_reasons: blockingReasons,
      version: r.version,
      final_copy_created_at: r.final_copy_created_at,
      final_copy_updated_at: r.final_copy_updated_at,
    }
  })

  // ------- write JSON -------
  const outDir = path.join(__dirname, "..", "docs")
  fs.mkdirSync(outDir, { recursive: true })
  const jsonPath = path.join(outDir, "post-review-pack.json")
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        total: pack.length,
        rule: "READ-ONLY export. No publish_jobs / published_records / approvals created. Posts unchanged.",
        posts: pack,
      },
      null,
      2,
    ),
    "utf8",
  )

  // ------- write Markdown -------
  const md = []
  md.push("# Post Review Pack")
  md.push("")
  md.push(`> Read-only export of every final_copy. Generated at ${new Date().toISOString()}.`)
  md.push(`> Total posts: **${pack.length}**`)
  md.push("")
  md.push("> Rule: this file is generated by `scripts/export-review-pack.js`. It does NOT create publish_jobs, published_records, or change any post.")
  md.push("")

  // Top-level summary table
  const byStatus = new Map()
  const byLang = new Map()
  const byPlatform = new Map()
  for (const p of pack) {
    byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1)
    byLang.set(p.language, (byLang.get(p.language) ?? 0) + 1)
    byPlatform.set(p.platform, (byPlatform.get(p.platform) ?? 0) + 1)
  }
  md.push("## Summary")
  md.push("")
  md.push("### By status")
  md.push("")
  md.push("| status | count |")
  md.push("| --- | --- |")
  for (const [k, v] of [...byStatus.entries()].sort()) md.push(`| ${k} | ${v} |`)
  md.push("")
  md.push("### By language")
  md.push("")
  md.push("| language | count |")
  md.push("| --- | --- |")
  for (const [k, v] of [...byLang.entries()].sort()) md.push(`| ${k} | ${v} |`)
  md.push("")
  md.push("### By platform")
  md.push("")
  md.push("| platform | count |")
  md.push("| --- | --- |")
  for (const [k, v] of [...byPlatform.entries()].sort()) md.push(`| ${k} | ${v} |`)
  md.push("")

  // Per-post sections.
  md.push("## Posts")
  md.push("")
  for (const p of pack) {
    md.push(`### ${p.product} · ${p.platform} · ${p.language}`)
    md.push("")
    md.push("| field | value |")
    md.push("| --- | --- |")
    md.push(`| final_copy_id | \`${p.final_copy_id}\` |`)
    md.push(`| product | ${p.product} |`)
    md.push(`| language | ${p.language} |`)
    md.push(`| platform | ${p.platform} |`)
    md.push(`| status | ${p.status} |`)
    md.push(`| validation_status | ${p.validation_status} |`)
    md.push(`| post_title | ${p.post_title ?? ""} |`)
    md.push(`| affiliate_link | ${p.affiliate_link ? `\`${p.affiliate_link}\`` : "—"} |`)
    md.push(
      `| campaign_link | ${p.campaign_link ? `\`${p.campaign_link.final_url}\` (${p.campaign_link.name ?? ""})` : "—"} |`,
    )
    md.push(`| image_asset_path | ${p.image_asset_path ? `\`${p.image_asset_path}\`` : "—"} |`)
    md.push(`| video_asset_path | ${p.video_asset_path ? `\`${p.video_asset_path}\`` : "—"} |`)
    md.push(`| asset_status | ${p.asset_status} |`)
    md.push(`| media_required | ${p.media_required ? "yes" : "no"} |`)
    md.push(`| media_ready | ${p.media_ready ? "yes" : "no"} |`)
    md.push(`| publish_media_mode | ${p.publish_media_mode} |`)
    md.push(`| image_required | ${p.image_required ? "yes" : "no"} |`)
    md.push(`| video_required | ${p.video_required ? "yes" : "no"} |`)
    md.push(`| next_action | ${p.next_action} |`)
    if (p.video_suitable_for.length > 0) {
      md.push(`| video_suitable_for | ${p.video_suitable_for.join(", ")} |`)
    }
    md.push(`| publish_job_exists | ${p.publish_job_exists ? "yes" : "no"} |`)
    md.push(`| published_record_exists | ${p.published_record_exists ? "yes" : "no"} |`)
    if (p.published_record_live_url) {
      md.push(`| published_record_live_url | <${p.published_record_live_url}> |`)
    }
    md.push(
      `| blocking_reasons | ${p.blocking_reasons.length === 0 ? "—" : p.blocking_reasons.map((b) => `\`${b}\``).join(", ")} |`,
    )
    md.push(`| version | ${p.version} |`)
    md.push(`| updated_at | ${p.final_copy_updated_at} |`)
    md.push("")
    md.push("**full_post_text:**")
    md.push("")
    md.push("```")
    md.push(p.full_post_text ?? "")
    md.push("```")
    md.push("")
    md.push("---")
    md.push("")
  }

  const mdPath = path.join(outDir, "POST_REVIEW_PACK.md")
  fs.writeFileSync(mdPath, md.join("\n"), "utf8")

  console.log(`wrote ${jsonPath}`)
  console.log(`wrote ${mdPath}`)
  console.log(`total posts: ${pack.length}`)
  console.log(`by status:`, Object.fromEntries(byStatus))
  console.log(`by language:`, Object.fromEntries(byLang))
  console.log(`by platform:`, Object.fromEntries(byPlatform))

  await c.end()
}
main().catch(async (e) => { console.error(e); try { await c.end() } catch {}; process.exit(1) })
