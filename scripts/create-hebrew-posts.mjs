import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(import.meta.dirname, '..')
const envRaw = readFileSync(resolve(root, '.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const sourceContentIds = {
  '856173da-5e3c-47a3-8bd7-807a6d59e167': 'c4305bd3-43a4-40a8-9530-4d8869e56088',
  '09b3dd60-e522-4d24-ac95-6cbbb0154870': '4a00a127-fd49-4293-b7a3-15b74f27a39b',
  '93e9a0a9-adfe-4574-95bb-2058a3a21cf0': '4a00a1be-0da8-48a1-9c44-3ccb1ae2b00f',
  '896d1b5f-846b-47c2-b9f9-02b6142582b6': 'e0bb6014-2267-4060-8564-ed40911692cf',
  '656bdb6a-34f8-4dd5-9d98-76922fe12d02': 'cac0fec5-82bc-41db-8550-bfaa0aff4a6d',
  '6150f8d9-f907-4497-a580-b838f70b4dc7': '664a8cbc-981b-4614-a735-69cb4ad0fa5b',
  '2d38c018-8b01-472c-9e3e-9cd6c82f624e': '457983b2-874f-4fee-a111-6094e4fbe169',
  '04d026d8-a64a-4521-93f2-bdeecd8c9a45': '78f581f9-52ef-45b6-903f-0e15e9f2e599',
  'b8d2123f-a9b1-4a20-af43-768f23ef52f2': '7a35d0fb-561b-4900-b9c7-192f98aea38c',
}

const products = [
  {
    id: '856173da-5e3c-47a3-8bd7-807a6d59e167',
    name: 'Logitech MX Master 4',
    link: 'https://amzn.to/3Qm6GLY',
    posts: {
      facebook_page: `גילוי נאות: הפוסט מכיל קישור שותפים.

אם אתם עובדים מול מחשב 8+ שעות ביום, אתם יודעים כמה עכבר גרוע הורס את היום — יד כואבת, גלילה איטית, חיבור שמתנתק.

ה-Logitech MX Master 4 פותר את כל זה: גלגלת הפטית שמרגישה כמו חמאה, דיוק 8K DPI, טעינת USB-C של דקה אחת שנותנת 3 שעות, ומעבר חלק בין 3 מכשירים בלחיצה.

מתאים למתכנתים, מעצבים, עורכי וידאו — כל מי שהעכבר הוא הכלי המרכזי שלו.

לפרטים נוספים:
LINK`,
      instagram_professional: `גילוי נאות: קישור שותפים בביו.

יד עייפה סוף היום? גלילה איטית? חיבור שמתנתק?

MX Master 4 של Logitech — גלגלת הפטית, 8K DPI, דקה טעינה = 3 שעות עבודה. מעבר חלק בין 3 מכשירים.

העכבר שכל מי שעובד מול מסך צריך.

קישור בביו.

#logitech #mxmaster4 #עכבראלחוטי #טכנולוגיה #פרודוקטיביות #workfromhome #עבודהמהבית`,
      linkedin: `גילוי נאות: הפוסט מכיל קישור שותפים.

אחרי שנים של עבודה עם עכברים "טובים מספיק", עברתי ל-Logitech MX Master 4 — וזה שינה את חוויית העבודה.

הבעיה שרוב האנשים מתעלמים ממנה: עכבר בינוני עולה לכם בזמן ובנוחות. גלילה לא חלקה, חוסר דיוק, טעינה שמפסיקה באמצע הפגישה.

מה ה-MX Master 4 נותן:
• גלגלת הפטית — גלילה מדויקת במסמכים ארוכים
• 8K DPI — דיוק שמרגישים מהרגע הראשון
• USB-C — דקה טעינה = 3 שעות
• מעבר בין 3 מכשירים — לפטופ, מסך, טאבלט

למי זה? לכל מי שהמחשב הוא כלי העבודה העיקרי.

LINK`,
    },
  },
  {
    id: '09b3dd60-e522-4d24-ac95-6cbbb0154870',
    name: 'Logitech MX Vertical',
    link: 'https://www.amazon.com/dp/B07FNJB8TT?tag=rubinqs-20',
    posts: {
      facebook_page: `גילוי נאות: הפוסט מכיל קישור שותפים.

כאב בשורש כף היד אחרי יום עבודה? זה לא גיל — זה הזווית של העכבר.

Logitech MX Vertical מעמיד את היד בזווית של 57° — המיקום הטבעי שמפחית לחץ על השרירים. חיישן 4000 DPI, סוללה שמחזיקה 4 חודשים, וחיבור ל-3 מכשירים.

מי שכבר סובל מכאבים — זה העכבר שהפיזיותרפיסט שלכם היה ממליץ עליו.

LINK`,
      instagram_professional: `גילוי נאות: קישור שותפים בביו.

כאב בפרק כף היד? זה לא אתם — זה העכבר.

MX Vertical — זווית 57° טבעית, 4000 DPI, סוללה ל-4 חודשים.

העכבר הארגונומי שבאמת עובד.

קישור בביו.

#logitech #mxvertical #ארגונומי #בריאותבעבודה #עכבראלחוטי #carpaltunnel #worksetup`,
      linkedin: `גילוי נאות: הפוסט מכיל קישור שותפים.

אני רואה עמיתים שמתלוננים על כאבי שורש כף היד — ומוסיפים לעבוד עם אותו עכבר שטוח שגורם לבעיה.

Logitech MX Vertical הוא לא גאדג'ט — הוא פתרון אמיתי. הזווית של 57° מעמידה את היד במצב טבעי שמפחית מתח בשרירים. 4000 DPI, סוללה ל-4 חודשים, חיבור ל-3 מכשירים.

השקעה בציוד ארגונומי היא לא מותרות — היא מניעת נזק עתידי.

LINK`,
    },
  },
  {
    id: '93e9a0a9-adfe-4574-95bb-2058a3a21cf0',
    name: 'Philips Head Shaver 9000',
    link: 'https://amzn.to/4uYZqES',
    posts: {
      facebook_page: `גילוי נאות: הפוסט מכיל קישור שותפים.

גילוח ראש עם סכין רגילה = חתכים, גירוי, ו-20 דקות מול המראה כל בוקר.

Philips Norelco Head Shaver 9000 נבנה ספציפית לגילוח ראש. 9 להבים שזזים ב-360°, עמיד במים (אפשר להשתמש במקלחת), וסוללה שמחזיקה 120 דקות.

לכל מי שמגלח ראש באופן קבוע — זה חוסך זמן, כאב, וגירוי עור.

LINK`,
      instagram_professional: `גילוי נאות: קישור שותפים בביו.

גילוח ראש ב-3 דקות בלי חתכים?

Philips Head Shaver 9000 — 9 להבים 360°, עמיד במים, 120 דקות סוללה.

נבנה לראש, לא ללחיים.

קישור בביו.

#philips #headshaver #גילוח #grooming #baldhead #טיפוח`,
      linkedin: `גילוי נאות: הפוסט מכיל קישור שותפים.

מי שמגלח ראש יודע — סכין רגילה לא נבנתה לזה. הצורה לא מתאימה, קשה להגיע לעורף, והגירוי אחרי בלתי נסבל.

Philips Norelco Head Shaver 9000 תוכנן ספציפית לגילוח ראש: 9 להבים שנעים 360°, אפשר להשתמש יבש או במקלחת, ו-120 דקות סוללה.

מי שזה רלוונטי לו — זה משנה את הבוקר.

LINK`,
    },
  },
  {
    id: '896d1b5f-846b-47c2-b9f9-02b6142582b6',
    name: 'Philips Sonicare 6500',
    link: 'https://amzn.to/4uuDPTZ',
    posts: {
      facebook_page: `גילוי נאות: הפוסט מכיל קישור שותפים.

רוב האנשים חושבים שהם מצחצחים שיניים טוב. רופאי השיניים שלהם חושבים אחרת.

Philips Sonicare 6500 — 62,000 תנועות בדקה, 3 מצבי צחצוח, חיישן לחץ שמונע נזק לחניכיים, ו-14 יום סוללה מטעינה אחת.

מתאימה לכל מי שרוצה ביקור אצל רופא שיניים בלי הפתעות.

LINK`,
      instagram_professional: `גילוי נאות: קישור שותפים בביו.

62,000 תנועות בדקה > מברשת ידנית.

Sonicare 6500 — 3 מצבי צחצוח, חיישן לחץ, 14 יום סוללה.

הביקור הבא אצל השיניים יהיה אחר.

קישור בביו.

#philips #sonicare #שיניים #בריאותהפה #dentalcare #oralhealth`,
      linkedin: `גילוי נאות: הפוסט מכיל קישור שותפים.

השקעה קטנה בציוד שיניים חוסכת טיפולים יקרים בהמשך. זה פשוט חשבון כלכלי.

Philips Sonicare 6500: 62,000 תנועות בדקה (לעומת ~300 ידנית), חיישן שמתריע אם לוחצים חזק מדי, ו-14 יום סוללה מטעינה אחת.

מי שמחפש שדרוג אמיתי לשגרת הבוקר — זו נקודת כניסה טובה.

LINK`,
    },
  },
  {
    id: '656bdb6a-34f8-4dd5-9d98-76922fe12d02',
    name: 'Waterpik Gem 5100',
    link: 'https://amzn.to/4dYyf7m',
    posts: {
      facebook_page: `גילוי נאות: הפוסט מכיל קישור שותפים.

חוט דנטלי? בואו נהיה כנים — רוב האנשים לא עושים את זה. זה כואב, לוקח זמן, ומרגיש כמו עונש.

Waterpik Gem 5100 עושה את אותה עבודה עם סילון מים — 30 שניות ונגמר. אלחוטי, קומפקטי, 2 מצבי לחץ, מתאים למקלחת.

למי שיודע שהוא צריך לנקות בין השיניים אבל לא עושה את זה — זה הפתרון.

LINK`,
      instagram_professional: `גילוי נאות: קישור שותפים בביו.

חוט דנטלי? לא. סילון מים? כן.

Waterpik Gem 5100 — אלחוטי, 30 שניות, 2 מצבי לחץ.

ניקוי בין השיניים בלי הסבל.

קישור בביו.

#waterpik #waterflosser #שיניים #בריאותהפה #dentalcare #חוטדנטלי`,
      linkedin: `גילוי נאות: הפוסט מכיל קישור שותפים.

כל רופא שיניים אומר "אתה צריך לעשות חוט דנטלי". כמעט אף אחד לא עושה את זה באופן קבוע.

Waterpik Cordless Gem 5100 מחליף את החוט בסילון מים — 30 שניות, אלחוטי, 2 מצבי לחץ. קלינית הוכח כיעיל כמו חוט דנטלי.

מי שיודע שצריך ולא עושה — זה הכלי שמשנה את ההרגל.

LINK`,
    },
  },
  {
    id: '6150f8d9-f907-4497-a580-b838f70b4dc7',
    name: 'OBSBOT Tiny 2 Lite 4K',
    link: 'https://amzn.to/4g6WGkf',
    posts: {
      facebook_page: `גילוי נאות: הפוסט מכיל קישור שותפים.

המצלמה המובנית בלפטופ שלכם עושה אתכם נראים כמו ב-2012. תאורה גרועה, תמונה מטושטשת, וזווית שמציגה בעיקר את התקרה.

OBSBOT Tiny 2 Lite — מצלמה 4K עם מעקב אוטומטי. המצלמה עוקבת אחריכם כשאתם זזים, מתאימה תאורה אוטומטית, וזווית של 90°.

לפגישות זום, הרצאות, סטרימינג — כל מצב שבו אתם על מסך וצריכים להיראות מקצועי.

LINK`,
      instagram_professional: `גילוי נאות: קישור שותפים בביו.

המצלמה של הלפטופ = 2012.

OBSBOT Tiny 2 Lite — 4K, מעקב אוטומטי, תאורה חכמה, זווית 90°.

פגישות זום שנראות מקצועי.

קישור בביו.

#obsbot #webcam #4k #zoom #workfromhome #סטרימינג #פגישותאונליין`,
      linkedin: `גילוי נאות: הפוסט מכיל קישור שותפים.

בעולם של פגישות היברידיות, האיכות של המצלמה שלכם היא הרושם הראשון.

OBSBOT Tiny 2 Lite — 4K, מעקב AI שעוקב אחריכם כשאתם זזים, התאמת תאורה אוטומטית, וזווית 90° שמכניסה את כל הלוח אם צריך.

מי שעובד מרחוק או בהיברידי — זה שדרוג שמורגש מהפגישה הראשונה.

LINK`,
    },
  },
  {
    id: '2d38c018-8b01-472c-9e3e-9cd6c82f624e',
    name: 'OWC Thunderbolt 4 Dock',
    link: 'https://amzn.to/3RY0sm6',
    posts: {
      facebook_page: `גילוי נאות: הפוסט מכיל קישור שותפים.

לפטופ חדש ויפה — אבל רק 2 יציאות USB-C. אז מתחילים עם מתאם, עוד מתאם, דונגל, ופתאום השולחן נראה כמו חנות חשמל.

OWC Thunderbolt 4 Dock — 11 יציאות בתחנה אחת: 4×Thunderbolt 4, USB-A, SD, Ethernet, אודיו. כבל אחד ללפטופ — וזהו.

למי שיש לפטופ מודרני וצריך לחבר מסכים, כוננים, ורשת — בלי בלגן.

LINK`,
      instagram_professional: `גילוי נאות: קישור שותפים בביו.

2 יציאות בלפטופ? לא מספיק.

OWC Thunderbolt 4 Dock — 11 יציאות, כבל אחד, אפס בלגן.

שולחן עבודה נקי ומקצועי.

קישור בביו.

#owc #thunderbolt4 #dock #עמדתעבודה #desksetup #macsetup #techsetup`,
      linkedin: `גילוי נאות: הפוסט מכיל קישור שותפים.

תחנת עגינה היא לא מותרות — היא תשתית. בלעדיה, כל חיבור ללפטופ הוא ג'אגלינג של מתאמים.

OWC 11-Port Thunderbolt 4 Dock: 4 יציאות TB4, USB-A, SD, Ethernet, אודיו — הכל דרך כבל אחד. תומך ב-2 מסכים 4K או מסך 8K.

מי שעובד עם לפטופ על שולחן — זו ההשקעה שהופכת את התחנה לאמיתית.

LINK`,
    },
  },
  {
    id: '04d026d8-a64a-4521-93f2-bdeecd8c9a45',
    name: 'Seagate One Touch 8TB',
    link: 'https://amzn.to/4valYTa',
    posts: {
      facebook_page: `גילוי נאות: הפוסט מכיל קישור שותפים.

"אין לי מספיק מקום" — המשפט שכל מי שעובד עם קבצים גדולים מכיר. פרויקטים ישנים שלא רוצים למחוק, גיבויים שמתפזרים על 5 כוננים.

Seagate One Touch 8TB — כונן שולחני אחד עם 8 טרה. USB 3.0, הגנת סיסמה מובנית, תוכנת גיבוי אוטומטי.

עורכי וידאו, צלמים, ארכיטקטים — כל מי שהקבצים אצלו גדולים ורבים.

LINK`,
      instagram_professional: `גילוי נאות: קישור שותפים בביו.

8 טרה. כונן אחד. נגמר הסיפור.

Seagate One Touch 8TB — USB 3.0, הגנת סיסמה, גיבוי אוטומטי.

קישור בביו.

#seagate #externalhdd #אחסון #גיבוי #storage #8tb #עריכתוידאו`,
      linkedin: `גילוי נאות: הפוסט מכיל קישור שותפים.

בעידן הענן, כונן חיצוני עדיין רלוונטי — במיוחד כשעובדים עם קבצים שהענן פשוט לא מספיק מהיר בשבילם.

Seagate One Touch 8TB: כונן שולחני, USB 3.0, הגנת סיסמה מובנית, ותוכנת גיבוי. 8TB מספיקים לשנים של פרויקטים.

לעורכי וידאו, צלמים, וכל מי שמנהל ארכיון — הפתרון הפשוט והאמין.

LINK`,
    },
  },
  {
    id: 'b8d2123f-a9b1-4a20-af43-768f23ef52f2',
    name: 'FIFINE TANK6S',
    link: 'https://amzn.to/4ohfkrP',
    posts: {
      facebook_page: `גילוי נאות: הפוסט מכיל קישור שותפים.

מיקרופון USB שנשמע כמו מיקרופון מקצועי? זה מה ש-FIFINE TANK6S עושה.

מיקרופון דינמי (לא קונדנסר — אז הוא לא קולט כל רעש מהרקע), חיבור USB-C ישיר למחשב, כפתור mute פיזי, וצליל חם ומלא.

לפודקאסט, סטרימינג, הקלטת קריינות, פגישות — כל מי שצריך להישמע טוב בלי סטודיו.

LINK`,
      instagram_professional: `גילוי נאות: קישור שותפים בביו.

מיקרופון USB שנשמע מקצועי?

FIFINE TANK6S — דינמי (בלי רעשי רקע), USB-C, כפתור mute, צליל חם.

פודקאסט, סטרימינג, פגישות — בלי סטודיו.

קישור בביו.

#fifine #microphone #מיקרופון #פודקאסט #סטרימינג #voiceover #usb`,
      linkedin: `גילוי נאות: הפוסט מכיל קישור שותפים.

הבדל בין "נשמע חובבני" ל"נשמע מקצועי" בפגישת זום? לרוב זה המיקרופון.

FIFINE TANK6S — מיקרופון דינמי USB-C. דינמי אומר שהוא לא קולט כל רעש רקע (מזגן, מקלדת, רחוב). חיבור USB-C ישר למחשב, כפתור mute פיזי, צליל חם.

לפודקאסט, סטרימינג, הקלטות — או סתם כדי להישמע טוב בכל שיחה.

LINK`,
    },
  },
]

let count = 0
let errors = 0

for (const p of products) {
  const srcId = sourceContentIds[p.id]

  for (const [platform, body] of Object.entries(p.posts)) {
    const finalBody = body.replace(/LINK/g, p.link)

    const { data: pa, error: paErr } = await sb.from('platform_adaptations').insert({
      source_content_id: srcId,
      product_id: p.id,
      platform,
      title: `${p.name} — Hebrew ${platform}`,
      body: finalBody,
      content_hash: createHash('sha256').update(finalBody).digest('hex'),
    }).select('id').single()

    if (paErr) {
      console.error(`ERROR PA ${p.name} | ${platform}: ${paErr.message}`)
      errors++
      continue
    }

    const { error } = await sb.from('final_copies').insert({
      product_id: p.id,
      source_content_id: srcId,
      platform_adaptation_id: pa.id,
      platform,
      language: 'he',
      title: `${p.name} — ${platform} (HE)`,
      body: finalBody,
      content_hash: createHash('sha256').update(finalBody).digest('hex'),
      status: 'ready_for_operator_approval',
      validation_status: 'valid',
      affiliate_link: p.link,
    })
    if (error) {
      console.error(`ERROR ${p.name} | ${platform}: ${error.message}`)
      errors++
    } else {
      count++
      console.log(`OK ${p.name} | ${platform}`)
    }
  }
}

console.log(`\nDone: ${count} posts created, ${errors} errors`)
