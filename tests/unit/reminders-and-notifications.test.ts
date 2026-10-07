import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  GET as getReminders,
  POST as createReminder,
  PATCH as cancelReminder,
} from '@/app/api/reminders/route'
import {
  GET as getNotifications,
  PATCH as markNotificationsRead,
} from '@/app/api/notifications/route'
import { GET as runCron } from '@/app/api/cron/reminders/route'
import { POST as completeDoc } from '@/app/api/sign/[token]/complete/route'
import { POST as declineDoc } from '@/app/api/sign/[token]/decline/route'

// Mock dependencies
const mockUser = { id: 'user_owner_123', email: 'owner@example.com' }
const mockSigner = { id: 'signer_456', name: 'Bob Signer', email: 'bob@example.com' }
const mockOwnerProfile = {
  id: 'user_owner_123',
  email: 'owner@example.com',
  display_name: 'Alice Owner',
}

let mockNotificationsStore: any[] = []
let mockRemindersStore: any[] = []
let mockDocumentsStore: any[] = []
let mockSignersStore: any[] = []

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mockUser }, error: null })),
    },
  })),
}))

const mockSendEmail = vi.fn().mockResolvedValue({ success: true, messageId: 'msg_test' })
vi.mock('@/lib/email/client', () => ({
  sendTransactionalEmail: (...args: any[]) => mockSendEmail(...args),
}))

vi.mock('@/lib/audit', () => ({
  writeAuditEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/analytics', () => ({
  captureServerEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/pdf/flatten', () => ({
  flattenPdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 test')),
}))

vi.mock('@/lib/signer-context', () => ({
  COMPLETING_STALE_MS: 120000,
  resolveSignerToken: vi.fn(async (token: string) => {
    const doc = mockDocumentsStore.find((d) => d.id === 'doc_123')
    return {
      document: doc,
      signer: mockSigner,
      ownerProfile: mockOwnerProfile,
      fields: [],
    }
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: (table: string) => {
      let query: any = {
        _table: table,
        _filters: [] as any[],
        _selectedCols: '*',
        _updatePayload: null as any,
        _insertPayload: null as any,
        _orderCol: null as string | null,
        _orderAsc: true,
        _limitVal: null as number | null,

        select(cols: string = '*') {
          query._selectedCols = cols
          return query
        },
        eq(col: string, val: any) {
          query._filters.push({ type: 'eq', col, val })
          return query
        },
        in(col: string, vals: any[]) {
          query._filters.push({ type: 'in', col, vals })
          return query
        },
        lte(col: string, val: any) {
          query._filters.push({ type: 'lte', col, val })
          return query
        },
        gte(col: string, val: any) {
          query._filters.push({ type: 'gte', col, val })
          return query
        },
        ilike(col: string, val: any) {
          query._filters.push({ type: 'ilike', col, val })
          return query
        },
        is(col: string, val: any) {
          query._filters.push({ type: 'is', col, val })
          return query
        },
        or(filter: string) {
          return query
        },
        order(col: string, { ascending = true } = {}) {
          query._orderCol = col
          query._orderAsc = ascending
          return query
        },
        limit(val: number) {
          query._limitVal = val
          return query
        },
        insert(payload: any) {
          const records = Array.isArray(payload) ? payload : [payload]
          const inserted = records.map((r) => {
            const row = {
              id: r.id || `id_${Math.random().toString(36).substring(2, 9)}`,
              created_at: r.created_at || new Date().toISOString(),
              ...r,
            }
            if (table === 'notifications') mockNotificationsStore.push(row)
            if (table === 'reminders') mockRemindersStore.push(row)
            return row
          })
          query._insertResult = Array.isArray(payload) ? inserted : inserted[0]
          return query
        },
        update(payload: any) {
          query._updatePayload = payload
          return query
        },
        async maybeSingle() {
          const res = await query._execute()
          return { data: Array.isArray(res) ? res[0] || null : res || null, error: null }
        },
        async single() {
          const res = await query._execute()
          return { data: Array.isArray(res) ? res[0] || null : res || null, error: null }
        },
        then(resolve: any) {
          return query._execute().then((res: any) => resolve({ data: res, error: null }))
        },
        async _execute() {
          let dataset: any[] = []
          if (table === 'notifications') dataset = mockNotificationsStore
          else if (table === 'reminders') dataset = mockRemindersStore
          else if (table === 'documents') dataset = mockDocumentsStore
          else if (table === 'signers') dataset = mockSignersStore
          else if (table === 'profiles') dataset = [mockOwnerProfile]

          if (query._updatePayload) {
            let matched = dataset.filter((row) => {
              return query._filters.every((f: any) => {
                if (f.type === 'eq') return row[f.col] === f.val
                if (f.type === 'is') return row[f.col] === null
                return true
              })
            })
            matched.forEach((row) => {
              Object.assign(row, query._updatePayload)
            })
            return matched.length === 1 ? matched[0] : matched
          }

          if (query._insertResult !== undefined) {
            return query._insertResult
          }

          let results = dataset.filter((row) => {
            return query._filters.every((f: any) => {
              if (f.type === 'eq') return row[f.col] === f.val
              if (f.type === 'in') return f.vals.includes(row[f.col])
              if (f.type === 'lte') return row[f.col] <= f.val
              if (f.type === 'gte') return row[f.col] >= f.val
              if (f.type === 'ilike') {
                const target = String(row[f.col] || '').toLowerCase()
                const pattern = String(f.val).replace(/%/g, '').toLowerCase()
                return target.includes(pattern)
              }
              if (f.type === 'is') return row[f.col] === null
              return true
            })
          })

          // Populate nested documents if reminders table
          if (table === 'reminders') {
            results = results.map((r) => {
              const doc = mockDocumentsStore.find((d) => d.id === r.document_id)
              return {
                ...r,
                documents: doc
                  ? { id: doc.id, title: doc.title, status: doc.status }
                  : null,
              }
            })
          }

          return results
        },
      }
      return query
    },
    storage: {
      from: () => ({
        download: vi.fn().mockResolvedValue({
          data: { arrayBuffer: async () => new ArrayBuffer(8) },
          error: null,
        }),
        upload: vi.fn().mockResolvedValue({ data: { path: 'signed.pdf' }, error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://example.com/download.pdf' },
          error: null,
        }),
      }),
    },
  })),
}))

