import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const product = {
  name: "Philips Sonicare 6500 Series Electric Toothbrush",
  slug: "philips-sonicare-6500-series-electric-toothbrush",
  brand: "Philips Sonicare",
  category: "Oral Care / Electric Toothbrush",
  affiliate_url: "PENDING_AFFILIATE_LINK",
  price: 119.96,
  commission_rate: 0,
  status: "active",
  image_url: null,
  image_status: "missing",
  notes: JSON.stringify({
    marketplace: "amazon.com",
    price_usd: 119.96,
    shipping_import_to_il_usd: 32.26,
    shipping_usd: 0,
    estimated_total_to_il_usd: 152.22,
    shipping_status: "ships_to_israel",
    shipping_region: "US_TO_ISRAEL",
    advertising_region: "ISRAEL",
    is_publish_ready_for_il: true,
    estimated_commission_usd_4_percent: 4.80,
    estimated_commission_usd_5_percent: 6.00,
    rating: 4.7,
    review_count: 426,
    bought_last_month: 3000,
    badge: "Amazon Choice",
    seller: "Amazon.com",
    ships_from: "Amazon.com",
    product_score: 8,
    target_audience: "dental care, whitening, gum care, braces, premium toothbrush buyers",
    notes_he: "מוצר טוב לשיווק לישראל: מותג חזק, ביקוש גבוה, Amazon Choice, משלוח חינם. Import Charges מעט גבוהים אך עדיין סביר.",
    image_source: "placeholder_until_api_or_approved_manufacturer_asset",
    image_reference: "https://amzn.to/3RNTAI2",
    affiliate_link_status: "PENDING — user needs to paste short link"
  })
};

const { data, error } = await supabase
  .from("products")
  .insert(product)
  .select("id, name, status")
  .single();

if (error) {
  console.error("Insert failed:", error.message);
  process.exit(1);
}

console.log("Product added:", JSON.stringify(data, null, 2));
