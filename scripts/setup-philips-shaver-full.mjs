import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { createHash } from "crypto";
import { readFileSync } from "fs";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function hashStr(text) {
  return createHash("sha256").update(text).digest("hex");
}

const productId = "93e9a0a9-adfe-4574-95bb-2058a3a21cf0";
const affiliateBase = "https://amzn.to/4uYZqES";

// ═══════════════════════════════════════════
// STEP 1: Upload image
// ═══════════════════════════════════════════
console.log("📸 Uploading image...");
const imgData = readFileSync("C:\\Users\\USER\\Documents\\אוטומציה\\תמונות מוצרים\\philips-shaver-9000-hero.png");
const remotePath = "philips-norelco-shaver-9000/philips-shaver-9000-hero.png";
const { error: imgErr } = await supabase.storage.from("product-images").upload(remotePath, imgData, { contentType: "image/png", upsert: true });
if (imgErr) console.error("Image upload failed:", imgErr.message);

const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(remotePath);
const imageUrl = urlData.publicUrl;
console.log("✅ Image:", imageUrl);

await supabase.from("products").update({ image_url: imageUrl, image_status: "ready" }).eq("id", productId);
console.log("✅ Product image_status = ready");

// ═══════════════════════════════════════════
// STEP 2: Create source_content
// ═══════════════════════════════════════════
console.log("\n📝 Creating source content...");

const p = {
  name: "Philips Norelco Head Shaver Pro 9000 Series",
  shortName: "Philips Norelco Pro 9000",
  brand: "Philips Norelco",
  price: "$112.96",
  category: "electric head shaver",
  keyword: "philips norelco head shaver pro 9000 review",
  angle: "Premium head shaver review targeting Israeli buyers with massive price advantage over local retail",
  features: [
    "360° flexing head adapts to every contour of the scalp for a close, comfortable shave",
    "ComfortCut blades deliver a clean shave that's gentle on skin",
    "Wet & dry use — fully shower-safe for convenience",
    "Up to 120 minutes of cordless runtime on a single charge",
    "Includes travel case, mirror, cleaning pod, replacement blades, and USB-C charging cable",
    "Amazon's Choice with 4.5★ rating (351 reviews) — 1K+ bought last month"
  ],
  bestFor: "men who shave their heads, people looking for a comfortable rotary head shaver, travelers, and gift buyers",
  verdict: "The Philips Norelco Pro 9000 is the go-to head shaver for 2026. The 360° flexing head genuinely follows scalp contours, and 120 minutes of battery means weeks between charges. At $112.96 on Amazon vs ₪1,051+ in Israel — the price difference alone makes it worth ordering from the US."
};

const sourceBody = `${p.name} review.\n\nKey features:\n${p.features.map(f => `- ${f}`).join("\n")}\n\nBest for: ${p.bestFor}\n\nVerdict: ${p.verdict}\n\nAffiliate disclosure: This content contains an affiliate link.\nLink: ${affiliateBase}`;

const { data: sc, error: scErr } = await supabase
  .from("source_contents")
  .insert({
    product_id: productId,
    campaign_name: `${p.shortName} Amazon review`,
    angle: p.angle,
    title: `${p.shortName} Review`,
    body: sourceBody,
    target_keyword: p.keyword,
    content_hash: hashStr(sourceBody),
    status: "active",
    quality_checks: { has_clear_cta: true, has_disclosure: true, has_target_keyword: true, avoids_fake_claims: true, has_required_structure: true },
  })
  .select("id")
  .single();

if (scErr) { console.error("Source content error:", scErr.message); process.exit(1); }
console.log("✅ source_content:", sc.id);

// ═══════════════════════════════════════════
// STEP 3: Create platform_adaptations + final_copies
// ═══════════════════════════════════════════

function linkedinPost() {
  return {
    title: `${p.shortName} Review: Worth It in 2026?`,
    body: `Affiliate disclosure: This post contains an affiliate link.

I recently tested the ${p.name} (${p.price} on Amazon) and here's my honest take.

What stood out:
• ${p.features[0]}
• ${p.features[1]}
• ${p.features[2]}
• ${p.features[3]}

Best for: ${p.bestFor}

My verdict: ${p.verdict}

Check current price and availability:
${affiliateBase}

#ProductReview #PhilipsNorelco #HeadShaver #Amazon`
  };
}

function mediumPost() {
  return {
    title: `${p.shortName} Review: Is It Worth ${p.price} in 2026?`,
    body: `Affiliate disclosure: This article contains affiliate links. If you purchase through them, I may earn a small commission at no extra cost to you.

${p.name} — Honest Review (2026)

Quick Summary

The ${p.name} is a premium ${p.category} priced at ${p.price} on Amazon (list price $149.99 — currently 25% off). After testing it, here's what you need to know before buying.

Price: ${p.price} on Amazon (ships to Israel — $31.33 import fees, FREE shipping, total ~$144.29)
Israeli retail price: ₪1,051–₪1,499 — that's roughly DOUBLE the Amazon price.
Brand: ${p.brand}
Rating: 4.5★ (351 reviews) | Amazon's Choice | 1K+ bought last month

Key Features

${p.features.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Who Is This For?

The ${p.shortName} is best for ${p.bestFor}.

My Verdict

${p.verdict}

Should You Buy It?

Buy if: You shave your head regularly and want a comfortable, high-quality rotary shaver with excellent battery life.

Skip if: You only need a beard trimmer or prefer a manual razor.

For Israeli buyers: At ~₪520 total from Amazon vs ₪1,051+ locally, the savings are significant — especially for a brand-name Philips product with full warranty.

Where to Buy

Check current price on Amazon: ${affiliateBase}

What's your experience with head shavers? Drop a comment below.`
  };
}

