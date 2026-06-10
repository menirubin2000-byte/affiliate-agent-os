require("dotenv").config({ path: ".env.local" })
const { Client } = require("pg")
const crypto = require("crypto")

const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD

if (!DB_PASSWORD) {
  console.error("Missing SUPABASE_DB_PASSWORD in .env.local")
  process.exit(1)
}

const client = new Client({
  host: "db.gbkwydsodondarccqyet.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

const SITE_URL = "https://affiliate-agent-os.vercel.app"
const ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG || "rubinqs-20"
const ONLY_SLUG = process.argv[2]?.trim() || null

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

function amazonUrl(asin) {
  return `https://www.amazon.com/dp/${asin}?tag=${ASSOCIATE_TAG}`
}

function reviewUrl(slug) {
  return `${SITE_URL}/reviews/${slug}`
}

// Amazon products may use only manufacturer-hosted images or official PA-API media.
// If a legal image is missing, keep the product in the catalog without visual posts.
const products = [
  {
    name: "HUANUO FlowLift Dual Monitor Stand",
    slug: "huanuo-flowlift-dual-monitor-stand",
    brand: "HUANUO",
    category: "Desk Setup / Monitor Mounts",
    asin: "B07T5SY43L",
    manufacturerUrl: "https://www.huanuo.com/products/huanuo-ergonomic-gas-spring-dual-monitor-mount-13-30-inch-screens-black",
    targetKeyword: "dual monitor stand for desk setup",
    secondaryKeywords: ["dual monitor mount", "home office desk setup", "monitor arm"],
    contentAngle: "cleaner desk setup and ergonomic dual-screen workflow",
    notes:
      "Amazon API credentials are not available yet. Images are manufacturer-owned HUANUO product images, not manually downloaded Amazon images.",
    mainImage:
      "https://www.huanuo.com/cdn/shop/files/61CcipLafUL._AC_SL1280.jpg?v=1743470010&width=1188",
    media: [
      "https://www.huanuo.com/cdn/shop/files/61CcipLafUL._AC_SL1280.jpg?v=1743470010&width=1188",
      "https://www.huanuo.com/cdn/shop/files/71iQgv61gzL._AC_SL1500.jpg?v=1743470010&width=1200",
      "https://www.huanuo.com/cdn/shop/files/71xkVna5XxL._AC_SL1500.jpg?v=1743470010&width=1200",
      "https://www.huanuo.com/cdn/shop/files/71DL57lxE8L._AC_SL1500_201a4b6d-8c7f-49b0-89aa-16b20c639760.jpg?v=1743470010&width=1200",
      "https://www.huanuo.com/cdn/shop/files/ds6-essential-dual-monitor-arm-black-5178738.jpg?v=1768545615&width=1280",
      "https://www.huanuo.com/cdn/shop/files/ds6-essential-dual-monitor-arm-black-8620183.jpg?v=1768545615&width=1280",
    ],
    sourceBody: `Affiliate disclosure: this product candidate uses an Amazon Associates link.

HUANUO FlowLift Dual Monitor Stand is a practical desk setup product for people using two screens at home, in a small office, or in a creator/gaming workspace. The value is simple: lift both monitors off the desk, reduce cable clutter, and make the screen position easier to adjust without replacing the whole desk.

The strongest angle is not hype. It is workflow: cleaner desk, easier posture adjustment, and a more organized setup for work, gaming, editing, or trading screens. It fits visual platforms because the before/after use case is clear, and it fits LinkedIn because desk ergonomics and productivity are relevant for hybrid work.`,
    posts: {
      linkedin: {
        title: "HUANUO FlowLift - a practical dual-monitor desk upgrade",
        body: ({ link }) => `Affiliate disclosure: this post includes an affiliate link. If you buy through it, I may earn a commission at no extra cost to you.

A small desk setup upgrade can change the way a workspace feels.

The HUANUO FlowLift Dual Monitor Stand is useful for anyone running two screens and trying to keep a cleaner, more adjustable desk. The practical benefit is not just "more gear" - it is better screen positioning, more desk space, and less clutter around the keyboard, laptop, and accessories.

Good fit for:
- hybrid workers using two monitors
- developers, analysts, and creators
- gaming or streaming desks
- small home offices where every inch matters

What I like: the product has a clear use case, strong visual appeal, and a simple problem/solution story. What to check before buying: monitor size/weight, VESA compatibility, and whether your desk supports clamp or grommet mounting.

Check the current Amazon listing:
${link}`,
      },
      facebook_page: {
        title: "Cleaner dual-monitor desk setup with HUANUO FlowLift",
        body: ({ link }) => `Affiliate disclosure: this post includes an affiliate link.

If your desk is crowded because of two monitor stands, a dual monitor arm can make the whole setup feel cleaner.

HUANUO FlowLift is built for dual-screen desks and gives you more control over screen height, angle, and spacing. The main value is simple: lift the monitors, clear desk space, and make the workspace easier to adjust for work, gaming, editing, or study.

Before buying, check three things:
- your monitor size and weight
- VESA mount support
- whether your desk works with clamp/grommet mounting

This is a strong product candidate because the benefit is visual and easy to understand.

See the Amazon listing:
${link}`,
      },
      instagram_professional: {
        title: "HUANUO FlowLift desk setup idea",
        body: ({ link }) => `Affiliate disclosure: this post includes an affiliate link.

Desk setup idea: move both monitors off the desk and free up the surface for the things you actually use.

HUANUO FlowLift is a dual monitor stand for people who want a cleaner workspace, better screen positioning, and less clutter around the keyboard and accessories.

Best for:
- home office setups
- gaming desks
- creator workstations
- dual-screen productivity

Check compatibility before buying: monitor weight, VESA mount, and desk edge/clamp setup.

Amazon listing:
${link}`,
      },
      pinterest: {
        title: "Dual monitor desk setup upgrade",
        body: ({ link }) => `Affiliate disclosure: this Pin includes an affiliate link.

Dual monitor desk setup idea: use a HUANUO FlowLift stand to lift two screens, open up desk space, and make the setup look cleaner.

This is a good visual product for workspace, gaming room, home office, and productivity boards because the benefit is easy to see: less clutter, more adjustable screen position, and a more organized desk.

Before buying, confirm monitor size, monitor weight, VESA compatibility, and desk mounting style.

View the Amazon listing:
${link}`,
      },
      x_twitter: {
        title: "HUANUO FlowLift dual monitor stand",
        body: ({ link }) => `Affiliate disclosure: affiliate link included.

Good desk upgrade candidate: HUANUO FlowLift Dual Monitor Stand.

Why it works:
- clears desk space
- supports a cleaner dual-screen setup
- easy visual before/after angle
- useful for home office, gaming, creators, and analysts

Check VESA + monitor weight before buying.

Amazon listing: ${link}`,
      },
      medium: {
        title: "HUANUO FlowLift Review: A Practical Dual-Monitor Upgrade for Cleaner Desk Setups",
        body: ({ link }) => `Affiliate disclosure: this article includes an affiliate link. If you buy through it, I may earn a commission at no extra cost to you.

The HUANUO FlowLift Dual Monitor Stand is a practical product for anyone who uses two screens and wants a cleaner, more adjustable workspace. It is not the kind of product that needs a complicated pitch. The problem is visible: two monitor bases take up space, cables collect around the desk, and screen height is often not ideal.

The main benefit is desk control. A dual monitor arm can lift both screens off the surface, make positioning easier, and create more usable space for a keyboard, notebook, laptop dock, or audio gear. That makes it relevant for developers, analysts, remote workers, creators, gamers, and anyone using two displays for daily work.

Pros:
- clear problem/solution fit
- useful for work and gaming setups
- strong visual angle for social posts
- helps reduce desk clutter

Cons:
- buyers must check monitor weight and VESA compatibility
- not every desk is suitable for clamp or grommet mounting
- setup takes more effort than a basic monitor stand

Who it is for: people who already use two monitors and want a cleaner desk layout without buying a new desk.

Check the current Amazon listing:
${link}`,
      },
      substack: {
        title: "Desk setup pick: HUANUO FlowLift Dual Monitor Stand",
        body: ({ link }) => `Affiliate disclosure: this newsletter mention includes an affiliate link.

Today's practical desk setup pick is the HUANUO FlowLift Dual Monitor Stand.

The reason this product is interesting is that it solves a visible, everyday workspace problem. Dual-monitor setups are useful, but two stock monitor bases can take over the desk. A dual monitor arm can create more surface space, improve cable organization, and make the screens easier to position for long work sessions.

This product is strongest for:
- home office workers
- developers and data workers
- creators with editing or streaming desks
- gamers who want a cleaner setup

The buying checklist is simple: monitor size, monitor weight, VESA compatibility, and desk mounting support. If those line up, this is a useful upgrade.

Amazon listing:
${link}`,
      },
      quora: {
        title: "Is a dual monitor arm worth it for a home office?",
        body: ({ bridge }) => `A dual monitor arm can be worth it if your current setup has two monitor bases taking up desk space or if your screens are not positioned comfortably.

The main benefit is not "more tech." It is a cleaner and more adjustable workspace. A good dual monitor arm can help with:

- freeing up desk surface
- moving screens to a better height
- reducing clutter around the keyboard
- making a dual-screen setup feel more organized

The important thing is to check compatibility before buying: monitor weight, VESA mounting, screen size, and whether your desk supports clamp or grommet installation.

I put a short public review page here with disclosure and the product details:
${bridge}`,
      },
      reddit: {
        title: "Dual monitor arm for cleaning up a crowded desk",
        body: ({ bridge }) => `If your desk is crowded because of two separate monitor bases, a dual monitor arm is one of the more practical upgrades to consider.

The reason I like this category is that the benefit is visible: more desk space, better screen positioning, and a cleaner setup. The main thing I would check before buying is not the brand first, but compatibility:

- monitor weight
- VESA support
- desk thickness
- clamp or grommet mounting

I wrote a short public review/bridge page with the details and disclosure:
${bridge}`,
      },
    },
  },
  {
    name: "GTPLAYER GT800A Gaming Chair with Footrest",
    slug: "gtplayer-gt800a-gaming-chair",
    brand: "GTPLAYER",
    category: "Gaming / Office Chair",
    asin: "B0FVXRZJ12",
    manufacturerUrl: "https://gtplayer.com/products/footrest-series-gt800a?variant=42123423383732",
    targetKeyword: "gaming chair with footrest",
    secondaryKeywords: ["GTPLAYER GT800A", "gaming chair", "office gaming chair"],
    contentAngle: "budget-friendly gaming and work chair with footrest and lumbar support",
    notes:
      "Amazon API credentials are not available yet. Images are manufacturer-owned GTPLAYER product images, not manually downloaded Amazon images.",
    mainImage:
      "https://eu.gtplayer.com/cdn/shop/files/d92e076f69cb1a6f81c9bab8cd8f57a2_d3e4f846-2d43-4b76-a867-79fd6d126e89.jpg?v=1700880319",
    media: [
      "https://eu.gtplayer.com/cdn/shop/files/d92e076f69cb1a6f81c9bab8cd8f57a2_d3e4f846-2d43-4b76-a867-79fd6d126e89.jpg?v=1700880319",
      "https://eu.gtplayer.com/cdn/shop/files/3_2_b8852327-9e6d-489f-a581-5baa40a9e9df.jpg?v=1704961287",
      "https://eu.gtplayer.com/cdn/shop/files/7a96918c5a4111f5106ad2b0941050e0_2d49a562-77fe-42b4-a411-3d33ea87bfdd.jpg?v=1704961287",
      "https://eu.gtplayer.com/cdn/shop/files/c512696efd74edbc925ec22020bded3c_409f8602-a55f-466b-b7e3-f140ab084cac.jpg?v=1704961287",
      "https://eu.gtplayer.com/cdn/shop/files/c0fa7a95c0d800d184d00deba0c193c6.jpg?v=1704961287",
      "https://eu.gtplayer.com/cdn/shop/files/e122aac1ad4d87ed5e27420315dabe54.jpg?v=1704961287",
      "https://eu.gtplayer.com/cdn/shop/files/371a9eb351470bfb47a1cc01a4b8dc63_acff3647-cd02-42e6-b9e6-b88b7577b5c4.jpg?v=1704961287",
      "https://eu.gtplayer.com/cdn/shop/products/GT800A_-1_f3a4f215-608f-4c42-9c59-369609f91e19.jpg?v=1704961287",
    ],
    sourceBody: `Affiliate disclosure: this product candidate uses an Amazon Associates link.

GTPLAYER GT800A is a gaming-style chair candidate for people who want a chair for a gaming room, student setup, creator desk, or budget home office. The main selling angle is visual: high-back chair, footrest, lumbar support, and a setup-friendly look.

This should be positioned carefully. Do not claim it is premium ergonomic equipment. The safer angle is a value-focused gaming/work chair for buyers who want comfort features and style at a lower price point. Buyers should still check size, weight capacity, return policy, and whether the item ships to their location.`,
    posts: {
      facebook_page: {
        title: "GTPLAYER GT800A - gaming chair with footrest",
        body: ({ link }) => `Affiliate disclosure: this post includes an affiliate link.

If you are building a gaming desk, student setup, or budget home office, the chair is one of the most visible parts of the room.

GTPLAYER GT800A is a gaming-style chair with a high back, footrest, headrest, and lumbar support. The angle here is simple: a setup-friendly chair for people who want comfort features and a cleaner gaming/workstation look without going into premium chair pricing.

Good fit for:
- gaming setups
- student desks
- creator rooms
- budget home office upgrades

Before buying, check shipping, size, weight support, color, and return policy.

Amazon listing:
${link}`,
      },
      instagram_professional: {
        title: "Gaming setup chair idea: GTPLAYER GT800A",
        body: ({ link }) => `Affiliate disclosure: this post includes an affiliate link.

Gaming setup idea: GTPLAYER GT800A chair with footrest, high back, headrest, and lumbar support.

This is a good visual product for:
- gaming rooms
- student desks
- creator setups
- budget home offices

What to check first: shipping availability, size, chair color, and weight support. This is a value/setup pick, not a premium ergonomic chair claim.

Amazon listing:
${link}`,
      },
      pinterest: {
        title: "Gaming chair setup idea with footrest",
        body: ({ link }) => `Affiliate disclosure: this Pin includes an affiliate link.

Gaming room / desk setup idea: GTPLAYER GT800A gaming chair with footrest, headrest, and lumbar support.

This product works well visually because the use case is clear: gaming setup, creator desk, student room, or budget home office. It can be framed as a practical setup upgrade for people who want a high-back gaming chair look with comfort features.

Before buying, check shipping availability, size, weight support, color, and return policy.

View the Amazon listing:
${link}`,
      },
      x_twitter: {
        title: "GTPLAYER GT800A gaming chair",
        body: ({ link }) => `Affiliate disclosure: affiliate link included.

Product candidate: GTPLAYER GT800A gaming chair.

Why it fits social:
- visual setup product
- gaming / student / creator desk angle
- footrest + high-back chair hook
- easy image-led post

Check shipping, size, and return policy before buying.

Amazon listing: ${link}`,
      },
      medium: {
        title: "GTPLAYER GT800A Review: A Value-Focused Gaming Chair Candidate",
        body: ({ link }) => `Affiliate disclosure: this article includes an affiliate link. If you buy through it, I may earn a commission at no extra cost to you.

GTPLAYER GT800A is a gaming-style chair candidate for buyers who want a high-back chair with comfort features such as a footrest, headrest, and lumbar support. The strongest way to position this product is as a value/setup pick, not as a premium ergonomic chair.

The visual story is strong. Chairs are visible in gaming rooms, streaming rooms, student desks, and home offices. That makes the product suitable for image-first platforms such as Facebook, Instagram, Pinterest, and X.

Pros:
- clear gaming/setup use case
- includes footrest and support features
- visually easy to understand
- good fit for budget desk upgrade content

Cons:
- shipping availability must be checked
- comfort depends on body size and expectations
- not a substitute for a premium ergonomic office chair

Who it is for: buyers building a gaming desk, student room, creator corner, or value-focused home office.

Check the current Amazon listing:
${link}`,
      },
      substack: {
        title: "Setup pick: GTPLAYER GT800A Gaming Chair",
        body: ({ link }) => `Affiliate disclosure: this newsletter mention includes an affiliate link.

Today's setup product candidate is GTPLAYER GT800A, a gaming-style chair with a high back, footrest, headrest, and lumbar support.

The safe positioning is value-focused. This is not a premium ergonomic-office-chair claim. It is a gaming/setup chair candidate for people who want a visually clean chair for a desk setup, student room, creator desk, or gaming space.

The product should work best on image-led platforms because the chair is easy to show and the use case is simple.

Before buying, check:
- shipping availability
- size and weight support
- color/variant
- return policy

Amazon listing:
${link}`,
      },
      quora: {
        title: "Are gaming chairs with footrests worth considering?",
        body: ({ bridge }) => `Gaming chairs with footrests can be worth considering if the buyer wants a setup-friendly chair for gaming, studying, or a budget home office. The main value is usually visual style plus comfort features, not premium ergonomic performance.

I would check:

- size and weight support
- shipping availability
- return policy
- whether the footrest is actually useful for your desk height
- whether you need a gaming look or a more neutral office chair

I put a short public review page here with disclosure and product details:
${bridge}`,
      },
      reddit: {
        title: "Gaming chair with footrest: what to check before buying",
        body: ({ bridge }) => `For a gaming chair with a footrest, I would treat it as a setup/value purchase rather than a premium ergonomic purchase.

The checklist I would use:

- does it ship to your area?
- is the size right for your body?
- is the weight support enough?
- can you return it if the chair is uncomfortable?
- do you actually want the gaming style, or would a neutral office chair fit better?

I wrote a short public review/bridge page with disclosure and the product details:
${bridge}`,
      },
    },
  },
  {
    name: "Logitech MX Vertical Wireless Mouse",
    slug: "logitech-mx-vertical-wireless-mouse",
    brand: "Logitech",
    category: "Computers / Ergonomic Mouse",
    asin: "B07FNJB8TT",
    manufacturerUrl: "https://www.logitech.com/en-us/shop/p/mx-vertical-ergonomic-mouse.910-005435",
    targetKeyword: "ergonomic vertical mouse",
    secondaryKeywords: ["Logitech MX Vertical", "vertical wireless mouse", "ergonomic mouse"],
    contentAngle: "ergonomic mouse for work setups, creators, and long computer sessions",
    notes:
      "Amazon API credentials are not available yet. Images are official Logitech manufacturer product images, not manually downloaded Amazon images. Amazon screenshot showed category Computers, Tablets & Components and 2.50% commission rate.",
    mainImage:
      "https://resource.logitech.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/logitech/en/products/mice/mx-vertical/gallery/mx-vertical-gallery-01-new.png",
    media: [
      "https://resource.logitech.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/logitech/en/products/mice/mx-vertical/gallery/mx-vertical-gallery-01-new.png",
      "https://resource.logitech.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/logitech/en/products/mice/mx-vertical/gallery/mx-vertical-gallery-02.png",
      "https://resource.logitech.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/logitech/en/products/mice/mx-vertical/gallery/mx-vertical-gallery-03.png",
      "https://resource.logitech.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/logitech/en/products/mice/mx-vertical/gallery/mx-vertical-gallery-04.png",
      "https://resource.logitech.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/logitech/en/products/mice/mx-vertical/gallery/mx-vertical-gallery-05.png",
      "https://resource.logitech.com/w_1440,h_810,ar_16:9,c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/logitech/en/products/mice/mx-vertical/mx-vertical-advance-ergonomics-01.png",
    ],
    sourceBody: `Affiliate disclosure: this product candidate uses an Amazon Associates link.

Logitech MX Vertical Wireless Mouse is a strong work-setup product candidate because the use case is specific: people who spend long hours at a computer and want a more ergonomic mouse shape. The product fits office workers, developers, designers, creators, support teams, and anyone building a cleaner desk setup.

The safe angle is not medical claims. The better angle is comfort-oriented workflow: a vertical mouse shape, rechargeable wireless use, Logitech brand trust, and a premium desk setup feel. It is especially relevant for LinkedIn, Medium, Substack, Facebook, Instagram, Pinterest, and X.`,
    posts: {
      linkedin: {
        title: "Logitech MX Vertical - ergonomic mouse for long computer sessions",
        body: ({ link }) => `Affiliate disclosure: this post includes an affiliate link. If you buy through it, I may earn a commission at no extra cost to you.

For people who work on a computer all day, the mouse is not a small accessory. It is something the hand uses for hours.

Logitech MX Vertical is a useful product candidate because the positioning is clear: a vertical wireless mouse for desk setups, productivity work, and long computer sessions. It fits developers, analysts, designers, support teams, creators, and anyone trying to make a workstation more comfortable.

Why this product works for LinkedIn:
- relevant to hybrid work and desk ergonomics
- strong brand recognition
- clear visual product story
- practical upgrade without a complicated explanation

What to check before buying: hand size, preferred grip, operating system compatibility, and whether you actually like vertical mouse shapes.

Amazon listing:
${link}`,
      },
      facebook_page: {
        title: "Logitech MX Vertical wireless ergonomic mouse",
        body: ({ link }) => `Affiliate disclosure: this post includes an affiliate link.

A desk setup upgrade does not always need to be big.

Logitech MX Vertical is a vertical wireless mouse designed for people who spend long hours at a computer. The angle is simple: a more ergonomic mouse shape, rechargeable use, and a clean premium look for work desks, creator setups, and home offices.

Good fit for:
- home office users
- developers and designers
- students and creators
- anyone testing a vertical mouse for comfort

Before buying, check whether the vertical shape fits your hand and workflow.

Amazon listing:
${link}`,
      },
      instagram_professional: {
        title: "Desk setup pick: Logitech MX Vertical",
        body: ({ link }) => `Affiliate disclosure: this post includes an affiliate link.

Desk setup pick: Logitech MX Vertical wireless mouse.

This is a clean product for workstations, creator desks, and home offices because the story is easy to show: vertical mouse shape, premium Logitech look, rechargeable wireless use, and a practical comfort-focused setup angle.

Best for:
- long computer sessions
- productivity desks
- minimalist work setups
- creators and designers

Check hand fit and vertical-mouse preference before buying.

Amazon listing:
${link}`,
      },
      pinterest: {
        title: "Ergonomic desk setup idea: Logitech MX Vertical",
        body: ({ link }) => `Affiliate disclosure: this Pin includes an affiliate link.

Desk setup idea: Logitech MX Vertical wireless mouse.

This is a strong visual product for home office, productivity, tech desk, creator setup, and ergonomic workspace boards. The product has a clear use case: a vertical mouse for people who spend long hours on a computer and want a cleaner, more comfort-focused setup.

Before buying, check hand size, grip preference, and whether a vertical mouse shape fits your workflow.

View the Amazon listing:
${link}`,
      },
      x_twitter: {
        title: "Logitech MX Vertical ergonomic mouse",
        body: ({ link }) => `Affiliate disclosure: affiliate link included.

Product candidate: Logitech MX Vertical Wireless Mouse.

Why it fits:
- strong Logitech brand
- ergonomic / productivity angle
- clean visual product
- useful for developers, creators, office users, and home setups

Check hand fit and vertical mouse preference first.

Amazon listing: ${link}`,
      },
      medium: {
        title: "Logitech MX Vertical Review: A Practical Ergonomic Mouse Candidate for Work Setups",
        body: ({ link }) => `Affiliate disclosure: this article includes an affiliate link. If you buy through it, I may earn a commission at no extra cost to you.

Logitech MX Vertical is a strong product candidate for work setup content because it solves a specific problem: many people use a mouse for hours every day, but the mouse is often treated as an afterthought.

The product angle should stay practical. This is not a medical promise. It is a comfort-oriented desk upgrade for people who want to try a vertical mouse shape, keep a clean wireless setup, and use a product from a familiar brand.

Pros:
- clear ergonomic/workstation story
- strong brand recognition
- good visual product images
- relevant for developers, designers, analysts, creators, and office workers
- fits LinkedIn and long-form review content well

Cons:
- vertical mouse shapes are personal
- some users need time to adjust
- not ideal for every gaming or precision workflow

Who it is for: people building a more comfortable productivity desk or home office setup.

Check the current Amazon listing:
${link}`,
      },
      substack: {
        title: "Work setup pick: Logitech MX Vertical Wireless Mouse",
        body: ({ link }) => `Affiliate disclosure: this newsletter mention includes an affiliate link.

Today's work setup pick is Logitech MX Vertical, a vertical wireless mouse for people who spend a lot of time at a computer.

The product works because it has a clean, practical story. It is not just another gadget. It is a desk accessory with a clear use case: a comfort-focused mouse shape, rechargeable wireless use, and a professional look that fits productivity and home office setups.

Best audience:
- developers
- designers
- analysts
- support teams
- creators
- remote workers

Before buying, check whether a vertical mouse shape matches your hand size and grip preference.

Amazon listing:
${link}`,
      },
      quora: {
        title: "Is a vertical mouse worth it for office work?",
        body: ({ bridge }) => `A vertical mouse can be worth trying if you spend long hours at a computer and want a different hand position than a traditional flat mouse.

The main thing to understand is that it is personal. Some people adjust quickly and like the more upright shape. Others prefer a regular mouse, especially for gaming or very precise cursor work.

What I would check:

- hand size
- grip style
- whether you need wireless/rechargeable
- compatibility with your computer
- return policy in case the shape does not fit you

I put a short public review page here with disclosure and product details:
${bridge}`,
      },
      reddit: {
        title: "Vertical mouse for long computer sessions: what to check",
        body: ({ bridge }) => `If you are looking at a vertical mouse for long computer sessions, I would focus less on hype and more on fit.

A vertical mouse can be useful if you want to test a different hand position for work, but it is not automatically better for everyone.

Checklist:

- does the shape fit your hand?
- do you need rechargeable wireless?
- will you use it for work, gaming, or both?
- can you return it if the shape feels wrong?
- does it support your OS and workflow?

I wrote a short public review/bridge page with disclosure and product details:
${bridge}`,
      },
    },
  },
  {
    name: "SSK Portable SSD 4TB External Solid State Drive",
    slug: "ssk-portable-ssd-4tb-external-solid-state-drive",
    brand: "SSK",
    category: "External Solid State Drives",
    asin: null,
    affiliateUrl: "https://amzn.to/4g6q6yX",
    amazonDetailPageUrl: "https://amzn.to/4g6q6yX",
    manufacturerUrl: null,
    targetKeyword: "portable ssd 4tb external solid state drive",
    secondaryKeywords: [
      "4tb portable ssd",
      "external solid state drive",
      "ssd for creators",
      "iphone pro external storage",
      "backup storage ssd",
    ],
    contentAngle: "4TB portable SSD candidate for creators, video editors, photographers, iPhone Pro users, and backup storage workflows shipping from Amazon US to Israel",
    notes: `עמלה טובה ומשלוח סביר יחסית, אבל מותג פחות חזק מסמסונג/סנדיסק/קרושיאל ומחיר סופי גבוה.

marketplace=amazon.com
price_usd=419.99
shipping_import_to_il_usd=85.94
shipping_usd=0
estimated_total_to_il_usd=505.93
shipping_status=ships_to_israel
shipping_region=US_TO_ISRAEL
advertising_region=ISRAEL
is_publish_ready_for_il=true
estimated_commission_usd_2_5_percent=10.50
rating=4.5
review_count=3424
badge=Amazon Choice
product_score=7
target_audience=creators, video editors, photographers, iPhone Pro users, backup storage users
image_status=missing_legal_image
image_source=placeholder_until_api_or_approved_manufacturer_asset

No legal product image is stored yet. Wait for official Amazon PA-API media or an approved manufacturer asset before creating visual posts.`,
    sourceBody: `Affiliate disclosure: this product candidate uses an Amazon Associates link.

SSK Portable SSD 4TB is an Amazon product candidate for high-capacity portable storage workflows, especially for creators, video editors, photographers, iPhone Pro users, and backup-heavy users.

Current intake note: shipping to Israel looks viable and the estimated commission is acceptable, but the final delivered price is high and the brand is weaker than Samsung, SanDisk, or Crucial for trust. No visual publishing should start yet because there is still no legal product image asset in the system.`,
    price: 419.99,
    commissionRate: 2.5,
    commissionSummary: "Estimated 2.5% Amazon Associates commission (~$10.50) at the current listed price.",
    mainImage: null,
    media: [],
    imageStatus: "missing",
    amazonImageSource: "none",
    amazonApiStatus: "manual_image_required",
    posts: {},
  },
]

async function ensureSchema() {
  await client.query(`
    alter table public.products
      add column if not exists image_url text,
      add column if not exists image_status text default 'unknown',
      add column if not exists affiliate_link text,
      add column if not exists amazon_asin text,
      add column if not exists amazon_detail_page_url text,
      add column if not exists amazon_image_source text default 'none',
      add column if not exists amazon_image_fetched_at timestamptz,
      add column if not exists amazon_api_status text default 'not_checked';

    alter table public.final_copies
      add column if not exists image_url text,
      add column if not exists media_asset_url text,
      add column if not exists image_asset_path text,
      add column if not exists media_status text default 'unknown',
      add column if not exists needs_media_repair boolean not null default false,
      add column if not exists public_review_url text,
      add column if not exists language text not null default 'en';

    create table if not exists public.product_media_assets (
      id uuid primary key default gen_random_uuid(),
      product_id uuid not null references public.products(id) on delete cascade,
      source text not null default 'manufacturer'
        check (source in ('manufacturer', 'paapi', 'uploaded', 'generated')),
      url text not null,
      alt_text text,
      media_type text not null default 'image'
        check (media_type in ('image')),
      is_primary boolean not null default false,
      sort_order integer not null default 0,
      source_url text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (product_id, url)
    );

    create index if not exists idx_product_media_assets_product_id
      on public.product_media_assets(product_id, sort_order, created_at);
  `)
}

async function upsertProduct(product) {
  const affiliateUrl = product.affiliateUrl || amazonUrl(product.asin)
  const amazonDetailPageUrl = product.amazonDetailPageUrl || affiliateUrl
  const imageUrl = product.mainImage ?? null
  const imageStatus = product.imageStatus || (imageUrl ? "ready" : "missing")
  const amazonImageSource = product.amazonImageSource || (imageUrl ? "manufacturer" : "none")
  const amazonApiStatus = product.amazonApiStatus || (imageUrl ? "missing_api_credentials" : "manual_image_required")
  const existing = await client.query("select id from public.products where slug = $1 or amazon_asin = $2 limit 1", [
    product.slug,
    product.asin,
  ])

  if (existing.rows[0]) {
    await client.query(
      `update public.products
       set name = $1,
           slug = $2,
           brand = $3,
           category = $4,
           affiliate_url = $5,
           affiliate_link = $5,
           price = $6,
           commission_rate = $7,
           image_url = $8,
           image_status = $9,
           amazon_asin = $10,
           amazon_detail_page_url = $11,
           amazon_image_source = $12,
           amazon_api_status = $13,
           notes = $14,
           target_keyword = $15,
           secondary_keywords = $16,
           search_intent = 'commercial investigation',
           content_angle = $17,
           status = 'active',
           updated_at = now()
       where id = $18`,
      [
        product.name,
        product.slug,
        product.brand,
        product.category,
        affiliateUrl,
        product.price ?? null,
        product.commissionRate ?? null,
        imageUrl,
        imageStatus,
        product.asin,
        amazonDetailPageUrl,
        amazonImageSource,
        amazonApiStatus,
        product.notes,
        product.targetKeyword,
        product.secondaryKeywords,
        product.contentAngle,
        existing.rows[0].id,
      ],
    )
    return { id: existing.rows[0].id, created: false, affiliateUrl }
  }

  const created = await client.query(
    `insert into public.products (
      name, slug, brand, category, affiliate_url, affiliate_link, price, commission_rate, image_url, image_status,
      amazon_asin, amazon_detail_page_url, amazon_image_source, amazon_api_status,
      notes, target_keyword, secondary_keywords, search_intent, content_angle, status
    ) values ($1,$2,$3,$4,$5,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'commercial investigation',$17,'active')
    returning id`,
    [
      product.name,
      product.slug,
      product.brand,
      product.category,
      affiliateUrl,
      product.price ?? null,
      product.commissionRate ?? null,
      imageUrl,
      imageStatus,
      product.asin,
      amazonDetailPageUrl,
      amazonImageSource,
      amazonApiStatus,
      product.notes,
      product.targetKeyword,
      product.secondaryKeywords,
      product.contentAngle,
    ],
  )
  return { id: created.rows[0].id, created: true, affiliateUrl }
}

async function upsertMediaAssets(productId, product) {
  if (!Array.isArray(product.media) || product.media.length === 0) return 0
  let upserted = 0
  for (let index = 0; index < product.media.length; index += 1) {
    const url = product.media[index]
    await client.query(
      `insert into public.product_media_assets (
        product_id, source, url, alt_text, media_type, is_primary, sort_order, source_url
      ) values ($1, 'manufacturer', $2, $3, 'image', $4, $5, $6)
      on conflict (product_id, url) do update
      set alt_text = excluded.alt_text,
          is_primary = excluded.is_primary,
          sort_order = excluded.sort_order,
          source_url = excluded.source_url,
          updated_at = now()`,
      [productId, url, `${product.name} manufacturer image ${index + 1}`, index === 0, index, product.manufacturerUrl],
    )
    upserted += 1
  }
  return upserted
}

async function upsertAffiliateProgram(productId, product, affiliateUrl) {
  const existing = await client.query(
    "select id from public.affiliate_programs where product_id = $1 and network = 'Amazon Associates' limit 1",
    [productId],
  )

  const values = [
    productId,
    `${product.brand} on Amazon Associates`,
    "Amazon Associates",
    product.commissionSummary || "Commission varies by Amazon category and Associates account terms.",
    "unknown",
    "link_ready",
    affiliateUrl,
    product.imageStatus === "missing"
      ? "Amazon Associates link is available. No legal product image is stored yet; wait for PA-API media or an approved manufacturer asset before visual publishing."
      : "Amazon Associates link is available. Amazon product images require PA-API; current images are manufacturer-owned.",
  ]

  if (existing.rows[0]) {
    await client.query(
      `update public.affiliate_programs
       set product_id = $1,
           program_name = $2,
           network = $3,
           commission_summary = $4,
           approval_type = $5,
           status = $6,
           affiliate_link = $7,
           notes = $8,
           last_checked_at = now(),
           updated_at = now()
       where id = $9`,
      [...values, existing.rows[0].id],
    )
    return existing.rows[0].id
  }

  const created = await client.query(
    `insert into public.affiliate_programs (
      product_id, program_name, network, commission_summary, approval_type, status, affiliate_link, notes, last_checked_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,now())
    returning id`,
    values,
  )
  return created.rows[0].id
}

async function upsertSourceContent(productId, product) {
  const contentHash = hash(`${product.slug}:source:${product.sourceBody}`)
  const existing = await client.query(
    "select id from public.source_contents where product_id = $1 and content_hash = $2 limit 1",
    [productId, contentHash],
  )
  if (existing.rows[0]) {
    await client.query(
      `update public.source_contents
       set campaign_name = $1, angle = $2, title = $3, body = $4, target_keyword = $5, status = 'active', updated_at = now()
       where id = $6`,
      [`${product.brand} product candidate`, product.contentAngle, product.name, product.sourceBody, product.targetKeyword, existing.rows[0].id],
    )
    return existing.rows[0].id
  }

  const created = await client.query(
    `insert into public.source_contents (
      product_id, campaign_name, angle, title, body, target_keyword, content_hash, status, quality_checks
    ) values ($1,$2,$3,$4,$5,$6,$7,'active',$8)
    returning id`,
    [
      productId,
      `${product.brand} product candidate`,
      product.contentAngle,
      product.name,
      product.sourceBody,
      product.targetKeyword,
      contentHash,
      JSON.stringify({ has_disclosure: true, has_clear_cta: true, has_image: true }),
    ],
  )
  return created.rows[0].id
}

async function upsertPlatformPost({ productId, affiliateProgramId, sourceContentId, product, platform, post, affiliateUrl }) {
  const isBridgePlatform = platform === "quora" || platform === "reddit"
  const publicReviewUrl = reviewUrl(product.slug)
  const body = post.body({
    link: isBridgePlatform ? publicReviewUrl : affiliateUrl,
    bridge: publicReviewUrl,
  })
  const contentHash = hash(`${product.slug}:${platform}:${post.title}:${body}`)

  if (isBridgePlatform && (body.includes("amazon.com") || body.includes("amzn.to") || body.includes("?tag="))) {
    throw new Error(`${platform} body contains a direct affiliate/tracking link`)
  }

  const existingAdaptation = await client.query(
    "select id from public.platform_adaptations where product_id = $1 and platform = $2 and content_hash = $3 limit 1",
    [productId, platform, contentHash],
  )

  let platformAdaptationId = existingAdaptation.rows[0]?.id
  if (!platformAdaptationId) {
    const created = await client.query(
      `insert into public.platform_adaptations (
        source_content_id, product_id, platform, title, body, content_hash, quality_checks,
        auto_quality_status, policy_check_status, publish_mode, manual_fallback_required,
        output_verification_required, campaign_approval_status
      ) values ($1,$2,$3,$4,$5,$6,$7,'auto_quality_passed','allowed','browser_helper',false,true,'not_requested')
      returning id`,
      [
        sourceContentId,
        productId,
        platform,
        post.title,
        body,
        contentHash,
        JSON.stringify({
          has_disclosure: true,
          has_clear_cta: true,
          has_image: !isBridgePlatform,
          uses_public_review_url: isBridgePlatform,
        }),
      ],
    )
    platformAdaptationId = created.rows[0].id
  } else {
    await client.query(
      `update public.platform_adaptations
       set title = $1,
           body = $2,
           source_content_id = $3,
           auto_quality_status = 'auto_quality_passed',
           policy_check_status = 'allowed',
           campaign_approval_status = 'not_requested',
           updated_at = now()
       where id = $4`,
      [post.title, body, sourceContentId, platformAdaptationId],
    )
  }

  const existingFinalCopy = await client.query(
    "select id from public.final_copies where product_id = $1 and platform = $2 and language = 'en' order by updated_at desc limit 1",
    [productId, platform],
  )

  const mediaUrl = isBridgePlatform ? null : product.mainImage
  const affiliateLink = isBridgePlatform ? null : affiliateUrl
  const blockingReasons = []

  if (isBridgePlatform && !body.includes(publicReviewUrl)) {
    blockingReasons.push("public_review_url_missing")
  }

  const finalValues = [
    productId,
    affiliateProgramId,
    affiliateLink,
    sourceContentId,
    platformAdaptationId,
    platform,
    post.title,
    body,
    contentHash,
    "en",
    blockingReasons.length === 0 ? "ready_for_operator_approval" : "needs_system_fix",
    blockingReasons.length === 0 ? "valid" : "blocked",
    blockingReasons,
    mediaUrl,
    mediaUrl,
    mediaUrl,
    isBridgePlatform ? "not_required" : "ready",
    false,
    isBridgePlatform ? publicReviewUrl : null,
  ]

  if (existingFinalCopy.rows[0]) {
    await client.query(
      `update public.final_copies
       set product_id = $1,
           affiliate_program_id = $2,
           affiliate_link = $3,
           source_content_id = $4,
           platform_adaptation_id = $5,
           platform = $6,
           title = $7,
           body = $8,
           content_hash = $9,
           language = $10,
           status = $11,
           validation_status = $12,
           blocking_reasons = $13,
           image_url = $14,
           media_asset_url = $15,
           image_asset_path = $16,
           media_status = $17,
           needs_media_repair = $18,
           public_review_url = $19,
           updated_at = now()
       where id = $20`,
      [...finalValues, existingFinalCopy.rows[0].id],
    )
    return { created: false, platform }
  }

  await client.query(
    `insert into public.final_copies (
      product_id, affiliate_program_id, affiliate_link, source_content_id, platform_adaptation_id,
      platform, title, body, content_hash, language, status, validation_status, blocking_reasons,
      image_url, media_asset_url, image_asset_path, media_status, needs_media_repair, public_review_url
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    finalValues,
  )
  return { created: true, platform }
}

async function main() {
  await client.connect()
  await ensureSchema()

  const selectedProducts = ONLY_SLUG
    ? products.filter((product) => product.slug === ONLY_SLUG)
    : products

  if (ONLY_SLUG && selectedProducts.length === 0) {
    throw new Error(`Unknown product slug: ${ONLY_SLUG}`)
  }

  const summary = {
    productsCreated: 0,
    productsUpdated: 0,
    mediaAssets: 0,
    finalCopiesCreated: 0,
    finalCopiesUpdated: 0,
    platforms: [],
  }

  for (const product of selectedProducts) {
    const productResult = await upsertProduct(product)
    summary[productResult.created ? "productsCreated" : "productsUpdated"] += 1
    summary.mediaAssets += await upsertMediaAssets(productResult.id, product)

    const affiliateProgramId = await upsertAffiliateProgram(productResult.id, product, productResult.affiliateUrl)
    const sourceContentId = await upsertSourceContent(productResult.id, product)

    for (const [platform, post] of Object.entries(product.posts)) {
      const result = await upsertPlatformPost({
        productId: productResult.id,
        affiliateProgramId,
        sourceContentId,
        product,
        platform,
        post,
        affiliateUrl: productResult.affiliateUrl,
      })
      summary[result.created ? "finalCopiesCreated" : "finalCopiesUpdated"] += 1
      summary.platforms.push({ product: product.name, platform, created: result.created })
    }
  }

  const check = await client.query(`
    select
      p.name,
      fc.platform,
      fc.status,
      fc.validation_status,
      fc.media_status,
      fc.image_url is not null as has_image,
      fc.public_review_url
    from public.final_copies fc
    join public.products p on p.id = fc.product_id
    where p.slug = any($1::text[])
    order by p.name, fc.platform
  `, [selectedProducts.map((product) => product.slug)])

  const productCheck = await client.query(`
    select
      slug,
      name,
      price,
      commission_rate,
      affiliate_url,
      image_status,
      amazon_image_source,
      amazon_api_status
    from public.products
    where slug = any($1::text[])
    order by name
  `, [selectedProducts.map((product) => product.slug)])

  console.log(JSON.stringify({ summary, products: productCheck.rows, finalCopies: check.rows }, null, 2))
  await client.end()
}

main().catch(async (error) => {
  console.error(error)
  try {
    await client.end()
  } catch {}
  process.exit(1)
})
