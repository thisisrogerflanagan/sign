import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'
import { AppSidebar } from '@/components/app-sidebar'
import { ActivityFilters } from '@/components/activity/activity-filters'
import { format } from 'date-fns'
import { formatRelativeDate } from '@/lib/document-helpers'
import {
  GitCommit,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Send,
  Eye,
  FileCheck,
  Ban,
  FilePlus,
  Bell,
} from 'lucide-react'
import { AuditEventType } from '@/lib/supabase/types'

interface ActivityPageProps {
  searchParams: Promise<{
    type?: string
    q?: string
  }>
}

export default async function ActivityPage(props: ActivityPageProps) {
  const searchParams = await props.searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 1. Fetch current month fair-use usage for the sidebar quota widget
  const currentMonthStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
  )
    .toISOString()
    .split('T')[0]

  const { data: usageRow } = await supabase
    .from('usage_counters')
    .select('requests_sent')
    .eq('user_id', user.id)
    .eq('period_start', currentMonthStart)
    .single()

  const requestsSent = usageRow?.requests_sent || 0

  // 2. Query documents owned by user to populate search bar & filter audit events
  const { data: allDocs } = await supabase
    .from('documents')
    .select('id, title, status')
    .eq('owner_id', user.id)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })

  const userDocIds = (allDocs || []).map((d) => d.id)
  const docMap = new Map((allDocs || []).map((d) => [d.id, d]))

  // 3. Query audit events
  let auditEvents: any[] = []

  if (userDocIds.length > 0) {
    let query = supabase
      .from('audit_events')
      .select('*')
      .in('document_id', userDocIds)
      .order('created_at', { ascending: false })
      .limit(100)

    if (searchParams.type && searchParams.type !== 'all') {
      query = query.eq('event_type', searchParams.type as AuditEventType)
    }

    const { data: events } = await query
    auditEvents = events || []
  }

  // Filter by search query if present
  if (searchParams.q && searchParams.q.trim()) {
    const q = searchParams.q.toLowerCase().trim()
    auditEvents = auditEvents.filter((ev) => {
      const doc = docMap.get(ev.document_id)
      const titleMatch = doc?.title?.toLowerCase().includes(q)
      const actorMatch = ev.actor_email?.toLowerCase().includes(q)
      const ipMatch = ev.ip_address?.toLowerCase().includes(q)
      return titleMatch || actorMatch || ipMatch
    })
  }

  // Group events by calendar date
  const groupedEvents: { [dateStr: string]: typeof auditEvents } = {}
  for (const event of auditEvents) {
    const dateKey = format(new Date(event.created_at), 'MMMM d, yyyy')
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = []
    }
    groupedEvents[dateKey].push(event)
  }

  function getEventBadge(eventType: AuditEventType) {
    switch (eventType) {
      case 'document_created':
        return {
          label: 'Created',
          color: 'bg-zinc-100 text-zinc-700 border-zinc-200',
          icon: FilePlus,
        }
      case 'document_sent':
        return {
          label: 'Sent',
          color: 'bg-amber-50 text-amber-800 border-amber-200/60',
          icon: Send,
        }
      case 'document_viewed':
        return {
          label: 'Viewed',
          color: 'bg-blue-50 text-blue-800 border-blue-200/60',
          icon: Eye,
        }
      case 'document_completed':
        return {
          label: 'Signed',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
          icon: FileCheck,
        }
      case 'document_declined':
        return {
          label: 'Declined',
          color: 'bg-rose-50 text-rose-800 border-rose-200/60',
          icon: Ban,
        }
      case 'document_voided':
        return {
          label: 'Cancelled',
          color: 'bg-zinc-100 text-zinc-600 border-zinc-200',
          icon: Ban,
        }
      case 'reminder_sent':
        return {
          label: 'Reminder',
          color: 'bg-amber-50 text-amber-700 border-amber-200/60',
          icon: Bell,
        }
      default:
        return {
          label: eventType.replace(/_/g, ' '),
          color: 'bg-zinc-100 text-zinc-700 border-zinc-200',
          icon: GitCommit,
        }
    }
  }

  return (
    <AppShell
      documents={allDocs || []}
      sidebar={
        <AppSidebar
          userName={user.user_metadata?.display_name || user.email?.split('@')[0] || 'Joe Banks'}
          userEmail={user.email}
          requestsSent={requestsSent}
        />
      }
    >
      <main className="w-full space-y-6">
        {/* Main Content View Heading & Filter Row */}
        <div className="space-y-3">
          <div
            className="inline-flex items-center px-2 py-0.5 select-none leading-none font-medium"
            style={{
              fontSize: '12px',
              color: '#5F6269',
              backgroundColor: '#E6E8EC',
              borderRadius: '2px',
            }}
          >
            {format(new Date(), 'EEEE, MMMM d')}
          </div>

          <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1">
            <div className="flex items-center gap-3 shrink-0">
              <h1
                className="font-medium tracking-tight text-[#121417] whitespace-nowrap"
                style={{ fontSize: '22px' }}
              >
                Activity
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                <ShieldCheck className="h-3 w-3" />
                Source of Truth
              </span>
            </div>

            <div className="shrink-0">
              <ActivityFilters />
            </div>
          </div>
        </div>

        {/* Changelist Feed / Evidence Log */}
        {Object.keys(groupedEvents).length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center space-y-3 bg-muted/10">
            <GitCommit className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h3 className="text-sm font-semibold">No activity recorded yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Status transitions and signing events are logged automatically as tamper-evident audit records.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([dateStr, events]) => (
              <div key={dateStr} className="space-y-2.5">
                {/* Date Group Header */}
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1">
                  <span>{dateStr}</span>
                  <div className="h-px flex-1 bg-zinc-200/70" />
                </div>

                {/* Changelist Table Card */}
                <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm divide-y divide-zinc-100 overflow-hidden">
                  {events.map((event) => {
                    const doc = docMap.get(event.document_id)
                    const badge = getEventBadge(event.event_type)
                    const Icon = badge.icon
                    const shortHash = `#${event.id.replace(/-/g, '').slice(0, 7)}`
                    const eventTime = format(new Date(event.created_at), 'h:mm:ss a')
                    const relativeTime = formatRelativeDate(event.created_at)

                    return (
                      <div
                        key={event.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-zinc-50/70 transition-colors gap-3"
                      >
                        {/* Left: Commit-like Hash + Badge + Document Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Short Event Commit Hash */}
                          <span
                            title={`Audit ID: ${event.id}`}
                            className="font-mono text-[11px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded select-all shrink-0 border border-zinc-200/60"
                          >
                            {shortHash}
                          </span>

                          {/* Event Type Badge */}
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0 ${badge.color}`}
                          >
                            <Icon className="h-3 w-3" />
                            {badge.label}
                          </span>

                          {/* Document Title */}
                          <div className="truncate min-w-0 flex items-center gap-1.5">
                            <Link
                              href={`/documents/${event.document_id}`}
                              className="font-medium text-[13px] text-[#121417] hover:underline truncate"
                            >
                              {doc?.title || 'Untitled Document'}
                            </Link>
                          </div>
                        </div>

                        {/* Right: Actor, IP & Timestamp Evidence */}
                        <div className="flex items-center gap-3.5 text-xs text-zinc-500 shrink-0 self-end sm:self-auto">
                          {/* Actor */}
                          <span className="text-zinc-600 font-medium truncate max-w-[160px]">
                            {event.actor_email || event.actor_type}
                          </span>

                          {/* IP Evidence Pill */}
                          {event.ip_address && (
                            <span className="font-mono text-[11px] text-zinc-400 hidden md:inline">
                              {event.ip_address}
                            </span>
                          )}

                          {/* Timestamp */}
                          <div className="flex items-center gap-1.5 text-zinc-400">
                            <Clock className="h-3 w-3" />
                            <span title={event.created_at}>{eventTime}</span>
                            <span className="text-zinc-300">·</span>
                            <span>{relativeTime}</span>
                          </div>

                          {/* Evidence Seal */}
                          <div
                            title="Tamper-evident audit log record"
                            className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span className="hidden lg:inline font-medium">Verified</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  )
}
