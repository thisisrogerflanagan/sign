'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Home,
  Folder,
  Bell,
  LayoutGrid,
  Settings,
  CircleHelp,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface AppSidebarProps {
  userName?: string
  userEmail?: string
  userAvatar?: string | null
  requestsSent?: number
  open?: boolean
}

export function AppSidebar({ open = true, ..._props }: AppSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const status = searchParams?.get('status')
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    {
      label: 'New Document',
      href: '/send',
      icon: LayoutGrid,
      active: pathname === '/send',
    },
    {
      label: 'All Docs',
      href: '/',
      icon: Home,
      active: pathname === '/' && (!status || status === 'all'),
    },
    {
      label: 'Archive',
      href: '/?status=voided',
      icon: Folder,
      active: status === 'voided',
    },
    {
      label: 'Activity',
      href: '/activity',
      icon: Bell,
      active: pathname === '/activity',
    },
  ]

  return (
    <aside
      data-testid="app-sidebar"
      className={`fixed top-0 left-0 z-30 w-[88px] h-screen bg-white border-r border-black/[0.04] shrink-0 flex flex-col items-center justify-between pt-[20px] pb-[20px] select-none transition-transform duration-200 ${
        open ? 'translate-x-0' : '-translate-x-full hidden'
      }`}
      style={{
        width: '88px',
        height: '100vh',
        backgroundColor: '#FFFFFF',
        paddingTop: '20px',
        paddingBottom: '20px',
        ...(open ? {} : { display: 'none' }),
      }}
      aria-hidden={!open}
    >
      {/* Top: Logo + Primary Nav */}
      <div className="flex flex-col items-center w-full">
        {/* Scribbble Logo Mark (centered, 32px) */}
        <Link
          href="/"
          aria-label="Scribbble"
          data-testid="sidebar-logo"
          className="flex h-[32px] w-[32px] shrink-0 items-center justify-center transition-opacity hover:opacity-80"
          style={{ width: '32px', height: '32px' }}
        >
          <img src="/logo.svg" alt="Scribbble" className="h-[28px] w-[28px]" />
        </Link>

        {/* Primary Nav Stack (first item 24px below logo, 24px vertical gap) */}
        <nav
          aria-label="Primary navigation"
          className="mt-[24px] flex flex-col items-center gap-[24px] w-full"
          style={{ marginTop: '24px', gap: '24px' }}
        >
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = Boolean(item.active)

            return (
              <Link
                key={item.label}
                href={item.href}
                data-active={isActive}
                aria-current={isActive ? 'page' : undefined}
                className="sidebar-rail-item flex flex-col items-center justify-center gap-1 w-full text-center no-underline cursor-pointer"
                style={{ color: isActive ? '#111111' : '#737373' }}
              >
                {isActive ? (
                  <span
                    data-testid="active-nav-pill"
                    className="flex items-center justify-center bg-[#F1F1F1] rounded-[16px] py-[10px] px-[20px] text-[#111111]"
                    style={{
                      backgroundColor: '#F1F1F1',
                      borderRadius: '16px',
                      padding: '10px 20px',
                      color: '#111111',
                      ...({
                        cornerShape: 'superellipse(1.333)',
                        WebkitCornerShape: 'superellipse(1.333)',
                      } as React.CSSProperties),
                    }}
                  >
                    <Icon
                      size={24}
                      strokeWidth={2}
                      className="h-[24px] w-[24px] shrink-0 text-[#111111]"
                      style={{ color: '#111111' }}
                    />
                  </span>
                ) : (
                  <Icon
                    size={24}
                    strokeWidth={2}
                    className="h-[24px] w-[24px] shrink-0 text-[#737373]"
                    style={{ color: '#737373' }}
                  />
                )}
                <span
                  className="sidebar-rail-label hidden md:block text-[12px] leading-tight font-medium"
                  style={{
                    fontSize: '12px',
                    color: isActive ? '#111111' : '#737373',
                  }}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom: Secondary Icon-Only Actions (pinned to bottom with 20px bottom padding) */}
      <div
        data-testid="sidebar-bottom-group"
        className="mt-auto flex flex-col items-center gap-[24px] w-full"
        style={{ gap: '24px' }}
      >
        <Link
          href="/settings"
          aria-label="Settings"
          title="Settings"
          className="flex items-center justify-center text-[#737373] hover:text-[#111111] transition-colors"
          style={{ color: '#737373' }}
        >
          <Settings
            size={24}
            strokeWidth={2}
            className="h-[24px] w-[24px] shrink-0 text-[#737373]"
            style={{ color: '#737373' }}
          />
        </Link>

        <button
          type="button"
          aria-label="Help"
          title="Help"
          className="flex items-center justify-center text-[#737373] hover:text-[#111111] transition-colors"
          style={{ color: '#737373' }}
        >
          <CircleHelp
            size={24}
            strokeWidth={2}
            className="h-[24px] w-[24px] shrink-0 text-[#737373]"
            style={{ color: '#737373' }}
          />
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="flex items-center justify-center text-[#737373] hover:text-[#111111] transition-colors"
          style={{ color: '#737373' }}
        >
          <LogOut
            size={24}
            strokeWidth={2}
            className="h-[24px] w-[24px] shrink-0 text-[#737373]"
            style={{ color: '#737373' }}
          />
        </button>
      </div>
    </aside>
  )
}
