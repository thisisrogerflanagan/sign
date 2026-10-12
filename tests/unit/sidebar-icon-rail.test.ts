import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import fs from 'fs'
import path from 'path'

let mockPathname = '/'
let mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: vi.fn(),
    },
  }),
}))

import { AppSidebar } from '@/components/app-sidebar'
import { AppShell } from '@/components/app-shell'

describe('Issue #27: Left sidebar slim icon rail (Dropbox layout)', () => {
  beforeEach(() => {
    mockPathname = '/'
    mockSearchParams = new URLSearchParams()
  })

  it('renders an 88px wide, full-height white fixed left rail with 32px top-centered logo and 20px top/bottom padding', () => {
    const html = renderToString(React.createElement(AppSidebar, {}))

    expect(html).toContain('data-testid="app-sidebar"')
    expect(html).toContain('w-[88px]')
    expect(html).toContain('width:88px')
    expect(html).toContain('h-screen')
    expect(html).toContain('height:100vh')
    expect(html).toContain('bg-white')
    expect(html).toContain('padding-top:20px')
    expect(html).toContain('padding-bottom:20px')

    // Top-centered 32px logo mark
    expect(html).toContain('data-testid="sidebar-logo"')
    expect(html).toContain('width:32px;height:32px')
  })

  it('preserves all 4 primary nav items with exact labels, order, and destinations, stacked with 24px gap', () => {
    const html = renderToString(React.createElement(AppSidebar, {}))

    // Extract nav links inside <nav>
    const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/)
    expect(navMatch).toBeTruthy()
    const navHtml = navMatch![1]

    expect(html).toContain('margin-top:24px')
    expect(html).toContain('gap:24px')

    // Verify exact order of labels
    const labelMatches = [
      ...navHtml.matchAll(/class="sidebar-rail-label[^"]*"[^>]*>([^<]+)<\/span>/g),
    ].map((m) => m[1])
    expect(labelMatches).toEqual(['New Document', 'All Docs', 'Archive', 'Activity'])

    // Verify exact order of destinations
    const hrefMatches = [...navHtml.matchAll(/<a[^>]*href="([^"]+)"/g)].map((m) => m[1])
    expect(hrefMatches).toEqual(['/send', '/', '/?status=voided', '/activity'])
  })

  it('renders active item with #F1F1F1 squircle pill (16px radius, 10px/20px padding) and #111111 icon/label, and inactive items in #737373 with no pill', () => {
    mockPathname = '/'
    mockSearchParams = new URLSearchParams()
    const html = renderToString(React.createElement(AppSidebar, {}))

    // Exactly 1 active pill when on '/'
    const pillMatches = html.match(/data-testid="active-nav-pill"/g)
    expect(pillMatches).toHaveLength(1)

    expect(html).toContain('background-color:#F1F1F1')
    expect(html).toContain('border-radius:16px')
    expect(html).toContain('padding:10px 20px')
    expect(html).toContain('color:#111111')
    expect(html).toContain('color:#737373')
  })

  it('renders all icons as Lucide SVGs at 24px size and 2px stroke, with secondary icon-only buttons pinned at the bottom', () => {
    const html = renderToString(React.createElement(AppSidebar, {}))

    // Every <svg> in the sidebar must be a Lucide icon with width="24" height="24" stroke-width="2"
    const svgTags = [...html.matchAll(/<svg[^>]*>/g)].map((m) => m[0])
    expect(svgTags.length).toBe(7)
    for (const tag of svgTags) {
      expect(tag).toContain('lucide')
      expect(tag).toContain('width="24"')
      expect(tag).toContain('height="24"')
      expect(tag).toContain('stroke-width="2"')
    }

    // Bottom secondary group is pinned to bottom with icon-only actions (no visible text labels)
    const bottomMatch = html.match(
      /data-testid="sidebar-bottom-group"[^>]*>([\s\S]*?)<\/div>/
    )
    expect(bottomMatch).toBeTruthy()
    const bottomHtml = bottomMatch![1]
    expect(bottomHtml).toContain('aria-label="Settings"')
    expect(bottomHtml).toContain('aria-label="Help"')
    expect(bottomHtml).toContain('aria-label="Sign out"')
    expect(bottomHtml).not.toContain('sidebar-rail-label')
  })

  it('shifts main content area right by 88px (margin-left: 88px) and hides nav labels below 768px', () => {
    const shellHtml = renderToString(
      React.createElement(AppShell, {
        sidebar: React.createElement(AppSidebar, {}),
        documents: [],
        children: React.createElement('div', null, 'Main Content'),
      })
    )

    expect(shellHtml).toContain('data-testid="app-main-content"')
    expect(shellHtml).toContain('ml-[88px]')
    expect(shellHtml).toContain('margin-left:88px')

    // Labels have hidden md:block and responsive CSS rule in globals.css
    expect(shellHtml).toContain('sidebar-rail-label hidden md:block')
    const globalsCss = fs.readFileSync(
      path.join(process.cwd(), 'app/globals.css'),
      'utf8'
    )
    expect(globalsCss).toContain('.sidebar-rail-label')
  })
})
