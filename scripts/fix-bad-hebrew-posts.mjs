import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { createClient } from "@supabase/supabase-js"

const envRaw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
const env = Object.fromEntries(
  envRaw
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("=")
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
    }),
)

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const BAD_TITLE_RE =
  /\(HE\)|\(he\)|instagram_professional|facebook_page|x_twitter|YouTube Shorts/i
const BAD_BODY_RE = /טיוטת פוסט YouTube Shorts|מבנה הסרטון|להוסיף וידאו לפני פרסום/i

const NO_DIRECT_LINK = new Set(["reddit", "quora"])
const VIDEO_PLATFORMS = new Set(["youtube", "tiktok"])

function hashContent(title, body) {
  return createHash("sha256").update(`${title}\n\n${body}`).digest("hex")
}

function isBadRow(row) {
  const title = row.title ?? ""
  const body = row.body ?? ""
  const blockers = Array.isArray(row.blocking_reasons) ? row.blocking_reasons : []
  return (
    !title.trim() ||
    BAD_TITLE_RE.test(title) ||
    BAD_BODY_RE.test(body) ||
    title.includes("????") ||
    body.includes("????") ||
    body.includes("Affiliate disclosure:") ||
    (VIDEO_PLATFORMS.has(row.platform) &&
      row.needs_media_repair &&
      !row.media_asset_url &&
      (row.status !== "needs_system_fix" || !blockers.includes("video_required_for_ready")))
  )
}

function shortName(name) {
  const exact = {
    "Logitech MX Master 4 Wireless Mouse": "Logitech MX Master 4",
    "Logitech MX Vertical Wireless Mouse": "Logitech MX Vertical",
    "Philips Norelco Head Shaver Pro 9000 Series": "Philips Head Shaver 9000",
    "Philips Sonicare 6500 Series Electric Toothbrush": "Philips Sonicare 6500",
    "Waterpik Cordless Gem Water Flosser 5100": "Waterpik Gem 5100",
    "OWC 11-Port Thunderbolt 4 Dock": "OWC Thunderbolt 4 Dock",
    "OBSBOT Tiny 2 Lite 4K Webcam": "OBSBOT Tiny 2 Lite 4K",
    "Seagate One Touch 8TB External Hard Drive Desktop HDD": "Seagate One Touch 8TB",
    "FIFINE AmpliTank TANK6S Vocal Dynamic Microphone": "FIFINE TANK6S",
    "Baseus Bass EH10 NC Headphones": "Baseus EH10 NC",
    "Baseus Inspire XC1 Sound / Bose edition": "Baseus Inspire XC1",
    "Foldable 360 Laptop Stand 10-17 inch": "Foldable 360 Laptop Stand",
    "Comfast AC1200 Outdoor WiFi AP / Repeater": "Comfast AC1200",
    "UGREEN Revodok Max 17-Port Thunderbolt 5 Dock": "UGREEN Revodok Max",
    "SSK 1TB SSD External Hard Drive Portable SSD": "SSK 1TB SSD",
    "Crucial Pro DDR5 RAM 16GBx1/16GBx2 6400MHz 6000MHz 5600MHz Desktop Gaming Memory Intel XMP 3.0 & AMD EXPO for PC Gamer":
      "Crucial Pro DDR5",
    "Kingston FURY Beast DDR5 6000MHz Desktop Gaming Memory Intel XMP 3.0 & AMD EXPO":
      "Kingston FURY Beast DDR5",
  }
  return exact[name] ?? name
}

