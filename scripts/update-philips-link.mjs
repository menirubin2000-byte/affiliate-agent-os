import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const productId = "896d1b5f-846b-47c2-b9f9-02b6142582b6";

const { data: product } = await supabase
  .from("products")
  .select("notes")
  .eq("id", productId)
  .single();

const notes = JSON.parse(product.notes);
notes.commission_rate_percent = 3.0;
notes.commission_category = "Health & Personal Care";
notes.estimated_commission_usd_3_percent = 3.60;
notes.tracking_id = "rubinqs-20";
delete notes.estimated_commission_usd_4_percent;
delete notes.estimated_commission_usd_5_percent;
delete notes.affiliate_link_status;

const { error } = await supabase
  .from("products")
  .update({
    affiliate_url: "https://amzn.to/4uuDPTZ",
    commission_rate: 3.0,
    notes: JSON.stringify(notes)
  })
  .eq("id", productId);

if (error) { console.error("Failed:", error.message); process.exit(1); }
console.log("Philips Sonicare updated: affiliate_url + commission 3% ($3.60/sale)");
