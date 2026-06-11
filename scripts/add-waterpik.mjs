import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const product = {
  name: "Waterpik Cordless Gem Water Flosser 5100",
  slug: "waterpik-cordless-gem-water-flosser-5100",
  brand: "Waterpik",
  category: "Oral Care / Water Flosser",
  affiliate_url: "https://amzn.to/4dYyf7m",
  price: 67.99,
  commission_rate: 0,
  status: "active",
  image_url: null,
  image_status: "missing",
  notes: JSON.stringify({
    marketplace: "amazon.com",
    price_usd: 67.99,
    shipping_import_to_il_usd: 0,
    shipping_usd: 0,
    estimated_total_to_il_usd: 67.99,
    shipping_status: "ships_to_israel",
    shipping_region: "US_TO_ISRAEL",
    advertising_region: "ISRAEL",
    is_publish_ready_for_il: true,
    rating: 4.4,
    review_count: 60,
    bought_last_month: 2000,
    seller: "Amazon.com",
    ships_from: "Amazon.com",
    product_score: 8.5,
    target_audience: "people with braces, implants, gum care, daily dental hygiene, travel users",
    notes_he: "מוצר חזק לשיווק לישראל: מחיר סופי נמוך, משלוח חינם, ללא מיסי יבוא, מותג מוכר וביקוש גבוה. לבדוק עמלה מדויקת ב-SiteStripe.",
    image_source: "placeholder_until_api_or_approved_manufacturer_asset",
    image_reference: "https://amzn.to/4dWY7Aq"
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
