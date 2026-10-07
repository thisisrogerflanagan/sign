'use client'

import React, { useState } from 'react'
import {
  Check,
  Clock,
  Ban,
  User,
  Send,
  Bell,
  Loader2,
  CheckCircle2,
  Mail,
  Calendar,
  Layers,
  ListFilter,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { DocumentStatus } from '@/lib/supabase/types'
import { formatDate } from '@/lib/document-helpers'

export interface DocumentLifecyclePanelProps {
  document: {
    id: string
    status: DocumentStatus
    title: string
    created_at: string
    sent_at?: string | null
    viewed_at?: string | null
    completed_at?: string | null
    declined_at?: string | null
    voided_at?: string | null
    sender_message?: string | null
  }
  signers: Array<{
    id: string
    name?: string | null
    email: string
    created_at?: string
    token_expires_at?: string | null
  }>
}

export function DocumentLifecyclePanel({
  document: doc,
  signers,
}: DocumentLifecyclePanelProps) {
  const { toast } = useToast()
  const [filterTab, setFilterTab] = useState<'all' | 'lifecycle' | 'signers'>('all')
  const [sendingSignerId, setSendingSignerId] = useState<string | null>(null)
  const [reminderScheduled, setReminderScheduled] = useState<Record<string, boolean>>({})

  // Existing stage definitions from document-lifecycle section:
  // 1. Sent
  // 2. Opened
  // 3. Signed
  const isDraft = doc.status === 'draft'
  const isDeclined = doc.status === 'declined' || !!doc.declined_at
  const isVoided = doc.status === 'voided' || !!doc.voided_at
  const isCompleted = doc.status === 'completed' || !!doc.completed_at
  const isCompleting = doc.status === 'completing'
  const isViewed =
    doc.status === 'viewed' || !!doc.viewed_at || isCompleting || isCompleted

  const stage1Current = doc.status === 'sent'
  const stage1Completed = isViewed || isCompleting || isCompleted

  const stage2Current = doc.status === 'viewed'
  const stage2Completed = isCompleting || isCompleted

  const stage3Current = isCompleting || doc.status === 'completed'
  const stage3Completed = isCompleted

  async function handleSendReminder(signer: {
    id: string
    email: string
    name?: string | null
  }) {
    if (sendingSignerId) return
    setSendingSignerId(signer.id)

    try {
      // Default: in 3 days per Issue #25 spec
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + 3)
      const remindAt = targetDate.toISOString()

      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: doc.id,
          remindAt,
          note: `Follow-up reminder for ${signer.email}`,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule reminder')
      }

      setReminderScheduled((prev) => ({ ...prev, [signer.id]: true }))
      toast({
        title: 'Reminder scheduled',
        description: `Follow-up reminder set for ${signer.email} (in 3 days).`,
      })
    } catch (err: any) {
      toast({
        title: 'Could not schedule reminder',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSendingSignerId(null)
    }
  }

  function getSignerStatusBadge(signer: { email: string }) {
    if (isCompleted) {
      return {
        label: 'Signed',
        className: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
      }
    }
    if (isDeclined) {
      return {
        label: 'Declined',
        className: 'bg-rose-50 text-rose-800 border-rose-200/60',
      }
    }
    if (isViewed) {
      return {
        label: 'Viewed',
        className: 'bg-blue-50 text-blue-800 border-blue-200/60',
      }
    }
    return {
      label: 'Sent',
      className: 'bg-amber-50 text-amber-800 border-amber-200/60',
    }
  }

  const showLifecycle = filterTab === 'all' || filterTab === 'lifecycle'
  const showSigners = filterTab === 'all' || filterTab === 'signers'

  return (
    <div className="space-y-6 w-full" data-testid="left-lifecycle-column">
      {/* Craft Breadcrumb Metadata */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <div className="h-4 w-4 rounded-[4px] bg-sky-500/15 text-sky-700 flex items-center justify-center font-bold text-[10px]">
          S
        </div>
        <span className="font-medium text-foreground/80">Scribbble</span>
        <span>&bull;</span>
        <span className="truncate">
          {doc.sent_at
            ? `Sent ${formatDate(doc.sent_at)}`
            : `Created ${formatDate(doc.created_at)}`}
        </span>
      </div>

      {/* Craft Segmented Pill Switcher */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1 p-1 bg-zinc-200/60 rounded-full text-xs font-medium text-muted-foreground select-none">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
              filterTab === 'all'
                ? 'bg-white text-foreground shadow-xs font-semibold'
                : 'hover:text-foreground'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('lifecycle')}
            className={`px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
              filterTab === 'lifecycle'
                ? 'bg-white text-foreground shadow-xs font-semibold'
                : 'hover:text-foreground'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Lifecycle</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('signers')}
            className={`px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
              filterTab === 'signers'
                ? 'bg-white text-foreground shadow-xs font-semibold'
                : 'hover:text-foreground'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Signers</span>
          </button>
        </div>
      </div>

      {/* 1. Lifecycle Progress Section */}
      {showLifecycle && (
        <div className="space-y-3" data-testid="lifecycle-section">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Lifecycle Progress
            </h2>
            <span className="text-[11px] font-medium text-muted-foreground capitalize">
              {doc.status}
            </span>
          </div>

          {isDraft ? (
            <div className="rounded-xl bg-white border border-black/[0.04] p-4 text-xs text-muted-foreground flex items-center gap-2 shadow-xs">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <span>
                Draft mode. Place fields and send to start the signing lifecycle.
              </span>
            </div>
          ) : isDeclined ? (
            <div className="rounded-xl bg-rose-50/80 p-4 border border-rose-200/60 text-xs text-rose-900 flex items-start gap-2.5 shadow-xs">
              <Ban className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Signature Request Declined</p>
                <p className="text-[11px] text-rose-800/90 mt-0.5">
                  Signer declined this document on{' '}
                  {doc.declined_at ? formatDate(doc.declined_at) : 'recently'}.
                </p>
              </div>
            </div>
          ) : isVoided ? (
            <div className="rounded-xl bg-white border border-black/[0.04] p-4 text-xs text-zinc-700 flex items-start gap-2.5 shadow-xs">
              <Ban className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Signature Request Voided</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  Voided by sender on{' '}
                  {doc.voided_at ? formatDate(doc.voided_at) : 'recently'}.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-black/[0.04] bg-white p-4 sm:p-5 shadow-xs">
              <div
                className="grid grid-cols-3 gap-2 text-center"
                data-testid="lifecycle-stepper"
              >
                {/* Stage 1: Sent */}
                <div
                  className="space-y-1.5 flex flex-col items-center"
                  data-testid="stage-sent"
                  data-stage-current={stage1Current ? 'true' : 'false'}
                  data-stage-completed={stage1Completed ? 'true' : 'false'}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      stage1Completed
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : stage1Current
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary/20 shadow-xs'
                          : 'bg-zinc-100 text-zinc-400'
                    }`}
                  >
                    {stage1Completed ? <Check className="h-4 w-4" /> : '1'}
                  </div>
                  <p
                    className={`text-xs ${
                      stage1Current || stage1Completed
                        ? 'font-semibold text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Sent
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {doc.sent_at ? formatDate(doc.sent_at) : '—'}
                  </p>
                </div>

                {/* Stage 2: Opened */}
                <div
                  className="space-y-1.5 flex flex-col items-center"
                  data-testid="stage-opened"
                  data-stage-current={stage2Current ? 'true' : 'false'}
                  data-stage-completed={stage2Completed ? 'true' : 'false'}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      stage2Completed
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : stage2Current
                          ? 'bg-blue-600 text-white ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-zinc-100 text-zinc-400'
                    }`}
                  >
                    {stage2Completed ? <Check className="h-4 w-4" /> : '2'}
                  </div>
                  <p
                    className={`text-xs ${
                      stage2Current || stage2Completed
                        ? 'font-semibold text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Opened
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {doc.viewed_at ? formatDate(doc.viewed_at) : 'Awaiting open'}
                  </p>
                </div>

                {/* Stage 3: Signed */}
                <div
                  className="space-y-1.5 flex flex-col items-center"
                  data-testid="stage-signed"
                  data-stage-current={stage3Current ? 'true' : 'false'}
                  data-stage-completed={stage3Completed ? 'true' : 'false'}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      stage3Completed
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/20 shadow-xs'
                        : stage3Current
                          ? 'bg-purple-600 text-white ring-2 ring-purple-500/20 shadow-xs'
                          : 'bg-zinc-100 text-zinc-400'
                    }`}
                  >
                    {stage3Completed ? <Check className="h-4 w-4" /> : '3'}
                  </div>
                  <p
                    className={`text-xs ${
                      stage3Current || stage3Completed
                        ? 'font-semibold text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Signed
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {doc.completed_at
                      ? formatDate(doc.completed_at)
                      : 'Awaiting signature'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Signer Details Section */}
      {showSigners && (
        <div className="space-y-3" data-testid="signers-card">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              Signer Details
            </h2>
            <span className="rounded-full bg-zinc-200/60 px-2 py-0.5 text-[10px] font-medium text-zinc-700">
              {signers.length} {signers.length === 1 ? 'signer' : 'signers'}
            </span>
          </div>

          {signers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-4 text-center text-xs text-muted-foreground">
              No signers assigned to this document.
            </div>
          ) : (
            <div className="space-y-3">
              {signers.map((signer) => {
                const badge = getSignerStatusBadge(signer)
                const hasScheduled = reminderScheduled[signer.id]
                const isSending = sendingSignerId === signer.id
                const canRemind = doc.status === 'sent' || doc.status === 'viewed'

                return (
                  <div
                    key={signer.id}
                    className="rounded-2xl border border-black/[0.04] p-4 bg-white text-xs space-y-3 shadow-xs hover:border-black/10 transition-all"
                    data-testid={`signer-row-${signer.id}`}
                  >
                    {/* Name, email & status badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {signer.name || 'Signer'}
                        </p>
                        <p className="text-muted-foreground text-[11px] truncate flex items-center gap-1">
                          <Mail className="h-3 w-3 shrink-0" />
                          {signer.email}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border shrink-0 ${badge.className}`}
                        data-testid={`signer-status-${signer.id}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* Per-signer timestamps */}
                    <div className="rounded-xl bg-zinc-50/70 p-2.5 border border-zinc-200/50 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Sent:</span>
                        <span className="font-mono text-foreground font-medium">
                          {doc.sent_at || signer.created_at
                            ? formatDate(doc.sent_at || signer.created_at)
                            : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Opened:</span>
                        <span className="font-mono text-foreground font-medium">
                          {doc.viewed_at ? formatDate(doc.viewed_at) : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Signed:</span>
                        <span className="font-mono text-foreground font-medium">
                          {doc.completed_at ? formatDate(doc.completed_at) : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Send Reminder button per signer */}
                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canRemind || isSending || hasScheduled}
                        onClick={() => handleSendReminder(signer)}
                        data-testid={`send-reminder-button-${signer.id}`}
                        className="w-full h-8 text-xs font-medium justify-center transition-all rounded-lg"
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Scheduling...
                          </>
                        ) : hasScheduled ? (
                          <>
                            <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                            Reminder scheduled (in 3d)
                          </>
                        ) : isCompleted ? (
                          <>
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                            Signed
                          </>
                        ) : (
                          <>
                            <Bell className="mr-1.5 h-3.5 w-3.5 text-primary" />
                            Send reminder
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Sender Note */}
          {doc.sender_message && (
            <div className="pt-2 text-muted-foreground border-t border-zinc-200/60 text-[11px] leading-relaxed px-1">
              <span className="font-medium text-foreground">Sender note:</span> &quot;
              {doc.sender_message}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  )
}
