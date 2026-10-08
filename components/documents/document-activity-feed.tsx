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
  Globe,
  Laptop,
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

function parseUserAgent(
  ua?: string | null
): { browser: string; os: string; formatted: string } | null {
  if (!ua) return null
  let browser = 'Browser'
  let os = 'Device'

  // Detect OS
  if (/macintosh|mac os x/i.test(ua)) os = 'macOS'
  else if (/windows/i.test(ua)) os = 'Windows'
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/linux/i.test(ua)) os = 'Linux'

  // Detect Browser
  if (/edg/i.test(ua)) browser = 'Edge'
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome'
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox'
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari'

  return {
    browser,
    os,
    formatted: `${browser} on ${os}`,
  }
}

export function DocumentActivityFeed({ events = [] }: DocumentActivityFeedProps) {
  // Chronological order: Newest first
  const sortedEvents = [...events].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
        return <Activity className="h-3.5 w-3.5 text-zinc-600" />
    }
  }

  return (
    <div className="space-y-4 w-full" data-testid="right-activity-column">
      {/* Title & Subtitle */}
      <div className="space-y-1 px-1">
        <h2 className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
          Activity Record
        </h2>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Tamper-evident, chronological log of all interactions with server timestamps and
          client details.
        </p>
      </div>

      {sortedEvents.length === 0 ? (
        <div
          className="py-6 px-1 text-xs text-muted-foreground"
          data-testid="activity-empty-state"
        >
          No audit events recorded yet.
        </div>
      ) : (
        <div className="space-y-1" data-testid="activity-feed-list">
          {sortedEvents.map((event) => {
            const client = parseUserAgent(event.user_agent)
            const icon = getEventIcon(event.event_type)

            return (
              <div
                key={event.id}
                className="px-2 py-2 rounded-xl hover:bg-black/[0.02] transition-colors text-xs space-y-1 group"
                data-testid={`activity-event-${event.id}`}
                data-event-type={event.event_type}
              >
                {/* Event Icon, Action Title & Timestamp */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-5 w-5 rounded-md flex items-center justify-center shrink-0">
                      {icon}
                    </div>
                    <span className="font-medium capitalize text-foreground text-xs truncate">
                      {event.event_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-muted-foreground/70 font-mono text-[10px] shrink-0">
                    {formatDate(event.created_at)} UTC
                  </span>
                </div>

                {/* Actor, parsed client device, and IP */}
                <div className="pl-7 space-y-1 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-foreground/85 font-medium truncate max-w-[200px]">
                      {event.actor_email || event.actor_type || 'system'}
                    </span>
                    {client && (
                      <>
                        <span className="text-zinc-300">&bull;</span>
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-foreground/75 font-medium"
                          title={event.user_agent || undefined}
                        >
                          <Laptop className="h-3 w-3 text-muted-foreground/60" />
                          <span>{client.formatted}</span>
                        </span>
                      </>
                    )}
                    {event.ip_address && (
                      <>
                        <span className="text-zinc-300">&bull;</span>
                        <span className="inline-flex items-center gap-1 font-mono text-muted-foreground/80">
                          <Globe className="h-3 w-3 text-muted-foreground/50" />
                          <span>{event.ip_address}</span>
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

                  {/* Raw User Agent fallback if unparsed */}
                  {event.user_agent && !client && (
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
