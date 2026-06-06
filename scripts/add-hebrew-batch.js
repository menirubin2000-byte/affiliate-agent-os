// Hebrew content pipeline for the 4 products that have a Hebrew product image
// (image_url_he): AhaSlides, Joiin, Reditus, Systeme.io.
//
// Same idempotent ensure* pattern as the English batch. For each product we
// create (if missing):
//   - a Hebrew source_content
//   - a Hebrew platform_adaptation per platform (linkedin / medium / substack)
//   - a final_copy with language='he', status='ready_for_operator_approval',
//     validation_status='valid'
//
// The dashboard auto-pairs language='he' final_copies with image_url_he.
// MENI still approves manually — no auto-approval, no publish_job, no
// published_record created here.

require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")
const crypto = require("crypto")
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

const PRODUCTS = [
  {
    name: "AhaSlides",
    category: "מצגות אינטראקטיביות",
    description:
      "פלטפורמת מצגות אינטראקטיביות עם סקרים בזמן אמת, שאלות מהקהל, ענן מילים וחידונים. עובדת בדפדפן בלי התקנה.",
    angle: "להפוך מצגות חד-כיווניות לדיון פעיל עם הקהל בלי כלים חיצוניים",
    audience: "מרצים, מנחים, מורים ומנהלי הדרכה",
    use_cases: [
      "סקרים חיים במהלך מצגות",
      "שאלות מהקהל עם הצבעת קהל",
      "חידונים תחרותיים בסשנים",
      "ענני מילים לפתיחת דיון",
      "תיאום סדנאות וסיעורי מוחות",
    ],
  },
  {
    name: "Joiin",
    category: "דוחות פיננסיים מאוחדים",
    description:
      "פלטפורמה לאיחוד דוחות פיננסיים בין כמה ישויות מ-QuickBooks ו-Xero לדוח אחד. חוסכת עבודת אקסל ידנית.",
    angle: "לאחד דוחות מ-QuickBooks ו-Xero של מספר חברות לדוח אחד בלי גיליונות",
    audience: "רואי חשבון, CFO חיצוניים וצוותי כספים שמנהלים קבוצת חברות",
    use_cases: [
      "איחוד דוחות רווח והפסד בין ישויות",
      "דוחות במספר מטבעות",
      "חבילות דיווח ללקוחות של רואי חשבון",
      "השוואת תזרים מזומנים ותקציבים קבוצתיים",
      "ירידה לפרטים בכל ישות מדוח מאוחד אחד",
    ],
  },
  {
    name: "Reditus",
    category: "רשת שותפים ל-SaaS",
    description:
      "רשת שותפים ייעודית לעסקי SaaS - מציעה תוכניות שותפים, מערכת מעקב, דוחות וגישה לקטלוג מוצרים אמיתי שאפשר לקדם.",
    angle: "להתחיל קידום שותפים ל-SaaS בלי לחפש תוכניות בנפרד - הכל במקום אחד",
    audience: "משווקי שותפים, יוצרי תוכן ובעלי בלוגים בתחום SaaS",
    use_cases: [
      "גישה לעשרות תוכניות שותפים של SaaS",
      "קישורי שותף מותאמים אישית לכל מוצר",
      "מעקב קליקים, רישומים ועמלות",
      "תשלום מאוחד מכל התוכניות",
      "דוחות ביצועים פר מוצר",
    ],
  },
  {
    name: "Systeme.io",
    category: "פלטפורמת שיווק כל-באחד",
    description:
      "פלטפורמת שיווק אחת לבניית משפכי מכירות, ניוזלטרים, אוטומציות, חברות, קורסים, אתרים ותוכנית שותפים - הכל בחבילה אחת.",
    angle: "להחליף 5-6 כלי שיווק שונים במערכת אחת בלי לאבד יכולות",
    audience: "יוצרי תוכן, יזמים סולו ובעלי עסקים קטנים",
    use_cases: [
      "בניית משפכי מכירות עם דפי נחיתה",
      "ניוזלטרים ואוטומציות אימייל",
      "מכירת קורסים ומועדוני חברות",
      "ניהול תוכנית שותפים פנימית",
      "פלטפורמה חופשית עד 2,000 אנשי קשר",
    ],
  },
]

const PLATFORMS = ["linkedin", "medium", "substack"]

