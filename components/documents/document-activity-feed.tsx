'use client'

import React, { useState } from 'react'
import {
  Shield,
  Send,
  Eye,
  CheckCircle2,
  FileCheck,
  Ban,
  Bell,
  Download,
  FileText,
  Activity,
  User,
  Globe,
  Lock,
} from 'lucide-react'
import { formatDate } from '@/lib/document-helpers'

export interface ActivityEvent {
  id: string
  event_type: string
  actor_type?: string | null
  actor_email?: string | null
  ip_address?: string | null
  user_agent?: string | null
  metadata?: any
  created_at: string
}

export interface DocumentActivityFeedProps {
  events: ActivityEvent[]
}

export function DocumentActivityFeed({ events = [] }: DocumentActivityFeedProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'timeline' | 'security'>('all')

  // Chronological order: Newest first
  const sortedEvents = [...events].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Filter events based on active tab
  const filteredEvents = sortedEvents.filter((ev) => {
    if (activeTab === 'timeline') {
      return [
        'document_sent',
        'document_viewed',
        'document_completed',
        'field_filled',
        'reminder_sent',
      ].includes(ev.event_type)
    }
    if (activeTab === 'security') {
      return Boolean(
        ev.ip_address ||
        ev.user_agent ||
        ev.event_type.includes('declined') ||
        ev.event_type.includes('voided')
      )
    }
    return true
  })

  function getEventIcon(eventType: string) {
    switch (eventType) {
      case 'document_sent':
        return <Send className="h-3.5 w-3.5 text-blue-600" />
      case 'document_viewed':
        return <Eye className="h-3.5 w-3.5 text-indigo-600" />
      case 'document_completed':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
      case 'field_filled':
        return <FileCheck className="h-3.5 w-3.5 text-sky-600" />
      case 'document_declined':
        return <Ban className="h-3.5 w-3.5 text-rose-600" />
      case 'reminder_sent':
        return <Bell className="h-3.5 w-3.5 text-amber-600" />
      case 'signed_pdf_downloaded':
        return <Download className="h-3.5 w-3.5 text-zinc-600" />
      case 'document_voided':
        return <Ban className="h-3.5 w-3.5 text-zinc-600" />
      case 'document_created':
        return <FileText className="h-3.5 w-3.5 text-zinc-600" />
      default:
        return <Activity className="h-3.5 w-3.5 text-primary" />
    }
  }

  function getEventBulletBg(eventType: string) {
    switch (eventType) {
      case 'document_sent':
        return 'bg-blue-50 border-blue-200'
      case 'document_viewed':
        return 'bg-indigo-50 border-indigo-200'
      case 'document_completed':
        return 'bg-emerald-50 border-emerald-200'
      case 'document_declined':
        return 'bg-rose-50 border-rose-200'
      case 'reminder_sent':
        return 'bg-amber-50 border-amber-200'
      default:
        return 'bg-zinc-100 border-zinc-200'
    }
  }

  return (
    <div className="space-y-4 w-full" data-testid="right-activity-column">
      {/* Craft Text Tabs Header */}
      <div className="flex items-center gap-5 border-b border-zinc-200/60 pb-2 px-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`font-semibold transition-colors pb-1 relative ${
            activeTab === 'all'
              ? 'text-foreground after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`font-semibold transition-colors pb-1 relative ${
            activeTab === 'timeline'
              ? 'text-foreground after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Timeline
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`font-semibold transition-colors pb-1 relative ${
            activeTab === 'security'
              ? 'text-foreground after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Security
        </button>
      </div>

      {/* Title & Subtitle */}
      <div className="space-y-1 px-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
          Activity Record
        </h2>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Tamper-evident, chronological log of all interactions with server timestamps and
          IP addresses.
        </p>
      </div>

      {filteredEvents.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-zinc-200 bg-white p-6 text-center text-xs text-muted-foreground"
          data-testid="activity-empty-state"
        >
          No audit events recorded yet.
        </div>
      ) : (
        <div className="space-y-2.5" data-testid="activity-feed-list">
          {filteredEvents.map((event) => {
            const bulletBg = getEventBulletBg(event.event_type)
            const icon = getEventIcon(event.event_type)

            return (
              <div
                key={event.id}
                className="rounded-2xl border border-black/[0.04] p-3.5 bg-white text-xs space-y-2 shadow-xs hover:border-black/10 transition-all group"
                data-testid={`activity-event-${event.id}`}
                data-event-type={event.event_type}
              >
                {/* Event Icon, Title & Timestamp */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`h-6 w-6 rounded-lg border flex items-center justify-center shrink-0 ${bulletBg}`}
                    >
                      {icon}
                    </div>
                    <span className="font-semibold capitalize text-foreground text-xs truncate">
                      {event.event_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-muted-foreground font-mono text-[10px] shrink-0">
                    {formatDate(event.created_at)} UTC
                  </span>
                </div>

                {/* Audit details */}
                <div className="rounded-xl bg-zinc-50/70 p-2.5 border border-zinc-200/40 text-[11px] text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-foreground/80 font-medium">Actor:</span>
                    <span className="font-mono text-foreground font-semibold">
                      {event.actor_email || event.actor_type || 'system'}
                    </span>
                    {event.ip_address && (
                      <>
                        <span className="text-zinc-300">&bull;</span>
                        <span className="font-mono text-muted-foreground">
                          IP: {event.ip_address}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Metadata if present */}
                  {event.metadata &&
                    typeof event.metadata === 'object' &&
                    Object.keys(event.metadata).length > 0 && (
                      <div className="pt-0.5 text-[10px] font-mono text-zinc-600 flex flex-wrap gap-x-2">
                        {event.metadata.signer_email && (
                          <span>Signer: {String(event.metadata.signer_email)}</span>
                        )}
                        {event.metadata.note && (
                          <span>Note: {String(event.metadata.note)}</span>
                        )}
                        {event.metadata.reason && (
                          <span>Reason: {String(event.metadata.reason)}</span>
                        )}
                      </div>
                    )}

                  {/* User agent if present */}
                  {event.user_agent && (
                    <div className="truncate max-w-xs text-[10px] text-muted-foreground/60 font-mono pt-0.5">
                      {event.user_agent}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
