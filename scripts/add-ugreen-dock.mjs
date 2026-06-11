import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const product = {
  name: "UGREEN Revodok Max 17-Port Thunderbolt 5 Dock",
  slug: "ugreen-revodok-max-17-port-thunderbolt-5-dock",
  brand: "UGREEN",
  category: "Docking Stations / Thunderbolt Dock",
  affiliate_url: "https://amzn.to/4exVXHC",
  price: 389.99,
  commission_rate: 2.5,
  status: "active",
  image_url: null,
  image_status: "missing",
  notes: JSON.stringify({
    marketplace: "amazon.com",
    price_usd: 389.99,
    list_price_usd: 499.99,
    discount_percent: 22,
    shipping_status: "check_required",
    shipping_region: "US_TO_ISRAEL",
    advertising_region: "ISRAEL",
    is_publish_ready_for_il: false,
    commission_rate_percent: 2.5,
    estimated_commission_usd: 9.75,
    rating: null,
    review_count: null,
    seller: "UGREEN",
    ships_from: "Amazon",
    product_score: 8.5,
    target_audience: "Mac power users, creative professionals, video editors, developers, multi-monitor setups, Thunderbolt 5 early adopters",
    notes_he: "תחנת עגינה פרימיום 17 פורטים עם Thunderbolt 5 (120Gbps), תמיכה ב-8K, NVMe M.2 SSD מובנה, טעינה 240W, אלומיניום עם קירור AI. מחיר מבצע $389 במקום $499. לבדוק משלוח לישראל.",
    image_source: "placeholder_until_api_or_approved_manufacturer_asset",
    key_features: {
      ports: "17 ports: 3x USB-A 10Gbps, 3x USB-C 10Gbps (2 with 60W charging), SD/TF 4.0, 3x 3.5mm audio, 2.5G Ethernet, DP1.4, 2x Thunderbolt 5 downstream",
      speed: "Intel-certified Thunderbolt 5 with up to 120Gbps bandwidth. Built-in NVMe PCIe Gen4x4 M.2 slot supports 2230-2280 SSDs up to 8TB",
      display: "Triple independent displays on Windows (2x TBT5 + DP): single 8K@60Hz or dual 6K@60Hz. Mac supports dual displays",
      power: "240W total system power with high-speed 2.5GbE ethernet for low-latency wired connections",
      cooling: "AI smart cooling with 60mm ultra-thin fan, premium aluminum unibody chassis with matte finish and security lock slot"
    },
    compatible_devices: "MacBook M4/M3/M2/M1 Pro/Max, Mac mini M4 Pro, Thunderbolt 5/4 Windows laptops (macOS 15+ required for Mac)"
  })
};

const { data, error } = await supabase
  .from("products")
  .insert(product)
  .select("id, name, status")
  .single();

if (error) { console.error("Insert failed:", error.message); process.exit(1); }
console.log("Product added:", JSON.stringify(data, null, 2));
