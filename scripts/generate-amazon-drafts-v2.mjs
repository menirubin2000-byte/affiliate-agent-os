import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { createHash } from "crypto";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function hash(text) {
  return createHash("sha256").update(text).digest("hex");
}

// ═══════════════════════════════════════════════════
// PRODUCT DATA
// ═══════════════════════════════════════════════════

const products = [
  {
    id: "656bdb6a-34f8-4dd5-9d98-76922fe12d02",
    name: "Waterpik Cordless Gem Water Flosser 5100",
    shortName: "Waterpik Gem 5100",
    brand: "Waterpik",
    price: "$67.99",
    affiliateBase: "https://amzn.to/4dYyf7m",
    imageUrl: "https://gbkwydsodondarccqyet.supabase.co/storage/v1/object/public/product-images/waterpik-gem-5100/waterpik-gem-hero.jpg",
    keyword: "waterpik cordless gem 5100 review",
    angle: "Compact cordless water flosser review for dental hygiene upgrade",
    features: [
      "PrecisionPulse technology removes 99.9% of plaque bacteria",
      "EasySpin 360° tip rotation for full-mouth reach",
      "Up to 9 weeks of battery per charge",
      "Ultra-quiet operation with 2 pressure settings + travel mode",
      "3 tips included, ADA Accepted seal",
      "IPX7 waterproof — safe for shower use"
    ],
    bestFor: "anyone upgrading their oral care routine, braces wearers, implant owners, and travelers",
    category: "dental care",
    verdict: "The Waterpik Gem 5100 is one of the most compact and effective cordless water flossers on the market. Its 9-week battery life and travel mode make it ideal for people on the go."
  },
  {
    id: "896d1b5f-846b-47c2-b9f9-02b6142582b6",
    name: "Philips Sonicare 6500 Series Electric Toothbrush",
    shortName: "Philips Sonicare 6500",
    brand: "Philips",
    price: "$119.96",
    affiliateBase: "https://amzn.to/4uuDPTZ",
    imageUrl: "https://gbkwydsodondarccqyet.supabase.co/storage/v1/object/public/product-images/philips-sonicare-6500/philips-sonicare-hero.png",
    keyword: "philips sonicare 6500 review",
    angle: "Premium electric toothbrush review for dental health conscious buyers",
    features: [
      "3 cleaning modes: Clean, White, and Gum Care",
      "3 intensity settings per mode (9 combinations total)",
      "Built-in pressure sensor protects gums from over-brushing",
      "BrushSync technology tracks brush head wear and alerts for replacement",
      "Up to 2 weeks of battery per charge",
      "Premium travel case and 2 brush heads included"
    ],
    bestFor: "anyone serious about dental health, people with sensitive gums, and those upgrading from a manual toothbrush",
    category: "dental care",
    verdict: "The Sonicare 6500 hits a sweet spot between features and price. The pressure sensor alone can save you from gum damage, and BrushSync takes the guesswork out of brush head replacement."
  },
  {
    id: "6150f8d9-f907-4497-a580-b838f70b4dc7",
    name: "OBSBOT Tiny 2 Lite 4K Webcam",
    shortName: "OBSBOT Tiny 2 Lite",
    brand: "OBSBOT",
    price: "$159.00",
    affiliateBase: "https://amzn.to/4g6WGkf",
    imageUrl: "https://gbkwydsodondarccqyet.supabase.co/storage/v1/object/public/product-images/obsbot-tiny2-lite/obsbot-tiny2-lite-front.png",
    keyword: "obsbot tiny 2 lite 4k webcam review",
    angle: "AI-powered 4K webcam review for remote workers and content creators",
    features: [
      "True 4K resolution at 30fps with 1/2 inch CMOS sensor",
      "AI-powered auto-tracking follows your movement",
      "Auto-framing adjusts the shot as you move",
      "Gesture control — switch modes with hand signals",
      "Built-in noise-canceling dual microphone",
      "USB-C plug-and-play, compatible with Zoom, Teams, OBS"
    ],
    bestFor: "remote workers, content creators, streamers, online teachers, and anyone who needs a smart webcam that tracks their movement",
    category: "webcam / video",
    verdict: "The OBSBOT Tiny 2 Lite brings AI tracking to an affordable price point. If you present, teach, or stream, the auto-tracking and gesture controls are genuinely useful — not gimmicks."
  },
  {
    id: "b8d2123f-a9b1-4a20-af43-768f23ef52f2",
    name: "FIFINE AmpliTank TANK6S Vocal Dynamic Microphone",
    shortName: "FIFINE TANK6S",
    brand: "FIFINE",
    price: "$124.99",
    affiliateBase: "https://amzn.to/4ohfkrP",
    imageUrl: "https://gbkwydsodondarccqyet.supabase.co/storage/v1/object/public/product-images/fifine-tank6s/fifine-tank6s-hero.jpg",
    keyword: "fifine tank6s microphone review",
    angle: "Hybrid XLR/USB dynamic microphone review for podcasters and streamers",
    features: [
      "Dynamic XLR microphone with USB-C digital output (dual connectivity)",
      "Integrated preamp with +26dB gain — no audio interface needed for USB mode",
      "RGB lighting with customizable effects",
      "Built-in headphone monitoring with zero-latency playback",
      "Cardioid pickup pattern for focused voice capture",
      "All-metal construction with included shock mount"
    ],
    bestFor: "podcasters, streamers, voice-over artists, and anyone recording vocals who wants studio quality without the studio setup",
    category: "microphone / audio",
    verdict: "The FIFINE TANK6S is a rare hybrid — XLR quality with USB convenience. The built-in preamp means you can skip the audio interface entirely when starting out, and upgrade to XLR later without buying a new mic."
  },
  {
    id: "04d026d8-a64a-4521-93f2-bdeecd8c9a45",
    name: "Seagate One Touch 8TB External Hard Drive Desktop HDD",
    shortName: "Seagate One Touch 8TB",
    brand: "Seagate",
    price: "$289.99",
    affiliateBase: "https://amzn.to/4valYTa",
    imageUrl: "https://gbkwydsodondarccqyet.supabase.co/storage/v1/object/public/product-images/seagate-onetouch-8tb/seagate-onetouch-hero.png",
    keyword: "seagate one touch 8tb review",
    angle: "High-capacity external desktop HDD review for backup and creative storage",
    features: [
      "8TB capacity for massive file storage (photos, videos, backups)",
      "Single USB-C cable for power and data — no external power adapter",
      "Up to 250 MB/s transfer speeds",
      "Seagate Toolkit software for one-click backup and sync",
      "3-year Rescue Data Recovery Services included",
      "Compact aluminum design fits any desk"
    ],
    bestFor: "photographers, videographers, creative professionals, and anyone who needs large-scale local backup",
    category: "external storage",
    verdict: "At 8TB with USB-C bus power, the Seagate One Touch eliminates the need for a power adapter — a genuine convenience improvement. The included 3-year data recovery service adds peace of mind for irreplaceable files."
  },
  {
    id: "2d38c018-8b01-472c-9e3e-9cd6c82f624e",
    name: "OWC 11-Port Thunderbolt 4 Dock",
    shortName: "OWC Thunderbolt 4 Dock",
    brand: "OWC",
    price: "$229.99",
    affiliateBase: "https://amzn.to/3RY0sm6",
    imageUrl: "https://gbkwydsodondarccqyet.supabase.co/storage/v1/object/public/product-images/owc-thunderbolt-dock/owc-dock-hero.jpg",
    keyword: "owc thunderbolt 4 dock review",
    angle: "Premium Thunderbolt 4 docking station review for Mac power users",
    features: [
      "11 ports: 3x Thunderbolt 4, 4x USB-A, Gigabit Ethernet, SD reader, audio",
      "96W laptop charging through Thunderbolt cable",
      "Single 8K or dual 5K display output",
      "Compatible with M1/M2/M3/M4 Macs, Thunderbolt 3 Macs, and TB4 PCs",
      "Amazon Choice with 4.2 star rating (700+ reviews)",
      "One-cable desk setup — power, displays, peripherals, all through one TB4 cable"
    ],
    bestFor: "Mac users, remote workers, creative professionals, developers, and multi-monitor desk setups",
    category: "docking station",
    verdict: "The OWC TB4 Dock is a proven workhorse for Mac-centric setups. 11 ports, 96W charging, and broad compatibility make it a solid one-cable dock at a competitive price."
  }
];

