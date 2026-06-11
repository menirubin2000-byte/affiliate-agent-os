import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Check existing final_copies for reference
const { data: copies, error: e1 } = await supabase
  .from("final_copies")
  .select("*")
  .limit(2);

if (e1) console.error("final_copies error:", e1.message);
else {
  console.log("📋 final_copies sample (columns):", Object.keys(copies[0] || {}));
  if (copies[0]) {
    console.log("\nSample record:");
    console.log(JSON.stringify(copies[0], null, 2));
  }
}

// Check what platforms/surfaces exist
const { data: platforms } = await supabase
  .from("final_copies")
  .select("surface, status")
  .limit(20);

const surfaces = [...new Set((platforms || []).map(p => p.surface))];
const statuses = [...new Set((platforms || []).map(p => p.status))];
console.log("\nExisting surfaces:", surfaces);
console.log("Existing statuses:", statuses);

// Check content_drafts
const { data: drafts, error: e2 } = await supabase
  .from("content_drafts")
  .select("*")
  .limit(1);

if (e2) console.error("content_drafts error:", e2.message);
else {
  console.log("\n📋 content_drafts columns:", Object.keys(drafts[0] || {}));
}

// Check which Amazon products already have final_copies
const amazonIds = [
  "656bdb6a-34f8-4dd5-9d98-76922fe12d02", // Waterpik
  "896d1b5f-846b-47c2-b9f9-02b6142582b6", // Philips
  "6150f8d9-f907-4497-a580-b838f70b4dc7", // OBSBOT
  "b8d2123f-a9b1-4a20-af43-768f23ef52f2", // FIFINE
  "04d026d8-a64a-4521-93f2-bdeecd8c9a45", // Seagate
  "2d38c018-8b01-472c-9e3e-9cd6c82f624e", // OWC
];

const { data: existingCopies } = await supabase
  .from("final_copies")
  .select("product_id, surface, status")
  .in("product_id", amazonIds);

console.log(`\nExisting final_copies for Amazon products: ${(existingCopies || []).length}`);
for (const c of existingCopies || []) {
  console.log(`  ${c.product_id} → ${c.surface} (${c.status})`);
}
