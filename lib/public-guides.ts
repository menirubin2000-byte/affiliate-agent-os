export type GuideLocale = "en" | "he"

export type GuideSection = {
  name: string
  summary: string
  keyFeatures: string
  whyWeChooseIt: string
  affiliateNote?: string
}

export type GuideContent = {
  title: string
  description: string
  eyebrow: string
  readTime: string
  disclosure: string
  intro: string[]
  conclusion: string
  sectionLabels: {
    keyFeatures: string
    whyWeChooseIt: string
    note: string
    relatedReview: string
    affiliateLink: string
    switchLanguage: string
  }
  sections: GuideSection[]
}

export type PublicGuide = {
  slug: string
  relatedReviewSlug: string
  affiliateUrl: string
  locales: Record<GuideLocale, GuideContent>
}

export const REDITUS_AFFILIATE_URL = "https://www.getreditus.com/?red=rubinq"

const GUIDES: PublicGuide[] = [
  {
    slug: "top-5-affiliate-marketing-platforms",
    relatedReviewSlug: "reditus",
    affiliateUrl: REDITUS_AFFILIATE_URL,
    locales: {
      en: {
        title: "Top 5 Affiliate Marketing Platforms You Should Use",
        description:
          "A compact comparison of five affiliate platforms for SaaS, ecommerce, and enterprise partnership programs.",
        eyebrow: "Guides",
        readTime: "6 min read",
        disclosure: "Disclosure: this guide includes affiliate links.",
        intro: [
          "Affiliate marketing is a powerful engine for business growth. Whether you are a product creator, a SaaS founder, or an affiliate marketer yourself, using the right tracking and management tools is essential.",
          "A good platform automates payouts, tracks clicks accurately, and connects you with the right partners. Here are the top 5 affiliate marketing platforms you should consider using today.",
        ],
        conclusion:
          "Choosing the right affiliate platform depends on your specific niche. For ecommerce, ShareASale and CJ Affiliate are incredibly strong. However, if you are operating in the SaaS and B2B space, Reditus stands out as the clear winner due to its specialized tools and Stripe integration. Choose the platform that best fits your business model and start growing your partner network today.",
        sectionLabels: {
          keyFeatures: "Key Features",
          whyWeChooseIt: "Why We Choose It",
          note: "Note",
          relatedReview: "Read the full Reditus review",
          affiliateLink: "Open the Reditus affiliate link",
          switchLanguage: "View in Hebrew",
        },
        sections: [
          {
            name: "Reditus",
            summary:
              "Reditus is purpose-built for B2B SaaS companies looking to grow their revenue through affiliate marketing. Unlike generic affiliate networks, Reditus focuses strictly on SaaS metrics and the B2B ecosystem.",
            keyFeatures:
              "It offers a seamless integration with Stripe, an intuitive partner dashboard, and access to a growing marketplace filled with B2B-specific affiliates.",
            whyWeChooseIt:
              "It eliminates the complexity of setting up a program. It is extremely easy to recruit new partners and automate monthly recurring commissions without the usual administrative headache.",
            affiliateNote: "You can sign up for Reditus here",
          },
          {
            name: "PartnerStack",
            summary:
              "PartnerStack is another excellent choice, specifically tailored for software companies. It allows businesses to manage affiliate, referral, and reseller programs all under one roof.",
            keyFeatures: "Automated partner onboarding, flexible reward structures, and a very active B2B marketplace.",
            whyWeChooseIt:
              "It provides great resources for partners to learn about the products they are promoting, making it a highly engaging platform.",
          },
          {
            name: "Impact.com",
            summary:
              "Impact is a robust, enterprise-level partnership management platform. It goes beyond traditional affiliate marketing by allowing you to manage influencers, brand ambassadors, and strategic business partners.",
            keyFeatures: "Highly customizable smart contracts, cross-device tracking, and advanced fraud protection.",
            whyWeChooseIt:
              "For businesses scaling up that need a highly customizable and secure tracking system, Impact is top-tier.",
          },
          {
            name: "ShareASale",
            summary:
              "ShareASale (part of Awin) is one of the oldest and most reliable affiliate networks on the internet, catering mainly to ecommerce and retail brands.",
            keyFeatures: "A massive network of merchants, real-time tracking, and a very straightforward, traditional setup.",
            whyWeChooseIt:
              "It is incredibly beginner-friendly for both merchants and affiliates, with low barriers to entry.",
          },
          {
            name: "CJ Affiliate (Formerly Commission Junction)",
            summary:
              "CJ Affiliate is a giant in the affiliate space, known for partnering with some of the world's biggest and most recognized consumer brands.",
            keyFeatures: "Unmatched global reach, deep-link automation, and comprehensive data reporting.",
            whyWeChooseIt:
              "If you want to work with Fortune 500 companies or need advanced data analytics to optimize your campaigns, CJ is the place to be.",
          },
        ],
      },
      he: {
        title: "5 פלטפורמות שיווק השותפים הטובות ביותר שכדאי לכם להכיר",
        description:
          "השוואה קצרה בין חמש פלטפורמות שיווק שותפים לחברות SaaS, חנויות איקומרס ותוכניות שותפים מתקדמות.",
        eyebrow: "מדריכים",
        readTime: "6 דקות קריאה",
        disclosure: "גילוי נאות: המדריך הזה כולל קישורי שותפים.",
        intro: [
          "שיווק שותפים הוא מנוע צמיחה עוצמתי לעסקים. בין אם אתם יוצרי מוצרים, מייסדי חברות SaaS, או משווקי שותפים בעצמכם, שימוש בכלי המעקב והניהול הנכונים הוא קריטי.",
          "פלטפורמה טובה הופכת את התשלומים לאוטומטיים, עוקבת אחרי הקלקות במדויק ומחברת אתכם לשותפים הנכונים. הנה 5 פלטפורמות שיווק השותפים המובילות שכדאי לכם לשקול.",
        ],
        conclusion:
          "בחירת פלטפורמת השותפים הנכונה תלויה בנישה שלכם. עבור איקומרס, ShareASale ו-CJ Affiliate הן אפשרויות חזקות מאוד. אבל אם אתם פועלים בתחום ה-SaaS וה-B2B, Reditus בולטת כמנצחת ברורה בזכות הכלים הייעודיים שלה והאינטגרציה עם Stripe. בחרו את הפלטפורמה שהכי מתאימה למודל העסקי שלכם והתחילו להגדיל את רשת השותפים שלכם כבר עכשיו.",
        sectionLabels: {
          keyFeatures: "תכונות מרכזיות",
          whyWeChooseIt: "למה בחרנו בה",
          note: "הערה",
          relatedReview: "לסקירת Reditus המלאה",
          affiliateLink: "לינק השותפים של Reditus",
          switchLanguage: "View in English",
        },
        sections: [
          {
            name: "Reditus",
            summary:
              "Reditus נבנתה במיוחד עבור חברות B2B SaaS שרוצות להגדיל את ההכנסות שלהן דרך שיווק שותפים. בניגוד לרשתות שותפים כלליות, Reditus מתמקדת אך ורק במדדי SaaS ובאקו-סיסטם של עסקים לעסקים.",
            keyFeatures:
              "אינטגרציה חלקה עם Stripe, לוח בקרה נוח לשותפים, וגישה לזירת מסחר הולכת וגדלה של משווקי B2B.",
            whyWeChooseIt:
              "היא מעלימה את הסיבוך שבהקמת תוכנית שותפים. קל מאוד לגייס שותפים חדשים ולבצע אוטומציה לעמלות חודשיות חוזרות ללא כאב ראש ניהולי.",
            affiliateNote: "ניתן להירשם ל-Reditus כאן",
          },
          {
            name: "PartnerStack",
            summary:
              "PartnerStack היא בחירה מצוינת נוספת, המותאמת במיוחד לחברות תוכנה. היא מאפשרת לעסקים לנהל תוכניות שותפים, תוכניות הפניה ומשווקים מורשים תחת קורת גג אחת.",
            keyFeatures: "קליטת שותפים אוטומטית, מבנה תגמול גמיש וזירת B2B פעילה מאוד.",
            whyWeChooseIt:
              "היא מספקת משאבים מעולים לשותפים כדי ללמוד על המוצרים שהם מקדמים, מה שהופך אותה לפלטפורמה מעורבת מאוד.",
          },
          {
            name: "Impact.com",
            summary:
              "Impact היא פלטפורמת ניהול שותפויות חזקה ברמת אנטרפרייז. היא חורגת משיווק שותפים מסורתי ומאפשרת לנהל משפיענים, שגרירי מותג ושותפים עסקיים אסטרטגיים.",
            keyFeatures: "חוזים חכמים הניתנים להתאמה אישית גבוהה, מעקב חוצה-מכשירים והגנה מתקדמת מפני הונאות.",
            whyWeChooseIt:
              "עבור עסקים שצומחים מהר וזקוקים למערכת מעקב מאובטחת ומותאמת אישית, Impact היא מהשורה הראשונה.",
          },
          {
            name: "ShareASale",
            summary:
              "ShareASale, כיום חלק מ-Awin, היא אחת מרשתות השותפים הוותיקות והאמינות באינטרנט, הפונה בעיקר למותגי איקומרס וקמעונאות.",
            keyFeatures: "רשת עצומה של מוכרים, מעקב בזמן אמת והגדרה מסורתית ופשוטה מאוד.",
            whyWeChooseIt:
              "היא ידידותית להפליא למתחילים, הן עבור המוכרים והן עבור השותפים, עם רף כניסה נמוך.",
          },
          {
            name: "CJ Affiliate",
            summary:
              "CJ Affiliate היא ענקית בתחום השותפים, הידועה בעבודה עם כמה ממותגי הצריכה הגדולים והמוכרים בעולם.",
            keyFeatures: "טווח הגעה עולמי חסר תקדים, אוטומציה של קישורי עומק ודוחות נתונים מקיפים.",
            whyWeChooseIt:
              "אם אתם רוצים לעבוד עם חברות Fortune 500 או צריכים ניתוח נתונים מתקדם לאופטימיזציה של הקמפיינים שלכם, CJ הוא המקום להיות בו.",
          },
        ],
      },
    },
  },
]

export function listPublicGuides() {
  return GUIDES.map((guide) => ({
    slug: guide.slug,
    relatedReviewSlug: guide.relatedReviewSlug,
    title: guide.locales.en.title,
    description: guide.locales.en.description,
    hebrewTitle: guide.locales.he.title,
  }))
}

export function getPublicGuide(slug: string) {
  return GUIDES.find((guide) => guide.slug === slug) ?? null
}
