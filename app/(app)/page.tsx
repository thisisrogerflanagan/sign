import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DocumentRowActions } from '@/components/documents/document-row-actions'
import { DocumentThumbnail } from '@/components/documents/document-thumbnail'
import { HomeFeedFilters } from '@/components/documents/home-feed-filters'
import { AppShell } from '@/components/app-shell'
import { AppSidebar } from '@/components/app-sidebar'
import { SquircleButton } from '@/components/ui/squircle-button'
import { format } from 'date-fns'
import {
  getStatusBadgeInfo,
  formatRelativeDate,
  getDocumentSubtitle,
} from '@/lib/document-helpers'
import { FileText, Plus, Inbox, AlertCircle, ArrowDown, ArrowUp } from 'lucide-react'
import { DocumentStatus } from '@/lib/supabase/types'

interface HomePageProps {
  searchParams: Promise<{
    status?: string
    q?: string
    page?: string
    sort?: string
    order?: string
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
  const currentMonthStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
  )
    .toISOString()
    .split('T')[0]

  const { data: usageRow } = await supabase
    .from('usage_counters')
    .select('requests_sent')
    .eq('user_id', user.id)
    .eq('period_start', currentMonthStart)
    .single()

  const requestsSent = usageRow?.requests_sent || 0

  // 2. Query documents based on search, filter, and sorting
  const filterStatus = searchParams.status
  const searchQuery = searchParams.q
  const page = parseInt(searchParams.page || '1', 10)
  const pageSize = 25
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const currentSort = searchParams.sort || 'updated'
  const currentOrder = searchParams.order === 'asc' ? 'asc' : 'desc'
  const ascending = currentOrder === 'asc'

  let orderColumn = 'updated_at'
  if (currentSort === 'created') orderColumn = 'created_at'
  else if (currentSort === 'viewed') orderColumn = 'viewed_at'
  else if (currentSort === 'name') orderColumn = 'title'

  let docQuery = supabase
    .from('documents')
    .select(
      `
      id,
      title,
      status,
      page_count,
      created_at,
      updated_at,
      sent_at,
      viewed_at,
      completed_at,
      is_test,
      signers (
        name,
        email
      )
    `,
      { count: 'exact' }
    )
    .eq('owner_id', user.id)
    .neq('status', 'deleted')
    .order(orderColumn, { ascending, nullsFirst: false })
    .range(from, to)

  if (filterStatus && filterStatus !== 'all') {
    docQuery = docQuery.eq('status', filterStatus as DocumentStatus)
  }

  if (searchQuery) {
    docQuery = docQuery.ilike('title', `%${searchQuery}%`)
  }

  const { data: documents, count: totalCount, error } = await docQuery

  function getSortUrl(column: string) {
    const isCurrent = currentSort === column
    const nextOrder = isCurrent && currentOrder === 'desc' ? 'asc' : 'desc'
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (searchQuery) params.set('q', searchQuery)
    params.set('sort', column)
    params.set('order', nextOrder)
    return `/?${params.toString()}`
  }

