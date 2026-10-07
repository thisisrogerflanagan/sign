import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/sign/[token]/complete/route'
import { COMPLETING_STALE_MS, resolveSignerToken } from '@/lib/signer-context'
import { flattenPdf } from '@/lib/pdf/flatten'
import { writeAuditEvent } from '@/lib/audit'
import { captureServerEvent } from '@/lib/analytics'
import { sendTransactionalEmail } from '@/lib/email/client'

// Mock external services
vi.mock('@/lib/signer-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/signer-context')>()
  return {
    ...actual,
    resolveSignerToken: vi.fn(),
  }
})

vi.mock('@/lib/pdf/flatten', () => ({
  flattenPdf: vi.fn(),
}))

vi.mock('@/lib/audit', () => ({
  writeAuditEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/analytics', () => ({
  captureServerEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/email/client', () => ({
  sendTransactionalEmail: vi
    .fn()
    .mockResolvedValue({ success: true, messageId: 'msg_123' }),
}))

// Mock Supabase admin client
const mockDocumentUpdate = vi.fn()
const mockDocumentEq = vi.fn()
const mockDocumentOr = vi.fn()
const mockDocumentSelect = vi.fn()
const mockDocumentMaybeSingle = vi.fn()

const mockOriginalsDownload = vi.fn()
const mockSignedUpload = vi.fn()
const mockSignedCreateSignedUrl = vi.fn()

const mockNotificationInsert = vi.fn().mockResolvedValue({ data: null, error: null })
const mockReminderUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'notifications') {
        return {
          insert: mockNotificationInsert,
        }
      }
      if (table === 'reminders') {
        return {
          update: mockReminderUpdate,
        }
      }
      if (table === 'documents') {
        return {
          update: (payload: any) => {
            mockDocumentUpdate(payload)
            return {
              eq: (col1: string, val1: any) => {
                mockDocumentEq(col1, val1)
                return {
                  or: (filter: string) => {
                    mockDocumentOr(filter)
                    return {
                      select: (cols: string) => {
                        mockDocumentSelect(cols)
                        return {
                          maybeSingle: mockDocumentMaybeSingle,
                        }
                      },
                    }
                  },
                  eq: (col2: string, val2: any) => {
                    mockDocumentEq(col2, val2)
                    return Promise.resolve({ data: null, error: null })
                  },
                }
              },
            }
          },
        }
      }
      return {}
    },
    storage: {
      from: (bucket: string) => {
        if (bucket === 'originals') {
          return {
            download: mockOriginalsDownload,
          }
        }
        if (bucket === 'signed') {
          return {
            upload: mockSignedUpload,
            createSignedUrl: mockSignedCreateSignedUrl,
          }
        }
        return {}
      },
    },
  })),
}))

