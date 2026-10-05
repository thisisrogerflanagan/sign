/**
 * In-memory sliding window rate limiter
 * Blunt token-guessing and email OTP spamming.
 */

interface RateLimitRecord {
  count: number
  expiresAt: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

export interface RateLimitOptions {
  key: string
  limit: number
  windowMs: number
}

export function checkRateLimit(options: RateLimitOptions): {
  success: boolean
  remaining: number
  resetMs: number
} {
  const now = Date.now()
  const record = rateLimitStore.get(options.key)

  // Prune expired record
  if (record && record.expiresAt < now) {
    rateLimitStore.delete(options.key)
  }

  const current = rateLimitStore.get(options.key)

  if (!current) {
    rateLimitStore.set(options.key, {
      count: 1,
      expiresAt: now + options.windowMs,
    })
    return {
      success: true,
      remaining: options.limit - 1,
      resetMs: options.windowMs,
    }
  }

  if (current.count >= options.limit) {
    return {
      success: false,
      remaining: 0,
      resetMs: Math.max(0, current.expiresAt - now),
    }
  }

  current.count += 1
  return {
    success: true,
    remaining: options.limit - current.count,
    resetMs: Math.max(0, current.expiresAt - now),
  }
}
