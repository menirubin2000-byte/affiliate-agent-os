import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const productId = "b8d2123f-a9b1-4a20-af43-768f23ef52f2";
const bucket = "product-images";
const basePath = "C:\\Users\\USER\\Documents\\אוטומציה\\תמונות מוצרים";

const files = [
  { local: "fifine-tank6s-1.png", remote: "fifine-tank6s/fifine-tank6s-main.png", type: "image/png" },
  { local: "fifine-tank6s-2.jpg", remote: "fifine-tank6s/fifine-tank6s-xlr-usb.jpg", type: "image/jpeg" },
  { local: "fifine-tank6s-3.jpg", remote: "fifine-tank6s/fifine-tank6s-detail.jpg", type: "image/jpeg" },
];

let primaryUrl = null;

for (const f of files) {
  const data = readFileSync(`${basePath}\\${f.local}`);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(f.remote, data, { contentType: f.type, upsert: true });

  if (error) {
    console.error(`Upload failed for ${f.local}:`, error.message);
    continue;
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(f.remote);
  console.log(`Uploaded: ${f.local} → ${urlData.publicUrl}`);
  if (!primaryUrl) primaryUrl = urlData.publicUrl;
}

if (primaryUrl) {
  const { error } = await supabase
    .from("products")
    .update({ image_url: primaryUrl, image_status: "ready" })
    .eq("id", productId);

  if (error) console.error("Product update failed:", error.message);
  else console.log(`Product image_url set, image_status = ready`);
}
