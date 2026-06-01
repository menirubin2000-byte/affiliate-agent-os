/**
 * Apply the template_type constraint fix via Supabase's postgrest-compatible approach.
 * Creates a temporary RPC function, runs it, then drops it.
 */
import { config } from "dotenv"
config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars")
  process.exit(1)
}

// Try approach 1: Direct database URL if available
if (dbUrl) {
  console.log("Found database URL, connecting directly...")
  // Would use pg module here, but let's try the REST approach first
}

// Approach 2: Use the Supabase SQL API endpoint
// The Supabase project has a /pg endpoint or we can use the pooler
const sql = `
ALTER TABLE public.content_drafts DROP CONSTRAINT IF EXISTS content_drafts_template_type_check;
ALTER TABLE public.content_drafts ADD CONSTRAINT content_drafts_template_type_check CHECK (template_type IN ('review', 'comparison', 'buying_guide', 'social_post', 'tiktok_script', 'quora_answer', 'reddit_post'));
`

// Try the /rest/v1/rpc approach with a raw query function
const headers = {
  "apikey": supabaseKey,
  "Authorization": `Bearer ${supabaseKey}`,
  "Content-Type": "application/json",
}

// Check if there's a query function already
const checkFn = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
  method: "POST",
  headers,
  body: JSON.stringify({ sql_text: "SELECT 1" }),
})

if (checkFn.ok) {
  console.log("exec_sql RPC exists, using it...")
  const result = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers,
    body: JSON.stringify({ sql_text: sql }),
  })
  if (result.ok) {
    console.log("Migration applied!")
  } else {
    console.log(`Failed: ${await result.text()}`)
  }
} else {
  // Try creating the function first via a known writable path
  console.log("No exec_sql function. Trying to create one via the Supabase Studio API...")

  // Extract project ref from URL (https://abcdef.supabase.co -> abcdef)
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0]

  // Try the Supabase Management API v1 SQL endpoint
  const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`
  const sbAccessToken = process.env.SUPABASE_ACCESS_TOKEN

  if (sbAccessToken) {
    console.log("Using Supabase Management API...")
    const mgmtResult = await fetch(mgmtUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${sbAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    })
    if (mgmtResult.ok) {
      console.log("Migration applied via Management API!")
    } else {
      console.log(`Management API failed: ${mgmtResult.status} ${await mgmtResult.text()}`)
    }
  } else {
    console.log("")
    console.log("Cannot run SQL directly. No CLI, no psql, no management token.")
    console.log("")
    console.log("QUICK FIX: Run this SQL in your Supabase Dashboard SQL Editor:")
    console.log("  Project URL:", supabaseUrl)
    console.log("  Go to: SQL Editor -> New query -> Paste and run:")
    console.log("")
    console.log(sql)
    console.log("")
    console.log("Then re-run: npx tsx scripts/generate-missing-drafts.mts")
  }
}
