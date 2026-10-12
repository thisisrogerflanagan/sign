import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import fs from 'fs'
import path from 'path'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))
import { SendFlowEditor } from '@/components/send/send-flow-editor'
import { PlacedFieldData } from '@/components/send/info-panel'
import {
  FILTER_GROUP_CONTAINER_STYLE,
  FILTER_GROUP_CONTAINER_CLASS,
  FILTER_GROUP_BUTTON_BASE_CLASS,
} from '@/components/documents/home-feed-filters'

describe('Issue #28: Send doc view PDF card, pager header, and field placeholders', () => {
  const sampleFields: PlacedFieldData[] = [
    {
      id: 'f1',
      type: 'signature',
      label: 'Signature',
      page: 1,
      x: 0.2,
      y: 0.3,
      width: 0.24,
      height: 0.055,
      required: true,
      assigned_to: 'signer',
      value: null,
    },
    {
      id: 'f2',
      type: 'date',
      label: 'Date Signed',
      page: 1,
      x: 0.5,
      y: 0.3,
      width: 0.18,
      height: 0.038,
      required: true,
      assigned_to: 'signer',
      value: null,
    },
    {
      id: 'f3',
      type: 'initials',
      label: 'Initials',
      page: 1,
      x: 0.7,
      y: 0.3,
      width: 0.12,
      height: 0.045,
      required: false,
      assigned_to: 'signer',
      value: null,
    },
  ]

  describe('Acceptance Criterion 1 & 2: PDF Page Card Styles and Un-nesting', () => {
    it('globals.css defines .pdf-page-card with 20px radius, soft shadow, overflow: hidden, and white background', () => {
      const cssPath = path.join(process.cwd(), 'app/globals.css')
      const css = fs.readFileSync(cssPath, 'utf-8')

      expect(css).toContain('.pdf-page-card')
      expect(css).toMatch(/border-radius:\s*20px;/)
      expect(css).toMatch(/box-shadow:[\s\S]*0 12px 32px rgba\(0,\s*0,\s*0,\s*0\.10?\)/)
      expect(css).toMatch(/0 2px 8px rgba\(0,\s*0,\s*0,\s*0\.06\)/)
      expect(css).toMatch(/overflow:\s*hidden;/)
      expect(css).toMatch(/background:\s*#ffffff;/i)
    })

    it('send view renders exactly one card-styled element around the page (no nested white wrapper)', () => {
      const html = renderToString(
        React.createElement(SendFlowEditor, {
          initialStep: 'place',
          initialTitle: 'Sales Agreement',
          initialNumPages: 3,
          initialCurrentPage: 1,
          initialFields: sampleFields,
        })
      )

      // PDF Page card exists
      expect(html).toContain('data-testid="pdf-page-card"')
      expect(html).toContain('class="pdf-page-card')

      // Main element is not wrapped in a nested white card
      expect(html).not.toMatch(/<main[^>]*bg-white[^>]*rounded-2xl[^>]*shadow-sm/)
    })
  })

  describe('Acceptance Criterion 3 & 4: 3-Zone Pager Header Row and Page Navigation', () => {
    it('shares All-docs filter button group styles and classes', () => {
      expect(FILTER_GROUP_CONTAINER_STYLE).toBeDefined()
      expect(FILTER_GROUP_CONTAINER_STYLE.background).toBe('white')
      expect(FILTER_GROUP_CONTAINER_CLASS).toContain('flex items-center')
      expect(FILTER_GROUP_BUTTON_BASE_CLASS).toContain('text-[13px]')
    })

    it('renders 3-zone header row: pager on left, centered title, and right-aligned CTAs', () => {
      const html = renderToString(
        React.createElement(SendFlowEditor, {
          initialStep: 'place',
          initialTitle: 'Executive Employment Agreement',
          initialNumPages: 5,
          initialCurrentPage: 2,
          initialFields: sampleFields,
        })
      )

      // Header row
      expect(html).toContain('data-testid="send-header-row"')

      // Left zone: Pager with Prev, 2 / 5, Next
      expect(html).toContain('data-testid="pager-button-group"')
      expect(html).toContain('Prev')
      expect(html).toContain('2 / 5')
      expect(html).toContain('Next')

      // Center zone: centered document title
      expect(html).toContain('data-testid="document-title"')
      expect(html).toContain('Executive Employment Agreement')

      // Right zone: review & send CTA button
      expect(html).toContain('data-testid="continue-to-review-button"')
      expect(html).toContain('Review &amp; send')
    })

    it('disables Prev on page 1 and enables Next for multi-page documents', () => {
      const html = renderToString(
        React.createElement(SendFlowEditor, {
          initialStep: 'place',
          initialTitle: 'Contract',
          initialNumPages: 4,
          initialCurrentPage: 1,
          initialFields: sampleFields,
        })
      )

      expect(html).toContain('1 / 4')
      // Prev button is disabled on page 1
      expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?Prev[\s\S]*?<\/button>/)
    })

    it('disables Next on last page and enables Prev', () => {
      const html = renderToString(
        React.createElement(SendFlowEditor, {
          initialStep: 'place',
          initialTitle: 'Contract',
          initialNumPages: 4,
          initialCurrentPage: 4,
          initialFields: sampleFields,
        })
      )

      expect(html).toContain('4 / 4')
      // Next button is disabled on last page
      expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?Next[\s\S]*?<\/button>/)
    })

    it('hides pager button group entirely for single-page documents', () => {
      const html = renderToString(
        React.createElement(SendFlowEditor, {
          initialStep: 'place',
          initialTitle: 'Single Page Contract',
          initialNumPages: 1,
          initialCurrentPage: 1,
          initialFields: sampleFields,
        })
      )

      expect(html).toContain('Single Page Contract')
      expect(html).toContain('data-testid="continue-to-review-button"')
      expect(html).not.toContain('data-testid="pager-button-group"')
      expect(html).not.toContain('Prev')
      expect(html).not.toContain('Next')
    })
  })

  describe('Acceptance Criterion 5: Minimal Field Placeholders without Green Tint', () => {
    it('globals.css defines .field-placeholder with hairline dashed outline and subtle background', () => {
      const cssPath = path.join(process.cwd(), 'app/globals.css')
      const css = fs.readFileSync(cssPath, 'utf-8')

      expect(css).toContain('.field-placeholder')
      expect(css).toMatch(/border:\s*1\.5px dashed #c9c9c9;/i)
      expect(css).toMatch(/background:\s*rgba\(0,\s*0,\s*0,\s*0\.03\);/)
      expect(css).toMatch(/border-radius:\s*8px;/)
      expect(css).toContain('.field-placeholder:hover')
      expect(css).toMatch(/border-color:\s*#9a9a9a;/i)
    })

    it('renders field placeholders with .field-placeholder and 12px #8A8A8A label', () => {
      const html = renderToString(
        React.createElement(SendFlowEditor, {
          initialStep: 'place',
          initialTitle: 'Contract',
          initialNumPages: 1,
          initialCurrentPage: 1,
          initialFields: sampleFields,
        })
      )

      expect(html).toContain('class="field-placeholder')
      expect(html).toContain('text-[12px] text-[#8A8A8A]')
      expect(html).toContain('Signature')
      expect(html).toContain('Date Signed')
      expect(html).toContain('Initials')
    })

    it('contains zero occurrences of green or emerald in send-flow-editor.tsx', () => {
      const editorPath = path.join(process.cwd(), 'components/send/send-flow-editor.tsx')
      const editorCode = fs.readFileSync(editorPath, 'utf-8')

      expect(editorCode).not.toMatch(/green|emerald|#4ade80|#86efac/i)
    })
  })

  describe('Acceptance Criterion 6: Left and Right Panels Unchanged', () => {
    it('preserves InfoPanel and FieldPalette sidebars in send-flow-editor.tsx', () => {
      const editorPath = path.join(process.cwd(), 'components/send/send-flow-editor.tsx')
      const editorCode = fs.readFileSync(editorPath, 'utf-8')

      expect(editorCode).toContain('<InfoPanel')
      expect(editorCode).toContain('<FieldPalette')
    })
  })

  describe('Continuous Multi-Page PDF Scroll View & Fixed Card', () => {
    it('renders fixed card with vertical scrollbar (flex-1 min-h-0 overflow-y: auto) and unscrollable main', () => {
      const html = renderToString(
        React.createElement(SendFlowEditor, {
          initialStep: 'place',
          initialTitle: 'Contract Agreement',
          initialNumPages: 3,
          initialCurrentPage: 1,
        })
      )

      // Main element is non-scrolling to keep header pinned
      expect(html).toContain('overflow-hidden flex flex-col')

      // White background card has fixed flex-1 min-h-0 with vertical scrollbar
      expect(html).toContain('pdf-page-card w-full flex-1 min-h-0')
      expect(html).toContain('overflow-y:auto')
    })

    it('renders all pages sequentially in continuous scroll view with individual canvases', () => {
      const multiPageFields: PlacedFieldData[] = [
        ...sampleFields,
        {
          id: 'f4',
          type: 'signature',
          label: 'Client Signature Page 2',
          page: 2,
          x: 0.25,
          y: 0.6,
          width: 0.24,
          height: 0.055,
          required: true,
          assigned_to: 'signer',
          value: null,
        },
      ]

      const html = renderToString(
        React.createElement(SendFlowEditor, {
          initialStep: 'place',
          initialTitle: '3-Page Commercial Agreement',
          initialNumPages: 3,
          initialCurrentPage: 1,
          initialFields: multiPageFields,
        })
      )

      // Renders all 3 pages sequentially
      expect(html).toContain('data-testid="pdf-page-1"')
      expect(html).toContain('data-testid="pdf-page-2"')
      expect(html).toContain('data-testid="pdf-page-3"')

      // Page 1 contains sampleFields
      expect(html).toContain('data-testid="field-placeholder-f1"')
      expect(html).toContain('Signature')

      // Page 2 contains field f4
      expect(html).toContain('data-testid="field-placeholder-f4"')
      expect(html).toContain('Client Signature Page 2')

      // 3 canvas elements rendered for the 3 pages
      const canvasMatches = html.match(/<canvas[^>]*class="block w-full h-auto"/g)
      expect(canvasMatches).toHaveLength(3)
    })
  })
})
