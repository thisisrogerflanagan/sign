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

  describe('Left Panel (InfoPanel) - 4 Tabs & Real Document Data', () => {
    it('renders navigation with 4 tabs: Properties, Review, Actions, Stats', () => {
      const html = renderToString(
        React.createElement(InfoPanel, {
          hasDocument: true,
          fields: sampleFields,
          activeTab: 'properties',
        })
      )

      expect(html).toContain('Properties')
      expect(html).toContain('Review')
      expect(html).toContain('Actions')
      expect(html).toContain('Stats')
    })

    it('Properties tab displays real metadata: file name, page count, file size, and upload date', () => {
      const html = renderToString(
        React.createElement(InfoPanel, {
          hasDocument: true,
          documentTitle: 'Partnership Agreement',
          fileName: 'partnership_final.pdf',
          pageCount: 4,
          fileSizeBytes: 2450000,
          uploadDate: '2026-10-07T12:00:00.000Z',
          fields: sampleFields,
          activeTab: 'properties',
        })
      )

      expect(html).toContain('partnership_final.pdf')
      expect(html).toContain('4 pages')
      expect(html).toContain('2.34 MB')
      expect(html).toContain('Oct 7, 2026')
    })

    it('Review tab shows pre-send checklist with check and warning states', () => {
      // 1. With required fields placed, 1 signer, and sender signed
      const passingHtml = renderToString(
        React.createElement(InfoPanel, {
          hasDocument: true,
          fields: sampleFields,
          signersCount: 1,
          activeTab: 'review',
        })
      )

      expect(passingHtml).toContain('Required fields')
      expect(passingHtml).toContain('Ready')
      expect(passingHtml).toContain('Signer recipient')
      expect(passingHtml).toContain('Added')
      expect(passingHtml).toContain('Sender signature')

      // 2. With no fields placed and 0 signers
      const warningHtml = renderToString(
        React.createElement(InfoPanel, {
          hasDocument: true,
          fields: [],
          signersCount: 0,
          activeTab: 'review',
        })
      )

      expect(warningHtml).toContain('Pending')
      expect(warningHtml).toContain('At least one signer is required before sending')
    })

    it('Actions tab renders Save draft, Send document, and separated Delete draft', () => {
      const html = renderToString(
        React.createElement(InfoPanel, {
          hasDocument: true,
          fields: sampleFields,
          activeTab: 'actions',
        })
      )

      expect(html).toContain('Save draft')
      expect(html).toContain('Send document')
      expect(html).toContain('continue-to-review-button')
      expect(html).toContain('Delete draft')
      expect(html).toContain('Danger Zone')
    })

    it('Stats tab shows live counts by field type, signers added, and document status', () => {
      const html = renderToString(
        React.createElement(InfoPanel, {
          hasDocument: true,
          status: 'draft',
          signersCount: 2,
          fields: sampleFields,
          activeTab: 'stats',
        })
      )

      // Signature: 2, Initials: 1, Date: 1, Text: 1
      expect(html).toContain('Signature')
      expect(html).toContain('Initials')
      expect(html).toContain('Date')
      expect(html).toContain('Text')
      expect(html).toContain('Signers added')
      expect(html).toContain('draft')
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