  return (
    <AppShell
      documents={documents || []}
      sidebar={
        <AppSidebar
          userName={
            user.user_metadata?.display_name || user.email?.split('@')[0] || 'Joe Banks'
          }
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
                <img
                  src="/icons/add_doc.svg"
                  alt="New document"
                  className="h-[18px] w-[18px]"
                />
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
            <p className="text-xs text-muted-foreground">
              Please refresh the page to try again.
            </p>
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
                  Send your first PDF to someone or run a free test request to yourself to
                  see how effortless it is.
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
          /* Table Layout matching Screenshot media_1791222121961.png */
          <div className="rounded-xl border border-zinc-200/80 bg-white overflow-hidden shadow-xs">
            {/* Table Header */}
            <div className="flex items-center px-4 py-3 border-b border-zinc-100 text-xs font-normal text-[#8A8F98] bg-white select-none">
              <div className="flex-1 min-w-0 pr-4">
                <Link
                  href={getSortUrl('name')}
                  className="inline-flex items-center gap-1 hover:text-[#121417] transition-colors"
                >
                  <span>Name</span>
                  {currentSort === 'name' &&
                    (currentOrder === 'asc' ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </Link>
              </div>

              <div className="w-28 sm:w-36 shrink-0">
                <Link
                  href={getSortUrl('viewed')}
                  className="inline-flex items-center gap-1 hover:text-[#121417] transition-colors"
                >
                  <span>Last Viewed</span>
                  {currentSort === 'viewed' &&
                    (currentOrder === 'asc' ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </Link>
              </div>

              <div className="w-28 sm:w-36 shrink-0">
                <Link
                  href={getSortUrl('updated')}
                  className={`inline-flex items-center gap-1 transition-colors ${
                    currentSort === 'updated'
                      ? 'text-[#121417] font-medium'
                      : 'hover:text-[#121417]'
                  }`}
                >
                  <span>Updated</span>
                  {currentSort === 'updated' ? (
                    currentOrder === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5 text-[#121417]" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-[#121417]" />
                    )
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 opacity-40" />
                  )}
                </Link>
              </div>

              <div className="w-28 sm:w-36 shrink-0 hidden md:block">
                <Link
                  href={getSortUrl('created')}
                  className="inline-flex items-center gap-1 hover:text-[#121417] transition-colors"
                >
                  <span>Created</span>
                  {currentSort === 'created' &&
                    (currentOrder === 'asc' ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </Link>
              </div>

              <div className="w-8 shrink-0" />
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-zinc-100">
              {documents?.map((doc: any) => {
                const signer = Array.isArray(doc.signers) ? doc.signers[0] : doc.signers
                const href =
                  doc.status === 'draft'
                    ? `/send/${doc.id}/place`
                    : `/documents/${doc.id}`
                const subtitle = getDocumentSubtitle(doc)

                return (
                  <div
                    key={doc.id}
                    className="group flex items-center px-4 py-3 hover:bg-[#FAFAFA] transition-colors"
                  >
                    {/* Document Info with PDF Page 1 Thumbnail */}
                    <Link
                      href={href}
                      className="flex-1 min-w-0 pr-4 flex items-center gap-3.5"
                    >
                      <DocumentThumbnail documentId={doc.id} title={doc.title} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[13px] text-[#121417] tracking-tight truncate group-hover:text-primary transition-colors">
                            {doc.title || 'Untitled Document'}
                          </span>
                          {doc.is_test && (
                            <span className="rounded bg-zinc-100 px-1.5 py-0.2 text-[10px] font-medium text-zinc-600 border">
                              Test
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-[#8A8F98] mt-0.5 truncate font-normal">
                          {subtitle}
                        </p>
                      </div>
                    </Link>

                    {/* Last Viewed */}
                    <div className="w-28 sm:w-36 shrink-0 text-xs text-[#5F6269] truncate">
                      {formatRelativeDate(doc.viewed_at)}
                    </div>

                    {/* Updated */}
                    <div className="w-28 sm:w-36 shrink-0 text-xs text-[#5F6269] truncate">
                      {formatRelativeDate(doc.updated_at || doc.created_at)}
                    </div>

                    {/* Created */}
                    <div className="w-28 sm:w-36 shrink-0 text-xs text-[#5F6269] truncate hidden md:block">
                      {formatRelativeDate(doc.created_at)}
                    </div>

                    {/* Actions Menu */}
                    <div className="w-8 shrink-0 flex items-center justify-end">
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
                  <Link
                    href={`/?page=${page - 1}${filterStatus ? `&status=${filterStatus}` : ''}${
                      currentSort ? `&sort=${currentSort}&order=${currentOrder}` : ''
                    }`}
                  >
                    Previous
                  </Link>
                </Button>
              )}
              {to + 1 < totalCount && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/?page=${page + 1}${filterStatus ? `&status=${filterStatus}` : ''}${
                      currentSort ? `&sort=${currentSort}&order=${currentOrder}` : ''
                    }`}
                  >
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
