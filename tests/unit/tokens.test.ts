import { describe, it, expect } from 'vitest'
import { generateSignerToken, hashSignerToken } from '@/lib/tokens'
import crypto from 'crypto'

describe('Tokens Unit Tests', () => {
  it('generates a 32-byte base64url string with sufficient entropy', () => {
    const token = generateSignerToken()
    expect(typeof token).toBe('string')
    // 32 bytes base64url encoded is 43 characters
    expect(token.length).toBe(43)
    // base64url charset: [A-Za-z0-9_-]
    expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true)

    // Ensure uniqueness
    const token2 = generateSignerToken()
    expect(token).not.toBe(token2)
  })

  it('correctly hashes tokens using SHA-256 at rest', () => {
    const testToken = 'abc123_test-token'
    const expectedHash = crypto.createHash('sha256').update(testToken).digest('hex')
    const actualHash = hashSignerToken(testToken)

    expect(actualHash).toBe(expectedHash)
    expect(actualHash).toHaveLength(64)
    expect(/^[0-9a-f]{64}$/.test(actualHash)).toBe(true)
  })
})
