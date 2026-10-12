import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { DocumentLifecyclePanel } from '@/components/documents/document-lifecycle-panel'
import { DocumentCenterViewer } from '@/components/documents/document-center-viewer'
import { DocumentActivityFeed } from '@/components/documents/document-activity-feed'
import { THUMBNAIL_CARD_STYLE } from '@/components/documents/document-thumbnail'
import fs from 'fs'
import path from 'path'

describe('Issue #25: Sender sent view 3-column layout', () => {
  const mockDoc = {
    id: 'doc_123',
    status: 'sent' as const,
    title: 'Mutual NDA Agreement',
    created_at: '2026-10-07T12:00:00Z',
    sent_at: '2026-10-07T12:05:00Z',
    viewed_at: null,
    completed_at: null,
    declined_at: null,
    voided_at: null,
    sender_message: 'Please review and sign',
  }

  const mockSigners = [
    {
      id: 'signer_1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      created_at: '2026-10-07T12:05:00Z',
    },
  ]

  const mockAuditEvents = [
    {
      id: 'ev_1',
      event_type: 'document_created',
      actor_type: 'sender',
      actor_email: 'owner@example.com',
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0',
      created_at: '2026-10-07T12:00:00Z',
    },
    {
      id: 'ev_2',
      event_type: 'document_sent',
      actor_type: 'sender',
      actor_email: 'owner@example.com',
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0',
      metadata: { signer_email: 'alice@example.com' },
      created_at: '2026-10-07T12:05:00Z',
    },
    {
      id: 'ev_3',
      event_type: 'document_viewed',
      actor_type: 'signer',
      actor_email: 'alice@example.com',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      created_at: '2026-10-07T12:30:00Z',
    },
  ]

  describe('Acceptance Criterion 1 & 5: 3-Column Layout and Responsive Stacking', () => {
    it('app/(app)/documents/[id]/page.tsx defines a 3-column grid at desktop and single column below 1024px', () => {
      const pageFilePath = path.join(process.cwd(), 'app/(app)/documents/[id]/page.tsx')
      const pageCode = fs.readFileSync(pageFilePath, 'utf-8')

      // Desktop: 3 columns (lg:grid-cols-...)
      expect(pageCode).toMatch(/grid-cols-1/)
      expect(pageCode).toMatch(/lg:grid-cols-/)

      // 3 extracted components wired into layout
      expect(pageCode).toContain('DocumentLifecyclePanel')
      expect(pageCode).toContain('DocumentCenterViewer')
      expect(pageCode).toContain('DocumentActivityFeed')
    })
  })

  describe('Acceptance Criterion 2: Lifecycle Tracker uses existing stage definitions', () => {
    it('uses existing stage definitions: Sent, Opened, Signed', () => {
      const html = renderToString(
        React.createElement(DocumentLifecyclePanel, {
          document: mockDoc,
          signers: mockSigners,
        })
      )

      expect(html).toContain('Sent')
      expect(html).toContain('Opened')
      expect(html).toContain('Signed')
    })

    it('highlights current stage as Sent when document status is sent', () => {
      const html = renderToString(
        React.createElement(DocumentLifecyclePanel, {
          document: { ...mockDoc, status: 'sent', sent_at: '2026-10-07T12:05:00Z' },
          signers: mockSigners,
        })
      )

      expect(html).toContain('data-testid="stage-sent"')
      expect(html).toContain('data-stage-current="true"')
    })

    it('checks completed Sent stage and highlights Opened when document status is viewed', () => {
      const html = renderToString(
        React.createElement(DocumentLifecyclePanel, {
          document: {
            ...mockDoc,
            status: 'viewed',
            sent_at: '2026-10-07T12:05:00Z',
            viewed_at: '2026-10-07T12:30:00Z',
          },
          signers: mockSigners,
        })
      )

      // Stage 1 (Sent) is completed (checked)
      expect(html).toContain('data-testid="stage-sent"')
      expect(html).toContain('data-stage-completed="true"')

      // Stage 2 (Opened) is current
      expect(html).toContain('data-testid="stage-opened"')
      expect(html).toContain('data-stage-current="true"')
    })

    it('checks completed stages and highlights Signed when document status is completed', () => {
      const html = renderToString(
        React.createElement(DocumentLifecyclePanel, {
          document: {
            ...mockDoc,
            status: 'completed',
            sent_at: '2026-10-07T12:05:00Z',
            viewed_at: '2026-10-07T12:30:00Z',
            completed_at: '2026-10-07T13:00:00Z',
          },
          signers: mockSigners,
        })
      )

      expect(html).toContain('data-testid="stage-signed"')
      expect(html).toContain('data-stage-completed="true"')
      expect(html).toContain('data-stage-current="true"')
    })
  })

  describe('Acceptance Criterion 3: Signer rows and per-signer Send reminder', () => {
    it('displays signer name, email, accurate status badge and timestamps', () => {
      const html = renderToString(
        React.createElement(DocumentLifecyclePanel, {
          document: {
            ...mockDoc,
            status: 'viewed',
            viewed_at: '2026-10-07T12:30:00Z',
          },
          signers: mockSigners,
        })
      )

      expect(html).toContain('Alice Johnson')
      expect(html).toContain('alice@example.com')
      expect(html).toContain('Viewed')
      expect(html).toContain('Sent:')
      expect(html).toContain('Opened:')
      expect(html).toContain('Signed:')
    })

    it('renders working Send reminder button for signer awaiting signature', () => {
      const html = renderToString(
        React.createElement(DocumentLifecyclePanel, {
          document: mockDoc,
          signers: mockSigners,
        })
      )

      expect(html).toContain('data-testid="send-reminder-button-signer_1"')
      expect(html).toContain('Send reminder')
    })

    it('disables or marks reminder when document is already signed', () => {
      const html = renderToString(
        React.createElement(DocumentLifecyclePanel, {
          document: {
            ...mockDoc,
            status: 'completed',
            completed_at: '2026-10-07T13:00:00Z',
          },
          signers: mockSigners,
        })
      )

      expect(html).toContain('Signed')
      expect(html).toContain('disabled')
    })
  })

  describe('Acceptance Criterion 4: Activity feed with real events, newest first', () => {
    it('renders audit events chronological newest first with timestamps and actor', () => {
      const html = renderToString(
        React.createElement(DocumentActivityFeed, {
          events: mockAuditEvents,
        })
      )

      expect(html).toContain('Activity Record')
      expect(html).toContain('document viewed')
      expect(html).toContain('document sent')
      expect(html).toContain('document created')
      expect(html).toContain('alice@example.com')
      expect(html).toContain('owner@example.com')
      expect(html).toContain('192.168.1.1')

      // Verify order in HTML: ev_3 (newest, viewed) must appear before ev_1 (oldest, created)
      const viewedIndex = html.indexOf('data-testid="activity-event-ev_3"')
      const sentIndex = html.indexOf('data-testid="activity-event-ev_2"')
      const createdIndex = html.indexOf('data-testid="activity-event-ev_1"')

      expect(viewedIndex).toBeLessThan(sentIndex)
      expect(sentIndex).toBeLessThan(createdIndex)
    })

    it('renders empty state when there are no audit events', () => {
      const html = renderToString(
        React.createElement(DocumentActivityFeed, {
          events: [],
        })
      )

      expect(html).toContain('No audit events recorded yet')
    })
  })

  describe('Center PDF Column: Document viewer treatment', () => {
    it('uses THUMBNAIL_CARD_STYLE matching #23 All docs thumbnail style', () => {
      expect(THUMBNAIL_CARD_STYLE).toBeDefined()
      expect(THUMBNAIL_CARD_STYLE.boxShadow).toContain('rgba(0, 0, 0, 0.04)')

      const html = renderToString(
        React.createElement(DocumentCenterViewer, {
          documentId: 'doc_123',
          title: 'Mutual NDA Agreement',
          pageCount: 3,
        })
      )

      expect(html).toContain('data-testid="center-pdf-column"')
      expect(html).toContain('Page 1 of 3')
      expect(html).toContain('data-testid="pdf-paper-card"')
    })
  })
})
