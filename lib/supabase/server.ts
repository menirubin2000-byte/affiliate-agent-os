import { createServerClient } from "@supabase/ssr"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import { getSupabaseReadiness } from "@/lib/env"

let serviceRoleClient: SupabaseClient | null = null

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    const readiness = getSupabaseReadiness()
    throw new Error(`${readiness.summary} ${readiness.guidance}`)
  }

  return value
}

export function isSupabaseConfigured() {
  return getSupabaseReadiness().status === "configured"
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Components cannot write cookies.
          }
        },
      },
    },
  )
}

export function getServiceRoleSupabase() {
  if (!serviceRoleClient) {
    serviceRoleClient = createClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )
  }

  return serviceRoleClient
}
