import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getSupabaseReadiness } from "@/lib/env"

let browserClient: SupabaseClient | null = null

export function isSupabaseConfigured() {
  return getSupabaseReadiness().status === "configured"
}

export function getBrowserSupabaseClient() {
  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    throw new Error(`${readiness.summary} ${readiness.guidance}`)
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }

  return browserClient
}