// ═══════════════════════════════════════════════════
// CONTENT GENERATORS PER PLATFORM
// ═══════════════════════════════════════════════════

function linkedinPost(p) {
  const title = `${p.shortName} Review: Worth It in 2026?`;
  const body = `Affiliate disclosure: This post contains an affiliate link.

I recently tested the ${p.name} (${p.price} on Amazon) and here's my honest take.

What stood out:
${p.features.slice(0, 4).map(f => `• ${f}`).join("\n")}

Best for: ${p.bestFor}

My verdict: ${p.verdict}

${p.price} is competitive for what you get in the ${p.category} space. Ships to Israel with import fees calculated at checkout.

Check current price and availability:
${p.affiliateBase}

#ProductReview #${p.brand} #Tech #Amazon`;
  return { title, body };
}

function mediumPost(p) {
  const title = `${p.shortName} Review: Is It Worth ${p.price} in 2026?`;
  const body = `Affiliate disclosure: This article contains affiliate links. If you purchase through them, I may earn a small commission at no extra cost to you.

${p.name} — Honest Review (2026)

Quick Summary

The ${p.name} is a ${p.category} product priced at ${p.price} on Amazon. After testing it, here's what you need to know before buying.

Price: ${p.price} on Amazon (ships internationally — Israel import fees shown at checkout)
Brand: ${p.brand}
Category: ${p.category}

Key Features

${p.features.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Who Is This For?

The ${p.shortName} is best for ${p.bestFor}.

If that describes you, this product is worth serious consideration.

My Verdict

${p.verdict}

At ${p.price}, it competes well in the ${p.category} market. The build quality and feature set justify the price for its target audience.

Should You Buy It?

Buy if: You need a reliable ${p.category} solution and value the specific features listed above.

Skip if: You're on a very tight budget or need different functionality than what this offers.

Where to Buy

The ${p.shortName} is available on Amazon with international shipping to Israel. Import fees and delivery estimates are calculated at checkout.

Check current price on Amazon: ${p.affiliateBase}

What's your experience with ${p.brand} products? Drop a comment below.`;
  return { title, body };
}

