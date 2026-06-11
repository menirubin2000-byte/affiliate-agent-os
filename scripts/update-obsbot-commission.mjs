import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const productId = "6150f8d9-f907-4497-a580-b838f70b4dc7";

// Get current notes
const { data: product } = await supabase
  .from("products")
  .select("notes")
  .eq("id", productId)
  .single();

const notes = JSON.parse(product.notes);
notes.commission_rate_percent = 4.0;
notes.commission_category = "Camera, Photo & Video";
notes.estimated_commission_usd_4_percent = 6.36;
notes.tracking_id = "rubinqs-20";
delete notes.estimated_commission_usd_2_5_percent;

const { error } = await supabase
  .from("products")
  .update({
    commission_rate: 4.0,
    notes: JSON.stringify(notes)
  })
  .eq("id", productId);

if (error) { console.error("Update failed:", error.message); process.exit(1); }
console.log("OBSBOT commission updated: 4%, est $6.36/sale");
