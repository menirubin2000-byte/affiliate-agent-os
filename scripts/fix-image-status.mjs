import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fix Waterpik - images already uploaded to Storage, just need to update product record
const waterpikUrl = "https://gbkwydsodondarccqyet.supabase.co/storage/v1/object/public/product-images/waterpik-gem-5100/waterpik-gem-hero.jpg";
const { error: e1 } = await supabase.from("products")
  .update({ image_url: waterpikUrl, image_status: "ready" })
  .eq("id", "656bdb6a-34f8-4dd5-9d98-76922fe12d02");
if (e1) console.error("Waterpik fail:", e1.message);
else console.log("✅ Waterpik image_status = ready");

// Fix Philips Sonicare
const philipsUrl = "https://gbkwydsodondarccqyet.supabase.co/storage/v1/object/public/product-images/philips-sonicare-6500/philips-sonicare-hero.png";
const { error: e2 } = await supabase.from("products")
  .update({ image_url: philipsUrl, image_status: "ready" })
  .eq("id", "896d1b5f-846b-47c2-b9f9-02b6142582b6");
if (e2) console.error("Philips fail:", e2.message);
else console.log("✅ Philips Sonicare image_status = ready");

// Fix Seagate - need to download and upload image
console.log("\n📸 Downloading Seagate image...");
