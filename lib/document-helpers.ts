import { formatDistanceToNow, format } from 'date-fns'
import { DocumentStatus } from '@/lib/supabase/types'

export function formatRelativeDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    const date = new Date(dateString)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return dateString
  }
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    const date = new Date(dateString)
    return format(date, 'MMM d, yyyy h:mm a')
  } catch {
    return dateString
  }
}

export function getDocumentSubtitle(doc: {
  status: DocumentStatus
  page_count?: number | null
  signers?: any
}): string {
  if (doc.status === 'draft') {
    if (!doc.page_count || doc.page_count === 0) {
      return 'Empty Document'
    }
    return `Draft • ${doc.page_count} page${doc.page_count === 1 ? '' : 's'}`
  }
  if (doc.status === 'sent') {
    return 'Waiting to sign'
  }
  if (doc.status === 'viewed') {
    return 'Opened'
  }
  if (doc.status === 'completed') {
    return 'Completed'
  }
  if (doc.status === 'declined') {
    return 'Declined'
  }
  return 'Document'
}

export function getStatusBadgeInfo(status: DocumentStatus) {
  switch (status) {
    case 'draft':
      return {
        label: 'Draft',
        color: 'bg-zinc-100 text-zinc-700 border-zinc-200',
      }
    case 'sent':
      return {
        label: 'Waiting to sign',
        color: 'bg-amber-50 text-amber-800 border-amber-200/60',
      }
    case 'viewed':
      return {
        label: 'Opened',
        color: 'bg-blue-50 text-blue-800 border-blue-200/60',
      }
    case 'completed':
      return {
        label: 'Signed',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
      }
    case 'declined':
      return {
        label: 'Declined',
        color: 'bg-rose-50 text-rose-800 border-rose-200/60',
      }
    case 'voided':
      return {
        label: 'Voided',
        color: 'bg-zinc-100 text-zinc-500 border-zinc-200',
      }
    case 'deleted':
      return {
        label: 'Deleted',
        color: 'bg-zinc-100 text-zinc-400 border-zinc-200',
      }
    default:
      return {
        label: status,
        color: 'bg-zinc-100 text-zinc-700 border-zinc-200',
      }
  }
}

export function getNextActionGuidance(doc: {
  status: DocumentStatus
  sent_at: string | null
  viewed_at: string | null
}): { text: string; actionType?: string } | null {
  if (doc.status === 'draft') {
    return { text: 'Ready to place fields & send', actionType: 'continue_draft' }
  }

  if (doc.status === 'sent' && doc.sent_at) {
    const sentDate = new Date(doc.sent_at)
    const daysSince = (Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince >= 2) {
      return {
        text: `Sent ${Math.floor(daysSince)}d ago. Send a gentle reminder?`,
        actionType: 'remind',
      }
    }
    return { text: 'Delivered to signer. Awaiting view.' }
  }

  if (doc.status === 'viewed') {
    return { text: 'Signer viewed the document. Waiting for completion.' }
  }

  if (doc.status === 'completed') {
    return { text: 'Complete. Download signed copy anytime.', actionType: 'download' }
  }

  if (doc.status === 'declined') {
    return { text: 'Signer chose not to sign this request.' }
  }

  if (doc.status === 'voided') {
    return { text: 'Canceled by sender. Link is disabled.' }
  }

  return null
}
