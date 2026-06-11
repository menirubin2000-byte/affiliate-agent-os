import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const amazonProductIds = [
  "656bdb6a-34f8-4dd5-9d98-76922fe12d02", // Waterpik
  "896d1b5f-846b-47c2-b9f9-02b6142582b6", // Philips Sonicare
  "6150f8d9-f907-4497-a580-b838f70b4dc7", // OBSBOT
  "b8d2123f-a9b1-4a20-af43-768f23ef52f2", // FIFINE
  "04d026d8-a64a-4521-93f2-bdeecd8c9a45", // Seagate
  "2d38c018-8b01-472c-9e3e-9cd6c82f624e", // OWC
  "93e9a0a9-adfe-4574-95bb-2058a3a21cf0", // Philips Norelco Shaver
];

const { data, error } = await supabase
  .from("final_copies")
  .update({
    status: "ready_for_operator_approval",
    validation_status: "valid",
    blocking_reasons: [],
  })
  .in("product_id", amazonProductIds)
  .eq("status", "draft_internal")
  .select("id, platform, title");

if (error) {
  console.error("Error:", error.message);
} else {
  console.log(`✅ ${data.length} פוסטים עודכנו ל-ready_for_operator_approval:\n`);
  for (const d of data) {
    console.log(`  📝 ${d.platform.padEnd(10)} — ${d.title}`);
  }
  console.log(`\n🔗 לאישור: https://affiliate-agent-os.vercel.app/dashboard/he/approve`);
}
