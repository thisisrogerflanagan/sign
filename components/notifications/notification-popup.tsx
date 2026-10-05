'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotificationPopupProps {
  onClose: () => void
}

export function NotificationPopup({ onClose }: NotificationPopupProps) {
  const [activeTab, setActiveTab] = useState<'activity' | 'reminders'>('activity')
  const popupRef = useRef<HTMLDivElement>(null)

  // Same dropdown box shadow as search bar dropdown
  const dropdownBoxShadow =
    'rgba(0, 0, 0, 0.07) 0px 4px 9px 0px, rgba(0, 0, 0, 0.06) 0px 16px 16px 0px, rgba(0, 0, 0, 0.04) 0px 36px 22px 0px, rgba(0, 0, 0, 0.01) 0px 65px 26px 0px, rgba(0, 0, 0, 0) 0px 101px 28px 0px, rgba(0, 0, 0, 0.03) 0px 0px 0px 1px'

  // Handle click outside and Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
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
  }, [onClose])

  return (
    <div
      ref={popupRef}
      className="absolute top-[calc(100%+8px)] right-0 z-50 flex flex-col p-4 select-none animate-in fade-in zoom-in-95 duration-150"
      style={{
        width: '380px',
        maxWidth: 'calc(100vw - 32px)',
        borderRadius: '18px',
        boxShadow: dropdownBoxShadow,
        background: 'rgba(250, 250, 250, 0.85)',
        backdropFilter: 'saturate(1.5) blur(32px)',
        WebkitBackdropFilter: 'saturate(1.5) blur(32px)',
      }}
    >
      {/* Header Row: Title & Overflow action */}
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-[16px] font-bold tracking-tight text-[#121417]">
          Notifications
        </h3>
        <button
          type="button"
          aria-label="More notification options"
          title="More options"
          className="p-1 rounded-md text-[#5F6269] hover:text-[#121417] hover:bg-[rgba(26,28,30,0.06)] transition-colors"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Segmented Control Tabs */}
      <div className="bg-[#EAECEF]/80 p-1 rounded-[12px] flex items-center gap-1 text-[13px]">
        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={cn(
            'flex-1 py-1 px-3 rounded-[9px] font-medium transition-all text-center',
            activeTab === 'activity'
              ? 'bg-white text-[#121417] shadow-sm'
              : 'text-[#5F6269] hover:text-[#121417]'
          )}
        >
          Activity
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reminders')}
          className={cn(
            'flex-1 py-1 px-3 rounded-[9px] font-medium transition-all text-center',
            activeTab === 'reminders'
              ? 'bg-white text-[#121417] shadow-sm'
              : 'text-[#5F6269] hover:text-[#121417]'
          )}
        >
          Reminders
        </button>
      </div>

      {/* Content Area */}
      <div className="flex flex-col items-center justify-center pt-8 pb-4 px-2">
        {/* Visual Skeleton Cards Illustration with subtle aura */}
        <div className="relative w-full max-w-[240px] flex flex-col items-center">
          {/* Subtle iridescent glow behind cards */}
          <div
            className="absolute inset-0 -inset-x-4 blur-2xl opacity-60 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(254, 215, 226, 0.7) 0%, rgba(233, 213, 255, 0.6) 40%, rgba(199, 210, 254, 0.5) 80%, transparent 100%)',
            }}
          />

          {/* 3 Stacked Cards */}
          <div className="relative z-10 w-full space-y-2">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="bg-white/95 rounded-xl border border-black/[0.05] p-2.5 shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-center gap-2.5"
              >
                <div className="h-5 w-5 rounded-full bg-[#E5E8ED] shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-1.5 w-16 rounded-full bg-[#E5E8ED]" />
                  <div className="h-1.5 w-32 rounded-full bg-[#E5E8ED]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty State Text */}
        {activeTab === 'activity' ? (
          <>
            <h4 className="text-[16px] font-bold text-[#121417] mt-6 mb-1.5 text-center">
              No notifications yet
            </h4>
            <p className="text-[13px] text-[#5F6269] text-center leading-relaxed max-w-[280px]">
              You’ll be notified here when someone mentions you, writes a comment on your document or replies to your comments.
            </p>
            <Link
              href="/settings"
              onClick={onClose}
              className="mt-6 inline-flex items-center justify-center bg-[#2A6FF5] hover:bg-[#1E5ED8] text-white font-medium text-[13px] px-5 py-2 rounded-xl transition-colors shadow-sm"
            >
              Learn more
            </Link>
          </>
        ) : (
          <>
            <h4 className="text-[16px] font-bold text-[#121417] mt-6 mb-1.5 text-center">
              No reminders yet
            </h4>
            <p className="text-[13px] text-[#5F6269] text-center leading-relaxed max-w-[280px]">
              You’ll see reminders here when documents are pending signatures, awaiting your action, or close to expiration.
            </p>
            <Link
              href="/"
              onClick={onClose}
              className="mt-6 inline-flex items-center justify-center bg-[#2A6FF5] hover:bg-[#1E5ED8] text-white font-medium text-[13px] px-5 py-2 rounded-xl transition-colors shadow-sm"
            >
              Learn more
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
