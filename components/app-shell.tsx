'use client'

import * as React from 'react'
import { useState } from 'react'
import { SearchBar } from '@/components/documents/search-bar'
import { NotificationPopup } from '@/components/notifications/notification-popup'

interface AppShellProps {
  sidebar: React.ReactNode
  children: React.ReactNode
  documents?: Array<{
    id: string
    title: string
    status?: string
  }>
}

export function AppShell({ sidebar, children, documents }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const superellipseStyle: React.CSSProperties = {
    borderRadius: '10px',
    ...({
      cornerShape: 'superellipse(1.333)',
      WebkitCornerShape: 'superellipse(1.333)',
    } as any),
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* 48px Top of the App Header */}
      <header className="relative h-[48px] shrink-0 w-full flex items-center justify-between select-none bg-background z-20">
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

        {/* Right: Button Group (notification on left, help on far right) */}
        <div className="flex items-center gap-1.5 pr-4 sm:pr-6 relative">
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              aria-label="Notifications"
              title="Notifications"
              className={`flex items-center justify-center p-[4px] transition-colors hover:bg-[rgba(26,28,30,0.04)] active:scale-95 ${
                notificationsOpen ? 'bg-[rgba(26,28,30,0.06)]' : ''
              }`}
              style={superellipseStyle}
            >
              <img src="/icons/notification.svg" alt="Notifications" className="h-[20px] w-[20px]" />
            </button>

            {/* Notification Popup Window */}
            {notificationsOpen && (
              <NotificationPopup onClose={() => setNotificationsOpen(false)} />
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
          background: 'rgb(252, 253, 254)',
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
          <div className="w-[268px] h-full overflow-y-auto">
            {sidebar}
          </div>
        </div>

        {/* Center Content Area */}
        <div className="flex-1 flex flex-col min-w-0 p-8 space-y-6 h-full overflow-y-auto transition-all duration-300">
          {children}
        </div>
      </div>
    </div>
  )
}
