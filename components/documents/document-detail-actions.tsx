'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Copy,
  Check,
  Bell,
  Ban,
  Trash2,
  CopyPlus,
  Download,
  Edit,
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

interface DocumentDetailActionsProps {
  documentId: string
  title: string
  status: DocumentStatus
  signerEmail?: string | null
  downloadOriginalUrl?: string | null
  downloadSignedUrl?: string | null
}

export function DocumentDetailActions({
  documentId,
  title,
  status,
  signerEmail,
  downloadOriginalUrl,
  downloadSignedUrl,
}: DocumentDetailActionsProps) {
  const [copied, setCopied] = useState(false)
  const [remindOpen, setRemindOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  const canCopyLink = status === 'sent' || status === 'viewed'
  const canRemind = status === 'sent' || status === 'viewed'
  const canVoid = status === 'sent' || status === 'viewed'

  async function handleCopyLink() {
    try {
      const res = await fetch(`/api/envelopes/${documentId}/link`, { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        await navigator.clipboard.writeText(data.url)
        setCopied(true)
        toast({
          title: 'Fresh link generated & copied',
          description: 'Any older signing links for this document are now inactive.',
        })
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error copying link' })
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
      if (!res.ok) throw new Error('Reminder failed')
      toast({
        title: 'Reminder sent',
        description: `We emailed a fresh signing link to ${signerEmail || 'the signer'}.`,
      })
      setRemindOpen(false)
      router.refresh()
    } catch {
      toast({ variant: 'destructive', title: 'Could not send reminder' })
    } finally {
      setLoading(false)
    }
  }

  async function handleVoid() {
    setLoading(true)
    try {
      const res = await fetch(`/api/envelopes/${documentId}/void`, { method: 'POST' })
      if (!res.ok) throw new Error('Void failed')
      toast({ title: 'Request voided', description: 'The document can no longer be signed.' })
      setVoidOpen(false)
      router.refresh()
    } catch {
      toast({ variant: 'destructive', title: 'Failed to void' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/envelopes/${documentId}/delete`, { method: 'POST' })
      if (!res.ok) throw new Error('Delete failed')
      toast({ title: 'Document deleted' })
      setDeleteOpen(false)
      router.push('/')
    } catch {
      toast({ variant: 'destructive', title: 'Failed to delete' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDuplicate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/envelopes/${documentId}/duplicate`, { method: 'POST' })
      const data = await res.json()
      if (data.newDocumentId) {
        toast({ title: 'Draft duplicated', description: 'Opening fresh draft...' })
        router.push(`/send/${data.newDocumentId}/place`)
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to duplicate' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'draft' && (
        <Button asChild size="sm">
          <Link href={`/send/${documentId}/place`}>
            <Edit className="mr-1.5 h-3.5 w-3.5" />
            Continue editing
          </Link>
        </Button>
      )}

      {status === 'completed' && downloadSignedUrl && (
        <Button asChild size="sm">
          <a href={downloadSignedUrl} target="_blank" rel="noreferrer" download>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download signed PDF
          </a>
        </Button>
      )}

      {downloadOriginalUrl && status !== 'completed' && (
        <Button asChild variant="outline" size="sm">
          <a href={downloadOriginalUrl} target="_blank" rel="noreferrer" download>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download original PDF
          </a>
        </Button>
      )}

      {canCopyLink && (
        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          {copied ? (
            <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="mr-1.5 h-3.5 w-3.5" />
          )}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      )}

      {canRemind && (
        <Button variant="outline" size="sm" onClick={() => setRemindOpen(true)}>
          <Bell className="mr-1.5 h-3.5 w-3.5" />
          Remind
        </Button>
      )}

      <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={loading}>
        <CopyPlus className="mr-1.5 h-3.5 w-3.5" />
        Duplicate
      </Button>

      {canVoid && (
        <Button
          variant="outline"
          size="sm"
          className="text-amber-700 hover:text-amber-800"
          onClick={() => setVoidOpen(true)}
        >
          <Ban className="mr-1.5 h-3.5 w-3.5" />
          Void
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:bg-destructive/10"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        Delete
      </Button>

      {/* Remind confirmation dialog */}
      <Dialog open={remindOpen} onOpenChange={setRemindOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a reminder to {signerEmail || 'the signer'}?</DialogTitle>
            <DialogDescription>
              We will send a fresh email with a renewed signing link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemindOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleRemind} disabled={loading}>
              {loading ? 'Sending...' : 'Send reminder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void confirmation dialog */}
      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void &quot;{title}&quot;?</DialogTitle>
            <DialogDescription>
              This will immediately deactivate all signing links. Signers will see a &quot;Request canceled&quot; message.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleVoid} disabled={loading}>
              {loading ? 'Voiding...' : 'Yes, void request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &quot;{title}&quot;?</DialogTitle>
            <DialogDescription>
              This removes the document from your feed and permanently removes PDF storage copies. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
