'use client'

import React from 'react'
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
  // Ensure chronological order: Newest first per spec
  const sortedEvents = [...events].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Factual icon matching event type
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
    <div
      className="rounded-2xl border bg-card p-5 sm:p-6 shadow-xs space-y-5 w-full"
      data-testid="right-activity-column"
    >
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-base font-bold tracking-tight flex items-center gap-2 text-foreground">
          <Shield className="h-4 w-4 text-primary shrink-0" />
          Activity Record
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Tamper-evident, chronological log of all interactions with server timestamps and
          IP addresses.
        </p>
      </div>

      {sortedEvents.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground bg-muted/10"
          data-testid="activity-empty-state"
        >
          No audit events recorded yet.
        </div>
      ) : (
        <div
          className="relative border-l border-zinc-200 ml-3 space-y-6 pt-2 pb-2"
          data-testid="activity-feed-list"
        >
          {sortedEvents.map((event) => {
            const bulletBg = getEventBulletBg(event.event_type)
            const icon = getEventIcon(event.event_type)

            return (
              <div
                key={event.id}
                className="relative pl-6 space-y-1 group"
                data-testid={`activity-event-${event.id}`}
                data-event-type={event.event_type}
              >
                {/* Timeline Bullet with Icon */}
                <div
                  className={`absolute -left-3 top-0.5 h-6 w-6 rounded-full border flex items-center justify-center shadow-xs bg-white ${bulletBg}`}
                >
                  {icon}
                </div>

                {/* Event Title & Timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <span className="font-semibold capitalize text-foreground text-xs">
                    {event.event_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-muted-foreground font-mono text-[10px] shrink-0">
                    {formatDate(event.created_at)} UTC
                  </span>
                </div>

                {/* Factual Audit Information */}
                <div className="text-[11px] text-muted-foreground space-y-0.5">
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

                  {/* Factual Metadata details if present */}
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
