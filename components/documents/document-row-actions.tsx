'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal,
  ExternalLink,
  Copy,
  Bell,
  Ban,
  Trash2,
  CopyPlus,
  Check,
  Clock,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { DocumentStatus } from '@/lib/supabase/types'

interface DocumentRowActionsProps {
  documentId: string
  title: string
  status: DocumentStatus
  signerEmail?: string | null
}

export function DocumentRowActions({
  documentId,
  title,
  status,
  signerEmail,
}: DocumentRowActionsProps) {
  const [open, setOpen] = useState(false)
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [remindMeDialogOpen, setRemindMeDialogOpen] = useState(false)
  const [remindPreset, setRemindPreset] = useState<
    'tomorrow' | '3days' | '1week' | 'custom'
  >('tomorrow')
  const [customDate, setCustomDate] = useState('')
  const [reminderNote, setReminderNote] = useState('')
  const [savingReminder, setSavingReminder] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const canRemind = status === 'sent' || status === 'viewed'
  const canCopyLink = status === 'sent' || status === 'viewed'
  const canVoid = status === 'sent' || status === 'viewed'

  async function handleSetReminder(e: React.FormEvent) {
    e.preventDefault()
    let targetDate = new Date()
    if (remindPreset === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1)
      targetDate.setHours(9, 0, 0, 0)
    } else if (remindPreset === '3days') {
      targetDate.setDate(targetDate.getDate() + 3)
      targetDate.setHours(9, 0, 0, 0)
    } else if (remindPreset === '1week') {
      targetDate.setDate(targetDate.getDate() + 7)
      targetDate.setHours(9, 0, 0, 0)
    } else if (remindPreset === 'custom' && customDate) {
      targetDate = new Date(customDate)
    }

    setSavingReminder(true)
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          remindAt: targetDate.toISOString(),
          note: reminderNote || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to create reminder')

      toast({
        title: 'Reminder scheduled',
        description: 'You will be reminded to follow up on this document.',
      })
      setRemindMeDialogOpen(false)
      setReminderNote('')
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not schedule reminder',
        description: 'Please try again.',
      })
    } finally {
      setSavingReminder(false)
    }
  }

  async function handleRemind() {
    setLoading(true)
    try {
      const res = await fetch('/api/envelopes/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })
      if (!res.ok) throw new Error('Failed to send reminder')
      toast({
        title: 'Reminder sent',
        description: `We sent a polite reminder to ${signerEmail || 'the signer'}.`,
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Reminder failed',
        description: 'Could not send reminder. Please try again.',
      })
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  async function handleCopyLink() {
    try {
      const res = await fetch(`/api/envelopes/${documentId}/link`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.url) {
        await navigator.clipboard.writeText(data.url)
        setCopied(true)
        toast({
          title: 'Signing link copied',
          description: 'Link has been copied to your clipboard.',
        })
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not copy link',
        description: 'Failed to generate signing link.',
      })
    } finally {
      setOpen(false)
    }
  }

  async function handleVoid() {
    setLoading(true)
    try {
      const res = await fetch(`/api/envelopes/${documentId}/void`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to void')
      toast({
        title: 'Document voided',
        description: 'The signing link has been deactivated.',
      })
      setVoidDialogOpen(false)
      router.refresh()
    } catch {
      toast({
        variant: 'destructive',
        title: 'Failed to void',
        description: 'Could not void document. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/envelopes/${documentId}/delete`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast({
        title: 'Document moved to trash',
        description: 'Document has been marked as deleted.',
      })
      setDeleteDialogOpen(false)
      router.refresh()
    } catch {
      toast({
        variant: 'destructive',
        title: 'Failed to delete',
        description: 'Could not delete document.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(!open)}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>

        {open && (
          <div
            className="absolute right-0 top-9 z-30 w-44 rounded-lg border bg-popover p-1 shadow-md text-sm animate-in fade-in zoom-in-95"
            onMouseLeave={() => setOpen(false)}
          >
            <Link
              href={`/documents/${documentId}`}
              className="flex w-full items-center px-2.5 py-1.5 rounded-md hover:bg-muted text-left transition-colors"
              onClick={() => setOpen(false)}
            >
              <ExternalLink className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              Open details
            </Link>

            {canCopyLink && (
              <button
                type="button"
                className="flex w-full items-center px-2.5 py-1.5 rounded-md hover:bg-muted text-left transition-colors"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <Check className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                )}
                Copy signing link
              </button>
            )}

            {canRemind && (
              <>
                <button
                  type="button"
                  className="flex w-full items-center px-2.5 py-1.5 rounded-md hover:bg-muted text-left transition-colors"
                  onClick={handleRemind}
                  disabled={loading}
                >
                  <Bell className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  Send reminder
                </button>
                <button
                  type="button"
                  className="flex w-full items-center px-2.5 py-1.5 rounded-md hover:bg-muted text-left transition-colors"
                  onClick={() => {
                    setOpen(false)
                    setRemindMeDialogOpen(true)
                  }}
                >
                  <Clock className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  Remind me
                </button>
              </>
            )}

            <button
              type="button"
              className="flex w-full items-center px-2.5 py-1.5 rounded-md hover:bg-muted text-left transition-colors"
              onClick={() => {
                setOpen(false)
                router.push(`/documents/${documentId}?duplicate=true`)
              }}
            >
              <CopyPlus className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              Duplicate draft
            </button>

            {canVoid && (
              <button
                type="button"
                className="flex w-full items-center px-2.5 py-1.5 rounded-md hover:bg-muted text-left text-amber-700 transition-colors"
                onClick={() => {
                  setOpen(false)
                  setVoidDialogOpen(true)
                }}
              >
                <Ban className="mr-2 h-3.5 w-3.5" />
                Void request
              </button>
            )}

            <button
              type="button"
              className="flex w-full items-center px-2.5 py-1.5 rounded-md hover:bg-destructive/10 text-left text-destructive transition-colors"
              onClick={() => {
                setOpen(false)
                setDeleteDialogOpen(true)
              }}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete document
            </button>
          </div>
        )}
      </div>

      {/* Void Dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void &quot;{title}&quot;?</DialogTitle>
            <DialogDescription>
              This will deactivate the signing link. The recipient will not be able to
              sign this document anymore.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVoidDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleVoid} disabled={loading}>
              {loading ? 'Voiding...' : 'Yes, void request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &quot;{title}&quot;?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this document from your feed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remind Me Dialog */}
      <Dialog open={remindMeDialogOpen} onOpenChange={setRemindMeDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSetReminder} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Remind me about &quot;{title}&quot;</DialogTitle>
              <DialogDescription>
                Schedule a follow-up reminder so you don&apos;t forget to check back on
                this document.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  When
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setRemindPreset('tomorrow')}
                    className={`py-2 px-3 rounded-lg border text-center transition-colors font-medium ${
                      remindPreset === 'tomorrow'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemindPreset('3days')}
                    className={`py-2 px-3 rounded-lg border text-center transition-colors font-medium ${
                      remindPreset === '3days'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    In 3 days
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemindPreset('1week')}
                    className={`py-2 px-3 rounded-lg border text-center transition-colors font-medium ${
                      remindPreset === '1week'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    In 1 week
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemindPreset('custom')}
                    className={`py-2 px-3 rounded-lg border text-center transition-colors font-medium ${
                      remindPreset === 'custom'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    Pick a date
                  </button>
                </div>
                {remindPreset === 'custom' && (
                  <input
                    type="datetime-local"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full text-xs border rounded-lg px-3 py-2 mt-2 bg-background"
                    required
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Note (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. nudge about the deposit"
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRemindMeDialogOpen(false)}
                disabled={savingReminder}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingReminder}>
                {savingReminder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Set reminder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
