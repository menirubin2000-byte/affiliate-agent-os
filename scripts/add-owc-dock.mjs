import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const product = {
  name: "OWC 11-Port Thunderbolt 4 Dock",
  slug: "owc-11-port-thunderbolt-4-dock",
  brand: "OWC",
  category: "Docking Stations / Thunderbolt Dock",
  affiliate_url: "https://amzn.to/3RY0sm6",
  price: 229.99,
  commission_rate: 2.5,
  status: "active",
  image_url: null,
  image_status: "missing",
  notes: JSON.stringify({
    marketplace: "amazon.com",
    price_usd: 229.99,
    shipping_import_to_il_usd: 52.75,
    shipping_usd: 0,
    estimated_total_to_il_usd: 282.74,
    shipping_status: "ships_to_israel",
    shipping_region: "US_TO_ISRAEL",
    advertising_region: "ISRAEL",
    is_publish_ready_for_il: true,
    commission_rate_percent: 2.5,
    estimated_commission_usd: 5.75,
    rating: 4.2,
    review_count: 697,
    bought_last_month: 200,
    badge: "Amazon Choice",
    seller: "OWC (Other World Computing)",
    ships_from: "Amazon",
    product_score: 8,
    target_audience: "Mac users, remote workers, creative professionals, developers, multi-monitor setups",
    notes_he: "תחנת עגינה 11 פורטים עם Thunderbolt 4, טעינה 96W, תמיכה ב-8K או Dual 5K. Amazon Choice, משלוח חינם לישראל. מותג מוכר בקרב משתמשי Mac.",
    image_source: "placeholder_until_api_or_approved_manufacturer_asset",
    features: "11 ports, 96W charging, single 8K or dual 5K displays, 3x TB ports, 4x USB, GbE, SD, compatible M1/M2 Macs, TB3 Macs, TB4 PCs, USB-C devices",
    size_variant: "DOCK",
    style: "Thunderbolt 4"
  })
};

const { data, error } = await supabase
  .from("products")
  .insert(product)
  .select("id, name, status")
  .single();

if (error) { console.error("Insert failed:", error.message); process.exit(1); }
console.log("Product added:", JSON.stringify(data, null, 2));
