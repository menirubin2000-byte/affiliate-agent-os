import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from("products")
  .select("id, name, brand, category, price, affiliate_url, notes, image_status, status")
  .eq("status", "active")
  .order("created_at", { ascending: false });

if (error) { console.error(error.message); process.exit(1); }

console.log(`Total active products: ${data.length}\n`);

for (const p of data) {
  let shipIL = "?";
  let score = "?";
  try {
    const n = JSON.parse(p.notes);
    shipIL = n.shipping_status === "ships_to_israel" ? "✅ IL" : "❌ NO IL";
    score = n.product_score || "?";
  } catch {}

  const aff = p.affiliate_url && !p.affiliate_url.includes("PENDING") ? "✅" : "❌";
  const img = p.image_status === "ready" ? "✅" : "❌";
  console.log(`${p.name} | ${p.category || ""} | $${p.price || "?"} | ship: ${shipIL} | aff: ${aff} | img: ${img} | score: ${score}`);
}
