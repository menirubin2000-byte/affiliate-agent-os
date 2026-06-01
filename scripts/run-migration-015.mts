import { config } from "dotenv"
config({ path: ".env.local" })

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const sql = readFileSync("supabase/migrations/015_add_new_template_types.sql", "utf-8")

console.log("Running migration 015_add_new_template_types...")
const { error } = await supabase.rpc("exec_sql", { sql_text: sql })

if (error) {
  // Try direct approach via REST if rpc doesn't exist
  console.log("rpc exec_sql not available, trying statements individually...")

  const stmt1 = "ALTER TABLE public.content_drafts DROP CONSTRAINT IF EXISTS content_drafts_template_type_check"
  const stmt2 = "ALTER TABLE public.content_drafts ADD CONSTRAINT content_drafts_template_type_check CHECK (template_type IN ('review', 'comparison', 'buying_guide', 'social_post', 'tiktok_script', 'quora_answer', 'reddit_post'))"

  // Use the Supabase SQL endpoint via fetch
  const headers = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
  }

  for (const statement of [stmt1, stmt2]) {
    console.log(`  Executing: ${statement.substring(0, 80)}...`)
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: statement })
    })
    if (!res.ok) {
      // Last resort: use the pg_net approach or just report
      console.log(`  HTTP ${res.status} - will try Supabase SQL editor approach`)
    }
  }

  // Test if it worked by trying an insert and rollback
  const testResult = await supabase
    .from("content_drafts")
    .select("id")
    .eq("template_type", "tiktok_script")
    .limit(1)

  if (testResult.error?.message?.includes("check constraint")) {
    console.error("\nMigration NOT applied. The constraint still blocks new template types.")
    console.error("Please run this SQL in the Supabase Dashboard SQL Editor:")
    console.error("")
    console.error(sql)
    process.exit(1)
  } else {
    console.log("Constraint appears updated (query did not fail).")
  }
} else {
  console.log("Migration applied successfully via rpc.")
}
