import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const productId = "2d38c018-8b01-472c-9e3e-9cd6c82f624e";
const bucket = "product-images";
const basePath = "C:\\Users\\USER\\Documents\\אוטומציה\\תמונות מוצרים";

const files = [
  { local: "owc-dock-hero.jpg", remote: "owc-thunderbolt-dock/owc-dock-hero.jpg" },
  { local: "owc-dock-front.jpg", remote: "owc-thunderbolt-dock/owc-dock-front.jpg" },
  { local: "owc-dock-back.jpg", remote: "owc-thunderbolt-dock/owc-dock-back.jpg" },
];

let primaryUrl = null;
for (const f of files) {
  const data = readFileSync(`${basePath}\\${f.local}`);
  const { error } = await supabase.storage.from(bucket).upload(f.remote, data, { contentType: "image/jpeg", upsert: true });
  if (error) { console.error(`Failed ${f.local}:`, error.message); continue; }
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(f.remote);
  console.log(`Uploaded: ${f.local} → ${urlData.publicUrl}`);
  if (!primaryUrl) primaryUrl = urlData.publicUrl;
}

if (primaryUrl) {
  await supabase.from("products").update({ image_url: primaryUrl, image_status: "ready" }).eq("id", productId);
  console.log("Product image_url set, image_status = ready");
}