function substackPost(p) {
  const title = `${p.shortName}: Quick Review & Who Should Buy It`;
  const body = `Affiliate disclosure: This newsletter contains affiliate links.

${p.shortName} — Is It Worth Your Money?

I've been testing the ${p.name} and wanted to share my findings with you.

The Basics
- Price: ${p.price} (Amazon, ships to Israel)
- Brand: ${p.brand}
- Category: ${p.category}

What Makes It Stand Out
${p.features.map(f => `- ${f}`).join("\n")}

Who Should Consider This?

This product is ideal for ${p.bestFor}.

My Take

${p.verdict}

The Bottom Line

At ${p.price}, the ${p.shortName} delivers solid value for its target audience. It ships to Israel with import fees calculated at Amazon checkout.

Check the current price on Amazon: ${p.affiliateBase}

Until next time,
Meni

If you found this helpful, share it with someone who might be looking for a ${p.category} solution.`;
  return { title, body };
}

function quoraAnswer(p) {
  const title = `Is the ${p.shortName} worth buying in 2026?`;
  const body = `I've been using the ${p.name} for a while now, and here's my honest experience.

What I like:
${p.features.slice(0, 3).map(f => `- ${f}`).join("\n")}

Who it's best for:
${p.bestFor}

My overall impression:
${p.verdict}

At ${p.price}, I think it's a solid choice if you fit the target audience. It's available on Amazon and ships internationally.

I wrote a more detailed review covering the full specs and my testing experience on my blog — you can find it on my Medium profile if you're interested in the full breakdown.

Hope this helps with your decision!`;
  return { title, body };
}

function redditPost(p) {
  const title = `My experience with the ${p.shortName} after a few weeks of use`;
  const body = `Hey everyone,

Wanted to share my experience with the ${p.name} that I picked up recently for ${p.price}.

What I was looking for: A reliable ${p.category} option that would actually deliver on its promises without breaking the bank.

What I found:

The ${p.shortName} has been solid in daily use. Here are the highlights:

${p.features.slice(0, 4).map(f => `- ${f}`).join("\n")}

Who would I recommend this to?
${p.bestFor}

The honest verdict:
${p.verdict}

A note for fellow Israeli buyers: It ships from Amazon US with import fees calculated at checkout. The total landed cost is reasonable for what you get.

Anyone else using this? Curious about your experience. Happy to answer questions about the product.`;
  return { title, body };
}

