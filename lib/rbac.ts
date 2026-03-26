/**
 * Role-based access control helpers.
 *
 * Currently two roles: 'admin' (full access) and 'member' (read-only dashboard).
 * All mutating operations (team management, settings, hide, nudge, etc.)
 * require the 'admin' role.
 */

import { NextResponse } from 'next/server'
import { getAuthUser, getProfile } from '@/lib/supabase/server'

export type AuthContext = {
  userId: string
  orgId: string
  role: 'admin' | 'member'
  name: string | null
  email: string
}

/**
 * Require authentication + a specific role. Returns null on success
 * (with the context), or a NextResponse error to send back.
 */
export async function requireRole(
  requiredRole: 'admin' | 'member' = 'admin',
): Promise<{ ctx: AuthContext } | { error: NextResponse }> {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])

  if (!user || !profile?.org_id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const role = (profile as any).role ?? 'admin' // default for existing users
  if (requiredRole === 'admin' && role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 }) }
  }

  return {
    ctx: {
      userId: user.id,
      orgId: profile.org_id,
      role,
      name: (profile as any).name ?? null,
      email: (profile as any).email ?? user.email ?? '',
    },
  }
}
