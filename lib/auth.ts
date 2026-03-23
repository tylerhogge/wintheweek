/**
 * Shared auth helpers for API routes.
 */

import { timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'

/**
 * Verify the CRON_SECRET from a request's Authorization: Bearer header.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * Returns null if valid, or a 401 NextResponse if invalid.
 */
export function verifyCronSecret(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`

  // Constant-time comparison — prevents timing side-channel attacks
  if (authHeader.length !== expected.length) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isValid = timingSafeEqual(
    Buffer.from(authHeader, 'utf-8'),
    Buffer.from(expected, 'utf-8'),
  )

  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null // valid
}
