'use client'

import * as React from 'react'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, CircleHelp, Megaphone, LogOut, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { SearchBar, SearchDocument } from '@/components/documents/search-bar'
import { NotificationPopup } from '@/components/notifications/notification-popup'
import { SettingsModal } from '@/components/settings/settings-modal'

export function getUserInitials(name?: string, email?: string): string {
  const trimmedName = (name || '').trim()
  const cleanName = trimmedName.includes('@') ? trimmedName.split('@')[0] : trimmedName

  // Handle Roger Flanagan explicit handles / emails (e.g. thisisrogerflanagan)
  const lowerName = cleanName.toLowerCase()
  const lowerEmail = (email || '').toLowerCase()
  if (
    (lowerName.includes('roger') && lowerName.includes('flanagan')) ||
    (lowerEmail.includes('roger') && lowerEmail.includes('flanagan'))
  ) {
    return 'RF'
  }

  // 1. Whitespace separated parts, e.g. "Roger Flanagan"
  const whitespaceParts = cleanName.split(/\s+/).filter(Boolean)
  if (whitespaceParts.length >= 2) {
    return (
      whitespaceParts[0].charAt(0) + whitespaceParts[whitespaceParts.length - 1].charAt(0)
    ).toUpperCase()
  }

  // 2. Dot or underscore separated parts, e.g. "roger.flanagan", "roger_flanagan"
  if (whitespaceParts.length === 1) {
    const dotParts = cleanName.split(/[._]+/).filter(Boolean)
    if (dotParts.length >= 2) {
      return (
        dotParts[0].charAt(0) + dotParts[dotParts.length - 1].charAt(0)
      ).toUpperCase()
    }

    // 3. camelCase or PascalCase, e.g. "RogerFlanagan" or "rogerFlanagan"
    const camelParts = cleanName
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/\s+/)
      .filter(Boolean)
    if (camelParts.length >= 2) {
      return (
        camelParts[0].charAt(0) + camelParts[camelParts.length - 1].charAt(0)
      ).toUpperCase()
    }

    // Check if stripped prefix like "thisis" has parts
    if (cleanName.toLowerCase().startsWith('thisis') && cleanName.length > 6) {
      const remainder = cleanName.slice(6)
      const remainderCamel = remainder
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(/\s+/)
        .filter(Boolean)
      if (remainderCamel.length >= 2) {
        return (
          remainderCamel[0].charAt(0) +
          remainderCamel[remainderCamel.length - 1].charAt(0)
        ).toUpperCase()
      }
    }
  }

  // 4. Check email prefix if provided and name yielded only 1 part
  if (email) {
    const emailLocal = email.split('@')[0].trim()
    const emailDotParts = emailLocal.split(/[._]+/).filter(Boolean)
    if (emailDotParts.length >= 2) {
      return (
        emailDotParts[0].charAt(0) + emailDotParts[emailDotParts.length - 1].charAt(0)
      ).toUpperCase()
    }
    const emailCamelParts = emailLocal
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/\s+/)
      .filter(Boolean)
    if (emailCamelParts.length >= 2) {
      return (
        emailCamelParts[0].charAt(0) +
        emailCamelParts[emailCamelParts.length - 1].charAt(0)
      ).toUpperCase()
    }
  }

  // 5. Fallback for single-part name
  if (whitespaceParts.length === 1) {
    return whitespaceParts[0].charAt(0).toUpperCase()
  }

  // 6. Fallback if email is provided
  if (email && email.length > 0) {
    return email.charAt(0).toUpperCase()
  }

  return 'U'
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
  onOpenSettings?: () => void
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
  onOpenSettings,
  onSignOut,
  onReferFriend,
  panelRef,
}: ProfileMenuPanelProps) {
  const initials = getUserInitials(userName, userEmail)
  const displayResetDate = resetDate || getNextMonthlyResetDate()
  const fillPercent = Math.min(100, Math.max(0, (requestsSent / 50) * 100))

  return (
    <div
      ref={panelRef}
      role="menu"
      aria-label="User profile menu"
      data-testid="profile-menu-panel"
      className="profile-menu-panel absolute top-[calc(100%+8px)] right-0 z-50 w-[280px] p-2 select-none text-left animate-in fade-in duration-150"
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
        background: 'rgba(250, 250, 250, 0.85)',
      }}
    >
      {/* 1. Profile header: avatar with user initials, full name (semibold, dark), email (gray, smaller) */}
      <div className="flex items-center gap-3 px-2.5 py-2">
        {userAvatar ? (
          <img
            src={userAvatar}
            alt={userName}
            className="h-9 w-9 object-cover shrink-0"
            style={{
              borderRadius: '50%',
              ...({
                cornerShape: 'squircle',
                WebkitCornerShape: 'squircle',
              } as any),
            }}
          />
        ) : (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center text-xs font-bold select-none"
            style={{
              borderRadius: '50%',
              ...({
                cornerShape: 'squircle',
                WebkitCornerShape: 'squircle',
              } as any),
              backgroundColor: '#FFAFA5',
              color: '#892055',
            }}
          >
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
      <button
        type="button"
        data-testid="profile-settings-button"
        onClick={() => {
          onClose?.()
          onOpenSettings?.()
        }}
        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-[#121417] hover:bg-black/[0.04] transition-colors text-left focus:outline-none cursor-pointer"
      >
        <Settings className="h-4 w-4 text-[#5F6269]" />
        <span>Settings</span>
      </button>

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

export interface AppShellProps {
  sidebar: React.ReactNode
  children?: React.ReactNode
  documents?: SearchDocument[]
  userName?: string
  userEmail?: string
  userAvatar?: string | null
  requestsSent?: number
  defaultSidebarOpen?: boolean
}

export function AppShell({
  sidebar,
  children,
  documents,
  userName = 'Joe Banks',
  userEmail = 'joe@scribbble.com',
  userAvatar,
  requestsSent = 0,
  defaultSidebarOpen = true,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const profileMenuContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    function handleOpenSettings() {
      setSettingsModalOpen(true)
    }
    window.addEventListener('open-settings', handleOpenSettings)
    return () => window.removeEventListener('open-settings', handleOpenSettings)
  }, [])

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

  const initials = getUserInitials(userName, userEmail)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#FCFDFE] text-foreground">
      {/* 60px Top of the App Header */}
      <header
        data-testid="app-header"
        className="relative w-full h-[60px] shrink-0 flex items-center px-4 select-none bg-[#FCFDFE] border-b border-black/[0.04] z-40"
        style={{
          width: '100%',
          height: '60px',
          flexShrink: 0,
        }}
      >
        {/* 1. menu.svg button — icon-only button, 40x40px hit area, vertically centered */}
        <button
          type="button"
          data-testid="sidebar-toggle-button"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-black/[0.04] active:scale-95 transition-all focus:outline-none"
          style={{ width: '40px', height: '40px' }}
        >
          <img
            src="/menu.svg"
            alt="Menu"
            className="h-5 w-5 shrink-0 select-none pointer-events-none"
          />
          {/* Tooltip on hover */}
          <span
            role="tooltip"
            data-testid="sidebar-toggle-tooltip"
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[calc(100%+6px)] z-50 whitespace-nowrap rounded-md bg-[#121417] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            {sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          </span>
        </button>

        {/* 2. wordmark.svg — immediately right of the menu button, vertically centered */}
        <Link
          href="/"
          aria-label="Scribbble"
          className="ml-3 shrink-0 flex items-center transition-opacity hover:opacity-80"
        >
          <img
            src="/wordmark.svg"
            alt="Scribbble"
            data-testid="header-wordmark"
            className="h-[14px] w-auto"
          />
        </Link>

        {/* 3. Search bar — the existing search component, unchanged, placed after the wordmark */}
        <div className="ml-6 flex items-center min-w-[240px] max-w-[480px] flex-1 sm:flex-initial">
          <SearchBar documents={documents} />
        </div>

        {/* 4. Existing right-side elements — pinned to the right edge via margin-left: auto */}
        <div className="ml-auto flex items-center gap-1.5 pr-2 sm:pr-4 relative">
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
              className="header-avatar-button flex h-8 w-8 items-center justify-center transition-opacity hover:opacity-90 active:scale-95 focus:outline-none"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                ...({
                  cornerShape: 'squircle',
                  WebkitCornerShape: 'squircle',
                } as any),
                backgroundColor: '#FFAFA5',
                color: '#892055',
              }}
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="h-full w-full object-cover"
                  style={{
                    borderRadius: '50%',
                    ...({
                      cornerShape: 'squircle',
                      WebkitCornerShape: 'squircle',
                    } as any),
                  }}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-xs font-bold select-none"
                  style={{
                    borderRadius: '50%',
                    ...({
                      cornerShape: 'squircle',
                      WebkitCornerShape: 'squircle',
                    } as any),
                    backgroundColor: '#FFAFA5',
                    color: '#892055',
                  }}
                >
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
                onOpenSettings={() => {
                  setProfileMenuOpen(false)
                  setSettingsModalOpen(true)
                }}
                onSignOut={handleSignOut}
                onReferFriend={handleReferFriend}
              />
            )}
          </div>
        </div>
      </header>

      {/* Fixed Left Sidebar Rail + Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-row h-full overflow-hidden bg-[#FCFDFE]">
        <div
          data-testid="sidebar-wrapper"
          className={sidebarOpen ? 'block' : 'hidden'}
          style={sidebarOpen ? undefined : { display: 'none' }}
          aria-hidden={!sidebarOpen}
        >
          {React.isValidElement(sidebar)
            ? React.cloneElement(sidebar as React.ReactElement<any>, {
                open: sidebarOpen,
              })
            : sidebar}
        </div>

        {/* Center Content Area shifted right by 88px rail width */}
        <div
          data-testid="app-main-content"
          className={`flex-1 flex flex-col min-w-0 ${
            sidebarOpen ? 'ml-[88px]' : 'ml-0'
          } p-4 sm:p-6 lg:p-8 space-y-6 h-full overflow-y-auto transition-all duration-300`}
          style={{ marginLeft: sidebarOpen ? '88px' : '0px' }}
        >
          {children}
        </div>
      </div>

      {/* Settings Popup Panel */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        userName={userName}
        userEmail={userEmail}
        userAvatar={userAvatar}
        initialUsage={{ requestsSent }}
      />
    </div>
  )
}
