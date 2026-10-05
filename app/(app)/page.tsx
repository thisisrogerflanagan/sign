import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DocumentRowActions } from '@/components/documents/document-row-actions'
import { HomeFeedFilters } from '@/components/documents/home-feed-filters'
import { AppShell } from '@/components/app-shell'
import { AppSidebar } from '@/components/app-sidebar'
import { SquircleButton } from '@/components/ui/squircle-button'
import { format } from 'date-fns'
import {
  getStatusBadgeInfo,
  formatRelativeDate,
  getNextActionGuidance,
} from '@/lib/document-helpers'
import {
  FileText,
  Plus,
  Sparkles,
  Inbox,
  AlertCircle,
} from 'lucide-react'
import { DocumentStatus } from '@/lib/supabase/types'

interface HomePageProps {
  searchParams: Promise<{
    status?: string
    q?: string
    page?: string
  }>
}

export default async function HomePage(props: HomePageProps) {
  const searchParams = await props.searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 1. Fetch current month fair-use usage
  const currentMonthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
    .toISOString()
    .split('T')[0]

  const { data: usageRow } = await supabase
    .from('usage_counters')
    .select('requests_sent')
    .eq('user_id', user.id)
    .eq('period_start', currentMonthStart)
    .single()

  const requestsSent = usageRow?.requests_sent || 0

  // 2. Query documents based on search & status filter
  const filterStatus = searchParams.status
  const searchQuery = searchParams.q
  const page = parseInt(searchParams.page || '1', 10)
  const pageSize = 25
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let docQuery = supabase
    .from('documents')
    .select(`
      id,
      title,
      status,
      created_at,
      sent_at,
      viewed_at,
      completed_at,
      is_test,
      signers (
        name,
        email
      )
    `, { count: 'exact' })
    .eq('owner_id', user.id)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filterStatus && filterStatus !== 'all') {
    docQuery = docQuery.eq('status', filterStatus as DocumentStatus)
  }

  if (searchQuery) {
    docQuery = docQuery.ilike('title', `%${searchQuery}%`)
  }

  const { data: documents, count: totalCount, error } = await docQuery

  return (
    <AppShell
      documents={documents || []}
      sidebar={
        <AppSidebar
          userName={user.user_metadata?.display_name || user.email?.split('@')[0] || 'Joe Banks'}
          userEmail={user.email}
          requestsSent={requestsSent}
        />
      }
    >
      <main className="w-full space-y-6">
            {/* Main Content View Heading */}
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
                <div className="flex items-center gap-3.5 shrink-0">
                  <SquircleButton href="/send" title="New document">
                    <img src="/icons/add_doc.svg" alt="New document" className="h-[18px] w-[18px]" />
                  </SquircleButton>
                  <h1
                    className="font-medium tracking-tight text-[#121417] whitespace-nowrap"
                    style={{ fontSize: '22px' }}
                  >
                    All Docs
                  </h1>
                </div>

                <div className="shrink-0">
                  <HomeFeedFilters />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-2">
                <AlertCircle className="mx-auto h-6 w-6 text-destructive" />
                <p className="text-sm font-medium">Could not load documents</p>
                <p className="text-xs text-muted-foreground">Please refresh the page to try again.</p>
              </div>
            )}

            {!error && documents && documents.length === 0 ? (
              searchQuery || (filterStatus && filterStatus !== 'all') ? (
                /* Empty filtered state */
                <div className="rounded-2xl border border-dashed p-12 text-center space-y-3 bg-muted/10">
                  <Inbox className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <h3 className="text-sm font-semibold">No documents found</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    No documents matched your current filter or search criteria.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/">Clear filters</Link>
                  </Button>
                </div>
              ) : (
                /* Empty new-user state */
                <div className="rounded-2xl border border-dashed p-12 text-center space-y-4 bg-muted/10">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">No signature requests yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Send your first PDF to someone or run a free test request to yourself to see how effortless it is.
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center gap-3">
                    <Button asChild>
                      <Link href="/send">
                        <Plus className="mr-1.5 h-4 w-4" />
                        Send your first request
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            ) : (
              /* Feed rows */
              <div className="divide-y rounded-xl border bg-card shadow-sm">
                {documents?.map((doc: any) => {
                  const signer = Array.isArray(doc.signers) ? doc.signers[0] : doc.signers
                  const badge = getStatusBadgeInfo(doc.status)
                  const nextAction = getNextActionGuidance(doc)

                  return (
                    <div
                      key={doc.id}
                      className="group flex items-center justify-between p-4 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1 pr-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="font-medium text-sm text-foreground hover:underline truncate"
                          >
                            {doc.title || 'Untitled Document'}
                          </Link>
                          {doc.is_test && (
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 border">
                              Test
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {signer?.name
                              ? `${signer.name} (${signer.email})`
                              : signer?.email || 'No signer assigned'}
                          </span>
                          <span>&bull;</span>
                          <span>{formatRelativeDate(doc.created_at)}</span>
                        </div>

                        {nextAction && (
                          <p className="text-xs text-muted-foreground/80 font-normal pt-0.5">
                            {nextAction.text}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${badge.color}`}
                        >
                          {badge.label}
                        </span>

                        <DocumentRowActions
                          documentId={doc.id}
                          title={doc.title}
                          status={doc.status}
                          signerEmail={signer?.email}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {typeof totalCount === 'number' && totalCount > pageSize ? (
              <div className="flex items-center justify-between pt-4 text-xs text-muted-foreground">
                <span>
                  Showing {from + 1}–{Math.min(totalCount, to + 1)} of {totalCount}
                </span>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/?page=${page - 1}${filterStatus ? `&status=${filterStatus}` : ''}`}>
                        Previous
                      </Link>
                    </Button>
                  )}
                  {to + 1 < totalCount && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/?page=${page + 1}${filterStatus ? `&status=${filterStatus}` : ''}`}>
                        Next
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </main>
    </AppShell>
  )
}
