import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: vi.fn(),
    },
  }),
}))

import { AppShell } from '@/components/app-shell'
import { AppSidebar } from '@/components/app-sidebar'

describe('Issue #33: New app header (60px bar with sidebar toggle, wordmark, search)', () => {
  it('renders a 60px tall, full-width (100%) header without margin-left offset', () => {
    const html = renderToString(
      React.createElement(
        AppShell,
        {
          sidebar: React.createElement(AppSidebar, {}),
          documents: [],
        },
        React.createElement('div', null, 'Page Content')
      )
    )

    const headerMatch = html.match(/<header[^>]*data-testid="app-header"[^>]*>/)
    expect(headerMatch).toBeTruthy()
    const headerTag = headerMatch![0]

    // Stretches 100% of viewport width and is 60px tall with flex-shrink: 0
    expect(headerTag).toContain('w-full')
    expect(headerTag).toContain('width:100%')
    expect(headerTag).toContain('h-[60px]')
    expect(headerTag).toContain('height:60px')
    expect(headerTag).toContain('shrink-0')

    // Header itself must NOT have margin-left or ml-[88px]
    expect(headerTag).not.toContain('ml-[88px]')
    expect(headerTag).not.toContain('margin-left')
  })

  it('renders elements in exact left-to-right order: menu button -> wordmark -> search bar -> right-side elements', () => {
    const html = renderToString(
      React.createElement(
        AppShell,
        {
          sidebar: React.createElement(AppSidebar, {}),
          documents: [],
        },
        React.createElement('div', null, 'Page Content')
      )
    )

    const headerContentMatch = html.match(
      /<header[^>]*data-testid="app-header"[^>]*>([\s\S]*?)<\/header>/
    )
    expect(headerContentMatch).toBeTruthy()
    const headerContent = headerContentMatch![1]

    const menuIdx = headerContent.indexOf('data-testid="sidebar-toggle-button"')
    const wordmarkIdx = headerContent.indexOf('data-testid="header-wordmark"')
    const searchIdx = headerContent.indexOf('main-search-bar')
    const rightGroupIdx = headerContent.indexOf('ml-auto')

    expect(menuIdx).toBeGreaterThan(-1)
    expect(wordmarkIdx).toBeGreaterThan(-1)
    expect(searchIdx).toBeGreaterThan(-1)
    expect(rightGroupIdx).toBeGreaterThan(-1)

    // Verify left-to-right sequence
    expect(menuIdx).toBeLessThan(wordmarkIdx)
    expect(wordmarkIdx).toBeLessThan(searchIdx)
    expect(searchIdx).toBeLessThan(rightGroupIdx)
  })

  it('renders menu.svg icon button with 40x40px hit area and tooltip "Close sidebar" when open', () => {
    const html = renderToString(
      React.createElement(
        AppShell,
        {
          sidebar: React.createElement(AppSidebar, {}),
          defaultSidebarOpen: true,
        },
        React.createElement('div', null, 'Page Content')
      )
    )

    // Button attributes and hit area
    const buttonMatch = html.match(
      /<button[^>]*data-testid="sidebar-toggle-button"[^>]*>([\s\S]*?)<\/button>/
    )
    expect(buttonMatch).toBeTruthy()
    const buttonTag = buttonMatch![0]
    const buttonInner = buttonMatch![1]

    expect(buttonTag).toContain('h-10')
    expect(buttonTag).toContain('w-10')
    expect(buttonTag).toContain('width:40px')
    expect(buttonTag).toContain('height:40px')
    expect(buttonTag).toContain('aria-label="Close sidebar"')
    expect(buttonTag).toContain('aria-expanded="true"')

    // Icon
    expect(buttonInner).toContain('src="/menu.svg"')

    // Tooltip
    expect(buttonInner).toContain('role="tooltip"')
    expect(buttonInner).toContain('data-testid="sidebar-toggle-tooltip"')
    expect(buttonInner).toContain('Close sidebar')
  })

  it('renders menu.svg icon button with tooltip "Open sidebar" and aria-expanded=false when closed', () => {
    const html = renderToString(
      React.createElement(
        AppShell,
        {
          sidebar: React.createElement(AppSidebar, {}),
          defaultSidebarOpen: false,
        },
        React.createElement('div', null, 'Page Content')
      )
    )

    const buttonMatch = html.match(
      /<button[^>]*data-testid="sidebar-toggle-button"[^>]*>([\s\S]*?)<\/button>/
    )
    expect(buttonMatch).toBeTruthy()
    const buttonTag = buttonMatch![0]
    const buttonInner = buttonMatch![1]

    expect(buttonTag).toContain('aria-label="Open sidebar"')
    expect(buttonTag).toContain('aria-expanded="false"')
    expect(buttonInner).toContain('Open sidebar')
  })

  it('renders wordmark.svg immediately right of the menu button', () => {
    const html = renderToString(
      React.createElement(
        AppShell,
        {
          sidebar: React.createElement(AppSidebar, {}),
        },
        React.createElement('div', null, 'Page Content')
      )
    )

    expect(html).toContain('data-testid="header-wordmark"')
    expect(html).toContain('src="/wordmark.svg"')
  })

  it('preserves existing search component and right-side elements pinned to the right edge via ml-auto', () => {
    const html = renderToString(
      React.createElement(
        AppShell,
        {
          sidebar: React.createElement(AppSidebar, {}),
          userName: 'Roger Flanagan',
          userEmail: 'roger@scribbble.com',
        },
        React.createElement('div', null, 'Page Content')
      )
    )

    // Search input present
    expect(html).toContain('placeholder="Search..."')
    expect(html).toContain('main-search-bar')

    // Right side elements preserved
    expect(html).toContain('ml-auto')
    expect(html).toContain('aria-label="Notifications"')
    expect(html).toContain('aria-label="Help"')
    expect(html).toContain('data-testid="header-avatar-button"')
    expect(html).toContain('RF')
  })

  it('toggles sidebar visibility and adjusts main content margin without layout shift in header', () => {
    // Open state
    const openHtml = renderToString(
      React.createElement(
        AppShell,
        {
          sidebar: React.createElement(AppSidebar, {}),
          defaultSidebarOpen: true,
        },
        React.createElement('div', null, 'Page Content')
      )
    )
    expect(openHtml).toContain('ml-[88px]')
    expect(openHtml).toContain('margin-left:88px')
    expect(openHtml).toContain('translate-x-0')
    expect(openHtml).not.toContain('data-testid="sidebar-wrapper" class="hidden"')

    // Closed state
    const closedHtml = renderToString(
      React.createElement(
        AppShell,
        {
          sidebar: React.createElement(AppSidebar, {}),
          defaultSidebarOpen: false,
        },
        React.createElement('div', null, 'Page Content')
      )
    )
    expect(closedHtml).toContain('ml-0')
    expect(closedHtml).toContain('margin-left:0px')
    expect(closedHtml).toContain('-translate-x-full hidden')
    expect(closedHtml).toContain('display:none')

    // In both states, header retains exact same dimensions and properties
    const openHeader = openHtml.match(/<header[^>]*data-testid="app-header"[^>]*>/)![0]
    const closedHeader = closedHtml.match(
      /<header[^>]*data-testid="app-header"[^>]*>/
    )![0]
    expect(openHeader).toBe(closedHeader)
  })
})