function metaForProduct(name, category) {
  const alias = shortName(name)

  const exact = {
    Willo: {
      alias,
      problem: "סינון ראשוני של מועמדים גוזל שעות, במיוחד כשצריך לתאם שיחות עם כל מועמד.",
      solution:
        "Willo מאפשר למועמדים לשלוח תשובות בווידאו, אודיו או טקסט בזמן שנוח להם, בלי שיחת זום ובלי תיאומים.",
      audience: "מגייסים, מנהלי גיוס וסוכנויות שמטפלים בהרבה מועמדים במקביל.",
      checks: [
        "לבדוק אם התהליך שלכם באמת בנוי לראיונות אסינכרוניים ולא לשיחה חיה.",
        "לבדוק איך התשובות נשמרות, משותפות ומתחברות למערכת הגיוס הקיימת.",
        "לוודא שחוויית המועמד נשארת קצרה וברורה כדי לא לאבד מועמדים טובים.",
      ],
      takeaway: "אם צוואר הבקבוק אצלכם הוא שיחות סינון, Willo יכול לחסוך זמן כמעט מיידית.",
      tags: ["willo", "recruiting", "hrtech", "hiring"],
    },
    "Ad Turbo": {
      alias,
      problem: "כתיבת וריאציות למודעות ממומנות לוקחת זמן ומאטה את קצב הבדיקות.",
      solution:
        "Ad Turbo מייצר במהירות כותרות, תיאורים ורעיונות לקריאייטיב כדי שתוכלו לבדוק יותר מודעות בפחות זמן.",
      audience: "מנהלי קמפיינים, סוכנויות ומי שמריץ פרסום ממומן על בסיס קבוע.",
      checks: [
        "לבדוק אם התוצרים מספיק קרובים לשפה של המותג שלכם.",
        "לבדוק אילו פלטפורמות ותבניות מודעה הכלי מכסה בפועל.",
        "לבדוק כמה עריכה אנושית עדיין נדרשת לפני העלאה לקמפיין.",
      ],
      takeaway: "זה כלי חוסך זמן, לא תחליף מלא לאסטרטגיה או לבקרת איכות.",
      tags: ["ads", "marketing", "ai", "performance"],
    },
    Algomo: {
      alias,
      problem: "פניות שירות חוזרות גומרות לצוות את הזמן, במיוחד כשאין כיסוי 24/7.",
      solution:
        "Algomo מוסיף בוט שירות ומכירה שמטפל בשאלות נפוצות, מסנן פניות ותופס לידים גם מחוץ לשעות העבודה.",
      audience: "חברות SaaS, אתרי איקומרס ועסקים עם נפח תמיכה חוזר.",
      checks: [
        "לבדוק אם מאגר הידע שלכם מספיק טוב כדי לאמן את הבוט.",
        "לבדוק איך הבוט מעביר פניות מורכבות לנציג אנושי.",
        "לבדוק מה רמת השליטה על הטון, השפה והאיסוף של לידים.",
      ],
      takeaway: "כשהעומס הוא שאלות שחוזרות על עצמן, Algomo יכול להוריד לחץ מהצוות מהר מאוד.",
      tags: ["support", "chatbot", "ai", "saas"],
    },
    Audiorista: {
      alias,
      problem: "הפצת אודיו לכמה ערוצים דורשת העלאה ידנית, התאמות פורמט ומעקב מפוזר.",
      solution:
        "Audiorista מרכז את פרסום והפצת האודיו במקום אחד, כדי להעלות פעם אחת ולנהל משם את השאר.",
      audience: "פודקאסטרים, יוצרי תוכן אודיו ועסקים שבונים ערוצי תוכן קוליים.",
      checks: [
        "לבדוק לאילו פלטפורמות ההפצה באמת מגיעה.",
        "לבדוק אם יש סטטיסטיקות שימוש ברמה שאתם צריכים.",
        "לבדוק אם ממשק העבודה נוח לצוות ולא רק ליוצר יחיד.",
      ],
      takeaway: "אם האתגר הוא אדמיניסטרציה של הפצה, זה כלי ששווה לבדוק.",
      tags: ["audio", "podcast", "distribution", "creator"],
    },
    EmailListVerify: {
      alias,
      problem: "שליחה לכתובות בעייתיות פוגעת בדליברביליות ומעלה Bounce מיותר.",
      solution:
        "EmailListVerify מנקה רשימות לפני שליחה ומסמן כתובות לא תקינות, מסוכנות או חד-פעמיות.",
      audience: "צוותי אימייל מרקטינג, אאוטריץ' וכל מי ששולח לנפח גדול של אנשי קשר.",
      checks: [
        "לבדוק איך הכלי מטפל בכתובות catch-all ובתיבות מסוכנות.",
        "לבדוק אם יש חיבור נוח ל-CRM או לכלי השליחה שלכם.",
        "לבדוק את המודל התמחורי מול נפח הרשימות האמיתי שלכם.",
      ],
      takeaway: "אם הדליברביליות חשובה לכם, ניקוי רשימות לפני קמפיין הוא לא מותרות.",
      tags: ["email", "deliverability", "outreach", "marketing"],
    },
    "Geo Targetly": {
      alias,
      problem: "אותו אתר לכולם אומר שגולשים ממדינות שונות רואים מסר, שפה או הצעה לא רלוונטיים.",
      solution:
        "Geo Targetly מפנה מבקרים לעמוד, שפה או הצעה שמתאימים למיקום שלהם בלי תחזוקה ידנית.",
      audience: "אתרי SaaS, חנויות אונליין ואפיליאייטים עם תנועה מכמה מדינות.",
      checks: [
        "לבדוק עד כמה קל לנהל חוקים לכמה אזורים ושפות.",
        "לבדוק אם יש השפעה על SEO וניתובים קיימים.",
        "לבדוק האם אפשר להריץ ניסויים בלי לשבור את חוויית המשתמש.",
      ],
      takeaway: "כשהאתר פונה לקהלים גלובליים, התאמה לפי מיקום יכולה לשפר המרות מהר.",
      tags: ["geo", "personalization", "conversion", "saas"],
    },
    GetResponse: {
      alias,
      problem: "שימוש בכמה כלים שונים לדפי נחיתה, אימייל ואוטומציה יוצר עומס וחיכוך.",
      solution:
        "GetResponse מרכז אימייל מרקטינג, אוטומציות, דפי נחיתה ולעיתים גם וובינרים בתוך מערכת אחת.",
      audience: "יוצרים, עסקים קטנים וצוותי שיווק שרוצים סטאק פשוט יותר.",
      checks: [
        "לבדוק אם בונה האוטומציות מספיק חזק למקרי השימוש שלכם.",
        "לבדוק את מגבלות התוכנית החינמית או הזולה.",
        "לבדוק אם אתם באמת צריכים מערכת all-in-one ולא כלי נפרד לכל שכבה.",
      ],
      takeaway: "למי שמעדיף פשטות על פני סטאק מפורק, זה פתרון שקל להכניס לעבודה.",
      tags: ["emailmarketing", "automation", "landingpages", "saas"],
    },
    GrapeLeads: {
      alias,
      problem: "בניית רשימות לידים ידנית לוקחת זמן ועדיין משאירה אתכם עם דאטה לא נקי.",
      solution:
        "GrapeLeads עוזר למצוא לידים ממוקדים ולצמצם את שלב החיפוש לפני האאוטריץ'.",
      audience: "מייסדים, אנשי מכירות וסוכנויות שבונות צינור לידים באופן קבוע.",
      checks: [
        "לבדוק מאילו מקורות הדאטה מגיעה האיכות.",
        "לבדוק אם אפשר לסנן לפי ICP אמיתי ולא רק לפי תפקיד וחברה.",
        "לבדוק כמה ניקוי נוסף עדיין נדרש לפני שליחה.",
      ],
      takeaway: "אם צוואר הבקבוק הוא איסוף דאטה, זה כלי ששווה בדיקה.",
      tags: ["leads", "outbound", "sales", "b2b"],
    },
    Guideflow: {
      alias,
      problem: "דמואים חיים לא סקיילביליים, אבל לקוחות עדיין רוצים להבין את המוצר לפני שיחה.",
      solution:
        "Guideflow יוצר walkthrough אינטראקטיבי שהלקוח יכול לעבור לבד ולהבין את המוצר בלי לתאם שיחה.",
      audience: "חברות SaaS, צוותי מכירות ומנהלי מוצר שמוכרים מערכת מורכבת יחסית.",
      checks: [
        "לבדוק כמה קל לעדכן דמו כשהמוצר משתנה.",
        "לבדוק אם יש אנליטיקה על נקודות נטישה ועניין.",
        "לבדוק האם אפשר להטמיע את הדמו באתר ובתהליך המכירה הקיים.",
      ],
      takeaway: "אם הרבה לידים מבקשים 'רק לראות איך זה עובד', Guideflow יכול לקצר תהליך.",
      tags: ["demo", "productmarketing", "saas", "sales"],
    },
    Joiin: {
      alias,
      problem: "איחוד דוחות מכמה מערכות חשבונאיות גורר אקסלים, ייצוא ידני והרבה בזבוז זמן.",
      solution:
        "Joiin מרכז נתונים פיננסיים מכמה ישויות ומערכות לדוחות ברורים ודשבורדים אוטומטיים.",
      audience: "CFOs, מנהלי כספים ומשרדים שמנהלים דיווח על כמה חברות או לקוחות.",
      checks: [
        "לבדוק לאילו מערכות חשבונאיות יש חיבור אמיתי.",
        "לבדוק איזה עומק דיווח והתאמות מטבע קיימים.",
        "לבדוק אם אפשר לייצא בקלות את הנתונים למבנה שהצוות כבר רגיל אליו.",
      ],
      takeaway: "אם הדיווח שלכם נופל על גיליונות, Joiin יכול לחסוך עבודה שחוזרת כל חודש.",
      tags: ["finance", "reporting", "accounting", "saas"],
    },
    "Leader Leads": {
      alias,
      problem: "איסוף לידים, אימות מיילים והרצת רצפים מכמה כלים שונים מאט את האאוטריץ'.",
      solution:
        "Leader Leads מרכז חיפוש לידים, אימות דאטה והתחלת רצפי אאוטריץ' תחת אותה עבודה.",
      audience: "צוותי מכירות, סוכנויות ומייסדים שעובדים outbound באופן קבוע.",
      checks: [
        "לבדוק מאיפה מגיעים הנתונים ועד כמה הם עדכניים.",
        "לבדוק האם יש מגבלות על נפח חיפוש, ייצוא ושליחה.",
        "לבדוק אם זה מחליף לכם כלי קיים או רק מוסיף עוד שכבה.",
      ],
      takeaway: "כשהבעיה היא פיצול בכלי המכירות, פלטפורמה אחת יכולה לחסוך הרבה חיכוך.",
      tags: ["leadgen", "sales", "outbound", "saas"],
    },
    Pricefy: {
      alias,
      problem: "מעקב ידני אחרי מחירי מתחרים נהיה לא מדויק תוך יום וגוזל זמן מיותר.",
      solution:
        "Pricefy מנטר מחירי מתחרים אוטומטית ומתריע כשיש שינוי שדורש תגובה.",
      audience: "מנהלי איקומרס, מותגים וקמעונאים שמתחרים על מחיר ונראות.",
      checks: [
        "לבדוק באילו אתרים וקטגוריות הכלי יודע לנטר טוב באמת.",
        "לבדוק אם ההתראות מגיעות בקצב שנוח לצוות שלכם.",
        "לבדוק האם יש מספיק היסטוריה וניתוח כדי לא רק להגיב אלא גם להבין מגמה.",
      ],
      takeaway: "אם תמחור תחרותי משפיע על המכירות שלכם, Pricefy פותר עבודה ידנית מתישה.",
      tags: ["pricing", "ecommerce", "monitoring", "retail"],
    },
    "Search Atlas": {
      alias,
      problem: "קפיצה בין כמה כלי SEO לכל משימה מאטה ניתוח, תוכן ומעקב.",
      solution:
        "Search Atlas מרכז מחקר מילות מפתח, אופטימיזציה, מעקב דירוגים וכלי audit בפלטפורמה אחת.",
      audience: "אנשי SEO, סוכנויות תוכן וצוותי שיווק שרוצים פחות פיזור.",
      checks: [
        "לבדוק אם הדאטה של הכלי מספיק חזק לשווקים שאתם עובדים בהם.",
        "לבדוק אילו יכולות באמת מחליפות לכם כלים אחרים.",
        "לבדוק אם העלות מצדיקה קונסולידציה של הסטאק הקיים.",
      ],
      takeaway: "כשהכאוס הוא בעודף כלים, Search Atlas עשוי לפשט את העבודה.",
      tags: ["seo", "content", "marketing", "saas"],
    },
    SignEasy: {
      alias,
      problem: "חתימה, סריקה ושליחה של מסמכים ידנית עדיין שורפת זמן על תהליך פשוט.",
      solution:
        "SignEasy מאפשר לשלוח, לחתום ולעקוב אחרי מסמכים דיגיטלית בלי לעבוד עם PDF ידני.",
      audience: "פרילנסרים, עסקים קטנים, מכירות וצוותים שעובדים מרחוק.",
      checks: [
        "לבדוק אם התבניות וה-workflows מתאימים למסמכים שלכם.",
        "לבדוק דרישות תאימות ואבטחה מול הלקוחות שלכם.",
        "לבדוק כמה חותמים וחבילות כלולים בתוכנית המתאימה.",
      ],
      takeaway: "אם עדיין מדפיסים או שולחים קבצים הלוך ושוב, זה מקום קל לחיסכון בזמן.",
      tags: ["esignature", "productivity", "documents", "saas"],
    },
    "Systeme.io": {
      alias,
      problem: "עסק דיגיטלי קטן נבנה מהר מאוד על יותר מדי כלים שונים שמסרבלים את העבודה.",
      solution:
        "Systeme.io מאחד דפי נחיתה, אימייל, אוטומציה, קורסים ותשלומים בתוך מערכת אחת.",
      audience: "יוצרים, סולופרנרים ובעלי עסקים קטנים שמוכרים מוצרים דיגיטליים.",
      checks: [
        "לבדוק אם בונה הדפים והאוטומציות מספיק גמישים בשבילכם.",
        "לבדוק מה נכלל בתוכנית החינמית ומה דורש שדרוג.",
        "לבדוק אם עדיף לכם all-in-one או סטאק מודולרי יותר.",
      ],
      takeaway: "למי שרוצה להתחיל מהר בלי לחבר חמישה כלים, Systeme.io מאוד הגיוני.",
      tags: ["funnels", "emailmarketing", "creatorbusiness", "saas"],
    },
    UptimeRobot: {
      alias,
      problem: "כשאתר נופל ואתם מגלים על זה מלקוח, כבר שילמתם באמון ובתנועה.",
      solution:
        "UptimeRobot בודק זמינות של אתרים ושירותים ומתריע מהר כשמשהו נופל.",
      audience: "מפתחים, בעלי אתרים, חברות SaaS וכל מי שלא יכול להרשות downtime שקט.",
      checks: [
        "לבדוק תדירות בדיקה, ערוצי התראה ומגבלות התוכנית.",
        "לבדוק האם צריך גם monitoring עמוק יותר ולא רק up/down.",
        "לבדוק איך הצוות מקבל התראות ומגיב בפועל.",
      ],
      takeaway: "זה אולי כלי פשוט, אבל הוא פותר בעיה יקרה מאוד ברגע הלא נכון.",
      tags: ["monitoring", "uptime", "devops", "saas"],
    },
    "Warmup Inbox": {
      alias,
      problem: "דומיינים ואינבוקסים חדשים נוחתים בספאם לפני שהאאוטריץ' בכלל מתחיל לעבוד.",
      solution:
        "Warmup Inbox בונה מוניטין שליחה דרך תעבורה מדומה וחכמה לפני שמתחילים לשלוח קמפיינים אמיתיים.",
      audience: "צוותי cold email, סוכנויות ומי שמרים דומיינים חדשים לאאוטריץ'.",
      checks: [
        "לבדוק אם יש לכם גם תהליך deliverability מעבר ל-warmup.",
        "לבדוק כמה תיבות צריך לחמם ובאיזה קצב.",
        "לבדוק איך הכלי משתלב עם ספקי האימייל שכבר יש לכם.",
      ],
      takeaway: "חימום תיבה לא מחליף אסטרטגיה, אבל הוא כן מונע פתיחה גרועה מדי.",
      tags: ["coldemail", "deliverability", "outbound", "email"],
    },
    Woodpecker: {
      alias,
      problem: "אאוטריץ' קר שנכנס לספאם שורף רשימות, דומיינים והזדמנויות.",
      solution:
        "Woodpecker מרכז רצפים, follow-ups וכלי deliverability כדי לשפר סיכוי שהמייל יגיע לאינבוקס.",
      audience: "צוותי מכירות, סוכנויות ומייסדים שמריצים cold email.",
      checks: [
        "לבדוק את מגבלות החשבונות, השליחה והחיבורים ל-inboxים.",
        "לבדוק עד כמה כלי ה-deliverability שלו מחליפים כלים אחרים.",
        "לבדוק שה-flow של הצוות באמת יושב טוב בתוך המערכת.",
      ],
      takeaway: "אם אתם כבר עושים אאוטריץ', הבעיה האמיתית היא לא רק כתיבה אלא הגעה לאינבוקס.",
      tags: ["coldemail", "sales", "outbound", "deliverability"],
    },
    Writecream: {
      alias,
      problem: "כתיבת תוכן שיווקי, אאוטריץ' ורעיונות לקופי שוב ושוב גוזלת זמן.",
      solution:
        "Writecream מייצר טקסטים שיווקיים, רעיונות, פתיחים ומסרים כדי לקצר את שלב הטיוטה.",
      audience: "משווקים, פרילנסרים, סוכנויות ומי שעובד על הרבה נכסים קצרים ומהירים.",
      checks: [
        "לבדוק אם התוצרים מספיק חדים אחרי עריכה מינימלית.",
        "לבדוק אילו פורמטים אתם באמת צריכים מתוך כל היכולות.",
        "לבדוק אם זה משלים את ה-workflow שלכם או רק מוסיף רעש.",
      ],
      takeaway: "אם החסם הוא מהירות יצירת טיוטה, זה כלי שימושי; עדיין צריך עין אנושית.",
      tags: ["aiwriting", "copywriting", "marketing", "content"],
    },
    ElevenLabs: {
      alias,
      problem: "יצירת קריינות איכותית בכמה שפות בדרך מסורתית יקרה ואיטית.",
      solution:
        "ElevenLabs מייצר קולות AI באיכות גבוהה, כולל text-to-speech ושכפול קול במגוון שפות.",
      audience: "יוצרי וידאו, אפליקציות, פודקאסטים וצוותים שבונים תוכן קולי.",
      checks: [
        "לבדוק רישוי, זכויות שימוש וקול במקרי מסחור.",
        "לבדוק עד כמה ההגייה והעברית/שפות היעד באמת טובות לכם.",
        "לבדוק עלות לפי נפח שימוש אמיתי ולא רק דמו קצר.",
      ],
      takeaway: "כשהצורך הוא מהירות סקייל בקול, ElevenLabs בדרך כלל ברשימת הבדיקה הראשונה.",
      tags: ["ai", "voice", "tts", "content"],
    },
  }

  if (exact[name]) return exact[name]

  if (/TANK6S|Microphone/i.test(name)) {
    return {
      alias,
      problem: "מיקרופונים זולים קולטים רעשי רקע והופכים הקלטה פשוטה למאבק.",
      solution:
        `${alias} נותן הקלטת קול ממוקדת ונקייה יותר, עם פחות רעש מסביב וסטאפ פשוט יחסית.`,
      audience: "פודקאסטרים, סטרימרים, זום ויוצרים שרוצים להישמע ברור בלי סטודיו.",
      checks: [
        "לבדוק אם אתם צריכים USB, XLR או שניהם.",
        "לבדוק כמה שליטה יש על gain, mute וניטור אוזניות.",
        "לבדוק אם המיקרופון מתאים לחדר לא מטופל אקוסטית.",
      ],
      takeaway: "אם איכות הסאונד חשובה יותר מהמראה, מיקרופון דינמי טוב שווה את זה.",
      tags: ["microphone", "audio", "creator", "streaming"],
    }
  }

  if (/Headphones|Sound \/ Bose|Earphones/i.test(name)) {
    return {
      alias,
      problem: "אוזניות בינוניות נשמעות חלש, לא מבודדות רעש וצריך לטעון אותן כל הזמן.",
      solution:
        `${alias} מכוון לנוחות יומיומית, סאונד טוב יותר ובחלק מהמקרים גם ביטול רעשים פעיל.`,
      audience: "מי שעובד מהבית, נוסע הרבה או פשוט רוצה אוזניות טובות בלי לשלם מחיר פרימיום מיותר.",
      checks: [
        "לבדוק נוחות לאורך זמן ולא רק נתוני סאונד על הנייר.",
        "לבדוק איכות מיקרופון וחיבורי Bluetooth/codec אם זה חשוב לכם.",
        "לבדוק האם ביטול הרעשים והסוללה מספיקים לשימוש האמיתי שלכם.",
      ],
      takeaway: "באודיו יומיומי, הנוחות והסוללה חשובות כמעט כמו איכות הסאונד.",
      tags: ["audio", "headphones", "tech", "gadgets"],
    }
  }

  if (/MX Master|MX Vertical|Mouse/i.test(name)) {
    return {
      alias,
      problem: "עכבר בינוני שוחק את היד, מאט עבודה מדויקת ונהיה מורגש אחרי שעות מול מסך.",
      solution:
        `${alias} מיועד לעבודה ארוכה יותר עם שליטה טובה יותר, ארגונומיה עדיפה ומעבר חלק בין מכשירים.`,
      audience: "מפתחים, מעצבים, עורכים וכל מי שעובד שעות ארוכות מול מחשב.",
      checks: [
        "לבדוק אם אתם צריכים דיוק, ארגונומיה או מעבר בין כמה מכשירים.",
        "לבדוק משקל, צורה וחיבור שמתאימים ליד ולשולחן שלכם.",
        "לבדוק אם הכפתורים והתוכנה באמת משפרים workflow אצלכם.",
      ],
      takeaway: "כשעובדים כל היום עם עכבר, שדרוג קטן בחומרה מורגש כל יום.",
      tags: ["mouse", "productivity", "setup", "workstation"],
    }
  }

  if (/Head Shaver|Shaver/i.test(name)) {
    return {
      alias,
      problem: "גילוח ראש עם סכין רגילה לוקח זמן, מגרה את העור וקשה להגיע לתוצאה אחידה.",
      solution:
        `${alias} בנוי לגילוח ראש מהיר ונוח יותר, עם התאמה לשימוש רטוב או יבש.`,
      audience: "מי שמגלח ראש באופן קבוע ורוצה תהליך מהיר ונוח יותר.",
      checks: [
        "לבדוק אם הוא בנוי לראש ולא רק לפנים.",
        "לבדוק זמן סוללה ונוחות ניקוי אחרי שימוש.",
        "לבדוק רגישות עור וקלות שימוש במקלחת אם זה חשוב לכם.",
      ],
      takeaway: "אם גילוח ראש הוא שגרה קבועה, כלי ייעודי עושה הבדל גדול.",
      tags: ["grooming", "shaver", "selfcare", "tech"],
    }
  }

  if (/Sonicare|Toothbrush/i.test(name)) {
    return {
      alias,
      problem: "רוב האנשים לא מצחצחים מספיק טוב או מפעילים לחץ חזק מדי בלי לשים לב.",
      solution:
        `${alias} משלב ניקוי חשמלי, מצבי עבודה וחיישני בקרה כדי לשפר את השגרה היומית.`,
      audience: "מי שרוצה שדרוג אמיתי ממברשת ידנית או מברשת חשמלית ישנה.",
      checks: [
        "לבדוק רמת עדינות לחניכיים וזמינות ראשי החלפה.",
        "לבדוק חיי סוללה ונוחות טעינה בנסיעות.",
        "לבדוק האם מצבי הניקוי באמת רלוונטיים לכם או רק שיווקיים.",
      ],
      takeaway: "במוצרי oral care, עקביות ונוחות שימוש חשובות לא פחות מהמפרט.",
      tags: ["oralcare", "toothbrush", "health", "wellness"],
    }
  }

  if (/Water Flosser|Waterpik/i.test(name)) {
    return {
      alias,
      problem: "רוב האנשים לא מתמידים בחוט דנטלי כי זה איטי ולא נוח.",
      solution:
        `${alias} נותן ניקוי בין השיניים עם סילון מים מהיר ונגיש יותר לשימוש קבוע.`,
      audience: "מי שרוצה לשפר היגיינת פה בלי להילחם כל ערב עם חוט דנטלי.",
      checks: [
        "לבדוק נפח מיכל, ניידות וסוג טעינה.",
        "לבדוק עוצמות זרם מים ונוחות שימוש יומיומית.",
        "לבדוק אם הוא מתאים למבנה אמבטיה ולשגרת הנסיעות שלכם.",
      ],
      takeaway: "אם ההתמדה היא הבעיה, פתרון נוח יותר בדרך כלל מנצח.",
      tags: ["oralcare", "waterflosser", "health", "wellness"],
    }
  }

  if (/Dock|Thunderbolt/i.test(name)) {
    return {
      alias,
      problem: "לפטופים מודרניים מגיעים עם מעט חיבורים, ואז כל השולחן מתמלא בדונגלים.",
      solution:
        `${alias} מרכז חיבורים חשובים בתחנה אחת כדי לחבר מסכים, אחסון, רשת וציוד היקפי בכבל אחד.`,
      audience: "משתמשי Mac ו-PC עם עמדת עבודה קבועה, מסכים חיצוניים וציוד היקפי מרובה.",
      checks: [
        "לבדוק תאימות מדויקת ל-Thunderbolt/USB4 של המחשב שלכם.",
        "לבדוק כמה מסכים, רזולוציה וטעינה התחנה באמת תומכת.",
        "לבדוק אם אתם צריכים פורטים ספציפיים כמו SD, Ethernet או USB-A.",
      ],
      takeaway: "דוק טוב לא רק מוסיף פורטים, הוא מנקה את הסטאפ ומונע כאב ראש יומי.",
      tags: ["dock", "setup", "thunderbolt", "workstation"],
    }
  }

  if (/Webcam|OBSBOT/i.test(name)) {
    return {
      alias,
      problem: "מצלמת לפטופ מובנית נראית חלש במיוחד בזום, פגישות או יצירת תוכן.",
      solution:
        `${alias} משפר את איכות התמונה ומוסיף שליטה טובה יותר על פריים ומעקב.`,
      audience: "עובדים מרחוק, סטרימרים ויוצרים שמופיעים הרבה מול מצלמה.",
      checks: [
        "לבדוק תאורה אמיתית בחדר ולא רק מפרט 4K.",
        "לבדוק אם מעקב אוטומטי באמת שימושי לכם או מיותר.",
        "לבדוק מיקום על המסך, זווית צילום וסאונד אם אין מיקרופון נפרד.",
      ],
      takeaway: "איכות וידאו משפיעה על הרושם הראשוני יותר ממה שנדמה.",
      tags: ["webcam", "video", "remotework", "creator"],
    }
  }

  if (/Hard Drive|SSD|Seagate|SSK/i.test(name)) {
    return {
      alias,
      problem: "אחסון נגמר מהר מדי, וגיבויים מתפזרים בין דיסקים ושירותי ענן.",
      solution:
        `${alias} מוסיף נפח אחסון חיצוני מסודר לקבצים, גיבויים וספריות מדיה.`,
      audience: "יוצרים, עורכי וידאו, צלמים וכל מי שמחזיק הרבה קבצים כבדים.",
      checks: [
        "לבדוק אם אתם צריכים נפח מקסימלי או מהירות עבודה גבוהה.",
        "לבדוק חיבור, עמידות ואופי שימוש: שולחני מול נייד.",
        "לבדוק אסטרטגיית גיבוי ולא להסתמך על כונן יחיד בלבד.",
      ],
      takeaway: "באחסון חיצוני, סוג השימוש חשוב יותר מהמספר הכי גדול על הקופסה.",
      tags: ["storage", "backup", "ssd", "hdd"],
    }
  }

  if (/DDR5|Gaming Memory|RAM|Memory/i.test(name)) {
    return {
      alias,
      problem: "מערכת עם זיכרון חלש או לא תואם מגבילה ביצועים בלי שתמיד שמים לב מיד.",
      solution:
        `${alias} מיועד לשדרוג זיכרון מהיר יותר למחשבים שתומכים בכך, בעיקר לגיימינג ולעבודה כבדה.`,
      audience: "גיימרים, בוני מחשבים ויוצרים שמריצים עומסים כבדים יחסית.",
      checks: [
        "לבדוק תאימות מלאה ללוח האם, למעבד ולפרופילי XMP/EXPO.",
        "לבדוק אם עדיף נפח גבוה יותר או תדר גבוה יותר עבור השימוש שלכם.",
        "לבדוק קירור, גובה המודולים ומגבלות מארז אם הסטאפ צפוף.",
      ],
      takeaway: "בשדרוגי RAM, תאימות קודמת לכל מספר שיווקי.",
      tags: ["ram", "pcbuild", "gaming", "hardware"],
    }
  }

  if (/Laptop Bag|Sleeve/i.test(name)) {
    return {
      alias,
      problem: "מחשב נייד יקר נזרק לתיק רגיל בלי הגנה מספקת ובלי ארגון נוח.",
      solution:
        `${alias} מוסיף שכבת הגנה, חלוקה טובה יותר ואחסון בסיסי מסודר לנשיאה יומיומית.`,
      audience: "סטודנטים, עובדים ניידים ומי שסוחב לפטופ כל יום.",
      checks: [
        "לבדוק מידות מדויקות לפי דגם הלפטופ ולא רק לפי אינץ' כללי.",
        "לבדוק רמת ריפוד, עמידות למים ואיכות רוכסנים.",
        "לבדוק אם צריך גם מקום למטען, עכבר ואביזרים נלווים.",
      ],
      takeaway: "באביזרי נשיאה, ההתאמה בפועל חשובה יותר מהתמונות.",
      tags: ["laptop", "bag", "accessories", "dailycarry"],
    }
  }

  if (/Laptop Stand/i.test(name)) {
    return {
      alias,
      problem: "עבודה עם לפטופ בגובה שולחן יוצרת זווית לא נוחה לצוואר ולגב.",
      solution:
        `${alias} מרים את המסך, משפר אוורור ויכול לעזור לסדר עמדת עבודה נוחה יותר.`,
      audience: "עובדים מהבית, סטודנטים ומי שעובד שעות עם לפטופ בלבד.",
      checks: [
        "לבדוק יציבות אמיתית עם גודל ומשקל הלפטופ שלכם.",
        "לבדוק טווח גובה וזווית שמתאימים לשולחן ולמסך חיצוני אם יש.",
        "לבדוק אם צריך פתרון מתקפל לניידות או סטנד קבוע לשולחן.",
      ],
      takeaway: "עמדה נוחה יותר היא לעיתים השדרוג הכי מורגש ביחס למחיר.",
      tags: ["laptopstand", "ergonomics", "setup", "workspace"],
    }
  }

  if (/WiFi AP|Repeater|Comfast/i.test(name)) {
    return {
      alias,
      problem: "קליטה חלשה בחצר, במחסן או בקצה הבית הופכת רשת טובה ללא שימושית.",
      solution:
        `${alias} נועד להרחיב או להפיץ Wi-Fi במרחבים שבהם הראוטר הראשי לא מספיק.`,
      audience: "בתים, חנויות או חללים חיצוניים שצריכים כיסוי רשת מעבר לראוטר הראשי.",
      checks: [
        "לבדוק טווח אמיתי וסביבת התקנה פנימית מול חיצונית.",
        "לבדוק סוגי הזנה, PoE והגנה לתנאי חוץ אם צריך.",
        "לבדוק אם עדיף access point אמיתי או repeater לפי התשתית שלכם.",
      ],
      takeaway: "בציוד רשת, מיקום והתקנה משפיעים לא פחות מהמפרט.",
      tags: ["wifi", "networking", "repeater", "hardware"],
    }
  }

  return {
    alias,
    problem: `קשה להבין מהר אם ${alias} באמת פותר את הבעיה שלשמה שוקלים לקנות אותו.`,
    solution: `${alias} נועד לתת פתרון ממוקד בקטגוריה של ${category ?? "המוצר הזה"} בלי להסתבך יותר מדי.`,
    audience: "מי שמחפש פתרון ברור ולא רוצה לנחש רק לפי דף מכירה.",
    checks: [
      "לבדוק התאמה אמיתית לשימוש היומיומי שלכם.",
      "לבדוק עלות מול חלופות פשוטות יותר.",
      "לבדוק האם המפרט בפועל מתאים לציפייה ולא רק לשיווק.",
    ],
    takeaway: "אם מקרי השימוש שלכם ברורים, הרבה יותר קל לדעת אם זה באמת שווה קנייה.",
    tags: ["review", "product", "tech"],
  }
}

