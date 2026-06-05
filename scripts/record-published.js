const { Client } = require("pg")
require("dotenv").config({ path: ".env.local" })
const { requireDirectPublishOverride } = require("./safety-guard")

if (!process.env.SUPABASE_DB_PASSWORD) {
  throw new Error("SUPABASE_DB_PASSWORD is required in .env.local")
}

const c = new Client({
  host: "db.gbkwydsodondarccqyet.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

// These posts are already published with real operator-confirmed URLs.
const PUBLISHED = [
  {
    product: "Systeme.io",
    platform: "linkedin",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7466268842743422976/",
  },
  {
    product: "Systeme.io",
    platform: "medium",
    url: "https://medium.com/@Rubin-Q.S/systeme-io-review-free-funnel-and-email-marketing-platform-for-online-businesses-8c4f042ceaa9",
  },
  {
    product: "Systeme.io",
    platform: "substack",
    url: "https://menirubin.substack.com/p/systemeio-review",
  },
  {
    product: "ElevenLabs",
    platform: "linkedin",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7466494313263284224/",
  },
  {
    product: "ElevenLabs",
    platform: "medium",
    url: "https://medium.com/@Rubin-Q.S/elevenlabs-review-is-it-worth-it-in-2026-e9f198c5c04f",
  },
  {
    product: "ElevenLabs",
    platform: "substack",
    url: "https://menirubin.substack.com/p/elevenlabs-quick-review",
  },
]

async function main() {
  requireDirectPublishOverride("scripts/record-published.js")

  await c.connect()

  for (const pub of PUBLISHED) {
    const fc = await c.query(
      `
        select
          fc.id,
          fc.product_id,
          fc.source_content_id,
          fc.platform_adaptation_id,
          ca.id as campaign_approval_id
        from final_copies fc
        join products p on p.id = fc.product_id
        left join campaign_approvals ca
          on ca.source_content_id = fc.source_content_id
         and ca.status = 'approved'
         and ca.approved_platforms @> array[fc.platform]::text[]
        where p.name = $1
          and fc.platform = $2
        order by fc.version desc
        limit 1
      `,
      [pub.product, pub.platform],
    )

    if (!fc.rows.length) {
      console.log("NO_FINAL_COPY:", pub.product, pub.platform)
      continue
    }

    const finalCopy = fc.rows[0]
    const existing = await c.query(
      `
        select id
        from published_records
        where final_copy_id = $1
           or (platform = $2 and live_url = $3)
        limit 1
      `,
      [finalCopy.id, pub.platform, pub.url],
    )

    if (existing.rows.length) {
      console.log("ALREADY_RECORDED:", pub.product, pub.platform)
      continue
    }

    await c.query(
      `
        insert into published_records (
          product_id,
          source_content_id,
          platform_adaptation_id,
          platform,
          live_url,
          verification_status,
          verified_at,
          final_copy_id,
          campaign_approval_id
        )
        values ($1, $2, $3, $4, $5, 'verified', now(), $6, $7)
        on conflict (platform, live_url) do nothing
      `,
      [
        finalCopy.product_id,
        finalCopy.source_content_id,
        finalCopy.platform_adaptation_id,
        pub.platform,
        pub.url,
        finalCopy.id,
        finalCopy.campaign_approval_id,
      ],
    )

    await c.query(
      `
        update final_copies
        set status = 'published_verified',
            updated_at = now()
        where id = $1
      `,
      [finalCopy.id],
    )

    console.log("RECORDED:", pub.product, pub.platform, pub.url)
  }

  const summary = await c.query(`
    select status, count(*)::int as count
    from final_copies
    group by status
    order by status
  `)
  console.log("FINAL_COPY_STATUS_SUMMARY:")
  for (const row of summary.rows) console.log(`${row.status}: ${row.count}`)

  await c.end()
}

main().catch(async (error) => {
  console.error(error.message)
  try {
    await c.end()
  } catch {}
  process.exitCode = 1
})
