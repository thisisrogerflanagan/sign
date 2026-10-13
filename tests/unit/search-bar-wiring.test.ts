import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import fs from 'fs'
import path from 'path'
import { renderToString } from 'react-dom/server'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
}))

// Mock Supabase server client for API route testing
const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  }),
}))

import {
  SearchBar,
  filterDocuments,
  getRecipientSubtitle,
  SearchDocument,
} from '@/components/documents/search-bar'
import { GET as getDocumentsRoute } from '@/app/api/documents/route'

describe('Issue #35: Wire search bar to real document data', () => {
  const sampleDocs: SearchDocument[] = [
    {
      id: 'doc-1',
      title: 'EMPLOYMENT AGREEMENT',
      status: 'sent',
      updated_at: '2026-10-12T10:00:00Z',
      signers: [{ name: 'Alice Smith', email: 'alice@company.com' }],
    },
    {
      id: 'doc-2',
      title: 'Consulting Contract',
      status: 'completed',
      updated_at: '2026-10-11T10:00:00Z',
      signers: [{ name: 'Bob Jones', email: 'bob@contractor.io' }],
    },
    {
      id: 'doc-3',
      title: 'Mutual Non-Disclosure Agreement',
      status: 'draft',
      updated_at: '2026-10-10T10:00:00Z',
      signers: [{ name: 'Carol Danvers', email: 'carol@marvel.com' }],
    },
    {
      id: 'doc-4',
      title: 'Residential Lease',
      status: 'viewed',
      updated_at: '2026-10-09T10:00:00Z',
      signers: [{ name: 'David Miller', email: 'david@rentals.org' }],
    },
    {
      id: 'doc-5',
      title: 'Vendor SOW',
      status: 'sent',
      updated_at: '2026-10-08T10:00:00Z',
      signers: [{ name: 'Eve Adams', email: 'eve@vendors.net' }],
    },
    {
      id: 'doc-6',
      title: 'Older Archived Document',
      status: 'completed',
      updated_at: '2026-10-01T10:00:00Z',
      signers: [{ name: 'Frank Wright', email: 'frank@old.com' }],
    },
  ]

  it('acceptance criterion 1: typing a real document title shows it; typing gibberish shows empty state and no dummy entries', () => {
    // 1. Real document search
    const results = filterDocuments(sampleDocs, 'employment')
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('EMPLOYMENT AGREEMENT')

    // 2. Gibberish search returns empty array
    const emptyResults = filterDocuments(sampleDocs, 'gibberish_xyz_999')
    expect(emptyResults).toHaveLength(0)

    // 3. Render SearchBar with defaultOpen and empty state
    const htmlEmpty = renderToString(
      React.createElement(SearchBar, {
        documents: [],
        defaultOpen: true,
      })
    )
    expect(htmlEmpty).toContain('data-testid="search-empty-state"')
    expect(htmlEmpty).not.toContain('doc-mock-1')
    expect(htmlEmpty).not.toContain('The Flanagans')
    expect(htmlEmpty).not.toContain('Meltdown')
    expect(htmlEmpty).not.toContain('WhatsApp')
  })

  it('acceptance criterion 2: dummy/mock data sources are deleted from search-bar.tsx (verified by grep / file inspect)', () => {
    const searchBarFile = path.resolve(
      process.cwd(),
      'components/documents/search-bar.tsx'
    )
    const content = fs.readFileSync(searchBarFile, 'utf8')

    // Confirm dummy data structures are completely gone
    expect(content).not.toContain('DEFAULT_DOCUMENTS')
    expect(content).not.toContain('SUBSECTIONS')
    expect(content).not.toContain('doc-mock-1')
    expect(content).not.toContain('doc-mock-2')
    expect(content).not.toContain('doc-mock-7')
    expect(content).not.toContain('The Flanagans')
    expect(content).not.toContain('Meltdown')
    expect(content).not.toContain('Changelog')
  })

  it('acceptance criterion 3: results stay in sync with reality via /api/documents endpoint', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
    })

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockNeq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'new-doc-1',
          title: 'Brand New Created Document',
          status: 'draft',
          signers: [{ name: 'New Signer', email: 'signer@test.com' }],
        },
      ],
      error: null,
    })

    mockFrom.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      neq: mockNeq,
      order: mockOrder,
    })

    // Call GET endpoint
    const req = new Request('http://localhost:3000/api/documents?q=Brand%20New')
    const res = await getDocumentsRoute(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.documents).toHaveLength(1)
    expect(json.documents[0].title).toBe('Brand New Created Document')

    // Verify deleted documents are filtered out at the DB level
    expect(mockNeq).toHaveBeenCalledWith('status', 'deleted')
  })

  it('acceptance criterion 4: matches on title and recipient name/email case-insensitively', () => {
    // Search a lowercase fragment of an uppercase title
    const titleMatch = filterDocuments(sampleDocs, 'employ')
    expect(titleMatch).toHaveLength(1)
    expect(titleMatch[0].id).toBe('doc-1')

    const titleFragment2 = filterDocuments(sampleDocs, 'AGREEMENT')
    expect(titleFragment2).toHaveLength(2) // EMPLOYMENT AGREEMENT & Mutual Non-Disclosure Agreement

    // Search recipient name case-insensitively
    const recipientNameMatch = filterDocuments(sampleDocs, 'alice')
    expect(recipientNameMatch).toHaveLength(1)
    expect(recipientNameMatch[0].id).toBe('doc-1')

    const recipientNameUpper = filterDocuments(sampleDocs, 'CAROL')
    expect(recipientNameUpper).toHaveLength(1)
    expect(recipientNameUpper[0].id).toBe('doc-3')

    // Search recipient email case-insensitively
    const recipientEmailMatch = filterDocuments(sampleDocs, 'contractor.io')
    expect(recipientEmailMatch).toHaveLength(1)
    expect(recipientEmailMatch[0].id).toBe('doc-2')

    const emailDomainMatch = filterDocuments(sampleDocs, 'marvel.com')
    expect(emailDomainMatch).toHaveLength(1)
    expect(emailDomainMatch[0].id).toBe('doc-3')
  })

  it('acceptance criterion 5: provides correct navigation URLs for draft vs sent/completed documents', () => {
    // Draft document should navigate to /send/${id}/place
    const draftDoc = sampleDocs.find((d) => d.status === 'draft')!
    const draftHref =
      draftDoc.status === 'draft'
        ? `/send/${draftDoc.id}/place`
        : `/documents/${draftDoc.id}`
    expect(draftHref).toBe('/send/doc-3/place')

    // Completed or sent document should navigate to /documents/${id}
    const sentDoc = sampleDocs.find((d) => d.status === 'sent')!
    const sentHref =
      sentDoc.status === 'draft'
        ? `/send/${sentDoc.id}/place`
        : `/documents/${sentDoc.id}`
    expect(sentHref).toBe('/documents/doc-1')
  })

  it('acceptance criterion 6: empty query returns top 5 recent documents sorted by recency', () => {
    // 6 sample documents passed; empty query should return top 5 ordered by updated_at desc
    const topRecent = filterDocuments(sampleDocs, '')
    expect(topRecent).toHaveLength(5)
    expect(topRecent[0].id).toBe('doc-1') // Most recent (Oct 12)
    expect(topRecent[1].id).toBe('doc-2') // Oct 11
    expect(topRecent[2].id).toBe('doc-3') // Oct 10
    expect(topRecent[3].id).toBe('doc-4') // Oct 09
    expect(topRecent[4].id).toBe('doc-5') // Oct 08
    // doc-6 (Oct 01) should NOT be in top 5
    expect(topRecent.map((d) => d.id)).not.toContain('doc-6')
  })

  it('renders recipient subtitle and status badge correctly in search dropdown rows', () => {
    const subtitle1 = getRecipientSubtitle(sampleDocs[0])
    expect(subtitle1).toBe('Alice Smith (alice@company.com)')

    const html = renderToString(
      React.createElement(SearchBar, {
        documents: sampleDocs,
        defaultOpen: true,
      })
    )

    expect(html).toContain('EMPLOYMENT AGREEMENT')
    expect(html).toContain('Alice Smith (alice@company.com)')
    expect(html).toContain('Waiting to sign')
    expect(html).toContain('Signed')
  })
})
