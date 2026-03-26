import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

// Used in Server Components, Server Actions, and Route Handlers.
// Wrapped in React.cache so the same client instance is reused across
// all server components in a single request (avoids repeated cookies() calls).
export const createClient = cache(async () => {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) =>
              cookieStore.set(name, value, options as any),
            )
          } catch {
            // setAll called from a Server Component — safe to ignore
          }
        },
      },
    },
  )
})

// Service-role client for privileged operations (API routes only — never expose to client)
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ─── Per-request memoised helpers ─────────────────────────────────────────────
// React.cache deduplicates calls within a single server render pass.
// This eliminates repeated auth.getUser() + profile round-trips when both
// the layout and a page component need the same data.

export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
})

export const getProfile = cache(async () => {
  const user = await getAuthUser()
  if (!user) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, org_id, name, email, organizations(id, name, slug)')
    .eq('id', user.id)
    .single()
  if (!data) return null
  // Supabase returns FK joins as arrays — normalize to the single object AppShell expects
  const orgs = data.organizations
  return {
    ...data,
    organizations: Array.isArray(orgs) ? (orgs[0] ?? null) : orgs,
  }
})
