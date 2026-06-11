import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await s.from("source_contents").select("*").limit(2);
if (error) console.error("Error:", error.message);
else {
  console.log("source_contents columns:", Object.keys(data[0] || {}));
  console.log("\nSample:", JSON.stringify(data[0], null, 2));
}
