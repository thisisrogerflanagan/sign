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
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const canRemind = status === 'sent' || status === 'viewed'
  const canCopyLink = status === 'sent' || status === 'viewed'
  const canVoid = status === 'sent' || status === 'viewed'

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
              <button
                type="button"
                className="flex w-full items-center px-2.5 py-1.5 rounded-md hover:bg-muted text-left transition-colors"
                onClick={handleRemind}
                disabled={loading}
              >
                <Bell className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                Send reminder
              </button>
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
              This will deactivate the signing link. The recipient will not be able to sign this document anymore.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialogOpen(false)} disabled={loading}>
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
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
