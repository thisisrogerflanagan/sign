'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { THUMBNAIL_CARD_STYLE } from '@/components/documents/document-thumbnail'

export interface DocumentCenterViewerProps {
  documentId: string
  title: string
  pageCount?: number | null
  pdfUrl?: string | null
  downloadUrl?: string | null
}

export function DocumentCenterViewer({
  documentId,
  title,
  pageCount = 1,
  pdfUrl,
  downloadUrl,
}: DocumentCenterViewerProps) {
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [numPages, setNumPages] = useState<number>(pageCount || 1)
  const [scale, setScale] = useState<number>(1.0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvedPdfUrl, setResolvedPdfUrl] = useState<string | null>(pdfUrl || null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const renderTaskRef = useRef<any>(null)
  const pdfDocRef = useRef<any>(null)

  // 1. Fetch PDF URL if not directly supplied
  useEffect(() => {
    let isCancelled = false

    async function fetchFileUrl() {
      if (pdfUrl) {
        setResolvedPdfUrl(pdfUrl)
        return
      }

      if (!documentId) return

      try {
        setLoading(true)
        const res = await fetch(`/api/documents/${documentId}/file`)
        if (!res.ok) throw new Error('Could not fetch document file URL')
        const data = await res.json()
        if (isCancelled) return
        if (data.url) {
          setResolvedPdfUrl(data.url)
        } else {
          throw new Error('Document file URL is empty')
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Failed to retrieve document')
          setLoading(false)
        }
      }
    }

    fetchFileUrl()

    return () => {
      isCancelled = true
    }
  }, [documentId, pdfUrl])

  // 2. Load PDF Document via pdfjs-dist
  useEffect(() => {
    if (!resolvedPdfUrl) return
    let isCancelled = false

    const targetUrl = resolvedPdfUrl
    async function loadPdf() {
      try {
        setLoading(true)
        setError(null)

        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

        const loadingTask = pdfjs.getDocument({ url: targetUrl })
        const doc = await loadingTask.promise

        if (isCancelled) return

        pdfDocRef.current = doc
        setNumPages(doc.numPages)
        setLoading(false)
      } catch (err: any) {
        if (!isCancelled) {
          console.error('PDF preview error:', err)
          setError('Could not render PDF preview in browser.')
          setLoading(false)
        }
      }
    }

    loadPdf()

    return () => {
      isCancelled = true
    }
  }, [resolvedPdfUrl])

  // 3. Render Current Page to Canvas
  useEffect(() => {
    const doc = pdfDocRef.current
    if (!doc || !canvasRef.current) return
    let isCancelled = false

    async function renderPage() {
      try {
        // Cancel existing page render task if any
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel()
          } catch {
            // Ignore cancel error
          }
        }

        const page = await doc.getPage(currentPage)
        if (isCancelled || !canvasRef.current) return

        const unscaledViewport = page.getViewport({ scale: 1.0 })
        // High-DPI target resolution matching #23 All docs thumbnail style
        const targetWidth = 820 * scale
        const renderScale = Math.max(targetWidth / unscaledViewport.width, 1.0)
        const viewport = page.getViewport({ scale: renderScale })

        const canvas = canvasRef.current
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)

        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) return

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        const renderTask = (page as any).render({
          canvasContext: ctx,
          viewport,
        })
        renderTaskRef.current = renderTask

        await renderTask.promise
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException' && !isCancelled) {
          console.warn('Page render error:', err)
        }
      }
    }

    renderPage()

    return () => {
      isCancelled = true
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {
          // Ignore
        }
      }
    }
  }, [currentPage, scale, numPages])

  const activeDownloadUrl = downloadUrl || resolvedPdfUrl

  return (
    <div
      className="w-full flex-1 min-w-0 flex flex-col items-center justify-start bg-zinc-100/70 rounded-2xl border border-black/[0.04] p-4 sm:p-6 overflow-auto relative min-h-[600px] h-full"
      data-testid="center-pdf-column"
    >
      {/* Top Floating Controls Toolbar */}
      <div
        className="flex items-center gap-3 bg-background/95 backdrop-blur-sm rounded-full border px-4 py-1.5 shadow-sm text-xs sticky top-0 z-20 mb-6"
        data-testid="pdf-controls-toolbar"
      >
        {/* Page Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={currentPage <= 1 || loading}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-foreground px-1 select-none">
            {`Page ${currentPage} of ${numPages}`}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={currentPage >= numPages || loading}
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={scale <= 0.6 || loading}
            onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))))}
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="w-12 text-center text-muted-foreground font-medium select-none">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={scale >= 2.0 || loading}
            onClick={() => setScale((s) => Math.min(2.0, Number((s + 0.15).toFixed(2))))}
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Download / Open PDF Action */}
        {activeDownloadUrl && (
          <>
            <div className="h-4 w-px bg-border" />
            <a
              href={activeDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs font-medium px-2 py-1 rounded-md hover:bg-muted transition-colors"
              title="Open or download PDF"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open PDF</span>
            </a>
          </>
        )}
      </div>

      {/* PDF Document Paper Container matching #23 All docs thumbnail style */}
      <div
        style={THUMBNAIL_CARD_STYLE}
        className="w-full max-w-3xl bg-white rounded-[4px] border border-black/[0.04] p-2 sm:p-4 shadow-sm overflow-hidden select-none flex flex-col items-center justify-center relative min-h-[500px]"
        data-testid="pdf-paper-card"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center p-16 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs font-medium">Rendering PDF document preview...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center p-12 text-center max-w-md gap-3">
            <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">Preview unavailable</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            {activeDownloadUrl && (
              <a
                href={activeDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF to view locally
              </a>
            )}
          </div>
        )}

        {/* Rendered Canvas */}
        <div
          className={`w-full flex justify-center ${loading || error ? 'hidden' : 'block'}`}
        >
          <canvas
            ref={canvasRef}
            className="block max-w-full h-auto shadow-xs rounded-[2px]"
            data-testid="pdf-render-canvas"
          />
        </div>
      </div>
    </div>
  )
}
