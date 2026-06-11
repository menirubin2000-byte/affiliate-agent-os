import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const bucket = "product-images";
const basePath = "C:\\Users\\USER\\Documents\\אוטומציה\\תמונות מוצרים";

// Waterpik Cordless Gem 5100
const waterpikId = "656bdb6a-af6b-4f5d-8e20-cde1d02a3ea0";
const waterpikFiles = [
  { local: "waterpik-gem-5100-hero.jpg", remote: "waterpik-gem-5100/waterpik-gem-hero.jpg" },
  { local: "waterpik-gem-5100-features.jpg", remote: "waterpik-gem-5100/waterpik-gem-features.jpg" },
  { local: "waterpik-gem-5100-side.jpg", remote: "waterpik-gem-5100/waterpik-gem-side.jpg" },
];

// Philips Sonicare ProtectiveClean 6500
const philipsId = "896d1b5f-3f91-42b8-a55c-6dcea1a18a0c";
const philipsFiles = [
  { local: "philips-sonicare-6500-hero.png", remote: "philips-sonicare-6500/philips-sonicare-hero.png", type: "image/png" },
];

async function uploadSet(productId, files, productName) {
  let primaryUrl = null;
  for (const f of files) {
    const data = readFileSync(`${basePath}\\${f.local}`);
    const contentType = f.type || "image/jpeg";
    const { error } = await supabase.storage.from(bucket).upload(f.remote, data, { contentType, upsert: true });
    if (error) { console.error(`❌ Failed ${f.local}:`, error.message); continue; }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(f.remote);
    console.log(`  ✅ ${f.local} → ${urlData.publicUrl}`);
    if (!primaryUrl) primaryUrl = urlData.publicUrl;
  }
  if (primaryUrl) {
    const { error } = await supabase.from("products").update({ image_url: primaryUrl, image_status: "ready" }).eq("id", productId);
    if (error) console.error(`❌ Update failed for ${productName}:`, error.message);
    else console.log(`  ✅ ${productName} image_status = ready`);
  }
}

console.log("\n📸 Waterpik Cordless Gem 5100:");
await uploadSet(waterpikId, waterpikFiles, "Waterpik");

console.log("\n📸 Philips Sonicare ProtectiveClean 6500:");
await uploadSet(philipsId, philipsFiles, "Philips Sonicare");

console.log("\n✅ Done!");
