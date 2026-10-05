import crypto from 'crypto'

/**
 * Generates a cryptographically secure 32-byte URL-safe base64 token.
 */
export function generateSignerToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * Hashes a token with SHA-256 for secure storage and lookup.
 */
export function hashSignerToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
