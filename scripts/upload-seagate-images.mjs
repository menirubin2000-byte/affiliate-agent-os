import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const productId = "04d026d8-a64a-4521-93f2-bdeecd8c9a45";
const bucket = "product-images";
const basePath = "C:\\Users\\USER\\Documents\\אוטומציה\\תמונות מוצרים";

const files = [
  { local: "seagate-onetouch-hero.png", remote: "seagate-onetouch-8tb/seagate-onetouch-hero.png" },
  { local: "seagate-onetouch-detail1.png", remote: "seagate-onetouch-8tb/seagate-onetouch-detail1.png" },
  { local: "seagate-onetouch-detail2.png", remote: "seagate-onetouch-8tb/seagate-onetouch-detail2.png" },
];

let primaryUrl = null;
for (const f of files) {
  const data = readFileSync(`${basePath}\\${f.local}`);
  const { error } = await supabase.storage.from(bucket).upload(f.remote, data, { contentType: "image/png", upsert: true });
  if (error) { console.error(`Failed ${f.local}:`, error.message); continue; }
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(f.remote);
  console.log(`✅ ${f.local} → ${urlData.publicUrl}`);
  if (!primaryUrl) primaryUrl = urlData.publicUrl;
}

if (primaryUrl) {
  const { error } = await supabase.from("products").update({ image_url: primaryUrl, image_status: "ready" }).eq("id", productId);
  if (error) console.error("Update failed:", error.message);
  else console.log("✅ Seagate image_status = ready");
}
