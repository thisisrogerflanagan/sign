'use client'

import React, { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'

interface DocumentThumbnailProps {
  documentId: string
  title?: string
}

// In-memory cache across row re-renders & route navigations
const thumbnailMemoryCache = new Map<string, string>()
const CACHE_PREFIX = 'thumb_crisp_v1_'

export function DocumentThumbnail({ documentId, title }: DocumentThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(() => {
    return thumbnailMemoryCache.get(documentId) || null
  })
  const [loading, setLoading] = useState<boolean>(!thumbnailUrl)

  useEffect(() => {
    if (thumbnailUrl || !documentId) return

    let isCancelled = false

    // Check sessionStorage
    try {
      const cached = sessionStorage.getItem(`${CACHE_PREFIX}${documentId}`)
      if (cached) {
        thumbnailMemoryCache.set(documentId, cached)
        setThumbnailUrl(cached)
        setLoading(false)
        return
      }
    } catch {
      // Ignore storage errors
    }

    async function generateThumbnail() {
      try {
        setLoading(true)

        // 1. Fetch document file signed URL
        const res = await fetch(`/api/documents/${documentId}/file`)
        if (!res.ok) throw new Error('Could not fetch file')
        const fileData = await res.json()
        if (isCancelled || !fileData.url) return

        // 2. Load PDF page 1 via pdfjs-dist
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

        const loadingTask = pdfjs.getDocument({ url: fileData.url })
        const doc = await loadingTask.promise
        if (isCancelled) return

        const page = await doc.getPage(1)
        const unscaledViewport = page.getViewport({ scale: 1.0 })

        // 3. Render at 5x resolution (160x190) so browser downscales with crisp, sharp text & vector rules
        const targetW = 32 * 5
        const targetH = 38 * 5
        const scale = Math.max(
          targetW / unscaledViewport.width,
          targetH / unscaledViewport.height
        )
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Fill with white paper background so anti-aliasing renders sharp against white
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        await (page as any).render({
          canvas,
          canvasContext: ctx,
          viewport,
        }).promise

        if (isCancelled) return

        // Export as lossless PNG instead of lossy JPEG
        const dataUrl = canvas.toDataURL('image/png')
        thumbnailMemoryCache.set(documentId, dataUrl)
        try {
          sessionStorage.setItem(`${CACHE_PREFIX}${documentId}`, dataUrl)
        } catch {
          // Ignore quota errors
        }

        setThumbnailUrl(dataUrl)
      } catch (err) {
        // Fallback to placeholder on error
      } finally {
        if (!isCancelled) setLoading(false)
      }
    }

    generateThumbnail()

    return () => {
      isCancelled = true
    }
  }, [documentId, thumbnailUrl])

  return (
    <div
      style={{
        boxShadow:
          '0px 1px 1px 0px rgba(0, 0, 0, 0.04), 0px 3px 3px 0px rgba(0, 0, 0, 0.04), 0px 6px 4px 0px rgba(0, 0, 0, 0.02), 0px 11px 4px 0px rgba(0, 0, 0, 0.01), 0px 17px 5px 0px rgba(0, 0, 0, 0.00), 0px 0px 0px 1px rgba(0, 0, 0, 0.03)',
      }}
      className="w-[32px] h-[38px] rounded-[4px] bg-white overflow-hidden shrink-0 flex items-center justify-center relative select-none border border-black/[0.04]"
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={title || 'Document thumbnail'}
          className="w-full h-full object-cover object-top pointer-events-none"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
      ) : loading ? (
        <div className="w-full h-full p-1 flex flex-col justify-between bg-zinc-50/50 animate-pulse">
          <div className="w-3/4 h-1 bg-zinc-200 rounded-xs" />
          <div className="w-full h-1 bg-zinc-200 rounded-xs" />
          <div className="w-1/2 h-1 bg-zinc-200 rounded-xs" />
        </div>
      ) : (
        <div className="w-full h-full p-1 flex flex-col justify-between bg-white text-zinc-300">
          <div className="w-3/4 h-1 bg-zinc-100 rounded-xs" />
          <div className="w-full h-1 bg-zinc-100 rounded-xs" />
          <div className="w-1/2 h-1 bg-zinc-100 rounded-xs" />
        </div>
      )}
    </div>
  )
}
