import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get all Amazon active products (the ones we care about for IL publishing)
const amazonProducts = [
  "Waterpik Cordless Gem Water Flosser 5100",
  "Philips Sonicare 6500 Series Electric Toothbrush",
  "OBSBOT Tiny 2 Lite 4K Webcam",
  "FIFINE AmpliTank TANK6S Vocal Dynamic Microphone",
  "Seagate One Touch 8TB External Hard Drive Desktop HDD",
  "SSK 1TB SSD External Hard Drive Portable SSD",
  "OWC 11-Port Thunderbolt 4 Dock",
  "UGREEN Revodok Max 17-Port Thunderbolt 5 Dock",
  "Logitech MX Vertical Wireless Mouse",
];

console.log("📦 סטטוס סופי של מוצרי Amazon:\n");
console.log("| # | מוצר | מחיר | תמונה | Affiliate | עמלה | IL? |");
console.log("|---|------|------|-------|-----------|------|-----|");

let i = 0;
for (const name of amazonProducts) {
  const { data } = await supabase.from("products").select("*").eq("name", name).single();
  if (!data) { console.log(`| ${++i} | ${name} | ❌ NOT FOUND | | | | |`); continue; }

  let notes = {};
  try { notes = JSON.parse(data.notes || "{}"); } catch {}

  const img = data.image_status === "ready" ? "✅" : "❌";
  const link = data.affiliate_url ? "✅" : "❌";
  const comm = data.commission_rate ? `${data.commission_rate}%` : "❓";
  const il = notes.is_publish_ready_for_il ? "✅" : "❓";

  console.log(`| ${++i} | ${data.name} | $${data.price || "?"} | ${img} | ${link} | ${comm} | ${il} |`);
}

// Summary: which products are ready for IL publishing
console.log("\n\n📋 מוצרים מוכנים לפרסום (IL + תמונה + affiliate):");
const { data: ready } = await supabase
  .from("products")
  .select("name, price, commission_rate, affiliate_url, image_status, notes")
  .eq("status", "active")
  .eq("image_status", "ready")
  .not("affiliate_url", "is", null);

let readyForIL = 0;
for (const p of ready || []) {
  let notes = {};
  try { notes = JSON.parse(p.notes || "{}"); } catch {}
  if (notes.is_publish_ready_for_il && p.affiliate_url?.includes("amzn.to")) {
    readyForIL++;
    console.log(`  ✅ ${p.name} ($${p.price}) - ${p.commission_rate || "?"}%`);
  }
}
console.log(`\nסה"כ מוכנים: ${readyForIL}`);
