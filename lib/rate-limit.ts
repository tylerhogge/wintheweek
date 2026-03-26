/**
 * Simple in-memory rate limiter for API routes.
 *
 * Uses a sliding window per key (IP or user ID). On Vercel this resets
 * per cold start — which is fine for abuse prevention. For truly persistent
 * rate limiting, swap this for Vercel KV or Upstash Redis.
 */

type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

// Clean up expired entries periodically to avoid memory leaks
const CLEANUP_INTERVAL = 60_000 // 1 minute
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}

export type RateLimitConfig = {
  /** Max requests allowed in the window */
  limit: number
  /** Window size in seconds */
  windowSeconds: number
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Check and consume a rate limit token for the given key.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanup()

  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    // First request or expired window — start fresh
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: config.limit - 1, resetAt: now + windowMs }
  }

  if (entry.count >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: config.limit - entry.count, resetAt: entry.resetAt }
}

/**
 * Extract a rate-limit key from a request.
 * Uses X-Forwarded-For (Vercel sets this) or falls back to a default.
 */
export function rateLimitKeyFromRequest(req: Request, prefix: string = ''): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown'
  return `${prefix}:${ip}`
}

/**
 * Rate limit by authenticated user ID (more accurate than IP).
 */
export function rateLimitKeyFromUser(userId: string, prefix: string = ''): string {
  return `${prefix}:user:${userId}`
}
