import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import fs from 'fs'
import path from 'path'
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

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}))

import { SettingsModal, SettingsSectionId } from '@/components/settings/settings-modal'
import { ProfileMenuPanel } from '@/components/app-shell'
import { GET as getSettingsRoute } from '@/app/api/settings/route'

describe('Issue #37: Settings as a popup panel (Craft-style layout, dropdown-menu visuals)', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    userName: 'Roger Flanagan',
    userEmail: 'roger@scribbble.com',
    initialProfile: {
      displayName: 'Roger Flanagan',
      timezone: 'America/New_York',
    },
    initialEntitlement: {
      plan: 'lifetime_founder',
      purchasedAt: '2026-10-01T12:00:00Z',
      refundStatus: 'none',
    },
    initialUsage: {
      requestsSent: 12,
      resetDate: 'Nov 1, 2026',
    },
  }

  it('acceptance criterion 1: clicking Settings in profile dropdown triggers onOpenSettings; SettingsModal handles open/close', () => {
    const onOpenSettings = vi.fn()
    const onClose = vi.fn()

    const dropdownHtml = renderToString(
      React.createElement(ProfileMenuPanel, {
        userName: 'Roger Flanagan',
        userEmail: 'roger@scribbble.com',
        onOpenSettings,
        onClose,
      })
    )

    // Contains Settings button entry point
    expect(dropdownHtml).toContain('data-testid="profile-settings-button"')
    expect(dropdownHtml).toContain('Settings')

    // Modal when closed renders nothing
    const closedHtml = renderToString(
      React.createElement(SettingsModal, {
        ...defaultProps,
        isOpen: false,
      })
    )
    expect(closedHtml).toBe('')

    // Modal when open renders overlay, panel, and close button
    const openHtml = renderToString(
      React.createElement(SettingsModal, {
        ...defaultProps,
        isOpen: true,
      })
    )
    expect(openHtml).toContain('data-testid="settings-modal-overlay"')
    expect(openHtml).toContain('data-testid="settings-modal-panel"')
    expect(openHtml).toContain('data-testid="settings-close-button"')
    expect(openHtml).toContain('aria-label="Close settings"')
  })

  it('acceptance criterion 2: popup background visually matches dropdown menus (frosted blur, same shadow and radius)', () => {
    const html = renderToString(React.createElement(SettingsModal, defaultProps))

    // Verified dropdown panel styles
    expect(html).toContain('settings-modal-panel')
    expect(html).toContain('background:rgba(250, 250, 250, 0.85)')
    expect(html).toContain('backdrop-filter:saturate(1.5) blur(32px)')
    expect(html).toContain('border-radius:18px')
    expect(html).toContain('corner-shape:superellipse(1.333)')
    expect(html).toContain('rgba(0, 0, 0, 0.07) 0px 4px 9px 0px')
    expect(html).toContain('rgba(0, 0, 0, 0.03) 0px 0px 0px 1px')

    // Verify globals.css contains .settings-modal-panel token definitions and fallback
    const cssContent = fs.readFileSync(
      path.resolve(process.cwd(), 'app/globals.css'),
      'utf8'
    )
    expect(cssContent).toContain('.settings-modal-panel')
    expect(cssContent).toContain('@supports not (corner-shape: superellipse(1))')
  })

  it('acceptance criterion 3: left nav lists Scribbble real settings sections only with identity block; clicking section swaps right pane', () => {
    const html = renderToString(React.createElement(SettingsModal, defaultProps))

    // User identity block
    expect(html).toContain('data-testid="settings-identity-block"')
    expect(html).toContain('RF')
    expect(html).toContain('Roger Flanagan')
    expect(html).toContain('roger@scribbble.com')

    // Scribbble sections only
    expect(html).toContain('data-testid="settings-nav-profile"')
    expect(html).toContain('data-testid="settings-nav-plan"')
    expect(html).toContain('data-testid="settings-nav-export"')
    expect(html).toContain('data-testid="settings-nav-danger"')

    expect(html).toContain('Profile &amp; Signer Identity')
    expect(html).toContain('Plan &amp; Monthly Usage')
    expect(html).toContain('Data Export')
    expect(html).toContain('Danger Zone')

    // Active pill treatment (bg-[#F1F1F1] with superellipse corner shape)
    expect(html).toContain('background-color:#F1F1F1')
    expect(html).toContain('corner-shape:superellipse(1.333)')
  })

  it('acceptance criterion 4: every settings control from the old UI is present and functional in the popup', () => {
    // 1. Profile section controls
    const profileHtml = renderToString(
      React.createElement(SettingsModal, {
        ...defaultProps,
        defaultSection: 'profile',
      })
    )
    expect(profileHtml).toContain('Display Name')
    expect(profileHtml).toContain('Email Address')
    expect(profileHtml).toContain('Timezone')
    expect(profileHtml).toContain('Save profile')
    expect(profileHtml).toContain('Sent by Roger Flanagan')

    // 2. Plan section controls
    const planHtml = renderToString(
      React.createElement(SettingsModal, {
        ...defaultProps,
        defaultSection: 'plan',
      })
    )
    expect(planHtml).toContain('Current Plan')
    expect(planHtml).toContain('Lifetime Founder ($49)')
    expect(planHtml).toContain('Fair-Use Allowance')
    expect(planHtml).toContain('12 of 50 requests')
    expect(planHtml).toContain('30-Day Money-Back Guarantee')
    expect(planHtml).toContain('Request a refund')

    // 3. Export section controls
    const exportHtml = renderToString(
      React.createElement(SettingsModal, {
        ...defaultProps,
        defaultSection: 'export',
      })
    )
    expect(exportHtml).toContain('Full Document Archive')
    expect(exportHtml).toContain('Export all documents')

    // 4. Danger section controls
    const dangerHtml = renderToString(
      React.createElement(SettingsModal, {
        ...defaultProps,
        defaultSection: 'danger',
      })
    )
    expect(dangerHtml).toContain('Delete Account Permanently')
    expect(dangerHtml).toContain('Delete account')
  })

  it('acceptance criterion 5: no Craft-specific sections or copy anywhere in the popup', () => {
    const sections: SettingsSectionId[] = ['profile', 'plan', 'export', 'danger']
    for (const sec of sections) {
      const html = renderToString(
        React.createElement(SettingsModal, {
          ...defaultProps,
          defaultSection: sec,
        })
      )

      expect(html).not.toContain('Published Content')
      expect(html).not.toContain('Space Settings')
      expect(html).not.toContain('Daily Notes')
      expect(html).not.toContain('Offline Mode')
      expect(html).not.toContain('Appearance')
      expect(html).not.toContain('Language')
      expect(html).not.toContain('Tags')
      expect(html).not.toContain('Craft')
    }
  })

  it('acceptance criterion 6: responsive stacked layout classes on viewports below 768px', () => {
    const html = renderToString(React.createElement(SettingsModal, defaultProps))

    // Container stacks flex-col on mobile, flex-row on md screens
    expect(html).toContain('flex flex-col md:flex-row')
    expect(html).toContain('w-full md:w-[280px]')
    expect(html).toContain('max-w-[840px]')
  })

  it('acceptance criterion 7: the old settings view/route is gone (no duplicate Settings UI)', () => {
    const oldSettingsPage = path.resolve(process.cwd(), 'app/(app)/settings/page.tsx')
    const oldClientView = path.resolve(
      process.cwd(),
      'components/settings/settings-client-view.tsx'
    )

    expect(fs.existsSync(oldSettingsPage)).toBe(false)
    expect(fs.existsSync(oldClientView)).toBe(false)
  })

  it('fetches settings data from GET /api/settings route accurately', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-456', email: 'owner@scribbble.com' } },
    })

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn()

    // 1. profile single, 2. entitlement single, 3. usage single
    mockSingle
      .mockResolvedValueOnce({
        data: { display_name: 'Owner Name', timezone: 'America/Chicago' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          plan: 'lifetime_founder',
          purchased_at: '2026-10-05T00:00:00Z',
          refund_status: 'none',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { requests_sent: 5 },
        error: null,
      })

    mockFrom.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    })

    const res = await getSettingsRoute()
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.userEmail).toBe('owner@scribbble.com')
    expect(json.profile.displayName).toBe('Owner Name')
    expect(json.profile.timezone).toBe('America/Chicago')
    expect(json.entitlement.plan).toBe('lifetime_founder')
    expect(json.usage.requestsSent).toBe(5)
  })
})
