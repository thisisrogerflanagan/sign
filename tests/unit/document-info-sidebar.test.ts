import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { InfoPanel, getReviewSteps } from '@/components/send/info-panel'
import { FieldPalette } from '@/components/send/field-palette'
import { SendFlowEditor } from '@/components/send/send-flow-editor'

// Mock next/navigation for SendFlowEditor
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/send',
}))

describe('Document Info Left Sidebar & Editor Layout (Design Update)', () => {
  it('1. Removes pill tabs completely from the sidebar', () => {
    const html = renderToString(React.createElement(InfoPanel, {}))

    expect(html).not.toContain('grid-cols-4')
    expect(html).not.toContain('rounded-full text-center')
    expect(html).not.toContain('Properties')
    expect(html).not.toContain('Actions')
    expect(html).not.toContain('Stats')
  })

  it('2. Renders title "Document Info" with AirbnbCereal_W_Bd (font-bold) and #3B3B3D', () => {
    const html = renderToString(React.createElement(InfoPanel, {}))

    expect(html).toContain('Document Info')
    expect(html).toContain('#3B3B3D')
    expect(html).toContain('font-bold')
    expect(html).toContain('Airbnb Cereal')
  })

  it('3. Renders sub headings "PROPERTIES" and "REVIEW" with AirbnbCereal_W_Md (font-medium) and #1A1C1E (30%)', () => {
    const html = renderToString(React.createElement(InfoPanel, {}))

    expect(html).toContain('PROPERTIES')
    expect(html).toContain('REVIEW')
    expect(html).toContain('font-medium')
    expect(html).toContain('text-[#1A1C1E]/30')
  })

  it('4. Uses custom SVGs, tight spacing (gap-1.5), and AirbnbCereal_W_Bk (font-normal) for property values', () => {
    const html = renderToString(
      React.createElement(InfoPanel, {
        createdAt: '4 days ago',
        updatedAt: '10 minutes ago',
        author: 'Johnny Maitai',
      })
    )

    // Icons
    expect(html).toContain('src="/icons/calendar.svg"')
    expect(html).toContain('src="/icons/author.svg"')

    // Labels & values
    expect(html).toContain('Created:')
    expect(html).toContain('4 days ago')
    expect(html).toContain('Updated:')
    expect(html).toContain('10 minutes ago')
    expect(html).toContain('Author:')
    expect(html).toContain('Johnny Maitai')

    // Tighter spacing between properties
    expect(html).toContain('gap-1.5')

    // AirbnbCereal_W_Bk (font-normal / weight 400) on values
    expect(html).toContain('font-normal')
    expect(html).toContain('font-weight:400')
  })

  it('5. Uses custom SVGs for REVIEW lifecycle items (completed vs empty)', () => {
    // In draft status: Document Created is completed, remaining 3 are pending
    const draftHtml = renderToString(
      React.createElement(InfoPanel, {
        status: 'draft',
      })
    )

    expect(draftHtml).toContain('Document Created')
    expect(draftHtml).toContain('Sent to Client')
    expect(draftHtml).toContain('Viewed by Client')
    expect(draftHtml).toContain('Document Completed')

    expect(draftHtml).toContain('src="/icons/review_completed.svg"')
    expect(draftHtml).toContain('src="/icons/review_empty.svg"')

    // Verify lifecycle progression logic
    const draftSteps = getReviewSteps('draft')
    expect(draftSteps[0].completed).toBe(true)
    expect(draftSteps[1].completed).toBe(false)
    expect(draftSteps[2].completed).toBe(false)
    expect(draftSteps[3].completed).toBe(false)

    const sentSteps = getReviewSteps('sent')
    expect(sentSteps[0].completed).toBe(true)
    expect(sentSteps[1].completed).toBe(true)
    expect(sentSteps[2].completed).toBe(false)
    expect(sentSteps[3].completed).toBe(false)

    const viewedSteps = getReviewSteps('viewed')
    expect(viewedSteps[0].completed).toBe(true)
    expect(viewedSteps[1].completed).toBe(true)
    expect(viewedSteps[2].completed).toBe(true)
    expect(viewedSteps[3].completed).toBe(false)

    const completedSteps = getReviewSteps('completed')
    expect(completedSteps.every((s) => s.completed)).toBe(true)
  })

  it('6. Right sidebar replaces tabs with "Actions" heading and removes Collections', () => {
    const html = renderToString(
      React.createElement(FieldPalette, {
        disabled: false,
        fields: [],
      })
    )

    // Heading Actions
    expect(html).toContain('Actions')
    expect(html).toContain('text-[26px]')
    expect(html).toContain('font-bold')

    // No tabs
    expect(html).not.toContain('Insert')
    expect(html).not.toContain('Format')
    expect(html).not.toContain('Style')

    // No collections section
    expect(html).not.toContain('Collections')
    expect(html).not.toContain('Table')
    expect(html).not.toContain('Gallery')
    expect(html).not.toContain('Kanban')
  })

  it('7. PDF viewing card and canvas fill the entire container with w-full', () => {
    const html = renderToString(
      React.createElement(SendFlowEditor, {
        initialStep: 'place',
        initialTitle: 'Contract Agreement',
        initialNumPages: 2,
        initialCurrentPage: 1,
      })
    )

    // pdf-page-card has w-full
    expect(html).toContain('pdf-page-card w-full')
    // Canvas has w-full
    expect(html).toContain('w-full h-auto')
  })
})