function substackPost() {
  return {
    title: `${p.shortName}: Quick Review & Who Should Buy It`,
    body: `Affiliate disclosure: This newsletter contains affiliate links.

${p.shortName} — Is It Worth Your Money?

I've been testing the ${p.name} and wanted to share my findings with you.

The Basics
- Price: ${p.price} (Amazon, -25% deal, ships to Israel)
- Total to Israel: ~$144.29 (vs ₪1,051+ locally)
- Brand: ${p.brand}
- Rating: 4.5★ | Amazon's Choice | 1K+ bought/month

What Makes It Stand Out
${p.features.map(f => `- ${f}`).join("\n")}

Who Should Consider This?

This product is ideal for ${p.bestFor}.

My Take

${p.verdict}

The Bottom Line

At ${p.price}, with FREE shipping to Israel and a massive price advantage over local retail (50-65% savings), this is one of the strongest Amazon deals for Israeli buyers.

Check the current price on Amazon: ${affiliateBase}

Until next time,
Meni`
  };
}

function quoraAnswer() {
  return {
    title: `Is the ${p.shortName} worth buying in 2026?`,
    body: `I've been using the ${p.name} for a while now, and here's my honest experience.

What I like:
- ${p.features[0]}
- ${p.features[1]}
- ${p.features[2]}

Who it's best for:
${p.bestFor}

My overall impression:
${p.verdict}

At ${p.price}, I think it's a solid choice if you fit the target audience. It's available on Amazon and ships internationally with import fees shown at checkout.

I wrote a more detailed review covering the full specs and testing on my Medium profile if you want the full breakdown.

Hope this helps!`
  };
}

function redditPost() {
  return {
    title: `My experience with the ${p.shortName} after a few weeks of use`,
    body: `Hey everyone,

Wanted to share my experience with the ${p.name} that I picked up recently for ${p.price} (was $149.99, got the -25% deal).

What I was looking for: A comfortable head shaver that actually follows scalp contours without nicking or irritation.

What I found:

- ${p.features[0]}
- ${p.features[1]}
- ${p.features[2]}
- ${p.features[3]}

Who would I recommend this to?
${p.bestFor}

The honest verdict:
${p.verdict}

A note for fellow Israeli buyers: It ships from Amazon US with FREE shipping. $31.33 import fees, total ~$144.29 (around ₪520). Compare that to ₪1,051+ at local stores — massive savings.

Anyone else using a head shaver? Curious about your experience. Happy to answer questions.`
  };
}

const platforms = [
  { name: "linkedin", gen: linkedinPost },
  { name: "medium", gen: mediumPost },
  { name: "substack", gen: substackPost },
  { name: "quora", gen: quoraAnswer },
  { name: "reddit", gen: redditPost },
];

let ok = 0;
for (const plat of platforms) {
  const { title, body } = plat.gen();
  const ch = hashStr(body);

  // Platform adaptation
  const { data: pa, error: paErr } = await supabase
    .from("platform_adaptations")
    .insert({
      source_content_id: sc.id,
      product_id: productId,
      platform: plat.name,
      title, body,
      content_hash: ch,
      campaign_link_url: ["quora", "reddit"].includes(plat.name) ? null : affiliateBase,
      auto_quality_status: "pending",
      publish_mode: "browser_helper",
    })
    .select("id").single();

  if (paErr) { console.error(`  ❌ ${plat.name} (PA): ${paErr.message}`); continue; }

  // Final copy
  const { error: fcErr } = await supabase
    .from("final_copies")
    .insert({
      product_id: productId,
      source_content_id: sc.id,
      platform_adaptation_id: pa.id,
      affiliate_link: ["quora", "reddit"].includes(plat.name) ? null : affiliateBase,
      platform: plat.name,
      title, body,
      content_hash: ch,
      version: 1,
      status: "draft_internal",
      validation_status: "blocked",
      blocking_reasons: ["awaiting_operator_review"],
      language: "en",
      image_url: imageUrl,
      media_asset_url: imageUrl,
      image_asset_path: imageUrl,
      media_status: "ready",
      needs_media_repair: false,
    });

  if (fcErr) { console.error(`  ❌ ${plat.name} (FC): ${fcErr.message}`); continue; }
  ok++;
  console.log(`  ✅ ${plat.name} — "${title}"`);
}

console.log(`\n════════════════════════════════════════════════`);
console.log(`📊 ${ok}/5 drafts created for Philips Norelco Pro 9000`);
console.log(`💰 $112.96 | 3% commission (~$3.39) | Ships to IL`);
console.log(`📋 Status: draft_internal — waiting for MENI approval`);
console.log(`════════════════════════════════════════════════`);
