import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DocumentDetailActions } from '@/components/documents/document-detail-actions'
import { DocumentLifecyclePanel } from '@/components/documents/document-lifecycle-panel'
import { DocumentCenterViewer } from '@/components/documents/document-center-viewer'
import { DocumentActivityFeed } from '@/components/documents/document-activity-feed'
import { getStatusBadgeInfo, formatDate } from '@/lib/document-helpers'
import {
  ArrowLeft,
  ChevronLeft,
  Share2,
  Folder,
  FileText,
  Sparkles,
  Download,
  User,
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
    <div className="min-h-screen bg-[#FCFDFE] pb-24 text-foreground selection:bg-sky-100 selection:text-sky-900">
      {/* Craft Minimalist Top Navbar */}
      <header className="border-b border-black/[0.04] bg-[#FCFDFE]/80 backdrop-blur-md sticky top-0 z-30 transition-all">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 sm:px-6">
          {/* Left: Back / Brand Toggle */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-full hover:bg-black/[0.04]"
              title="Back to All Documents"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
          </div>

          {/* Center: Subtle Document Title */}
          <div className="hidden md:flex items-center gap-2 max-w-md truncate">
            <span className="text-xs font-semibold text-foreground/80 truncate">
              {doc.title || 'Untitled Document'}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.2 text-[10px] font-medium border ${badge.color}`}
            >
              {badge.label}
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <DocumentDetailActions
              documentId={doc.id}
              title={doc.title}
              status={doc.status}
              signerEmail={primarySigner?.email}
              downloadOriginalUrl={downloadOriginalUrl}
              downloadSignedUrl={downloadSignedUrl}
            />

            {/* User Indicator */}
            <div className="h-7 w-7 rounded-full bg-zinc-200/80 border border-black/[0.06] flex items-center justify-center text-xs font-semibold text-foreground/70 shrink-0">
              {user.email ? user.email.slice(0, 1).toUpperCase() : 'U'}
            </div>
          </div>
        </div>
      </header>

      {/* Main 3-Column Layout:
          - Left: lifecycle progress + signers (unboxed sidebar on backdrop)
          - Center: document PDF sheet (floating elevated paper canvas)
          - Right: activity record (unboxed sidebar on backdrop)
          Stacks vertically below ~1024px (lg breakpoint) with no overlap */}
      <main className="mx-auto max-w-[1600px] px-4 pt-6 sm:px-6">
        <div
          className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_320px] xl:grid-cols-[340px_minmax(0,1fr)_340px] gap-6 items-start"
          data-testid="document-3-column-layout"
        >
          {/* Left Column: Lifecycle Progress + Signer Details */}
          <DocumentLifecyclePanel document={doc} signers={signersList} />

          {/* Center Column: Floating Craft Paper PDF Viewer */}
          <DocumentCenterViewer
            documentId={doc.id}
            title={doc.title}
            status={doc.status}
            createdAt={doc.created_at}
            isTest={doc.is_test}
            pageCount={doc.page_count}
            pdfUrl={downloadSignedUrl || downloadOriginalUrl}
            downloadUrl={downloadSignedUrl || downloadOriginalUrl}
          />

          {/* Right Column: Activity Record */}
          <DocumentActivityFeed events={auditEvents || []} />
        </div>
      </main>

      {/* Craft Floating Bottom Pills */}
      {/* Bottom-Left Quick Dock */}
      <div className="fixed bottom-5 left-6 z-30 hidden sm:flex items-center gap-1.5 p-1 bg-white/95 backdrop-blur-md rounded-full border border-black/[0.06] shadow-md text-xs">
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-zinc-100 text-muted-foreground hover:text-foreground transition-all"
          title="All Documents"
        >
          <Folder className="h-3.5 w-3.5" />
          <span className="font-medium text-[11px]">All Documents</span>
        </Link>
        {downloadOriginalUrl && (
          <a
            href={downloadOriginalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-zinc-100 text-muted-foreground hover:text-foreground transition-all"
            title="Download Original PDF"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="font-medium text-[11px]">Original PDF</span>
          </a>
        )}
      </div>

      {/* Bottom-Right Status Action Pill */}
      <div className="fixed bottom-5 right-6 z-30 hidden sm:flex items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/95 backdrop-blur-md rounded-full border border-black/[0.06] shadow-md text-xs font-medium text-foreground/80 select-none">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                doc.status === 'completed'
                  ? 'bg-emerald-400'
                  : doc.status === 'viewed'
                    ? 'bg-blue-400'
                    : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                doc.status === 'completed'
                  ? 'bg-emerald-500'
                  : doc.status === 'viewed'
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="capitalize">{badge.label}</span>
        </div>
      </div>
    </div>
  )
}
