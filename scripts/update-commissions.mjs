import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// FIFINE TANK6S — 4%
const { error: e1 } = await supabase
  .from("products")
  .update({ commission_rate: 4 })
  .eq("id", "b8d2123f-a9b1-4a20-af43-768f23ef52f2");
if (e1) console.error("FIFINE fail:", e1.message);
else console.log("✅ FIFINE TANK6S → 4% ($5.00 per sale)");

// Waterpik Gem 5100 — 3%
const { error: e2 } = await supabase
  .from("products")
  .update({ commission_rate: 3 })
  .eq("id", "656bdb6a-34f8-4dd5-9d98-76922fe12d02");
if (e2) console.error("Waterpik fail:", e2.message);
else console.log("✅ Waterpik Gem 5100 → 3% ($2.04 per sale)");
