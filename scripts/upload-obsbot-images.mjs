import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const productId = "6150f8d9-f907-4497-a580-b838f70b4dc7";
const bucket = "product-images";
const basePath = "C:\\Users\\USER\\Documents\\אוטומציה\\תמונות מוצרים";

const files = [
  { local: "obsbot-tiny2-lite-official-1.png", remote: "obsbot-tiny2-lite/obsbot-tiny2-lite-front.png" },
  { local: "obsbot-tiny2-lite-official-2.png", remote: "obsbot-tiny2-lite/obsbot-tiny2-lite-angle.png" },
  { local: "obsbot-tiny2-lite-official-3.png", remote: "obsbot-tiny2-lite/obsbot-tiny2-lite-side.png" },
];

let primaryUrl = null;

for (const f of files) {
  const data = readFileSync(`${basePath}\\${f.local}`);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(f.remote, data, { contentType: "image/png", upsert: true });

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
  else console.log(`Product image_url set to ${primaryUrl}, image_status = ready`);
}
