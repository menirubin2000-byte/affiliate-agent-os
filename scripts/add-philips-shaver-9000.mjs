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

// ═══════════════════════════════════════════
// STEP 1: Add product
// ═══════════════════════════════════════════

const product = {
  name: "Philips Norelco Head Shaver Pro 9000 Series",
  slug: "philips-norelco-head-shaver-pro-9000",
  brand: "Philips Norelco",
  category: "Beauty & Grooming / Electric Shavers",
  affiliate_url: "https://amzn.to/4uYZqES",
  price: 112.96,
  commission_rate: 3,
  status: "active",
  image_url: null,
  image_status: "missing",
  notes: JSON.stringify({
    marketplace: "amazon.com",
    price_usd: 112.96,
    list_price_usd: 149.99,
    discount_percent: 25,
    import_fees_usd: 31.33,
    shipping_usd: 0,
    estimated_total_to_il_usd: 144.29,
    il_local_price_range_ils: "1051-1499",
    price_advantage_il: "Amazon ~520-550 ILS vs local 1051-1499 ILS — savings of 50-65%",
    shipping_status: "ships_to_israel",
    shipping_region: "US_TO_ISRAEL",
    advertising_region: "ISRAEL",
    is_publish_ready_for_il: true,
    commission_rate_percent: 3,
    estimated_commission_usd: 3.39,
    rating: 4.5,
    review_count: 351,
    bought_last_month: "1000+",
    badge: "Amazon Choice",
    deal: "Limited time deal -25%",
    seller: "Philips Norelco (Visit the Norelco Store)",
    ships_from: "Amazon",
    delivery_to_il: "FREE delivery Sunday, July 12",
    fastest_delivery: "Sunday, June 21",
    product_score: 8.5,
    model: "HS9980/40",
    target_audience: "Men who shave their heads, people looking for a comfortable electric head shaver, gift buyers, travelers",
    notes_he: "מכונת גילוח ראש חשמלית Pro 9000 של Philips Norelco. ראש מסתובב 360° עם להבי ComfortCut. דגם חדש, Amazon Choice, 1K+ קונים בחודש. בארץ ₪1,051-₪1,499, באמזון ~₪520-550 כולל משלוח ומס. פער מחיר ענק — חזק לפרסום.",
    image_source: "manufacturer_cdn",
    key_features: {
      head: "360° flexing head adapts to every contour of the scalp",
      blades: "ComfortCut blades for clean shave, gentle on skin",
      use: "Wet & dry use — shower-safe",
      battery: "Up to 120 minutes cordless runtime",
      attachments: "Multiple guard attachments for different lengths",
      design: "Ergonomic grip designed specifically for head shaving"
    }
  })
};

const { data: prod, error: prodErr } = await supabase
  .from("products")
  .insert(product)
  .select("id, name, status")
  .single();

if (prodErr) {
  // Check if already exists
  const { data: existing } = await supabase
    .from("products")
    .select("id, name")
    .eq("slug", product.slug)
    .single();
  if (existing) {
    console.log("Product already exists:", existing.id);
    process.exit(0);
  }
  console.error("Insert failed:", prodErr.message);
  process.exit(1);
}

console.log("✅ Product added:", prod.id, prod.name);