describe('Issue #24: Reminders + Notifications Suite', () => {
  beforeEach(() => {
    mockNotificationsStore = []
    mockRemindersStore = []
    mockDocumentsStore = [
      {
        id: 'doc_123',
        owner_id: 'user_owner_123',
        title: 'Project Service Contract',
        status: 'sent',
        storage_path_original: 'user_owner_123/doc_123/original.pdf',
        sent_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]
    mockSignersStore = [
      {
        id: 'signer_456',
        document_id: 'doc_123',
        name: 'Bob Signer',
        email: 'bob@example.com',
      },
    ]
    mockSendEmail.mockClear()
    process.env.CRON_SECRET = 'super-secret-cron-token'
  })

  it('acceptance criterion 1: document lifecycle viewed -> signed -> completed produces notifications in order', async () => {
    // 1. First-time view: simulate the notification creation from the signing link viewed route
    // (Checked directly against admin client as in app/sign/[token]/page.tsx)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    // View notification
    await admin.from('notifications').insert({
      user_id: mockUser.id,
      document_id: 'doc_123',
      type: 'viewed',
      title: 'Document viewed',
      body: 'Bob Signer (bob@example.com) viewed "Project Service Contract".',
      created_at: new Date(Date.now() - 2000).toISOString(),
    })

    // 2. Complete document route: transitions doc and adds "signed" then "completed"
    const req = new Request('http://localhost:3000/api/sign/tok_abc/complete', {
      method: 'POST',
    })
    const res = await completeDoc(req, { params: Promise.resolve({ token: 'tok_abc' }) })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)

    // Verify all 3 notifications were created in chronological order
    expect(mockNotificationsStore).toHaveLength(3)
    expect(mockNotificationsStore[0].type).toBe('viewed')
    expect(mockNotificationsStore[1].type).toBe('signed')
    expect(mockNotificationsStore[2].type).toBe('completed')

    expect(mockNotificationsStore[1].body).toContain(
      'Bob Signer signed "Project Service Contract"'
    )
    expect(mockNotificationsStore[2].body).toContain(
      'All signers have signed "Project Service Contract"'
    )
  })

  it('acceptance criterion 2: a reminder set 1 minute out fires on the cron: notification appears AND email is sent', async () => {
    // Schedule a reminder due 1 minute ago (i.e. <= now)
    const oneMinAgo = new Date(Date.now() - 60000).toISOString()
    mockRemindersStore.push({
      id: 'rem_1',
      user_id: mockUser.id,
      document_id: 'doc_123',
      remind_at: oneMinAgo,
      note: 'nudge about the deposit',
      status: 'pending',
      created_at: new Date().toISOString(),
    })

    const cronReq = new Request('http://localhost:3000/api/cron/reminders', {
      method: 'GET',
      headers: {
        authorization: 'Bearer super-secret-cron-token',
      },
    })

    const res = await runCron(cronReq)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.firedReminders).toBe(1)

    // Check reminder status updated to 'fired'
    const updatedReminder = mockRemindersStore.find((r) => r.id === 'rem_1')
    expect(updatedReminder.status).toBe('fired')

    // Check notification created
    const notif = mockNotificationsStore.find((n) => n.type === 'reminder_due')
    expect(notif).toBeDefined()
    expect(notif.body).toContain('nudge about the deposit')

    // Check email sent
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: mockUser.email,
        template: 'reminder_due',
      })
    )
  })

  it('acceptance criterion 3: completing a document auto-completes its pending reminders (nothing fires afterward)', async () => {
    // Create a pending reminder for doc_123
    mockRemindersStore.push({
      id: 'rem_pending',
      user_id: mockUser.id,
      document_id: 'doc_123',
      remind_at: new Date(Date.now() + 3600000).toISOString(),
      note: 'call client',
      status: 'pending',
      created_at: new Date().toISOString(),
    })

    // Complete doc_123
    const req = new Request('http://localhost:3000/api/sign/tok_abc/complete', {
      method: 'POST',
    })
    await completeDoc(req, { params: Promise.resolve({ token: 'tok_abc' }) })

    // Verify reminder is now completed
    const rem = mockRemindersStore.find((r) => r.id === 'rem_pending')
    expect(rem.status).toBe('completed')

    // If cron runs now with an expired remind_at on a completed doc, it should NOT fire
    rem.remind_at = new Date(Date.now() - 1000).toISOString()
    mockSendEmail.mockClear()

    const cronReq = new Request('http://localhost:3000/api/cron/reminders', {
      method: 'GET',
      headers: {
        authorization: 'Bearer super-secret-cron-token',
      },
    })
    const cronRes = await runCron(cronReq)
    const cronData = await cronRes.json()
    expect(cronData.firedReminders).toBe(0)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('acceptance criterion 4 & 5: bell badge unread count matches and mark-all-read clears it', async () => {
    // Add 2 unread notifications
    mockNotificationsStore.push(
      {
        id: 'notif_1',
        user_id: mockUser.id,
        title: 'New view',
        body: 'Someone viewed',
        read_at: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 'notif_2',
        user_id: mockUser.id,
        title: 'Document signed',
        body: 'Someone signed',
        read_at: null,
        created_at: new Date().toISOString(),
      }
    )

    // GET /api/notifications returns unreadCount: 2
    const getRes = await getNotifications()
    const getData = await getRes.json()
    expect(getData.unreadCount).toBe(2)
    expect(getData.notifications).toHaveLength(2)

    // PATCH /api/notifications with all: true
    const patchReq = new Request('http://localhost:3000/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    const patchRes = await markNotificationsRead(patchReq)
    const patchData = await patchRes.json()
    expect(patchData.success).toBe(true)

    // Verify all notifications are read
    const verifyRes = await getNotifications()
    const verifyData = await verifyRes.json()
    expect(verifyData.unreadCount).toBe(0)
  })

  it('acceptance criterion 6: cancelling a reminder updates its status to cancelled', async () => {
    // Create reminder via POST
    const createReq = new Request('http://localhost:3000/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: 'doc_123',
        remindAt: new Date(Date.now() + 86400000).toISOString(),
        note: 'Follow up on payment terms',
      }),
    })
    const createRes = await createReminder(createReq)
    const createData = await createRes.json()
    expect(createRes.status).toBe(201)
    expect(createData.reminder).toBeDefined()
    const reminderId = createData.reminder.id

    // Check GET pending reminders
    const listRes = await getReminders()
    const listData = await listRes.json()
    expect(listData.reminders.find((r: any) => r.id === reminderId)).toBeDefined()

    // Cancel reminder via PATCH
    const cancelReq = new Request('http://localhost:3000/api/reminders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reminderId }),
    })
    const cancelRes = await cancelReminder(cancelReq)
    const cancelData = await cancelRes.json()
    expect(cancelData.success).toBe(true)
    expect(cancelData.reminder.status).toBe('cancelled')

    // Pending list now excludes it
    const listAfterRes = await getReminders()
    const listAfterData = await listAfterRes.json()
    expect(listAfterData.reminders.find((r: any) => r.id === reminderId)).toBeUndefined()
  })

  it('cron generates time-sensitive notice for document awaiting signature for 3+ days without recent notice', async () => {
    // doc_123 is 4 days old and sent, with no notifications in the last 7 days
    const cronReq = new Request('http://localhost:3000/api/cron/reminders', {
      method: 'GET',
      headers: {
        authorization: 'Bearer super-secret-cron-token',
      },
    })
    const res = await runCron(cronReq)
    const data = await res.json()
    expect(data.timeSensitiveNotifications).toBe(1)

    const notif = mockNotificationsStore.find((n) => n.type === 'time_sensitive')
    expect(notif).toBeDefined()
    expect(notif.body).toContain('has been awaiting signature for 3+ days')

    // Second cron run within 7 days does NOT duplicate
    const res2 = await runCron(cronReq)
    const data2 = await res2.json()
    expect(data2.timeSensitiveNotifications).toBe(0)
  })

  it('declining a document produces a declined notification for the owner', async () => {
    const req = new Request('http://localhost:3000/api/sign/tok_abc/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Terms not accepted' }),
    })

    const res = await declineDoc(req, { params: Promise.resolve({ token: 'tok_abc' }) })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)

    const notif = mockNotificationsStore.find((n) => n.type === 'declined')
    expect(notif).toBeDefined()
    expect(notif.body).toContain('Bob Signer declined to sign')
  })
})
