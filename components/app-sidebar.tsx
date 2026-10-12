'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { QuotaWidget } from '@/components/quota-widget'

interface AppSidebarProps {
  userName?: string
  userEmail?: string
  userAvatar?: string | null
  requestsSent?: number
}

export function AppSidebar({ requestsSent = 0 }: AppSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const status = searchParams?.get('status')

  return (
    <aside className="w-[268px] min-h-full shrink-0 flex flex-col justify-between pt-2 px-2.5 pb-3 select-none">
      <div className="space-y-5">
        {/* Primary Action: New Document */}
        <div className="space-y-2">
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
