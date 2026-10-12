import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { InfoPanel, PlacedFieldData } from '@/components/send/info-panel'
import { FieldPalette, V1_PALETTE_ITEMS } from '@/components/send/field-palette'
import { UploadArea } from '@/components/send/upload-area'
import { THUMBNAIL_CARD_STYLE } from '@/components/documents/document-thumbnail'

describe('Issue #23: Upload UX Sidebar Layout', () => {
  const sampleFields: PlacedFieldData[] = [
    {
      id: 'f1',
      type: 'signature',
      label: 'Signer Signature',
      page: 1,
      x: 0.1,
      y: 0.2,
      width: 0.2,
      height: 0.05,
      required: true,
      assigned_to: 'signer',
      value: null,
    },
    {
      id: 'f2',
      type: 'initials',
      label: 'Initials',
      page: 1,
      x: 0.4,
      y: 0.2,
      width: 0.1,
      height: 0.04,
      required: false,
      assigned_to: 'signer',
      value: null,
    },
    {
      id: 'f3',
      type: 'date',
      label: 'Date Signed',
      page: 1,
      x: 0.6,
      y: 0.2,
      width: 0.15,
      height: 0.04,
      required: true,
      assigned_to: 'signer',
      value: null,
    },
    {
      id: 'f4',
      type: 'text',
      label: 'Full Name',
      page: 1,
      x: 0.1,
      y: 0.3,
      width: 0.2,
      height: 0.04,
      required: false,
      assigned_to: 'signer',
      value: null,
    },
    {
      id: 'f5',
      type: 'signature',
      label: 'Sender Signature',
      page: 1,
      x: 0.1,
      y: 0.4,
      width: 0.2,
      height: 0.05,
      required: true,
      assigned_to: 'sender',
      value: 'data:image/png;base64,mock',
    },
  ]

  describe('Left Panel (InfoPanel) - Document Info Layout', () => {
    it('renders "Document Info" title and does not render pill tabs', () => {
      const html = renderToString(
        React.createElement(InfoPanel, {
          hasDocument: true,
          fields: sampleFields,
        })
      )

      expect(html).toContain('Document Info')
      expect(html).toContain('#3B3B3D')
      expect(html).not.toContain('grid-cols-4')
      expect(html).not.toContain('Stats')
      expect(html).not.toContain('Danger Zone')
    })

    it('renders PROPERTIES section with Created, Updated, and Author', () => {
      const html = renderToString(
        React.createElement(InfoPanel, {
          hasDocument: true,
          createdAt: '4 days ago',
          updatedAt: '10 minutes ago',
          author: 'Johnny Maitai',
        })
      )

      expect(html).toContain('PROPERTIES')
      expect(html).toContain('Created:')
      expect(html).toContain('4 days ago')
      expect(html).toContain('Updated:')
      expect(html).toContain('10 minutes ago')
      expect(html).toContain('Author:')
      expect(html).toContain('Johnny Maitai')
      expect(html).toContain('/icons/calendar.svg')
      expect(html).toContain('/icons/author.svg')
    })

    it('renders REVIEW section with 4 lifecycle steps and status-based icons', () => {
      // 1. In draft status: Document Created is completed, rest pending
      const draftHtml = renderToString(
        React.createElement(InfoPanel, {
          hasDocument: true,
          status: 'draft',
        })
      )

      expect(draftHtml).toContain('REVIEW')
      expect(draftHtml).toContain('Document Created')
      expect(draftHtml).toContain('Sent to Client')
      expect(draftHtml).toContain('Viewed by Client')
      expect(draftHtml).toContain('Document Completed')
      expect(draftHtml).toContain('/icons/review_completed.svg')
      expect(draftHtml).toContain('/icons/review_empty.svg')

      // 2. In sent status: Document Created & Sent to Client completed
      const sentHtml = renderToString(
        React.createElement(InfoPanel, {
          hasDocument: true,
          status: 'sent',
        })
      )
      expect(sentHtml).toContain('Document Created')
      expect(sentHtml).toContain('Sent to Client')

      // 3. In completed status: all steps completed
      const completedHtml = renderToString(
        React.createElement(InfoPanel, {
          hasDocument: true,
          status: 'completed',
        })
      )
      expect(completedHtml).not.toContain('/icons/review_empty.svg')
    })
  })

  describe('Right Panel (FieldPalette) - Gated Insert Options', () => {
    it('shows all v1 field types: Signature, Initials, Date, Text', () => {
      expect(V1_PALETTE_ITEMS.map((item) => item.type)).toEqual([
        'signature',
        'initials',
        'date',
        'text',
      ])
    })

    it('before upload: options are visible, greyed out, and shows helper text', () => {
      const html = renderToString(
        React.createElement(FieldPalette, {
          disabled: true,
          fields: [],
        })
      )

      // Shows helper text
      expect(html).toContain('Upload a document to start placing fields.')
      // Options are visible but disabled
      expect(html).toContain('Signature *')
      expect(html).toContain('Initials')
      expect(html).toContain('Date Signed')
      expect(html).toContain('Text')
      expect(html).toContain('aria-disabled="true"')
      expect(html).toContain('cursor-not-allowed')
    })

    it('after upload: options are fully interactive immediately', () => {
      const html = renderToString(
        React.createElement(FieldPalette, {
          disabled: false,
          fields: sampleFields,
        })
      )

      expect(html).toContain('Drag and drop any item to the document')
      expect(html).toContain('draggable="true"')
      expect(html).toContain('Placed Fields')
      expect(html).toContain('5')
      expect(html).not.toContain('Upload a document to start placing fields.')
    })
  })

  describe('Upload Area Card & Thumbnail Styles', () => {
    it('uses exact All docs thumbnail card styling (radius, shadow, border)', () => {
      expect(THUMBNAIL_CARD_STYLE).toEqual({
        boxShadow:
          '0px 1px 1px 0px rgba(0, 0, 0, 0.04), 0px 3px 3px 0px rgba(0, 0, 0, 0.04), 0px 6px 4px 0px rgba(0, 0, 0, 0.02), 0px 11px 4px 0px rgba(0, 0, 0, 0.01), 0px 17px 5px 0px rgba(0, 0, 0, 0.00), 0px 0px 0px 1px rgba(0, 0, 0, 0.03)',
      })

      const html = renderToString(
        React.createElement(UploadArea, {
          file: null,
          title: '',
          onFileSelect: () => {},
          onTitleChange: () => {},
          onContinueUpload: () => {},
          uploading: false,
          error: null,
        })
      )

      expect(html).toContain('rounded-[4px]')
      expect(html).toContain('border-black/[0.04]')
      expect(html).toContain('bg-white')
      expect(html).toContain('Upload a document to send')
      expect(html).toContain('data-testid="upload-pdf-input"')
      expect(html).toContain('data-testid="upload-continue-button"')
    })
  })
})
