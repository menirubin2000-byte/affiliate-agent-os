import process from "node:process"

import { config } from "dotenv"

config({ path: ".env.local" })

const { createClient } = await import("@supabase/supabase-js")
const { createOrUpdateScheduledPublishItemForFinalCopy } = await import("../lib/scheduled-publish-queue-db.ts")

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const { data, error } = await supabase
  .from("scheduled_publish_queue")
  .select("final_copy_id")
  .neq("status", "published")
  .order("created_at", { ascending: true })

if (error) {
  console.error(error.message)
  process.exit(1)
}

let rescheduled = 0
let errors = 0

for (const row of data ?? []) {
  try {
    await createOrUpdateScheduledPublishItemForFinalCopy(row.final_copy_id, { forceReschedule: true })
    rescheduled += 1
  } catch (error) {
    errors += 1
    console.error(row.final_copy_id, error instanceof Error ? error.message : error)
  }
}

console.log(JSON.stringify({ rescheduled, errors }, null, 2))