function buildPost(p, platform) {
  if (platform === "linkedin") {
    return {
      title: `${p.name} - ${p.category} שמתאימה ל${p.audience.split(",")[0]}`,
      body: `*גילוי שותפים: הפוסט כולל קישור שותף. אם רוכשים דרך הקישור אני מקבל עמלה בלי עלות נוספת לכם.*

לאחרונה בדקתי את ${p.name} בקטגוריית ${p.category}.

מה שבלט: ${p.angle}.

איפה זה מתאים:
${p.use_cases.slice(0, 4).map((u) => `- ${u}`).join("\n")}

למי זה הכי מתאים: ${p.audience}.

מה כדאי לדעת לפני שמתחילים:
- מנוי חודשי לשימוש מלא
- כלי ייעודי - ההתאמה תלויה במערכות הקיימות שלכם
- חלק מהיכולות נפתחות בתוכניות גבוהות יותר

שווה לבחון מול מה שאתם משתמשים היום.

נסו את ${p.name}: ${p.link}`,
    }
  }
  if (platform === "medium") {
    return {
      title: `${p.name} - סקירה מעשית ל${p.audience.split(",")[0]} ב-2026`,
      body: `*גילוי שותפים: המאמר כולל קישור שותף. אם רוכשים דרך הקישור אני מקבל עמלה בלי עלות נוספת לכם.*

## למה לבחון את ${p.name}

${p.description}

הזווית שמעניינת אצל ${p.name}: ${p.angle}.

## מקרי שימוש

${p.use_cases.map((u) => `- ${u}`).join("\n")}

## למי זה מתאים

${p.audience}.

## מה כדאי לדעת מראש

- מנוי חודשי נדרש לשימוש רציני
- כלי ייעודי - ההתאמה תלויה במערכות הקיימות שלכם
- חלק מהיכולות המתקדמות בתוכניות גבוהות יותר

## שורה תחתונה

אם אתם כבר עושים את העבודה ש-${p.name} נבנה עבורה - שווה לבחון אותו מול הפתרון הנוכחי שלכם. רוב התוכניות מאפשרות התחלה ברמה נמוכה כדי לבדוק לפני שמשלמים על הגדולות.

[נסו את ${p.name} כאן](${p.link})`,
    }
  }
  if (platform === "substack") {
    return {
      title: `${p.name}: מבט מעשי על ${p.category}`,
      body: `*גילוי שותפים: הפוסט כולל קישור שותף.*

## למה ${p.name}

${p.description}

הסיבה שבדקתי: ${p.angle}.

## מקרי שימוש

${p.use_cases.map((u) => `- ${u}`).join("\n")}

## למי זה מתאים

${p.audience}.

## מה כדאי לדעת

- מנוי חודשי לשימוש רציני
- כלי ייעודי - ההתאמה תלויה במערכות הקיימות שלכם
- יכולות מתקדמות בתוכניות גבוהות יותר

## שורה תחתונה

אם אתם כבר עושים את העבודה ש-${p.name} נבנה עבורה - שווה להתחיל ברמה הנמוכה ביותר ולבחון מול הפתרון הנוכחי לפני שמרחיבים.

[נסו את ${p.name} כאן](${p.link})`,
    }
  }
  throw new Error(`Unknown platform ${platform}`)
}

function shortHash(s) {
  return crypto.createHash("sha256").update(s).digest("hex").substring(0, 16)
}

async function getProductAndProgram(name) {
  const p = await c.query("SELECT id FROM products WHERE name = $1 LIMIT 1", [name])
  if (!p.rows.length) throw new Error(`Product not found: ${name}`)
  const productId = p.rows[0].id
  const ap = await c.query(
    `SELECT id, affiliate_link FROM affiliate_programs
     WHERE product_id = $1 AND status = 'link_ready' AND coalesce(affiliate_link,'') <> ''
     ORDER BY updated_at DESC LIMIT 1`,
    [productId],
  )
  if (!ap.rows.length) throw new Error(`No link_ready affiliate_program for ${name}`)
  return { productId, affiliateProgramId: ap.rows[0].id, affiliateLink: ap.rows[0].affiliate_link }
}

async function ensureHebrewSourceContent(productId, p) {
  // We keep one source_content per (product, angle). If there's already an
  // 'active' Hebrew source for this product, reuse it.
  const existing = await c.query(
    "SELECT id FROM source_contents WHERE product_id = $1 AND campaign_name LIKE '%_review_he' LIMIT 1",
    [productId],
  )
  if (existing.rows.length) return { id: existing.rows[0].id, created: false }
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")
  const ins = await c.query(
    `INSERT INTO source_contents
       (product_id, campaign_name, angle, title, body, target_keyword, content_hash, status)
     VALUES ($1, $2, 'review_he', $3, $4, $5, $6, 'active')
     RETURNING id`,
    [
      productId,
      `${slug}_review_he`,
      `${p.name} - סקירה בעברית`,
      p.description,
      `${p.name.toLowerCase()} סקירה`,
      `${slug}_src_he_1`,
    ],
  )
  return { id: ins.rows[0].id, created: true }
}

