import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveSignerToken, COMPLETING_STALE_MS } from '@/lib/signer-context'
import { hashSignerToken } from '@/lib/tokens'

// Mock Supabase admin
const mockSignerSingle = vi.fn()
const mockDocSingle = vi.fn()
const mockProfileSingle = vi.fn()
const mockFieldsSelect = vi.fn()
const mockStorageCreateSignedUrl = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'signers') {
        return {
          select: () => ({
            eq: () => ({
              single: mockSignerSingle,
            }),
          }),
        }
      }
      if (table === 'documents') {
        return {
          select: () => ({
            eq: () => ({
              single: mockDocSingle,
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: mockProfileSingle,
            }),
          }),
        }
      }
      if (table === 'fields') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [] }),
            }),
          }),
        }
      }
      return {}
    },
    storage: {
      from: () => ({
        createSignedUrl: mockStorageCreateSignedUrl,
      }),
    },
  })),
}))

describe('signer-context: transitional completing handling', () => {
  const rawToken = 'test-token-123'
  const mockSigner = {
    id: 's_1',
    document_id: 'doc_1',
    token_hash: hashSignerToken(rawToken),
    token_expires_at: new Date(Date.now() + 86400000).toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSignerSingle.mockResolvedValue({ data: mockSigner, error: null })
    mockProfileSingle.mockResolvedValue({ data: { id: 'p_1' }, error: null })
    mockStorageCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://sample.pdf' },
    })
  })

  it('blocks signer if document status is active completing (< 2 minutes old)', async () => {
    const recentIso = new Date(Date.now() - 30 * 1000).toISOString() // 30s ago
    mockDocSingle.mockResolvedValue({
      data: {
        id: 'doc_1',
        owner_id: 'p_1',
        status: 'completing',
        updated_at: recentIso,
      },
      error: null,
    })

    const ctx = await resolveSignerToken(rawToken)
    expect(ctx.errorType).toBe('already_completed')
    expect(ctx.document).toBeDefined()
  })

  it('allows signer through if document status is stale completing (> 2 minutes old)', async () => {
    const staleIso = new Date(Date.now() - (COMPLETING_STALE_MS + 5000)).toISOString() // 2m 5s ago
    mockDocSingle.mockResolvedValue({
      data: {
        id: 'doc_1',
        owner_id: 'p_1',
        status: 'completing',
        updated_at: staleIso,
        storage_path_original: 'path/orig.pdf',
      },
      error: null,
    })

    const ctx = await resolveSignerToken(rawToken)
    expect(ctx.errorType).toBeUndefined()
    expect(ctx.document).toBeDefined()
    expect(ctx.document.status).toBe('completing')
  })
})
