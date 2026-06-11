import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const product = {
  name: "OBSBOT Tiny 2 Lite 4K Webcam",
  slug: "obsbot-tiny-2-lite-4k-webcam",
  brand: "OBSBOT",
  category: "Webcam / Streaming Camera",
  affiliate_url: "https://amzn.to/4g6WGkf",
  price: 159.00,
  commission_rate: 0,
  status: "active",
  image_url: null,
  image_status: "missing",
  notes: JSON.stringify({
    marketplace: "amazon.com",
    price_usd: 159.00,
    shipping_import_to_il_usd: 39.08,
    shipping_usd: 0,
    estimated_total_to_il_usd: 198.08,
    shipping_status: "ships_to_israel",
    shipping_region: "US_TO_ISRAEL",
    advertising_region: "ISRAEL",
    is_publish_ready_for_il: true,
    estimated_commission_usd_2_5_percent: 3.98,
    rating: 4.4,
    review_count: 1900,
    bought_last_month: 1000,
    badge: "Amazon Choice",
    seller: "OBSBOT Official Store",
    ships_from: "Amazon",
    product_score: 8.5,
    target_audience: "content creators, streamers, Zoom users, teachers, remote workers, YouTubers",
    notes_he: "מוצר חזק לשיווק לישראל: מצלמת 4K עם AI Tracking, ביקוש טוב, ביקורות רבות, משלוח חינם. Import Charges סבירים.",
    image_source: "placeholder_until_api_or_approved_manufacturer_asset"
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
