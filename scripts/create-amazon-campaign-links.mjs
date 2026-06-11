import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const products = [
  { id: "656bdb6a-34f8-4dd5-9d98-76922fe12d02", name: "Waterpik Gem 5100", slug: "waterpik-gem-5100", affiliateUrl: "https://amzn.to/4dYyf7m" },
  { id: "896d1b5f-846b-47c2-b9f9-02b6142582b6", name: "Philips Sonicare 6500", slug: "philips-sonicare-6500", affiliateUrl: "https://amzn.to/4uuDPTZ" },
  { id: "6150f8d9-f907-4497-a580-b838f70b4dc7", name: "OBSBOT Tiny 2 Lite", slug: "obsbot-tiny-2-lite", affiliateUrl: "https://amzn.to/4g6WGkf" },
  { id: "b8d2123f-a9b1-4a20-af43-768f23ef52f2", name: "FIFINE TANK6S", slug: "fifine-tank6s", affiliateUrl: "https://amzn.to/4ohfkrP" },
  { id: "04d026d8-a64a-4521-93f2-bdeecd8c9a45", name: "Seagate One Touch 8TB", slug: "seagate-one-touch-8tb", affiliateUrl: "https://amzn.to/4valYTa" },
  { id: "2d38c018-8b01-472c-9e3e-9cd6c82f624e", name: "OWC TB4 Dock", slug: "owc-tb4-dock", affiliateUrl: "https://amzn.to/3RY0sm6" },
  { id: "93e9a0a9-adfe-4574-95bb-2058a3a21cf0", name: "Philips Norelco Pro 9000", slug: "philips-norelco-pro-9000", affiliateUrl: "https://amzn.to/4uYZqES" },
];

const platforms = ["linkedin", "medium", "substack"];

const rows = [];
for (const product of products) {
  for (const platform of platforms) {
    const mediumType = platform === "medium" ? "blog" : platform === "substack" ? "newsletter" : "social";
    const finalUrl = `${product.affiliateUrl}?utm_source=${platform}&utm_medium=${mediumType}&utm_campaign=${product.slug}`;
    rows.push({
      product_id: product.id,
      name: `${product.name} - ${platform}`,
      channel: platform,
      campaign_name: `${product.slug}-${platform}`,
      source: platform,
      medium: mediumType,
      term: product.slug,
      content: "amazon-review",
      base_url: product.affiliateUrl,
      final_url: finalUrl,
      notes: `Auto-generated campaign link for ${product.name} on ${platform}`,
      status: "active",
    });
  }
}

console.log(`\n📊 Creating ${rows.length} campaign links (${products.length} products × ${platforms.length} platforms)...\n`);

// Check for existing campaign links first
const { data: existing, error: existErr } = await supabase
  .from("campaign_links")
  .select("id, product_id, source")
  .in("product_id", products.map(p => p.id))
  .in("source", platforms);

if (existErr) {
  console.error("Error checking existing:", existErr.message);
  process.exit(1);
}

if (existing && existing.length > 0) {
  console.log(`⚠️  Found ${existing.length} existing campaign links. Skipping duplicates.\n`);
  const existingKeys = new Set(existing.map(e => `${e.product_id}:${e.source}`));
  const newRows = rows.filter(r => !existingKeys.has(`${r.product_id}:${r.source}`));

  if (newRows.length === 0) {
    console.log("✅ All campaign links already exist! Nothing to insert.");
    process.exit(0);
  }

  console.log(`📝 Inserting ${newRows.length} new campaign links...\n`);
  const { data, error } = await supabase.from("campaign_links").insert(newRows).select("id, product_id, source, channel");
  if (error) {
    console.error("Insert error:", error.message);
    process.exit(1);
  }
  console.log(`✅ ${data.length} campaign links created!\n`);
  for (const d of data) {
    const prod = products.find(p => p.id === d.product_id);
    console.log(`  🔗 ${d.source.padEnd(10)} — ${prod?.name}`);
  }
} else {
  // Insert all
  const { data, error } = await supabase.from("campaign_links").insert(rows).select("id, product_id, source, channel");
  if (error) {
    console.error("Insert error:", error.message);
    process.exit(1);
  }
  console.log(`✅ ${data.length} campaign links created!\n`);
  for (const d of data) {
    const prod = products.find(p => p.id === d.product_id);
    console.log(`  🔗 ${d.source.padEnd(10)} — ${prod?.name}`);
  }
}

console.log(`\n════════════════════════════════════════════════`);
console.log(`🎯 Campaign links should now unblock the approval dashboard.`);
console.log(`📋 Check: https://affiliate-agent-os.vercel.app/dashboard/he`);
console.log(`════════════════════════════════════════════════`);
