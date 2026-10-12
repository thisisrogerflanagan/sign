'use client'

import * as React from 'react'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, CircleHelp, Megaphone, LogOut, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { SearchBar } from '@/components/documents/search-bar'
import { NotificationPopup } from '@/components/notifications/notification-popup'

export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function getNextMonthlyResetDate(now: Date = new Date()): string {
  const nextMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  )
  return nextMonthStart.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export interface ProfileMenuPanelProps {
  userName?: string
  userEmail?: string
  userAvatar?: string | null
  requestsSent?: number
  resetDate?: string
  onClose?: () => void
  onSignOut?: () => void
  onReferFriend?: () => void
  panelRef?: React.RefObject<HTMLDivElement | null>
}

export function ProfileMenuPanel({
  userName = 'Joe Banks',
  userEmail = 'joe@scribbble.com',
  userAvatar,
  requestsSent = 0,
  resetDate,
  onClose,
  onSignOut,
  onReferFriend,
  panelRef,
}: ProfileMenuPanelProps) {
  const initials = getUserInitials(userName)
  const displayResetDate = resetDate || getNextMonthlyResetDate()
  const fillPercent = Math.min(100, Math.max(0, (requestsSent / 50) * 100))

  return (
    <div
      ref={panelRef}
      role="menu"
      aria-label="User profile menu"
      data-testid="profile-menu-panel"
      className="profile-menu-panel absolute top-[calc(100%+8px)] right-0 z-50 w-[280px] p-2 select-none text-left animate-in fade-in zoom-in-95 duration-150"
      style={{
        borderRadius: '18px',
        ...({
          cornerShape: 'superellipse(1.333)',
          WebkitCornerShape: 'superellipse(1.333)',
        } as any),
        boxShadow:
          'rgba(0, 0, 0, 0.07) 0px 4px 9px 0px, rgba(0, 0, 0, 0.06) 0px 16px 16px 0px, rgba(0, 0, 0, 0.04) 0px 36px 22px 0px, rgba(0, 0, 0, 0.01) 0px 65px 26px 0px, rgba(0, 0, 0, 0) 0px 101px 28px 0px, rgba(0, 0, 0, 0.03) 0px 0px 0px 1px',
        WebkitBackdropFilter: 'saturate(1.5) blur(32px)',
        backdropFilter: 'saturate(1.5) blur(32px)',
        background: 'rgba(255, 255, 255, 0.8)',
      }}
    >
      {/* 1. Profile header: avatar with user initials, full name (semibold, dark), email (gray, smaller) */}
      <div className="flex items-center gap-3 px-2.5 py-2">
        {userAvatar ? (
          <img
            src={userAvatar}
            alt={userName}
            className="h-9 w-9 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-white text-xs font-bold">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#121417] truncate">{userName}</p>
          <p className="text-[12px] text-[#5F6269] truncate">{userEmail}</p>
        </div>
      </div>

      {/* 2. Usage block: thin progress bar (fill width = used / 50), info icon + Using X of 50 signatures (gray), Monthly limit resets on <date> (gray, smaller, dynamic date) */}
      <div className="px-2.5 pt-1.5 pb-2.5 space-y-1.5">
        <div className="h-1.5 w-full rounded-full bg-black/[0.08] overflow-hidden">
          <div
            data-testid="profile-usage-bar-fill"
            className="h-full rounded-full bg-[#121417] transition-all"
            style={{ width: `${fillPercent}%` }}
          />
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#5F6269]">
          <Info className="h-3.5 w-3.5 shrink-0 text-[#5F6269]" />
          <span>{`Using ${requestsSent} of 50 signatures`}</span>
        </div>
        <p className="text-[11px] text-[#5F6269]">
          {`Monthly limit resets on ${displayResetDate}`}
        </p>
      </div>

      {/* 3. Divider */}
      <div className="my-1 h-px bg-black/[0.06]" role="separator" />

      {/* 4. Settings row (Lucide settings gear icon) */}
      <Link
        href="/settings"
        onClick={onClose}
        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-[#121417] hover:bg-black/[0.04] transition-colors"
      >
        <Settings className="h-4 w-4 text-[#5F6269]" />
        <span>Settings</span>
      </Link>

      {/* 5. Help row (Lucide circle-help icon) */}
      <a
        href="mailto:support@scribbble.com"
        onClick={onClose}
        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-[#121417] hover:bg-black/[0.04] transition-colors"
      >
        <CircleHelp className="h-4 w-4 text-[#5F6269]" />
        <span>Help</span>
      </a>

      {/* 6. Divider */}
      <div className="my-1 h-px bg-black/[0.06]" role="separator" />

      {/* 7. Refer-a-friend block: heading Refer a friend (semibold), body It's easy to recommend and earn extra monthly signatures. (gray), Lucide megaphone icon on the right */}
      <button
        type="button"
        onClick={onReferFriend}
        className="flex w-full items-start justify-between gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-black/[0.04] transition-colors"
      >
        <div className="space-y-0.5 flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#121417]">Refer a friend</p>
          <p className="text-[12px] text-[#5F6269] leading-snug">
            It&apos;s easy to recommend and earn extra monthly signatures.
          </p>
        </div>
        <Megaphone className="h-4 w-4 text-[#5F6269] shrink-0 mt-0.5" />
      </button>

      {/* 8. Divider */}
      <div className="my-1 h-px bg-black/[0.06]" role="separator" />

      {/* 9. Log out row (Lucide log-out icon) */}
      <button
        type="button"
        onClick={onSignOut}
        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-[#121417] hover:bg-black/[0.04] transition-colors text-left"
      >
        <LogOut className="h-4 w-4 text-[#5F6269]" />
        <span>Log out</span>
      </button>
    </div>
  )
}

interface AppShellProps {
  sidebar: React.ReactNode
  children: React.ReactNode
  documents?: Array<{
    id: string
    title: string
    status?: string
  }>
  userName?: string
  userEmail?: string
  userAvatar?: string | null
  requestsSent?: number
}

export function AppShell({
  sidebar,
  children,
  documents,
  userName = 'Joe Banks',
  userEmail = 'joe@scribbble.com',
  userAvatar,
  requestsSent = 0,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const profileMenuContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    async function checkUnread() {
      try {
        const res = await fetch('/api/notifications')
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.unreadCount || 0)
        }
      } catch {
        // non-fatal
      }
    }
    checkUnread()
  }, [])

  useEffect(() => {
    if (!profileMenuOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuContainerRef.current &&
        !profileMenuContainerRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false)
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [profileMenuOpen])

  async function handleSignOut() {
    setProfileMenuOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleReferFriend() {
    setProfileMenuOpen(false)
    if (typeof window !== 'undefined' && navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.origin).catch(() => {})
    }
    toast({
      title: 'Referral link copied',
      description: 'Share Scribbble with a friend to earn extra monthly signatures.',
    })
  }

  const superellipseStyle: React.CSSProperties = {
    borderRadius: '10px',
    ...({
      cornerShape: 'superellipse(1.333)',
      WebkitCornerShape: 'superellipse(1.333)',
    } as any),
  }

  const initials = getUserInitials(userName)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F7F7F8] text-foreground">
      {/* 48px Top of the App Header */}
      <header className="relative h-[48px] shrink-0 w-full flex items-center justify-between select-none bg-[#F7F7F8]/80 backdrop-blur-md border-b border-black/[0.04] z-20">
        {/* Left: Sidebar Toggle Button (left aligns at 24px with sidebar nav icons) */}
        <div className="flex items-center pl-[20px]">
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
            className="flex items-center justify-center p-[4px] transition-colors hover:bg-[rgba(26,28,30,0.04)] active:scale-95"
            style={superellipseStyle}
          >
            <img src="/icons/sidebar.svg" alt="Sidebar" className="h-[20px] w-[20px]" />
          </button>
        </div>

        {/* Center: Search Bar Horizontally Centered in Viewport */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-auto">
          <SearchBar documents={documents} />
        </div>

        {/* Right: Button Group (notification, help, and header avatar button on far right) */}
        <div className="flex items-center gap-1.5 pr-4 sm:pr-6 relative">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileMenuOpen(false)
                setNotificationsOpen((prev) => !prev)
              }}
              aria-label="Notifications"
              title="Notifications"
              className={`relative flex items-center justify-center p-[4px] transition-colors hover:bg-[rgba(26,28,30,0.04)] active:scale-95 ${
                notificationsOpen ? 'bg-[rgba(26,28,30,0.06)]' : ''
              }`}
              style={superellipseStyle}
            >
              <img
                src="/icons/notification.svg"
                alt="Notifications"
                className="h-[20px] w-[20px]"
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex min-w-[16px] h-4 px-1 items-center justify-center rounded-full bg-[#E5484D] text-[10px] font-bold text-white shadow-xs pointer-events-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popup Window */}
            {notificationsOpen && (
              <NotificationPopup
                onClose={() => setNotificationsOpen(false)}
                onUnreadCountChange={setUnreadCount}
                documents={documents}
              />
            )}
          </div>

          <button
            type="button"
            aria-label="Help"
            title="Help"
            className="flex items-center justify-center p-[4px] transition-colors hover:bg-[rgba(26,28,30,0.04)] active:scale-95"
            style={superellipseStyle}
          >
            <img src="/icons/help.svg" alt="Help" className="h-[20px] w-[20px]" />
          </button>

          {/* Header Avatar Button & Profile Dropdown Panel */}
          <div ref={profileMenuContainerRef} className="relative flex items-center">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(false)
                setProfileMenuOpen((prev) => !prev)
              }}
              aria-label="User menu"
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              data-testid="header-avatar-button"
              className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-90 active:scale-95 focus:outline-none"
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="h-6 w-6 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-white text-xs font-bold">
                  {initials}
                </div>
              )}
            </button>

            {profileMenuOpen && (
              <ProfileMenuPanel
                userName={userName}
                userEmail={userEmail}
                userAvatar={userAvatar}
                requestsSent={requestsSent}
                onClose={() => setProfileMenuOpen(false)}
                onSignOut={handleSignOut}
                onReferFriend={handleReferFriend}
              />
            )}
          </div>
        </div>
      </header>

      {/* 2-Column Section of the App */}
      <div
        className="flex-1 min-h-0"
        style={{
          position: 'relative',
          left: '0px',
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          height: '100%',
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          background: '#F7F7F8',
          transform: 'scale(1)',
          transformOrigin: 'center bottom',
          willChange: 'transform',
        }}
      >
        {/* Collapsible Sidebar Rail with Smooth Slide Transition */}
        <div
          className={`shrink-0 h-full overflow-hidden transition-[width,transform,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            sidebarOpen
              ? 'w-[268px] opacity-100 translate-x-0'
              : 'w-0 opacity-0 -translate-x-full pointer-events-none'
          }`}
        >
          <div className="w-[268px] h-full overflow-y-auto">{sidebar}</div>
        </div>

        {/* Center Content Area */}
        <div className="flex-1 flex flex-col min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 h-full overflow-y-auto transition-all duration-300">
          {children}
        </div>
      </div>
    </div>
  )
}
