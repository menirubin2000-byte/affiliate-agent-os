import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { createHash } from "crypto";
config({ path: ".env.local" });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const hash = createHash("sha256").update("test").digest("hex");

// Test: does source_content_id need to be a real FK?
// First create a real content_draft
const { data: cd } = await s.from("content_drafts").insert({
  product_id: "656bdb6a-34f8-4dd5-9d98-76922fe12d02",
  content_type: "review",
  template_type: "review",
  title: "TEST",
  body: "TEST",
  status: "draft",
}).select("id").single();

console.log("content_draft:", cd?.id);

// Now create platform_adaptation
const { data: pa, error: paErr } = await s.from("platform_adaptations").insert({
  source_content_id: cd.id,
  product_id: "656bdb6a-34f8-4dd5-9d98-76922fe12d02",
  platform: "linkedin",
  title: "TEST",
  body: "TEST",
  content_hash: hash,
}).select("id").single();

if (paErr) console.log("PA error:", paErr.message);
else console.log("platform_adaptation:", pa.id);

// Now create final_copy
const { data: fc, error: fcErr } = await s.from("final_copies").insert({
  product_id: "656bdb6a-34f8-4dd5-9d98-76922fe12d02",
  source_content_id: cd.id,
  platform_adaptation_id: pa?.id,
  platform: "linkedin",
  title: "TEST",
  body: "TEST",
  version: 1,
  status: "draft",
  validation_status: "pending",
  blocking_reasons: [],
  language: "en",
}).select("id").single();

if (fcErr) console.log("FC error:", fcErr.message);
else console.log("final_copy:", fc.id);

// Clean up all test records
if (fc?.id) await s.from("final_copies").delete().eq("id", fc.id);
if (pa?.id) await s.from("platform_adaptations").delete().eq("id", pa.id);
if (cd?.id) await s.from("content_drafts").delete().eq("id", cd.id);
console.log("✅ Cleaned up test records");
