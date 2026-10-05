import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DocumentDetailActions } from '@/components/documents/document-detail-actions'
import {
  getStatusBadgeInfo,
  formatDate,
  formatRelativeDate,
} from '@/lib/document-helpers'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Shield,
  User,
  Mail,
  Send,
  Ban,
  Activity,
} from 'lucide-react'

interface DocumentDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function DocumentDetailPage(props: DocumentDetailPageProps) {
  const { id: documentId } = await props.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient()

  // 1. Fetch document
  const { data: doc, error: docError } = await admin
    .from('documents')
    .select(`
      *,
      signers (*)
    `)
    .eq('id', documentId)
    .eq('owner_id', user.id)
    .single()

  if (docError || !doc || doc.status === 'deleted') {
    notFound()
  }

  const signer = Array.isArray(doc.signers) ? doc.signers[0] : doc.signers

  // 2. Fetch append-only audit events
  const { data: auditEvents } = await admin
    .from('audit_events')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true })

  // 3. Mint download signed URLs
  let downloadOriginalUrl: string | null = null
  let downloadSignedUrl: string | null = null

  if (doc.storage_path_original) {
    const { data: origSigned } = await admin.storage
      .from('originals')
      .createSignedUrl(doc.storage_path_original, 300)
    downloadOriginalUrl = origSigned?.signedUrl || null
  }

  if (doc.storage_path_signed) {
    const { data: signedSigned } = await admin.storage
      .from('signed')
      .createSignedUrl(doc.storage_path_signed, 300)
    downloadSignedUrl = signedSigned?.signedUrl || null
  }

  const badge = getStatusBadgeInfo(doc.status)

  // Tracker steps
  const isSent = !!doc.sent_at
  const isViewed = !!doc.viewed_at
  const isCompleted = !!doc.completed_at
  const isDeclined = !!doc.declined_at
  const isVoided = !!doc.voided_at

  return (
    <div className="min-h-screen bg-[#FCFDFE] pb-16">
      {/* Top Navbar */}
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Documents
          </Link>

          <DocumentDetailActions
            documentId={doc.id}
            title={doc.title}
            status={doc.status}
            signerEmail={signer?.email}
            downloadOriginalUrl={downloadOriginalUrl}
            downloadSignedUrl={downloadSignedUrl}
          />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 space-y-8">
        {/* Document Header Card */}
        <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight">{doc.title}</h1>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${badge.color}`}
                >
                  {badge.label}
                </span>
                {doc.is_test && (
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 border">
                    Test Request
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Created {formatDate(doc.created_at)} &bull; {doc.page_count || 1} page{doc.page_count === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {/* Progress Tracker */}
          {doc.status === 'draft' ? (
            <div className="rounded-xl bg-muted/40 p-4 border text-xs text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Draft mode. Place fields and send to start the signing lifecycle.</span>
            </div>
          ) : isDeclined ? (
            <div className="rounded-xl bg-rose-50/70 p-4 border border-rose-200/60 text-xs text-rose-900 flex items-center gap-2">
              <Ban className="h-4 w-4 text-rose-600" />
              <span>Signer declined this signature request on {formatDate(doc.declined_at)}.</span>
            </div>
          ) : isVoided ? (
            <div className="rounded-xl bg-zinc-100 p-4 border text-xs text-zinc-700 flex items-center gap-2">
              <Ban className="h-4 w-4 text-zinc-500" />
              <span>Request voided by sender on {formatDate(doc.voided_at)}.</span>
            </div>
          ) : (
            <div className="rounded-xl border bg-[#FCFDFE] p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Lifecycle Progress
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1.5">
                  <div
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      isSent
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    1
                  </div>
                  <p className="text-xs font-medium text-foreground">Sent</p>
                  <p className="text-[11px] text-muted-foreground">
                    {doc.sent_at ? formatDate(doc.sent_at) : '—'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      isViewed
                        ? 'bg-blue-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    2
                  </div>
                  <p className="text-xs font-medium text-foreground">Opened</p>
                  <p className="text-[11px] text-muted-foreground">
                    {doc.viewed_at ? formatDate(doc.viewed_at) : 'Awaiting open'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    3
                  </div>
                  <p className="text-xs font-medium text-foreground">Signed</p>
                  <p className="text-[11px] text-muted-foreground">
                    {doc.completed_at ? formatDate(doc.completed_at) : 'Awaiting signature'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Signer Detail */}
          {signer && (
            <div className="rounded-xl border p-4 bg-background text-xs space-y-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                Signer Details
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground pt-1">
                <div>
                  <span className="font-medium text-foreground">Email:</span> {signer.email}
                </div>
                {signer.name && (
                  <div>
                    <span className="font-medium text-foreground">Name:</span> {signer.name}
                  </div>
                )}
              </div>
              {doc.sender_message && (
                <div className="pt-2 text-muted-foreground border-t text-[11px]">
                  <span className="font-medium text-foreground">Sender note:</span> &quot;{doc.sender_message}&quot;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Append-only Activity Record */}
        <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Activity Record
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tamper-evident, chronological log of all interactions with server timestamps and IP addresses.
              </p>
            </div>
          </div>

          {!auditEvents || auditEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground bg-muted/10">
              No audit events recorded yet.
            </div>
          ) : (
            <div className="relative border-l border-zinc-200 ml-3 space-y-6">
              {auditEvents.map((event: any) => {
                const eventDate = new Date(event.created_at)
                return (
                  <div key={event.id} className="relative pl-6 space-y-1">
                    {/* Bullet */}
                    <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold capitalize text-foreground">
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-muted-foreground">&bull;</span>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        {formatDate(event.created_at)} UTC
                      </span>
                    </div>

                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <div>
                        Actor: <span className="font-medium text-foreground">{event.actor_email || event.actor_type}</span>
                        {event.ip_address && <span> &bull; IP: {event.ip_address}</span>}
                      </div>
                      {event.user_agent && (
                        <div className="truncate max-w-xl text-[10px] text-muted-foreground/70">
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
      </main>
    </div>
  )
}
