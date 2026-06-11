import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data } = await supabase
  .from("products")
  .select("name, category, price, affiliate_url, notes")
  .eq("status", "active")
  .order("name");

// Physical products only (have a price or Amazon-related category)
const physicalCategories = ["gaming", "chair", "mouse", "monitor", "hard drive", "ssd", "webcam", "microphone", "oral care", "water flosser", "toothbrush", "desk", "keyboard", "headphone", "speaker"];

for (const p of data) {
  let shipIL = false;
  const cat = (p.category || "").toLowerCase();
  const name = p.name.toLowerCase();

  // Check if physical product
  const isPhysical = physicalCategories.some(k => cat.includes(k) || name.includes(k)) || (p.price && p.price > 20);

  if (!isPhysical) continue; // skip SaaS products

  try {
    const n = JSON.parse(p.notes);
    shipIL = n.shipping_status === "ships_to_israel";
  } catch {}

  if (!shipIL) {
    console.log(`❌ ${p.name} | ${p.category || "?"} | $${p.price || "?"}`);
  }
}
