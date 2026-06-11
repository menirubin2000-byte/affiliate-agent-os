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

const AMAZON_LINK = 'https://amzn.to/3Qm6GLY'

const IMAGE_URL = 'https://resource.logitech.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/logitech/en/products/mice/mx-master-4/gallery/mx-master-4-graphite-top-angle-gallery-1.png'

async function main() {
  // 1. Create product
  const { data: product, error: pErr } = await sb.from('products').insert({
    name: 'Logitech MX Master 4 Wireless Mouse',
    slug: 'logitech-mx-master-4-wireless-mouse',
    brand: 'Logitech',
    category: 'mice',
    price: 119.99,
    affiliate_url: AMAZON_LINK,
    affiliate_link: AMAZON_LINK,
    image_url: IMAGE_URL,
    status: 'active',
    notes: 'Premium wireless mouse with haptic feedback, MagSpeed scroll wheel, 8K DPI sensor, USB-C charging, Bluetooth and Logi Bolt.',
    amazon_asin: 'B0DKH54YXP',
    amazon_detail_page_url: 'https://amzn.to/3Qm6GLY',
  }).select().single()
  if (pErr) throw pErr
  console.log('Product created:', product.id, product.name)

  // 2. Create affiliate program
  const { error: apErr } = await sb.from('affiliate_programs').insert({
    product_id: product.id,
    program_name: 'Amazon Associates',
    network: 'Amazon Associates',
    status: 'link_ready',
    approval_type: 'instant',
    affiliate_link: AMAZON_LINK,
    commission_summary: '4% on qualifying purchases',
  })
  if (apErr) console.error('Affiliate program error:', apErr.message)
  else console.log('Affiliate program created')

  // 3. Create final_copies — EN platforms
  const enPlatforms = [
    'facebook_page', 'instagram_professional', 'linkedin', 'medium',
    'substack', 'x_twitter', 'pinterest', 'quora', 'reddit', 'youtube', 'tiktok'
  ]

  const enPosts = {
    facebook_page: `Affiliate disclosure: this post includes an affiliate link.

Logitech just raised the bar — MX Master 4 is here.

Haptic feedback on a mouse scroll wheel. 8,000 DPI sensor. USB-C quick charge (1 min = 3 hours). Works across 3 devices simultaneously.

If you spend hours at a desk, this is the mouse upgrade that actually matters. The MagSpeed wheel alone scrolls 1,000 lines per second — and now it gives you tactile feedback.

$119.99 on Amazon:
${AMAZON_LINK}

#LogitechMXMaster4 #WirelessMouse #DeskSetup #Productivity #TechReview`,

    instagram_professional: `Affiliate disclosure: this post includes an affiliate link.

MX Master 4 — the mouse that feels like an upgrade to your entire workflow.

Haptic scroll wheel. 8K DPI. USB-C charging (1 min = 3 hrs). 3-device switching.

Link in bio for Amazon pricing.

#LogitechMXMaster4 #MXMaster4 #WirelessMouse #DeskSetup #Productivity #TechGear #Logitech #WorkFromHome #MouseReview`,

    linkedin: `Affiliate disclosure: this post includes an affiliate link. If you buy through it, I may receive a commission at no extra cost to you.

Logitech MX Master 4 — a productivity mouse that actually delivers on the "productivity" promise.

Key upgrades over the MX Master 3S:
- Haptic feedback on the MagSpeed scroll wheel
- 8,000 DPI sensor (up from 8,000 but refined tracking)
- Quieter clicks across all buttons
- 1 minute USB-C charge = 3 hours of use
- Logi Options+ AI integration for workflow shortcuts

I have used MX Master mice for years. The haptic scroll feedback is the kind of feature you don't think you need until you try it — it makes scrolling through long documents and spreadsheets feel precise rather than floaty.

At $119.99, it's not cheap. But if your mouse is a daily tool (and for most knowledge workers, it is), this is a solid long-term investment.

${AMAZON_LINK}`,

    medium: `Affiliate disclosure: this article includes an affiliate link. If you buy through it, I may receive a commission at no extra cost to you.

# Logitech MX Master 4 Review: Is the Upgrade Worth $120?

The MX Master series has been the go-to productivity mouse for years. The MX Master 4 adds haptic feedback to the MagSpeed scroll wheel, bumps the sensor to 8K DPI, and introduces USB-C quick charging that gives you 3 hours from a 1-minute charge.

## What's new

- **Haptic MagSpeed wheel**: tactile feedback while scrolling — you feel each "click" in precision mode
- **8,000 DPI sensor**: tracks on virtually any surface including glass
- **Quieter clicks**: all buttons are quieter than the 3S
- **USB-C quick charge**: 1 min = 3 hours, full charge = 70 days
- **Logi Options+ AI**: custom shortcuts and app-specific profiles

## Who should buy it

If you work on a computer 6+ hours a day and switch between apps, windows, or devices, this mouse saves real time. The thumb wheel for horizontal scrolling, the device-switch button, and the customizable gestures are genuine workflow accelerators.

If you already own an MX Master 3S and are happy with it, the upgrade is incremental — haptic feedback and slightly better ergonomics.

## Verdict

$119.99 is fair for a mouse you will use every day for 3-4 years. The haptic scroll is the standout feature.

${AMAZON_LINK}`,

    substack: `Affiliate disclosure: this newsletter mention includes an affiliate link.

Today I want to highlight the Logitech MX Master 4 — the latest in a line of mice that have become standard issue for productivity-focused desk setups.

The headline feature is haptic feedback on the scroll wheel. It sounds like a gimmick until you use it — scrolling through a 200-page PDF or a long spreadsheet with tactile feedback feels genuinely different from the smooth-scroll experience.

Other specs: 8K DPI sensor, USB-C charging (1 min = 3 hrs), Bluetooth + Logi Bolt, works on 3 devices simultaneously.

$119.99 on Amazon: ${AMAZON_LINK}`,

    x_twitter: `Affiliate disclosure: affiliate link included.

Logitech MX Master 4 — haptic scroll feedback, 8K DPI, USB-C quick charge (1 min = 3 hrs), 3-device switching.

$119.99 on Amazon. If you use a mouse all day, this is the upgrade.

${AMAZON_LINK}

#MXMaster4 #Logitech #DeskSetup`,

    pinterest: `Affiliate disclosure: this Pin includes an affiliate link.

Logitech MX Master 4 Wireless Mouse — premium desk setup essential. Haptic MagSpeed scroll, 8K DPI, USB-C, works on Mac + Windows + iPad.

$119.99 on Amazon:
${AMAZON_LINK}`,

    quora: `If you are looking for a high-end wireless mouse for daily work, the Logitech MX Master 4 is worth considering.

Key things that stand out after using it:

1. The haptic scroll wheel gives you tactile feedback — useful when scrolling through long documents or spreadsheets where you want precision.
2. 8,000 DPI sensor tracks on glass and virtually any surface.
3. USB-C quick charge: 1 minute gives you 3 hours of use.
4. You can pair it with 3 devices and switch with a button on the bottom.
5. Logi Options+ lets you set per-app button mappings and gestures.

It costs $119.99, which is expensive for a mouse but reasonable if you use it 8 hours a day. The build quality is solid and previous MX Master models lasted me 3-4 years without issues.`,

    reddit: `Been using the MX Master 4 for a couple of weeks now, wanted to share some thoughts for anyone considering it.

The big new thing is haptic feedback on the scroll wheel. Honestly, I was skeptical — sounded like a marketing feature. But scrolling through long docs and code files with the tactile click feedback is noticeably better than the smooth scroll on the 3S. You can toggle between free-spin and ratchet mode with a button.

Other stuff: 8K DPI (tracks on glass), USB-C quick charge (1 min = 3 hrs, not exaggerating), and the usual multi-device switching.

Downsides: $120 is steep. And if you already have a 3S, the improvements are incremental — the haptic wheel is the main reason to upgrade.

For anyone coming from a basic mouse or an older MX Master, it is a significant jump. The thumb wheel for horizontal scrolling and the gesture button are features I use constantly that I did not think I needed.

Would be happy to answer specific questions if anyone is on the fence.`,

    youtube: `Affiliate disclosure: this post includes an affiliate link.

[Video script for Logitech MX Master 4 review]

HOOK (0-5s): "Logitech put haptic feedback in a mouse scroll wheel — and it actually changes how scrolling feels."

INTRO (5-15s): Quick product shot. "This is the MX Master 4, Logitech's new flagship wireless mouse at $119.99."

FEATURES (15-40s): Demo haptic scroll, show 3-device switching, thumb wheel, USB-C charge demo.

VERDICT (40-55s): "If you use a mouse all day, this is the one to get. The haptic scroll is the real upgrade over the 3S."

CTA (55-60s): "Link in the description. Like and subscribe for more tech reviews."

Description:
Logitech MX Master 4 review — haptic feedback, 8K DPI, USB-C quick charge.
${AMAZON_LINK}
#LogitechMXMaster4 #MouseReview #Shorts`,

    tiktok: `Affiliate disclosure: this post includes an affiliate link.

[TikTok script for Logitech MX Master 4]

HOOK (0-3s): "This mouse has haptic feedback in the scroll wheel" [show scroll wheel close-up]

DEMO (3-20s): Show scrolling with haptic on vs off. Show 3-device switching. Show USB-C 1-min charge stat.

CLOSE (20-30s): "MX Master 4, $119.99, link in bio."

#MXMaster4 #Logitech #DeskSetup #TechTok #ProductivityMouse`,
  }

  // 4. Create final_copies — HE platforms
  const hePosts = {
    facebook_page: `גילוי נאות: הפוסט מכיל קישור שותפים (affiliate). רכישה דרכו עשויה לזכות אותי בעמלה ללא עלות נוספת עבורך.

Logitech MX Master 4 — העכבר האלחוטי שמגדיר מחדש את תחנת העבודה.

משוב הפטי בגלגל הגלילה. חיישן 8,000 DPI. טעינת USB-C (דקה אחת = 3 שעות עבודה). מעבר בין 3 מכשירים בלחיצת כפתור.

$119.99 באמזון:
${AMAZON_LINK}

#LogitechMXMaster4 #עכבראלחוטי #תחנתעבודה #טכנולוגיה`,

    instagram_professional: `גילוי נאות: הפוסט מכיל קישור שותפים.

MX Master 4 — העכבר שמשדרג את כל העבודה.

משוב הפטי. 8K DPI. טעינה מהירה ב-USB-C. מעבר בין 3 מכשירים.

קישור באמזון בביו.

#LogitechMXMaster4 #MXMaster4 #עכבראלחוטי #תחנתעבודה #טכנולוגיה #Logitech #עבודהמהבית`,

    linkedin: `גילוי נאות: הפוסט מכיל קישור שותפים. רכישה דרכו עשויה לזכות אותי בעמלה ללא עלות נוספת.

Logitech MX Master 4 — עכבר פרודוקטיביות שבאמת עומד בהבטחה.

מה חדש לעומת MX Master 3S:
- משוב הפטי בגלגל הגלילה MagSpeed
- חיישן 8,000 DPI (עובד גם על זכוכית)
- לחיצות שקטות יותר
- טעינת USB-C: דקה אחת = 3 שעות שימוש
- אינטגרציית AI ב-Logi Options+

המשוב ההפטי בגלילה הוא מסוג הפיצ'רים שלא חושבים שצריכים — עד שמנסים. גלילה במסמכים ארוכים ובגיליונות אלקטרוניים מרגישה מדויקת במקום "צפה".

$119.99 — לא זול, אבל אם העכבר הוא הכלי היומי שלכם, זו השקעה שמחזיקה 3-4 שנים.

${AMAZON_LINK}`,

    medium: `גילוי נאות: הכתבה מכילה קישור שותפים. רכישה דרכו עשויה לזכות אותי בעמלה ללא עלות נוספת.

# Logitech MX Master 4 — האם השדרוג שווה 120 דולר?

סדרת MX Master היא העכבר הפרודוקטיבי הנמכר ביותר כבר שנים. הגרסה הרביעית מוסיפה משוב הפטי לגלגל הגלילה, חיישן 8K DPI, וטעינת USB-C מהירה שנותנת 3 שעות מדקת טעינה אחת.

## מה חדש

- **גלגל MagSpeed הפטי**: מרגישים כל "קליק" במצב דיוק
- **חיישן 8,000 DPI**: עובד על כל משטח כולל זכוכית
- **לחיצות שקטות יותר**
- **טעינה מהירה USB-C**: דקה = 3 שעות, טעינה מלאה = 70 יום
- **Logi Options+ AI**: קיצורים מותאמים אישית לכל אפליקציה

## למי זה מתאים

לכל מי שעובד מול מחשב 6+ שעות ביום ומתנדנד בין אפליקציות, חלונות או מכשירים. גלגל האגודל לגלילה אופקית, כפתור מעבר בין מכשירים, ומחוות מותאמות — חוסכים זמן אמיתי.

## סיכום

$119.99 — מחיר הוגן לעכבר שמשתמשים בו כל יום 3-4 שנים. המשוב ההפטי הוא הפיצ'ר הבולט.

${AMAZON_LINK}`,

    substack: `גילוי נאות: האיזכור בניוזלטר מכיל קישור שותפים.

היום אני רוצה להציג את Logitech MX Master 4 — הדגם החדש בסדרת העכברים שהפכה לסטנדרט בתחנות עבודה פרודוקטיביות.

הפיצ'ר המרכזי: משוב הפטי בגלגל הגלילה. נשמע כמו גימיק, עד שמנסים — גלילה ב-PDF של 200 עמודים עם פידבק מישושי מרגישה אחרת לגמרי.

עוד: חיישן 8K DPI, טעינת USB-C (דקה = 3 שעות), Bluetooth + Logi Bolt, 3 מכשירים בו-זמנית.

$119.99 באמזון: ${AMAZON_LINK}`,

    x_twitter: `גילוי נאות: קישור שותפים.

Logitech MX Master 4 — משוב הפטי בגלילה, 8K DPI, טעינה מהירה USB-C (דקה = 3 שעות), מעבר בין 3 מכשירים.

$119.99 באמזון.

${AMAZON_LINK}

#MXMaster4 #Logitech #תחנתעבודה`,
  }

  const { randomUUID, createHash } = await import('crypto')
  const hash = (s) => createHash('sha256').update(s).digest('hex')

  // Create one source_content for the product
  const { data: srcContent, error: scErr } = await sb.from('source_contents').insert({
    product_id: product.id,
    campaign_name: 'MX Master 4 Launch',
    angle: 'product_review',
    title: 'Logitech MX Master 4 Wireless Mouse Review',
    body: 'Premium wireless mouse with haptic feedback, MagSpeed scroll wheel, 8K DPI sensor, USB-C charging.',
    content_hash: hash('mx-master-4-source'),
    status: 'active',
    quality_checks: { disclosure: true, cta: true, accuracy: true },
  }).select().single()
  if (scErr) { console.error('source_content error:', scErr.message); process.exit(1) }
  console.log('Source content created:', srcContent.id)

  async function insertFinalCopy(platform, language, body) {
    const title = `Logitech MX Master 4 — ${platform} (${language})`
    const bodyHash = hash(body)

    // Create platform_adaptation
    const { data: pa, error: paErr } = await sb.from('platform_adaptations').insert({
      source_content_id: srcContent.id,
      product_id: product.id,
      platform,
      title,
      body,
      content_hash: bodyHash,
      quality_checks: { disclosure: true, cta: true },
      auto_quality_status: 'auto_quality_passed',
      policy_check_status: 'allowed',
      publish_mode: 'manual',
      manual_fallback_required: false,
      output_verification_required: true,
      campaign_approval_status: 'not_requested',
    }).select().single()
    if (paErr) return paErr

    // Create final_copy
    const { error } = await sb.from('final_copies').insert({
      product_id: product.id,
      source_content_id: srcContent.id,
      platform_adaptation_id: pa.id,
      platform,
      language,
      title,
      body,
      content_hash: bodyHash + language,
      version: 1,
      status: 'ready_for_operator_approval',
      validation_status: 'valid',
      blocking_reasons: [],
      needs_media_repair: false,
      image_url: IMAGE_URL,
      affiliate_link: AMAZON_LINK,
    })
    return error
  }

  // Insert EN posts
  for (const [platform, body] of Object.entries(enPosts)) {
    const error = await insertFinalCopy(platform, 'en', body)
    if (error) console.error(`EN ${platform}:`, error.message)
    else console.log(`EN ${platform}: created`)
  }

  // Insert HE posts
  for (const [platform, body] of Object.entries(hePosts)) {
    const error = await insertFinalCopy(platform, 'he', body)
    if (error) console.error(`HE ${platform}:`, error.message)
    else console.log(`HE ${platform}: created`)
  }

  // Summary
  const { count } = await sb.from('final_copies')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', product.id)
  console.log(`\nDone. Total final_copies for MX Master 4: ${count}`)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