async function ensureHebrewPlatformAdaptation(productId, sourceContentId, platform, post) {
  // Avoid clobbering the existing English adaptation. Hebrew adaptations are
  // keyed by sha-stable hash on the Hebrew body so re-runs are idempotent.
  const heHash = shortHash(post.body)
  const existing = await c.query(
    "SELECT id FROM platform_adaptations WHERE product_id = $1 AND platform = $2 AND content_hash = $3",
    [productId, platform, heHash],
  )
  if (existing.rows.length) return { id: existing.rows[0].id, created: false }
  const r = await c.query(
    `INSERT INTO platform_adaptations
       (source_content_id, product_id, platform, title, body, content_hash)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [sourceContentId, productId, platform, post.title, post.body, heHash],
  )
  return { id: r.rows[0].id, created: true }
}

async function ensureHebrewFinalCopy({
  productId,
  affiliateProgramId,
  affiliateLink,
  sourceContentId,
  platformAdaptationId,
  platform,
  post,
}) {
  // Idempotent on platform_adaptation_id — each Hebrew adaptation gets one
  // final_copy.
  const existing = await c.query(
    "SELECT id, status, language FROM final_copies WHERE platform_adaptation_id = $1 LIMIT 1",
    [platformAdaptationId],
  )
  if (existing.rows.length) {
    return { id: existing.rows[0].id, status: existing.rows[0].status, created: false }
  }
  const hash = shortHash(post.body)
  const ins = await c.query(
    `INSERT INTO final_copies
       (product_id, affiliate_program_id, affiliate_link, source_content_id, platform_adaptation_id,
        platform, title, body, content_hash, version, status, validation_status, blocking_reasons, language)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,'ready_for_operator_approval','valid','{}','he')
     RETURNING id`,
    [
      productId,
      affiliateProgramId,
      affiliateLink,
      sourceContentId,
      platformAdaptationId,
      platform,
      post.title,
      post.body,
      hash,
    ],
  )
  return { id: ins.rows[0].id, status: "ready_for_operator_approval", created: true }
}

function writeReviewFiles(p, platform, post, ids) {
  const slug = p.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "")
  const dir = path.join(__dirname, "..", "content", "review-queue", slug)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `${platform}.he.md`), post.body, "utf8")
  fs.writeFileSync(
    path.join(dir, `${platform}.he.metadata.json`),
    JSON.stringify(
      {
        product: p.name,
        platform,
        language: "he",
        status: "ready_for_operator_approval",
        affiliate_link: p.link,
        source_content_id: ids.sourceContentId,
        platform_adaptation_id: ids.platformAdaptationId,
        final_copy_id: ids.finalCopyId,
        validation_status: "valid",
        blocking_reasons: [],
        reviewer_status: "ready_for_review",
        reviewer_notes: "מוכן לאישור MENI - גרסה עברית עם תמונה עברית",
        content_hash: shortHash(post.body),
      },
      null,
      2,
    ),
    "utf8",
  )
}

async function main() {
  await c.connect()
  console.log(`Generating Hebrew content for ${PRODUCTS.length} products × ${PLATFORMS.length} platforms`)

  let createdSourceContents = 0
  let createdAdaptations = 0
  let createdFinalCopies = 0
  let skippedFinalCopies = 0

  for (const p of PRODUCTS) {
    console.log(`\n→ ${p.name}`)
    const { productId, affiliateProgramId, affiliateLink } = await getProductAndProgram(p.name)
    p.link = affiliateLink  // pull the real link from DB so it's never stale
    const source = await ensureHebrewSourceContent(productId, p)
    if (source.created) createdSourceContents++
    console.log(`  HE source_content: ${source.id} ${source.created ? "(new)" : "(existing)"}`)
    for (const platform of PLATFORMS) {
      const post = buildPost(p, platform)
      const adaptation = await ensureHebrewPlatformAdaptation(productId, source.id, platform, post)
      if (adaptation.created) createdAdaptations++
      const finalCopy = await ensureHebrewFinalCopy({
        productId,
        affiliateProgramId,
        affiliateLink,
        sourceContentId: source.id,
        platformAdaptationId: adaptation.id,
        platform,
        post,
      })
      if (finalCopy.created) {
        createdFinalCopies++
        console.log(`  · ${platform.padEnd(8)} HE final_copy=${finalCopy.id} (new)`)
        writeReviewFiles(p, platform, post, {
          sourceContentId: source.id,
          platformAdaptationId: adaptation.id,
          finalCopyId: finalCopy.id,
        })
      } else {
        skippedFinalCopies++
        console.log(`  · ${platform.padEnd(8)} HE final_copy=${finalCopy.id} (existing, status=${finalCopy.status})`)
      }
    }
  }

  console.log("\n=== summary ===")
  console.log(`HE source_contents created:      ${createdSourceContents}`)
  console.log(`HE platform_adaptations created: ${createdAdaptations}`)
  console.log(`HE final_copies created:         ${createdFinalCopies}`)
  console.log(`HE final_copies skipped:         ${skippedFinalCopies}`)

  const rep = await c.query(
    `SELECT p.name, fc.platform, fc.language, fc.status
     FROM final_copies fc
     JOIN products p ON p.id = fc.product_id
     WHERE p.name IN ('AhaSlides','Joiin','Reditus','Systeme.io') AND fc.language='he'
     ORDER BY p.name, fc.platform`,
  )
  console.log("\n=== Hebrew final_copies in DB ===")
  for (const r of rep.rows) console.log(`  ${r.name.padEnd(12)} ${r.platform.padEnd(10)} ${r.language} ${r.status}`)

  await c.end()
}

main().catch(async (e) => {
  console.error("FATAL:", e)
  try { await c.end() } catch {}
  process.exit(1)
})