function buildHashtags(tags = [], platform) {
  if (platform === "medium" || platform === "substack" || platform === "quora" || platform === "reddit") {
    return ""
  }
  const normalized = tags
    .map((tag) => tag.replace(/[^a-z0-9]/gi, "").toLowerCase())
    .filter(Boolean)
    .slice(0, 4)
  if (platform === "youtube" && !normalized.includes("shorts")) normalized.unshift("shorts")
  if (!normalized.length) return ""
  return normalized.map((tag) => `#${tag}`).join(" ")
}

function buildCta(platform, alias, link) {
  if (NO_DIRECT_LINK.has(platform)) {
    return `אם אתם רוצים לבדוק, חפשו את "${alias}" או עברו לביקורת המלאה שלי על הכלי.`
  }
  if (!link) {
    return `אם אתם רוצים לבדוק את ${alias}, חפשו את השם המלא באתר הרשמי.`
  }
  return `לבדיקה: ${link}`
}

function bullets(items) {
  return items.map((item) => `- ${item}`).join("\n")
}

function buildCopy({ name, category, platform, link }) {
  const meta = metaForProduct(name, category)
  const disclosure = "גילוי נאות: הקישור הוא קישור שותפים."
  const cta = buildCta(platform, meta.alias, link)
  const checks = bullets(meta.checks.slice(0, 3))
  const hashtags = buildHashtags(meta.tags, platform)

  if (platform === "youtube") {
    return {
      title: `${meta.alias}: מה הוא פותר ולמי הוא מתאים #Shorts`,
      body: `${disclosure}

${meta.alias} ב-20 שניות:

הבעיה:
${meta.problem}

מה המוצר עושה:
${meta.solution}

למי זה מתאים:
${meta.audience}

מה לבדוק לפני קנייה:
${checks}

${cta}

${hashtags}`.trim(),
    }
  }

  if (platform === "tiktok") {
    return {
      title: `${meta.alias}: לפני שקונים`,
      body: `${disclosure}

הבעיה:
${meta.problem}

מה המוצר עושה:
${meta.solution}

למי זה מתאים:
${meta.audience}

מה לבדוק:
${checks}

${cta}

${hashtags}`.trim(),
    }
  }

  if (platform === "linkedin") {
    return {
      title: `${meta.alias}: מה בודקים לפני קנייה`,
      body: `${disclosure}

הבעיה:
${meta.problem}

מה ${meta.alias} עושה בפועל:
${meta.solution}

למי זה מתאים:
${meta.audience}

לפני קנייה תבדקו:
${checks}

שורה תחתונה:
${meta.takeaway}

${cta}`.trim(),
    }
  }

  if (platform === "medium") {
    return {
      title: `${meta.alias}: סקירה בעברית לפני קנייה`,
      body: `${disclosure}

## הבעיה
${meta.problem}

## מה המוצר עושה
${meta.solution}

## למי זה מתאים
${meta.audience}

## מה לבדוק לפני קנייה
${checks}

## שורה תחתונה
${meta.takeaway}

${cta}`.trim(),
    }
  }

  if (platform === "substack") {
    return {
      title: `${meta.alias}: האם זה באמת שווה בדיקה?`,
      body: `${disclosure}

## הבעיה
${meta.problem}

## מה ${meta.alias} עושה
${meta.solution}

## למי זה מתאים
${meta.audience}

## מה לבדוק לפני קנייה
${checks}

## שורה תחתונה
${meta.takeaway}

${cta}`.trim(),
    }
  }

  if (platform === "instagram_professional") {
    return {
      title: `${meta.alias}: שווה בדיקה?`,
      body: `${disclosure}

הבעיה:
${meta.problem}

מה המוצר עושה:
${meta.solution}

למי זה מתאים:
${meta.audience}

לפני קנייה:
${checks}

${cta}

${hashtags}`.trim(),
    }
  }

  if (platform === "facebook_page") {
    return {
      title: `${meta.alias}: מה חשוב לדעת`,
      body: `${disclosure}

${meta.problem}

${meta.solution}

למי זה מתאים:
${meta.audience}

לפני קנייה:
${checks}

${cta}`.trim(),
    }
  }

  if (platform === "pinterest") {
    return {
      title: `${meta.alias} | מה חשוב לדעת לפני קנייה`,
      body: `${disclosure}

הבעיה:
${meta.problem}

מה המוצר עושה:
${meta.solution}

למי זה מתאים:
${meta.audience}

לפני קנייה:
${checks}

${cta}

${hashtags}`.trim(),
    }
  }

  if (platform === "x_twitter") {
    return {
      title: `${meta.alias}: מה הוא פותר ולמי`,
      body: `${disclosure}

${meta.alias} פותר בעיה פשוטה:
${meta.problem}

מה הוא עושה:
${meta.solution}

למי זה מתאים:
${meta.audience}

לפני קנייה:
${meta.checks.slice(0, 2).map((item) => `• ${item}`).join("\n")}

${cta}`.trim(),
    }
  }

  if (platform === "quora") {
    return {
      title: `האם ${meta.alias} שווה בדיקה?`,
      body: `גילוי נאות: זו תשובה שכוללת אזכור למוצר שותפים.

התשובה הקצרה: כן, אם ${meta.audience.replace(/\.$/, "")}.

הבעיה:
${meta.problem}

מה ${meta.alias} עושה:
${meta.solution}

מה לבדוק לפני קנייה:
${checks}

שורה תחתונה:
${meta.takeaway}

${cta}`.trim(),
    }
  }

  if (platform === "reddit") {
    return {
      title: `בדקתי את ${meta.alias} - הנה מה שחשוב לדעת`,
      body: `גילוי נאות: הפוסט מזכיר מוצר שותפים, בלי לינק ישיר.

הבעיה:
${meta.problem}

מה המוצר עושה:
${meta.solution}

למי זה מתאים:
${meta.audience}

מה לבדוק לפני קנייה:
${checks}

שורה תחתונה:
${meta.takeaway}

${cta}`.trim(),
    }
  }

  return {
    title: `${meta.alias}: סקירה בעברית`,
    body: `${disclosure}

${meta.problem}

${meta.solution}

למי זה מתאים:
${meta.audience}

לפני קנייה:
${checks}

${cta}`.trim(),
  }
}

