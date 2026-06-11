import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const productId = "bd30a3c5-1c61-4028-8c16-663e55ed086a";
const bucket = "product-images";
const basePath = "C:\\Users\\USER\\Documents\\אוטומציה\\תמונות מוצרים";

const files = [
  { local: "ugreen-dock-1.png", remote: "ugreen-revodok-max-dock/ugreen-dock-hero.png", type: "image/png" },
  { local: "ugreen-dock-2.jpg", remote: "ugreen-revodok-max-dock/ugreen-dock-angle.jpg", type: "image/jpeg" },
  { local: "ugreen-dock-3.jpg", remote: "ugreen-revodok-max-dock/ugreen-dock-ports.jpg", type: "image/jpeg" },
];

let primaryUrl = null;
for (const f of files) {
  const data = readFileSync(`${basePath}\\${f.local}`);
  const { error } = await supabase.storage.from(bucket).upload(f.remote, data, { contentType: f.type, upsert: true });
  if (error) { console.error(`Failed ${f.local}:`, error.message); continue; }
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(f.remote);
  console.log(`Uploaded: ${f.local} → ${urlData.publicUrl}`);
  if (!primaryUrl) primaryUrl = urlData.publicUrl;
}

if (primaryUrl) {
  const { error } = await supabase.from("products").update({ image_url: primaryUrl, image_status: "ready" }).eq("id", productId);
  if (error) console.error("Update failed:", error.message);
  else console.log("✅ Product image_url set, image_status = ready");
}
