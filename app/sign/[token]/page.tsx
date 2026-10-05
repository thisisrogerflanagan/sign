import React from 'react'
import { resolveSignerToken } from '@/lib/signer-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeAuditEvent } from '@/lib/audit'
import { captureServerEvent } from '@/lib/analytics'
import { SignerDocumentViewer } from '@/components/signer/signer-document-viewer'
import { formatDate } from '@/lib/document-helpers'
import { AlertCircle, Ban, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'
import { headers } from 'next/headers'

interface SignerPageProps {
  params: Promise<{ token: string }>
}

export default async function SignerPage(props: SignerPageProps) {
  const { token } = await props.params
  const context = await resolveSignerToken(token)

  // 1. Edge state views
  if (context.errorType === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FCFDFE]">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Signing link not found</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This signing link does not exist or may have been deleted. Please check the URL or contact the person who sent it.
          </p>
        </div>
      </div>
    )
  }

  if (context.errorType === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FCFDFE]">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Clock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">This signing link has expired</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            For security, signature requests expire after 90 days. Please reach out to the sender to request a fresh signing link.
          </p>
        </div>
      </div>
    )
  }

  if (context.errorType === 'voided' || context.errorType === 'deleted') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FCFDFE]">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
            <Ban className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">This request was canceled</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The sender has canceled or voided this signature request. No further action can be taken on this document.
          </p>
        </div>
      </div>
    )
  }

  if (context.errorType === 'already_completed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FCFDFE]">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Already signed</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This document was successfully signed and completed on{' '}
            {formatDate(context.document?.completed_at)}. Both you and the sender received a final signed copy by email.
          </p>
        </div>
      </div>
    )
  }

  const { document: doc, signer, ownerProfile, fields, signedUrl } = context

  // 2. First-time open: record document_viewed audit event & update status sent -> viewed
  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0] || null
  const userAgent = headerStore.get('user-agent') || null

  if (doc.status === 'sent') {
    const admin = createAdminClient()
    const nowIso = new Date().toISOString()

    await admin
      .from('documents')
      .update({
        status: 'viewed',
        viewed_at: nowIso,
      })
      .eq('id', doc.id)

    await writeAuditEvent({
      documentId: doc.id,
      actorType: 'signer',
      actorEmail: signer.email,
      eventType: 'document_viewed',
      ipAddress: ip,
      userAgent,
    })

    await captureServerEvent(doc.owner_id, {
      name: 'document_viewed_by_signer',
      properties: { document_id: doc.id },
    })
  }

  const senderDisplayName =
    ownerProfile?.display_name || ownerProfile?.email?.split('@')[0] || 'The sender'

  return (
    <SignerDocumentViewer
      token={token}
      documentId={doc.id}
      documentTitle={doc.title}
      pageCount={doc.page_count || 1}
      senderDisplayName={senderDisplayName}
      signerName={signer.name || ''}
      signerEmail={signer.email}
      fields={fields}
      pdfUrl={signedUrl || ''}
    />
  )
}
