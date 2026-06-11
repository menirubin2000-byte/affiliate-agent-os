import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from("products")
  .select("id, name, brand, price, affiliate_url, image_status, image_url, status, commission_rate, notes")
  .eq("status", "active")
  .order("created_at", { ascending: false });

if (error) { console.error(error.message); process.exit(1); }

console.log(`\n📦 ${data.length} מוצרים פעילים:\n`);
for (const p of data) {
  let notes = {};
  try { notes = JSON.parse(p.notes || "{}"); } catch {}
  const ship = notes.is_publish_ready_for_il ? "✅ IL" : "❓";
  const img = p.image_status === "ready" ? "✅" : "❌";
  const link = p.affiliate_url ? "✅" : "❌";
  const comm = p.commission_rate ? `${p.commission_rate}%` : "?";
  console.log(`${img} ${p.name}`);
  console.log(`   💰 $${p.price || "?"} | 🔗 ${link} ${p.affiliate_url || ""} | 📷 ${p.image_status} | 💵 ${comm} | ${ship}`);
  console.log(`   ID: ${p.id}`);
  console.log("");
}
