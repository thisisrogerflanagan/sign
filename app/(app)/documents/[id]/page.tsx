import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DocumentDetailActions } from '@/components/documents/document-detail-actions'
import { DocumentLifecyclePanel } from '@/components/documents/document-lifecycle-panel'
import { DocumentCenterViewer } from '@/components/documents/document-center-viewer'
import { DocumentActivityFeed } from '@/components/documents/document-activity-feed'
import { getStatusBadgeInfo, formatDate } from '@/lib/document-helpers'
import { ArrowLeft } from 'lucide-react'

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

  // 1. Fetch document and associated signers
  const { data: doc, error: docError } = await admin
    .from('documents')
    .select(
      `
      *,
      signers (*)
    `
    )
    .eq('id', documentId)
    .eq('owner_id', user.id)
    .single()

  if (docError || !doc || doc.status === 'deleted') {
    notFound()
  }

  const signersList = Array.isArray(doc.signers)
    ? doc.signers
    : doc.signers
      ? [doc.signers]
      : []
  const primarySigner = signersList[0]

  // 2. Fetch append-only audit events (newest first per spec)
  const { data: auditEvents } = await admin
    .from('audit_events')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })

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

  return (
    <div className="min-h-screen bg-[#FCFDFE] pb-16">
      {/* Top Navbar */}
      <header className="border-b bg-background sticky top-0 z-30">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 sm:px-6">
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
            signerEmail={primarySigner?.email}
            downloadOriginalUrl={downloadOriginalUrl}
            downloadSignedUrl={downloadSignedUrl}
          />
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 pt-6 sm:px-6 space-y-6">
        {/* Document Header Card */}
        <div className="rounded-2xl border bg-card p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {doc.title}
              </h1>
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
              Created {formatDate(doc.created_at)} &bull; {doc.page_count || 1} page
              {doc.page_count === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* 3-Column Layout per Issue #25:
            - Left: lifecycle progress + signers
            - Center: document PDF
            - Right: activity record
            Stacks vertically below ~1024px (lg breakpoint) with no overlap */}
        <div
          className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_320px] xl:grid-cols-[340px_minmax(0,1fr)_340px] gap-6 items-start"
          data-testid="document-3-column-layout"
        >
          {/* Left Column: Lifecycle Progress + Signer Details */}
          <DocumentLifecyclePanel document={doc} signers={signersList} />

          {/* Center Column: The PDF */}
          <DocumentCenterViewer
            documentId={doc.id}
            title={doc.title}
            pageCount={doc.page_count}
            pdfUrl={downloadSignedUrl || downloadOriginalUrl}
            downloadUrl={downloadSignedUrl || downloadOriginalUrl}
          />

          {/* Right Column: Activity Record */}
          <DocumentActivityFeed events={auditEvents || []} />
        </div>
      </main>
    </div>
  )
}