function removeResolvedBlockers(blockingReasons, resolved) {
  if (!Array.isArray(blockingReasons) || !blockingReasons.length) return []
  return blockingReasons.filter((reason) => !resolved.has(reason))
}

async function nextVersionForRow(row) {
  if (!row.platform_adaptation_id) {
    return (row.version ?? 1) + 1
  }

  const { data, error } = await sb
    .from("final_copies")
    .select("id, version")
    .eq("platform_adaptation_id", row.platform_adaptation_id)

  if (error) throw error

  const maxVersion = data.reduce((max, item) => Math.max(max, item.version ?? 1), row.version ?? 1)
  return Math.max((row.version ?? 1) + 1, maxVersion + 1)
}

async function main() {
  const { data, error } = await sb
    .from("final_copies")
    .select(`
      id,
      product_id,
      platform_adaptation_id,
      platform,
      title,
      body,
      version,
      status,
      blocking_reasons,
      affiliate_link,
      image_url,
      media_asset_url,
      media_status,
      needs_media_repair,
      products (
        name,
        category,
        affiliate_link,
        affiliate_url,
        image_url,
        image_url_he,
        video_url
      )
    `)
    .eq("language", "he")
    .neq("status", "published_verified")

  if (error) throw error

  const targets = data.filter(isBadRow)
  let updated = 0
  let failed = 0
  let adaptationUpdated = 0
  let mediaBackfilled = 0

  for (const row of targets) {
    const product = row.products ?? {}
    const link = row.affiliate_link || product.affiliate_link || product.affiliate_url || null
    const copy = buildCopy({
      name: product.name ?? "מוצר",
      category: product.category ?? "",
      platform: row.platform,
      link,
    })

    let imageUrl = row.image_url || product.image_url_he || product.image_url || null
    let mediaAssetUrl = row.media_asset_url
    let mediaStatus = row.media_status
    let needsMediaRepair = row.needs_media_repair
    const resolved = new Set()

    if (!row.image_url && imageUrl) {
      resolved.add("image_required_for_ready")
      if (row.media_status === "missing_image") {
        mediaStatus = "ready"
        needsMediaRepair = false
        mediaBackfilled++
      }
    }

    if (VIDEO_PLATFORMS.has(row.platform) && !mediaAssetUrl && product.video_url) {
      mediaAssetUrl = product.video_url
      resolved.add("video_required_for_ready")
      if (row.media_status === "missing_video") {
        mediaStatus = "ready"
        needsMediaRepair = false
      }
      mediaBackfilled++
    }

    const blockingReasons = removeResolvedBlockers(row.blocking_reasons, resolved)
    if (VIDEO_PLATFORMS.has(row.platform) && !mediaAssetUrl) {
      if (!blockingReasons.includes("video_required_for_ready")) {
        blockingReasons.push("video_required_for_ready")
      }
      mediaStatus = "missing_video"
      needsMediaRepair = true
    }
    const nextStatus = blockingReasons.length > 0 ? "needs_system_fix" : "ready_for_operator_approval"
    const contentHash = hashContent(copy.title, copy.body)
    const nextVersion = await nextVersionForRow(row)

    const finalCopyPayload = {
      title: copy.title,
      body: copy.body,
      content_hash: contentHash,
      version: nextVersion,
      status: nextStatus,
      validation_status: "valid",
      blocking_reasons: blockingReasons,
      approved_by: null,
      approved_at: null,
      affiliate_link: link,
      image_url: imageUrl,
      media_asset_url: mediaAssetUrl,
      media_status: mediaStatus,
      needs_media_repair: needsMediaRepair,
    }

    const { error: updateError } = await sb.from("final_copies").update(finalCopyPayload).eq("id", row.id)
    if (updateError) {
      console.error(`FAIL final_copy ${row.id} ${product.name} / ${row.platform}: ${updateError.message}`)
      failed++
      continue
    }

    if (row.platform_adaptation_id) {
      const { error: adaptationError } = await sb
        .from("platform_adaptations")
        .update({
          title: copy.title,
          body: copy.body,
          content_hash: contentHash,
        })
        .eq("id", row.platform_adaptation_id)

      if (adaptationError) {
        console.error(
          `WARN adaptation ${row.platform_adaptation_id} ${product.name} / ${row.platform}: ${adaptationError.message}`,
        )
      } else {
        adaptationUpdated++
      }
    }

    updated++
    console.log(`OK ${product.name} / ${row.platform} -> ${nextStatus}`)
  }

  console.log(
    JSON.stringify(
      {
        scanned: data.length,
        targeted: targets.length,
        updated,
        failed,
        adaptationUpdated,
        mediaBackfilled,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