describe('Issue #1: Signing Completion Pipeline & Transitional Status', () => {
  const dummyDoc = {
    id: 'doc_123',
    owner_id: 'user_abc',
    title: 'Mutual NDA',
    status: 'viewed',
    storage_path_original: 'user_abc/doc_123/original.pdf',
    sent_at: new Date(Date.now() - 3600000).toISOString(),
  }

  const dummySigner = {
    id: 'signer_456',
    email: 'signer@example.com',
    name: 'Jane Doe',
  }

  const dummyOwnerProfile = {
    id: 'user_abc',
    email: 'owner@example.com',
    display_name: 'John Owner',
  }

  const dummyFields = [
    {
      id: 'field_1',
      assigned_to: 'signer',
      required: true,
      value: 'data:image/png;base64,sample',
      type: 'signature',
      page: 1,
      x: 0.1,
      y: 0.1,
      width: 0.2,
      height: 0.05,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Default healthy mock behaviors
    vi.mocked(resolveSignerToken).mockResolvedValue({
      signer: dummySigner,
      document: { ...dummyDoc },
      ownerProfile: dummyOwnerProfile,
      fields: dummyFields,
      signedUrl: 'https://example.com/original.pdf',
    })

    mockDocumentMaybeSingle.mockResolvedValue({
      data: { id: dummyDoc.id, status: 'completing' },
      error: null,
    })

    const samplePdfBuffer = Buffer.from('%PDF-1.4 sample pdf content')
    mockOriginalsDownload.mockResolvedValue({
      data: {
        arrayBuffer: async () => samplePdfBuffer.buffer,
      },
      error: null,
    })

    vi.mocked(flattenPdf).mockResolvedValue(Buffer.from('%PDF-1.4 flattened signed pdf'))

    mockSignedUpload.mockResolvedValue({
      data: { path: `${dummyDoc.owner_id}/${dummyDoc.id}/signed.pdf` },
      error: null,
    })

    mockSignedCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed.pdf' },
      error: null,
    })
  })

  it('acceptance criterion 1: simulated flatten failure leaves document in viewed, not completed, and returns 500', async () => {
    // Simulate flatten failure
    vi.mocked(flattenPdf).mockRejectedValue(new Error('Corrupt PDF stream or font error'))

    const req = new Request('http://localhost:3000/api/sign/valid-token/complete', {
      method: 'POST',
    })

    const res = await POST(req, {
      params: Promise.resolve({ token: 'valid-token' }),
    })

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Failed to process signed document. Please try again.')

    // 1. First update must have claimed the doc to 'completing'
    expect(mockDocumentUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ status: 'completing' })
    )

    // 2. Second update must have rolled back the doc to 'viewed'
    expect(mockDocumentUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: 'viewed',
        completed_at: null,
        storage_path_signed: null,
      })
    )

    // 3. Status must NEVER have transitioned to 'completed'
    const completedCalls = mockDocumentUpdate.mock.calls.filter(
      (call) => call[0]?.status === 'completed'
    )
    expect(completedCalls).toHaveLength(0)

    // 4. No completion emails sent
    expect(sendTransactionalEmail).not.toHaveBeenCalled()
  })

  it('acceptance criterion 2: signer can retry after a failed attempt and complete successfully', async () => {
    // Attempt 1: Flatten throws
    vi.mocked(flattenPdf).mockRejectedValueOnce(new Error('Transient PDF error'))

    const req1 = new Request('http://localhost:3000/api/sign/valid-token/complete', {
      method: 'POST',
    })
    const res1 = await POST(req1, {
      params: Promise.resolve({ token: 'valid-token' }),
    })
    expect(res1.status).toBe(500)

    // Attempt 2 (Retry): Document is now in 'viewed' and retry succeeds
    vi.mocked(resolveSignerToken).mockResolvedValueOnce({
      signer: dummySigner,
      document: { ...dummyDoc, status: 'viewed' },
      ownerProfile: dummyOwnerProfile,
      fields: dummyFields,
      signedUrl: 'https://example.com/original.pdf',
    })
    vi.mocked(flattenPdf).mockResolvedValueOnce(
      Buffer.from('%PDF-1.4 valid signed buffer')
    )

    const req2 = new Request('http://localhost:3000/api/sign/valid-token/complete', {
      method: 'POST',
    })
    const res2 = await POST(req2, {
      params: Promise.resolve({ token: 'valid-token' }),
    })

    expect(res2.status).toBe(200)
    const json2 = await res2.json()
    expect(json2.success).toBe(true)
    expect(json2.downloadUrl).toBe('https://example.com/signed.pdf')

    // Document transitioned to 'completed' on retry
    const completedCalls = mockDocumentUpdate.mock.calls.filter(
      (call) => call[0]?.status === 'completed'
    )
    expect(completedCalls).toHaveLength(1)
    expect(completedCalls[0][0]).toMatchObject({
      status: 'completed',
      storage_path_signed: `${dummyDoc.owner_id}/${dummyDoc.id}/signed.pdf`,
    })

    // Transactional emails sent to signer and owner
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(2)
  })

  it('acceptance criterion 3: double-submit returns 409 and preserves race protection', async () => {
    // Simulate losing atomic claim race (doc is already locked or completed by another request)
    mockDocumentMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const req = new Request('http://localhost:3000/api/sign/valid-token/complete', {
      method: 'POST',
    })
    const res = await POST(req, {
      params: Promise.resolve({ token: 'valid-token' }),
    })

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe(
      'Document is currently being completed or has already been signed'
    )

    // Should NOT attempt download, flatten, upload, rollback, or emails
    expect(mockOriginalsDownload).not.toHaveBeenCalled()
    expect(flattenPdf).not.toHaveBeenCalled()
    expect(mockSignedUpload).not.toHaveBeenCalled()
    expect(sendTransactionalEmail).not.toHaveBeenCalled()
  })

  it('rolls back to viewed if original PDF download fails', async () => {
    mockOriginalsDownload.mockResolvedValueOnce({
      data: null,
      error: { message: 'Original file missing in storage' },
    })

    const req = new Request('http://localhost:3000/api/sign/valid-token/complete', {
      method: 'POST',
    })
    const res = await POST(req, {
      params: Promise.resolve({ token: 'valid-token' }),
    })

    expect(res.status).toBe(500)

    // Rollback to viewed
    expect(mockDocumentUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: 'viewed' })
    )
    expect(flattenPdf).not.toHaveBeenCalled()
  })

  it('rolls back to viewed if signed PDF upload fails', async () => {
    mockSignedUpload.mockResolvedValueOnce({
      data: null,
      error: { message: 'Bucket quota exceeded' },
    })

    const req = new Request('http://localhost:3000/api/sign/valid-token/complete', {
      method: 'POST',
    })
    const res = await POST(req, {
      params: Promise.resolve({ token: 'valid-token' }),
    })

    expect(res.status).toBe(500)

    // Rollback to viewed
    expect(mockDocumentUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: 'viewed' })
    )
  })

  it('allows taking over a stale completing lock (> 2 minutes)', async () => {
    const staleDate = new Date(Date.now() - (COMPLETING_STALE_MS + 10000)).toISOString()

    // resolveSignerToken lets stale doc through
    vi.mocked(resolveSignerToken).mockResolvedValueOnce({
      signer: dummySigner,
      document: { ...dummyDoc, status: 'completing', updated_at: staleDate },
      ownerProfile: dummyOwnerProfile,
      fields: dummyFields,
      signedUrl: 'https://example.com/original.pdf',
    })

    const req = new Request('http://localhost:3000/api/sign/valid-token/complete', {
      method: 'POST',
    })
    const res = await POST(req, {
      params: Promise.resolve({ token: 'valid-token' }),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)

    // Claim query used the .or() filter checking status.in.(sent,viewed) OR stale completing
    expect(mockDocumentOr).toHaveBeenCalledWith(
      expect.stringContaining('and(status.eq.completing,updated_at.lt.')
    )
  })
})
