import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const toDeactivate = [
  "GTPLAYER GT800A Gaming Chair with Footrest",
  "HUANUO FlowLift Dual Monitor Stand"
];

for (const name of toDeactivate) {
  const { error } = await supabase
    .from("products")
    .update({ status: "inactive" })
    .eq("name", name);

  if (error) console.error(`Failed ${name}:`, error.message);
  else console.log(`❌ ${name} → inactive`);
}

console.log("\n✅ Logitech MX Vertical Wireless Mouse — נשאר active");
