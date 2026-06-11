import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const names = [
  "GTPLAYER GT800A Gaming Chair with Footrest",
  "HUANUO FlowLift Dual Monitor Stand",
  "Logitech MX Vertical Wireless Mouse"
];

for (const name of names) {
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("name", name)
    .single();

  if (!data) { console.log(`NOT FOUND: ${name}\n`); continue; }

  console.log(`\n========================================`);
  console.log(`שם: ${data.name}`);
  console.log(`מותג: ${data.brand || "?"}`);
  console.log(`קטגוריה: ${data.category || "?"}`);
  console.log(`מחיר: $${data.price || "?"}`);
  console.log(`Affiliate URL: ${data.affiliate_url || "NONE"}`);
  console.log(`Slug: ${data.slug || "?"}`);
  console.log(`Image: ${data.image_url || "NONE"}`);
  console.log(`Image status: ${data.image_status || "?"}`);

  if (data.notes) {
    try {
      const n = JSON.parse(data.notes);
      console.log(`\nNotes (parsed):`);
      console.log(JSON.stringify(n, null, 2));
    } catch {
      console.log(`Notes (raw): ${data.notes}`);
    }
  }
  console.log(`========================================\n`);
}
