import process from "node:process"

import { config } from "dotenv"

config({ path: ".env.local" })

const { createClient } = await import("@supabase/supabase-js")
const { createOrUpdateScheduledPublishItemForFinalCopy } = await import("../lib/scheduled-publish-queue-db.ts")
const { isAutoQueuePlatform } = await import("../lib/production-publishing-scheduler.ts")

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const { data, error } = await supabase
  .from("final_copies")
  .select("id, platform")
  .eq("status", "operator_approved")
  .eq("validation_status", "valid")

if (error) {
  console.error(error.message)
  process.exit(1)
}

let moved = 0
let skipped = 0
let errors = 0

for (const row of data ?? []) {
  if (!isAutoQueuePlatform(row.platform)) {
    skipped += 1
    continue
  }

  try {
    const item = await createOrUpdateScheduledPublishItemForFinalCopy(row.id)
    if (item) moved += 1
    else skipped += 1
  } catch (error) {
    errors += 1
    console.error(row.id, row.platform, error instanceof Error ? error.message : error)
  }
}

console.log(JSON.stringify({
  approvedValid: data?.length ?? 0,
  moved,
  skipped,
  errors,
}, null, 2))
