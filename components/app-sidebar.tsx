'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronDown,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { QuotaWidget } from '@/components/quota-widget'

interface AppSidebarProps {
  userName?: string
  userEmail?: string
  userAvatar?: string | null
  requestsSent?: number
}

export function AppSidebar({
  userName = 'Joe Banks',
  userEmail,
  userAvatar,
  requestsSent = 0,
}: AppSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const status = searchParams?.get('status')
  const router = useRouter()
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-[268px] min-h-full shrink-0 flex flex-col justify-between pt-2 px-2.5 pb-3 select-none">
      <div className="space-y-5">
        {/* User Switcher Pill & New Document */}
        <div className="space-y-2">
          {/* User Switcher Pill / Profile Button */}
          <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl transition-colors px-2.5 py-1.5 text-sm font-semibold text-[rgba(26,28,30,0.85)] w-fit',
                  userDropdownOpen
                    ? 'bg-[rgba(26,28,30,0.06)]'
                    : 'hover:bg-[rgba(26,28,30,0.06)]'
                )}
              >
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userName}
                    className="h-6 w-6 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-white text-xs font-bold">
                    {userName.charAt(0)}
                  </div>
                )}
                <span className="truncate max-w-[120px]">{userName}</span>
                <ChevronDown className="h-4 w-4 text-[rgba(26,28,30,0.85)] ml-0.5" />
              </button>

            {/* User Menu Dropdown */}
            {userDropdownOpen && (
              <div
                className="absolute left-0 top-12 z-30 w-52 rounded-xl border bg-card p-1.5 shadow-lg text-xs animate-in fade-in zoom-in-95"
                onMouseLeave={() => setUserDropdownOpen(false)}
              >
                <div className="px-2.5 py-1.5 text-muted-foreground truncate border-b mb-1">
                  {userEmail || userName}
                </div>
                <Link
                  href="/settings"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-muted text-foreground"
                >
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-destructive/10 text-destructive text-left"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Primary Action: New Document */}
          <div>
            <Link
              href="/send"
              className="sidebar-element"
              data-active={pathname === '/send'}
              style={{ ['--indent-level' as any]: 0 }}
            >
              <img
                src="/icons/add_doc.svg"
                alt=""
                className="h-[18px] w-[18px] shrink-0"
                aria-hidden="true"
              />
              <span>New Document</span>
            </Link>
          </div>
        </div>

        {/* Primary Nav List */}
        <div className="space-y-0.5">
          {/* All Docs */}
          <Link
            href="/"
            className="sidebar-element"
            data-active={pathname === '/' && (!status || status === 'all')}
            style={{ ['--indent-level' as any]: 0 }}
          >
            <img
              src="/icons/docs.svg"
              alt=""
              className="h-[18px] w-[18px] shrink-0"
              aria-hidden="true"
            />
            <span>All Docs</span>
          </Link>

          {/* Archive */}
          <Link
            href="/?status=voided"
            className="sidebar-element"
            data-active={status === 'voided'}
            style={{ ['--indent-level' as any]: 0 }}
          >
            <img
              src="/icons/archive.svg"
              alt=""
              className="h-[18px] w-[18px] shrink-0"
              aria-hidden="true"
            />
            <span>Archive</span>
          </Link>

          {/* Activity */}
          <Link
            href="/activity"
            className="sidebar-element"
            data-active={pathname === '/activity'}
            style={{ ['--indent-level' as any]: 0 }}
          >
            <img
              src="/icons/logbook.svg"
              alt=""
              className="h-[18px] w-[18px] shrink-0"
              aria-hidden="true"
            />
            <span>Activity</span>
          </Link>
        </div>
      </div>

      {/* Monthly Quota Box pinned at the bottom */}
      <div className="mt-auto pt-6 pb-1">
        <QuotaWidget used={requestsSent} limit={50} />
      </div>
    </aside>
  )
}
