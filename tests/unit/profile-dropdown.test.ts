import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import {
  ProfileMenuPanel,
  getUserInitials,
  getNextMonthlyResetDate,
} from '@/components/app-shell'
import fs from 'fs'
import path from 'path'

describe('Issue #26: Profile dropdown frosted squircle panel', () => {
  it('renders all 9 reference sections with exact copy and dynamic usage bar fill (used / 50 * 100%)', () => {
    const html = renderToString(
      React.createElement(ProfileMenuPanel, {
        userName: 'Roger Flanagan',
        userEmail: 'roger@scribbble.com',
        requestsSent: 15,
        resetDate: 'Nov 1, 2026',
      })
    )

    // 1. Profile header: avatar with user initials, full name, email
    expect(html).toContain('RF')
    expect(html).toContain('Roger Flanagan')
    expect(html).toContain('roger@scribbble.com')

    // 2. Usage block: thin progress bar (fill width = 15 / 50 = 30%), info icon + Using X of 50 signatures, Monthly limit resets on <date>
    expect(html).toContain('width:30%')
    expect(html).toContain('Using 15 of 50 signatures')
    expect(html).toContain('Monthly limit resets on Nov 1, 2026')

    // 3, 6, 8. Dividers (3 separators)
    const separators = html.match(/role="separator"/g) || []
    expect(separators).toHaveLength(3)

    // 4. Settings row
    expect(html).toContain('Settings')
    expect(html).toContain('data-testid="profile-settings-button"')

    // 5. Help row
    expect(html).toContain('Help')

    // 7. Refer-a-friend block
    expect(html).toContain('Refer a friend')
    expect(html).toContain(
      'It&#x27;s easy to recommend and earn extra monthly signatures.'
    )

    // 9. Log out row
    expect(html).toContain('Log out')
  })

  it('positions panel anchored to top-right below header avatar button with 8px gap and right-edge alignment', () => {
    const html = renderToString(
      React.createElement(ProfileMenuPanel, {
        userName: 'Jane Doe',
        userEmail: 'jane@scribbble.com',
        requestsSent: 0,
      })
    )

    expect(html).toContain('profile-menu-panel')
    expect(html).toContain('top-[calc(100%+8px)]')
    expect(html).toContain('right-0')
  })

  it('defines exact .profile-menu-panel CSS in app/globals.css and inline style', () => {
    const cssPath = path.join(process.cwd(), 'app/globals.css')
    const cssContent = fs.readFileSync(cssPath, 'utf-8').replace(/\s+/g, ' ')

    expect(cssContent).toContain('.profile-menu-panel')
    expect(cssContent).toContain('border-radius: 18px;')
    expect(cssContent).toContain('corner-shape: superellipse(1.333);')
    expect(cssContent).toContain(
      'box-shadow: rgba(0, 0, 0, 0.07) 0px 4px 9px 0px, rgba(0, 0, 0, 0.06) 0px 16px 16px 0px, rgba(0, 0, 0, 0.04) 0px 36px 22px 0px, rgba(0, 0, 0, 0.01) 0px 65px 26px 0px, rgba(0, 0, 0, 0) 0px 101px 28px 0px, rgba(0, 0, 0, 0.03) 0px 0px 0px 1px;'
    )
    expect(cssContent).toContain(
      '-webkit-backdrop-filter: saturate(1.5) blur(32px) !important;'
    )
    expect(cssContent).toContain('backdrop-filter: saturate(1.5) blur(32px) !important;')
    expect(cssContent).toContain('background: rgba(250, 250, 250, 0.85);')
    expect(cssContent).toContain('.search-dropdown-menu')
    expect(cssContent).toContain('.notification-popup-panel')
    expect(cssContent).toContain('@supports not (corner-shape: superellipse(1))')
  })

  it('renders user avatar with background color #FFAFA5 and copy color #892055 displaying initials with squircle shape', () => {
    const html = renderToString(
      React.createElement(ProfileMenuPanel, {
        userName: 'Roger Flanagan',
        userEmail: 'roger@scribbble.com',
      })
    )

    expect(html).toContain('background-color:#FFAFA5')
    expect(html).toContain('color:#892055')
    expect(html).toContain('RF')
    expect(html).toContain('border-radius:50%')
    expect(html).toContain('corner-shape:squircle')
  })

  it('computes dynamic reset date and user initials accurately', () => {
    expect(getUserInitials('Roger Flanagan')).toBe('RF')
    expect(getUserInitials('test-e2e')).toBe('T')
    expect(getUserInitials('roger.flanagan')).toBe('RF')
    expect(getUserInitials('roger_flanagan')).toBe('RF')
    expect(getUserInitials('RogerFlanagan')).toBe('RF')
    expect(getUserInitials('roger', 'roger.flanagan@gmail.com')).toBe('RF')
    expect(getUserInitials('thisisrogerflanagan', 'roger.flanagan@gmail.com')).toBe('RF')
    expect(getUserInitials('thisisrogerflanagan')).toBe('RF')
    expect(getUserInitials('thisisrogerflanagan', 'thisisrogerflanagan@gmail.com')).toBe(
      'RF'
    )
    expect(getNextMonthlyResetDate(new Date('2026-10-12T12:00:00Z'))).toBe('Nov 1, 2026')
    expect(getNextMonthlyResetDate(new Date('2026-12-15T12:00:00Z'))).toBe('Jan 1, 2027')
  })
})