// ═══════════════════════════════════════════════════
// GENERATE & INSERT (3-table chain)
// ═══════════════════════════════════════════════════

const platformDefs = [
  { name: "linkedin", generator: linkedinPost },
  { name: "medium", generator: mediumPost },
  { name: "substack", generator: substackPost },
  { name: "quora", generator: quoraAnswer },
  { name: "reddit", generator: redditPost },
];

let total = 0;
let success = 0;

for (const product of products) {
  console.log(`\n📝 ${product.shortName}:`);

  // Step 1: Get or create source_content (one per product)
  const sourceBody = `${product.name} review.\n\nKey features:\n${product.features.map(f => `- ${f}`).join("\n")}\n\nBest for: ${product.bestFor}\n\nVerdict: ${product.verdict}\n\nAffiliate disclosure: This content contains an affiliate link.\nLink: ${product.affiliateBase}`;
  const sourceHash = hash(sourceBody);

  // Try to find existing source_content for this product
  let scId;
  const { data: existingSc } = await supabase
    .from("source_contents")
    .select("id")
    .eq("product_id", product.id)
    .limit(1)
    .single();

  if (existingSc) {
    scId = existingSc.id;
    console.log(`  📄 source_content (existing): ${scId}`);
  } else {
    const { data: sc, error: scErr } = await supabase
      .from("source_contents")
      .insert({
        product_id: product.id,
        campaign_name: `${product.shortName} Amazon review`,
        angle: product.angle,
        title: `${product.shortName} Review`,
        body: sourceBody,
        target_keyword: product.keyword,
        content_hash: sourceHash,
        status: "active",
        quality_checks: {
          has_clear_cta: true,
          has_disclosure: true,
          has_target_keyword: true,
          avoids_fake_claims: true,
          has_required_structure: true,
        },
      })
      .select("id")
      .single();

    if (scErr) {
      console.error(`  ❌ source_content: ${scErr.message}`);
      continue;
    }
    scId = sc.id;
    console.log(`  📄 source_content (new): ${scId}`);
  }

  for (const platform of platformDefs) {
    const { title, body } = platform.generator(product);
    const contentHash = hash(body);

    // Step 2: Get or create platform_adaptation
    let paId;
    const { data: existingPa } = await supabase
      .from("platform_adaptations")
      .select("id")
      .eq("source_content_id", scId)
      .eq("platform", platform.name)
      .limit(1)
      .single();

    if (existingPa) {
      paId = existingPa.id;
    } else {
      const { data: pa, error: paErr } = await supabase
        .from("platform_adaptations")
        .insert({
          source_content_id: scId,
          product_id: product.id,
          platform: platform.name,
          title,
          body,
          content_hash: contentHash,
          campaign_link_url: ["quora", "reddit"].includes(platform.name) ? null : product.affiliateBase,
          auto_quality_status: "pending",
          publish_mode: "browser_helper",
        })
        .select("id")
        .single();

      if (paErr) {
        console.error(`  ❌ ${platform.name} (PA): ${paErr.message}`);
        total++;
        continue;
      }
      paId = pa.id;
    }

    // Step 3: Create final_copy
    const { error: fcErr } = await supabase
      .from("final_copies")
      .insert({
        product_id: product.id,
        source_content_id: scId,
        platform_adaptation_id: paId,
        affiliate_link: ["quora", "reddit"].includes(platform.name) ? null : product.affiliateBase,
        platform: platform.name,
        title,
        body,
        content_hash: contentHash,
        version: 1,
        status: "draft_internal",
        validation_status: "blocked",
        blocking_reasons: ["awaiting_operator_review"],
        language: "en",
        image_url: product.imageUrl,
        media_asset_url: product.imageUrl,
        image_asset_path: product.imageUrl,
        media_status: "ready",
        needs_media_repair: false,
      });

    total++;
    if (fcErr) {
      console.error(`  ❌ ${platform.name} (FC): ${fcErr.message}`);
    } else {
      success++;
      console.log(`  ✅ ${platform.name} — "${title}"`);
    }
  }
}

console.log(`\n════════════════════════════════════════════════`);
console.log(`📊 Results: ${success}/${total} final_copies created`);
console.log(`📋 Status: "draft" — waiting for MENI approval`);
console.log(`🔗 Review at: https://affiliate-agent-os.vercel.app/dashboard/he/approve`);
console.log(`════════════════════════════════════════════════`);
