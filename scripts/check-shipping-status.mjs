import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from("products")
  .select("id, name, brand, price, affiliate_url, notes, image_status, status")
  .eq("status", "active")
  .order("created_at", { ascending: false });

if (error) { console.error(error.message); process.exit(1); }

const amazonProducts = data.filter(p => {
  if (!p.notes) return false;
  try {
    const n = JSON.parse(p.notes);
    return n.marketplace === "amazon.com";
  } catch { return false; }
});

console.log(`\n=== Amazon Products (${amazonProducts.length}) ===\n`);

const shipsToIL = [];
const noShipToIL = [];

for (const p of amazonProducts) {
  const n = JSON.parse(p.notes);
  const ships = n.shipping_status === "ships_to_israel" && n.is_publish_ready_for_il === true;
  const row = {
    name: p.name,
    id: p.id,
    price: n.price_usd,
    total_il: n.estimated_total_to_il_usd,
    score: n.product_score,
    ships_to_il: ships,
    has_affiliate: p.affiliate_url && !p.affiliate_url.includes("PENDING"),
    image_ready: p.image_status === "ready",
  };
  if (ships) shipsToIL.push(row);
  else noShipToIL.push(row);
}

console.log("✅ SHIPS TO ISRAEL (ready for posts):");
for (const r of shipsToIL) {
  const aff = r.has_affiliate ? "✅" : "❌ NO LINK";
  const img = r.image_ready ? "✅" : "❌";
  console.log(`  ${r.name} | $${r.total_il} | score ${r.score} | affiliate: ${aff} | image: ${img}`);
}

console.log(`\n❌ NO SHIPPING TO ISRAEL (or not publish-ready):`);
for (const r of noShipToIL) {
  const aff = r.has_affiliate ? "✅" : "❌ NO LINK";
  console.log(`  ${r.name} | $${r.price} | affiliate: ${aff}`);
}

console.log(`\n--- Summary: ${shipsToIL.length} ready for IL, ${noShipToIL.length} not ready ---`);
