'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileSignature,
  Calendar,
  Type,
  User,
  Mail,
  Building2,
  Briefcase,
  PenTool,
  Trash2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  GripVertical,
  Sparkles,
  X,
  Star,
  RotateCcw,
  Clock,
  MessageSquare,
  CalendarDays,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldType } from '@/lib/supabase/types'
import { SignatureCaptureModal } from '@/components/signer/signature-capture-modal'

interface PlacedField {
  id: string
  type: FieldType
  label: string
  page: number
  x: number // 0 - 1
  y: number // 0 - 1
  width: number // 0 - 1
  height: number // 0 - 1
  required: boolean
  assigned_to: 'signer' | 'sender'
  is_suggestion?: boolean
  value?: string | null
}

const DEFAULT_DIMENSIONS: Record<FieldType, { width: number; height: number }> = {
  signature: { width: 0.24, height: 0.055 },
  initials: { width: 0.12, height: 0.045 },
  date: { width: 0.18, height: 0.038 },
  name: { width: 0.22, height: 0.038 },
  text: { width: 0.24, height: 0.038 },
}

interface PaletteItem {
  id: string
  type: FieldType
  label: string
  icon: any
  defaultLabel: string
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    id: 'signature',
    type: 'signature',
    label: 'Signature *',
    defaultLabel: 'Signature',
    icon: FileSignature,
  },
  { id: 'name', type: 'name', label: 'Name', defaultLabel: 'Full Name', icon: User },
  { id: 'email', type: 'text', label: 'Email', defaultLabel: 'Email', icon: Mail },
  {
    id: 'company',
    type: 'text',
    label: 'Company',
    defaultLabel: 'Company',
    icon: Building2,
  },
  {
    id: 'title',
    type: 'text',
    label: 'Title',
    defaultLabel: 'Job Title',
    icon: Briefcase,
  },
  {
    id: 'date',
    type: 'date',
    label: 'Date Signed',
    defaultLabel: 'Date Signed',
    icon: Calendar,
  },
  {
    id: 'initials',
    type: 'initials',
    label: 'Initials',
    defaultLabel: 'Initials',
    icon: PenTool,
  },
]

interface DocumentStats {
  words: number
  characters: number
  paragraphs: number
  readTime: string
}

function formatRelativeTime(isoString?: string) {
  if (!isoString) return 'Just now'
  const ms = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'Just now'
  if (mins === 1) return '1 minute ago'
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.floor(mins / 60)
  if (hours === 1) return '1 hour ago'
  if (hours < 24) return `${hours} hours ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export default function FieldEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [documentId, setDocumentId] = useState<string>('')
  const [docTitle, setDocTitle] = useState('Document')
  const [docCreatedAt, setDocCreatedAt] = useState<string>('')
  const [docUpdatedAt, setDocUpdatedAt] = useState<string>('')
  const [docAuthor, setDocAuthor] = useState<string>('Roger Flanagan')
  const [docStatus, setDocStatus] = useState<string>('draft')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedStatus, setSavedStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Document Review accordion state
  const [reviewOpen, setReviewOpen] = useState(true)

  // Document Stats
  const [docStats, setDocStats] = useState<DocumentStats>({
    words: 0,
    characters: 0,
    paragraphs: 0,
    readTime: '1m',
  })

  // PDF render state
  const [numPages, setNumPages] = useState<number>(1)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.1)

  // Fields state
  const [fields, setFields] = useState<PlacedField[]>([])
  const [activePaletteItem, setActivePaletteItem] = useState<PaletteItem | null>(
    PALETTE_ITEMS[0]
  )
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null)
  const [sidebarTab, setSidebarTab] = useState<'insert' | 'info'>('insert')

  // Modals & Action states
  const [senderSignModalOpen, setSenderSignModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [backupsModalOpen, setBackupsModalOpen] = useState(false)
  const [isStarred, setIsStarred] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pdfDocRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isDraggingRef = useRef<{
    id: string
    startX: number
    startY: number
    origX: number
    origY: number
  } | null>(null)

  const router = useRouter()
  const { toast } = useToast()

  // 1. Unwrap params & load document
  useEffect(() => {
    params.then((p) => {
      setDocumentId(p.id)
      fetchDocumentData(p.id)
    })
  }, [params])

  async function fetchDocumentData(id: string) {
    try {
      setLoading(true)
      // Fetch signed file URL & document metadata
      const fileRes = await fetch(`/api/documents/${id}/file`)
      const fileData = await fileRes.json()
      if (!fileRes.ok) throw new Error(fileData.error || 'Could not load PDF')

      setPdfUrl(fileData.url)
      setDocTitle(fileData.title || 'Untitled Document')
      setDocCreatedAt(fileData.createdAt || '')
      setDocUpdatedAt(fileData.updatedAt || fileData.createdAt || '')
      setDocAuthor(fileData.author || 'Roger Flanagan')
      setDocStatus(fileData.status || 'draft')

      // Fetch saved fields
      const fieldsRes = await fetch(`/api/documents/${id}/fields`)
      const fieldsData = await fieldsRes.json()

      let loadedFields: PlacedField[] = []
      if (fieldsRes.ok && fieldsData.fields) {
        loadedFields = fieldsData.fields.map((f: any) => ({
          id: f.id || Math.random().toString(36).substring(2),
          type: f.type,
          label:
            f.label ||
            (f.type === 'name'
              ? 'Full Name'
              : f.type === 'date'
                ? 'Date Signed'
                : f.type.toUpperCase()),
          page: f.page,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          required: f.required ?? true,
          assigned_to: f.assigned_to || 'signer',
          is_suggestion: !!f.is_suggestion,
          value: f.value || null,
        }))
        setFields(loadedFields)
      }

      // If document has no fields saved yet, trigger background auto-detect
      if (loadedFields.length === 0) {
        runAutoDetection(id)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize editor')
    } finally {
      setLoading(false)
    }
  }

  // Auto-detect fields trigger
  async function runAutoDetection(id: string) {
    try {
      const res = await fetch(`/api/documents/${id}/detect-fields`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok && Array.isArray(data.detected) && data.detected.length > 0) {
        const detectedFields: PlacedField[] = data.detected.map((d: any) => ({
          id: d.id || Math.random().toString(36).substring(2),
          type: d.type,
          label: d.label,
          page: d.page,
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height,
          required: d.required ?? true,
          assigned_to: d.assigned_to || 'signer',
          is_suggestion: true,
          value: null,
        }))
        setFields(detectedFields)
        triggerAutoSave(detectedFields)
      }
    } catch (detectErr) {
      console.error('Silent auto-detection fallback:', detectErr)
    }
  }

  // 2. Render PDF page using pdfjs-dist with High-DPI (Retina) scaling
  useEffect(() => {
    if (!pdfUrl) return

    let isCancelled = false

    async function loadAndRender() {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

        const loadingTask = pdfjs.getDocument({ url: pdfUrl! })
        const doc = await loadingTask.promise
        if (isCancelled) return

        pdfDocRef.current = doc
        setNumPages(doc.numPages)
        renderPage(doc, currentPage, scale)

        // Calculate document text statistics
        calculateTextStats(doc)
      } catch (err: any) {
        console.error('PDF render error:', err)
      }
    }

    loadAndRender()

    return () => {
      isCancelled = true
    }
  }, [pdfUrl])

  async function calculateTextStats(doc: any) {
    try {
      let fullText = ''
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((it: any) => it.str).join(' ')
        fullText += pageText + '\n\n'
      }

      const trimmed = fullText.trim()
      const words = trimmed ? trimmed.match(/\b\S+\b/g)?.length || 0 : 0
      const characters = trimmed.length
      const paragraphs = trimmed
        ? trimmed.split(/\n+/).filter((line) => line.trim().length > 0).length
        : 0
      const readTimeMinutes = Math.max(1, Math.ceil(words / 200))

      setDocStats({
        words,
        characters,
        paragraphs,
        readTime: `${readTimeMinutes}m`,
      })
    } catch (err) {
      console.error('Error calculating document stats:', err)
    }
  }

  const renderPage = useCallback(
    async (doc: any, pageNum: number, currentScale: number) => {
      if (!doc || !canvasRef.current) return

      try {
        const page = await doc.getPage(pageNum)
        const viewport = page.getViewport({ scale: currentScale })

        // FIX BLURRINESS: Multiply canvas resolution by window.devicePixelRatio
        const outputScale =
          typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        if (!context) return

        canvas.width = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)
        canvas.style.width = Math.floor(viewport.width) + 'px'
        canvas.style.height = Math.floor(viewport.height) + 'px'

        const transform =
          outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined

        const renderContext = {
          canvasContext: context,
          transform,
          viewport,
        }

        await page.render(renderContext).promise
      } catch (renderErr) {
        console.error('Failed to render page:', renderErr)
      }
    },
    []
  )

  useEffect(() => {
    if (pdfDocRef.current) {
      renderPage(pdfDocRef.current, currentPage, scale)
    }
  }, [currentPage, scale, renderPage])

  // 3. Debounced Auto-save
  const triggerAutoSave = useCallback(
    (updatedFields: PlacedField[]) => {
      if (!documentId) return
      setSavedStatus('Saving...')

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          setSaving(true)
          const res = await fetch(`/api/documents/${documentId}/fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: updatedFields }),
          })
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            throw new Error(errData.error || 'Auto-save failed')
          }
          setSavedStatus('All changes saved')
          setTimeout(() => setSavedStatus(null), 2500)
        } catch (err) {
          console.error('Save failed:', err)
          setSavedStatus('Failed to save')
        } finally {
          setSaving(false)
        }
      }, 600)
    },
    [documentId]
  )

  // Helper to add a new field at normalized coordinates
  function addFieldAtCoords(paletteItem: PaletteItem, normX: number, normY: number) {
    const dims = DEFAULT_DIMENSIONS[paletteItem.type]
    const clampedX = Math.max(0, Math.min(1 - dims.width, normX))
    const clampedY = Math.max(0, Math.min(1 - dims.height, normY))

    const newField: PlacedField = {
      id: Math.random().toString(36).substring(2, 9),
      type: paletteItem.type,
      label: paletteItem.defaultLabel,
      page: currentPage,
      x: clampedX,
      y: clampedY,
      width: dims.width,
      height: dims.height,
      required: true,
      assigned_to: 'signer',
      is_suggestion: false,
    }

    const updated = [...fields, newField]
    setFields(updated)
    setActiveFieldId(newField.id)
    triggerAutoSave(updated)
  }

  // 4. Click canvas to drop active field
  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!activePaletteItem || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    if (clickX < 0 || clickX > rect.width || clickY < 0 || clickY > rect.height) {
      return
    }

    const dims = DEFAULT_DIMENSIONS[activePaletteItem.type]
    const normX = (clickX - (dims.width * rect.width) / 2) / rect.width
    const normY = (clickY - (dims.height * rect.height) / 2) / rect.height

    addFieldAtCoords(activePaletteItem, normX, normY)
  }

  // 5. Native Drag & Drop onto canvas
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleCanvasDrop(e: React.DragEvent) {
    e.preventDefault()
    if (!canvasRef.current) return

    const paletteItemId = e.dataTransfer.getData('text/plain')
    const item = PALETTE_ITEMS.find((p) => p.id === paletteItemId) || activePaletteItem
    if (!item) return

    const rect = canvasRef.current.getBoundingClientRect()
    const dropX = e.clientX - rect.left
    const dropY = e.clientY - rect.top

    const dims = DEFAULT_DIMENSIONS[item.type]
    const normX = (dropX - (dims.width * rect.width) / 2) / rect.width
    const normY = (dropY - (dims.height * rect.height) / 2) / rect.height

    addFieldAtCoords(item, normX, normY)
  }

  // 6. Suggestions actions
  function handleAcceptAllSuggestions() {
    const updated = fields.map((f) => ({ ...f, is_suggestion: false }))
    setFields(updated)
    triggerAutoSave(updated)
    toast({
      title: 'Suggestions confirmed',
      description: 'All auto-detected fields have been added to the document.',
    })
  }

  function handleClearAllSuggestions() {
    const updated = fields.filter((f) => !f.is_suggestion)
    setFields(updated)
    triggerAutoSave(updated)
    toast({
      title: 'Suggestions cleared',
      description: 'Auto-detected field suggestions were removed.',
    })
  }

  function handleAcceptSingleSuggestion(id: string) {
    const updated = fields.map((f) => (f.id === id ? { ...f, is_suggestion: false } : f))
    setFields(updated)
    triggerAutoSave(updated)
  }

  // 7. Field editing
  function handleDeleteField(id: string) {
    const updated = fields.filter((f) => f.id !== id)
    setFields(updated)
    if (activeFieldId === id) {
      setActiveFieldId(null)
    }
    triggerAutoSave(updated)
  }

  function handleUpdateActiveField(updates: Partial<PlacedField>) {
    if (!activeFieldId) return
    const updated = fields.map((f) => (f.id === activeFieldId ? { ...f, ...updates } : f))
    setFields(updated)
    triggerAutoSave(updated)
  }

  // 8. Delete document action
  async function handleDeleteDocument() {
    try {
      setIsDeleting(true)
      const res = await fetch(`/api/envelopes/${documentId}/delete`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to delete document')
      toast({
        title: 'Document deleted',
        description: 'The draft document has been permanently deleted.',
      })
      router.push('/')
    } catch (err: any) {
      toast({
        title: 'Error deleting document',
        description: err.message,
        variant: 'destructive',
      })
      setIsDeleting(false)
    }
  }

  // 9. Dragging field on canvas
  function startDragging(e: React.MouseEvent, field: PlacedField) {
    e.stopPropagation()
    setActiveFieldId(field.id)
    isDraggingRef.current = {
      id: field.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: field.x,
      origY: field.y,
    }

    function onMouseMove(moveEvent: MouseEvent) {
      if (!isDraggingRef.current || !canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const deltaX = (moveEvent.clientX - isDraggingRef.current.startX) / rect.width
      const deltaY = (moveEvent.clientY - isDraggingRef.current.startY) / rect.height

      setFields((prev) =>
        prev.map((f) => {
          if (f.id === isDraggingRef.current?.id) {
            return {
              ...f,
              x: Math.max(0, Math.min(1 - f.width, isDraggingRef.current.origX + deltaX)),
              y: Math.max(
                0,
                Math.min(1 - f.height, isDraggingRef.current.origY + deltaY)
              ),
            }
          }
          return f
        })
      )
    }

    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      if (isDraggingRef.current) {
        setFields((latest) => {
          triggerAutoSave(latest)
          return latest
        })
        isDraggingRef.current = null
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const activeField = fields.find((f) => f.id === activeFieldId)
  const pageFields = fields.filter((f) => f.page === currentPage)
  const suggestionCount = fields.filter((f) => f.is_suggestion).length

  return (
    <div className="flex h-screen flex-col bg-[#FCFDFE]">
      {/* Top Navbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 sm:px-6 z-20">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Save draft & exit
            </Link>
          </Button>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <span className="font-semibold text-sm truncate max-w-[200px] sm:max-w-xs">
            {docTitle}
          </span>
        </div>

        {/* Stepper info */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium">
          <span className="text-muted-foreground">Upload</span>
          <span className="text-muted-foreground">&rarr;</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
            2
          </span>
          <span className="font-semibold text-foreground">Place fields</span>
          <span className="text-muted-foreground">&rarr;</span>
          <span className="text-muted-foreground">Review & send</span>
        </div>

        <div className="flex items-center gap-3">
          {savedStatus && (
            <span className="text-xs text-muted-foreground animate-in fade-in flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              {savedStatus}
            </span>
          )}

          <Button
            size="sm"
            onClick={() => router.push(`/send/${documentId}/review`)}
            disabled={fields.length === 0}
          >
            Review & send
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Editor Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center PDF View Area */}
        <main
          ref={containerRef}
          onClick={() => setActiveFieldId(null)}
          className="flex-1 overflow-auto p-6 flex flex-col items-center justify-start bg-zinc-100/80 relative"
        >
          {/* Top Detection Notification Bar */}
          {suggestionCount > 0 && (
            <div className="mb-4 w-full max-w-xl bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-2.5 shadow-sm flex items-center justify-between gap-3 text-amber-900 text-xs animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="font-medium">
                  <strong>{suggestionCount}</strong> field
                  {suggestionCount === 1 ? '' : 's'} auto-detected in this document
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAcceptAllSuggestions()
                  }}
                  className="h-7 text-xs bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  <Check className="mr-1 h-3 w-3" />
                  Accept all
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClearAllSuggestions()
                  }}
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center p-16 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Rendering PDF pages with retina clarity...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center text-destructive text-sm max-w-md">
              <AlertCircle className="mx-auto h-6 w-6 mb-2" />
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-4 flex flex-col items-center">
              {/* Controls bar */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-4 bg-background/95 backdrop-blur-sm rounded-full border px-4 py-1.5 shadow-sm text-xs sticky top-0 z-10"
              >
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium text-foreground">
                    Page {currentPage} of {numPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={currentPage >= numPages}
                    onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="h-4 w-px bg-border" />

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-12 text-center text-muted-foreground font-medium">
                    {Math.round(scale * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setScale((s) => Math.min(2.0, s + 0.15))}
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* PDF Canvas Container */}
              <div
                onClick={handleCanvasClick}
                onDragOver={handleDragOver}
                onDrop={handleCanvasDrop}
                className="relative cursor-crosshair rounded-lg shadow-xl bg-white select-none border border-zinc-200"
              >
                <canvas ref={canvasRef} className="block" />

                {/* Overlaid Placed Fields for Current Page */}
                {pageFields.map((field) => {
                  const isSelected = activeFieldId === field.id
                  const isSuggestion = !!field.is_suggestion

                  return (
                    <div
                      key={field.id}
                      onMouseDown={(e) => startDragging(e, field)}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveFieldId(field.id)
                      }}
                      style={{
                        position: 'absolute',
                        left: `${field.x * 100}%`,
                        top: `${field.y * 100}%`,
                        width: `${field.width * 100}%`,
                        height: `${field.height * 100}%`,
                      }}
                      className={`group cursor-move flex items-center justify-between px-2 rounded transition-all select-none ${
                        isSuggestion
                          ? isSelected
                            ? 'border-2 border-dashed border-amber-600 bg-amber-100/90 text-amber-950 shadow-md ring-2 ring-amber-400 z-20'
                            : 'border-2 border-dashed border-amber-500 bg-amber-50/80 text-amber-900 hover:border-amber-600 z-10'
                          : isSelected
                            ? 'border-2 border-primary bg-primary/20 text-primary shadow-md ring-2 ring-primary/30 z-20'
                            : field.assigned_to === 'sender'
                              ? 'border-2 border-purple-500 bg-purple-50/80 text-purple-900 hover:border-purple-600 z-10'
                              : 'border-2 border-blue-500/80 bg-blue-50/80 text-blue-900 hover:border-primary z-10'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold truncate pointer-events-none">
                        {field.type === 'signature' && (
                          <FileSignature className="h-3.5 w-3.5 shrink-0" />
                        )}
                        {field.type === 'initials' && (
                          <PenTool className="h-3.5 w-3.5 shrink-0" />
                        )}
                        {field.type === 'date' && (
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                        )}
                        {field.type === 'name' && (
                          <User className="h-3.5 w-3.5 shrink-0" />
                        )}
                        {field.type === 'text' && (
                          <Type className="h-3.5 w-3.5 shrink-0" />
                        )}

                        <span className="truncate">{field.label}</span>

                        {isSuggestion && (
                          <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.2 text-[9px] font-medium bg-amber-200/80 text-amber-800">
                            ✨ Suggested
                          </span>
                        )}

                        {field.assigned_to === 'sender' && !isSuggestion && (
                          <span className="inline-flex items-center rounded px-1 py-0.2 text-[9px] font-medium bg-purple-200/80 text-purple-800">
                            {field.value ? 'Signed (Me)' : 'Me'}
                          </span>
                        )}
                      </div>

                      {/* Quick action buttons on field hover */}
                      <div className="flex items-center gap-1">
                        {isSuggestion && (
                          <button
                            type="button"
                            title="Accept suggestion"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAcceptSingleSuggestion(field.id)
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-0.5 rounded shadow-sm transition-all"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}

                        <button
                          type="button"
                          title="Delete field"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteField(field.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Floating Field Inspector Popover (Shown when this field is active) */}
                      {isSelected && (
                        <div
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            top: '100%',
                            left: 0,
                            marginTop: '8px',
                          }}
                          className="absolute z-30 w-72 rounded-xl border bg-background p-3.5 shadow-xl text-left cursor-default animate-in fade-in zoom-in-95 space-y-3"
                        >
                          <div className="flex items-center justify-between border-b pb-2">
                            <span className="text-xs font-semibold capitalize text-foreground">
                              {field.type} Field
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveFieldId(null)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Label
                            </Label>
                            <Input
                              value={field.label}
                              onChange={(e) =>
                                handleUpdateActiveField({ label: e.target.value })
                              }
                              className="h-7 text-xs"
                              placeholder="e.g. Client signature"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Assigned To
                            </Label>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateActiveField({ assigned_to: 'signer' })
                                }
                                className={`py-1 px-2 rounded-lg border text-xs font-medium transition-colors ${
                                  field.assigned_to === 'signer'
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                Signer
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateActiveField({ assigned_to: 'sender' })
                                }
                                className={`py-1 px-2 rounded-lg border text-xs font-medium transition-colors ${
                                  field.assigned_to === 'sender'
                                    ? 'border-purple-600 bg-purple-50 text-purple-900 font-semibold'
                                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                Me (Sender)
                              </button>
                            </div>
                          </div>

                          {field.assigned_to === 'sender' &&
                            (field.type === 'signature' || field.type === 'initials') && (
                              <div className="pt-1">
                                {field.value ? (
                                  <div className="p-2 border rounded-lg bg-purple-50/60 space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px] text-purple-900 font-medium">
                                      <span>Signed by you</span>
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                    </div>
                                    <div className="h-10 border rounded bg-white p-1 flex items-center justify-center">
                                      <img
                                        src={field.value}
                                        alt="Signature"
                                        className="max-h-full max-w-full object-contain"
                                      />
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSenderSignModalOpen(true)}
                                      className="w-full text-[11px] h-6"
                                    >
                                      Change signature
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => setSenderSignModalOpen(true)}
                                    className="w-full text-xs h-7 bg-purple-700 hover:bg-purple-800 text-white"
                                  >
                                    Sign now
                                  </Button>
                                )}
                              </div>
                            )}

                          <div className="flex items-center justify-between pt-1 border-t text-xs">
                            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) =>
                                  handleUpdateActiveField({ required: e.target.checked })
                                }
                                className="rounded border-zinc-300 text-primary h-3.5 w-3.5"
                              />
                              <span>Required</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => handleDeleteField(field.id)}
                              className="text-destructive hover:underline text-[11px]"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </main>

        {/* Right Palette & Page Info Sidebar */}
        <aside className="w-80 shrink-0 border-l bg-background flex flex-col justify-between overflow-hidden shadow-sm z-10">
          <div className="flex flex-col h-full overflow-hidden">
            {/* Right Sidebar Tabs: Insert | Info */}
            <div className="flex border-b text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSidebarTab('insert')}
                className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                  sidebarTab === 'insert'
                    ? 'border-primary text-foreground font-bold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Insert
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('info')}
                className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                  sidebarTab === 'info'
                    ? 'border-primary text-foreground font-bold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Info
              </button>
            </div>

            {/* TAB CONTENT: Insert Palette */}
            {sidebarTab === 'insert' && (
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                <div className="text-xs text-muted-foreground">
                  Drag and drop any item to the document
                </div>

                <div className="space-y-2">
                  {PALETTE_ITEMS.map((item) => {
                    const Icon = item.icon
                    const isSelected = activePaletteItem?.id === item.id

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', item.id)
                          setActivePaletteItem(item)
                        }}
                        onClick={() => setActivePaletteItem(item)}
                        className={`group flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-grab active:cursor-grabbing transition-all select-none ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-foreground shadow-sm'
                            : 'border-border bg-card hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-1.5 rounded-lg ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-sm">{item.label}</span>
                        </div>

                        <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                          <GripVertical className="h-4 w-4" />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Placed Fields Summary */}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                      Document Fields ({fields.length})
                    </span>
                    {suggestionCount > 0 && (
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                        {suggestionCount} suggested
                      </span>
                    )}
                  </div>

                  {fields.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center bg-muted/30 rounded-lg">
                      No fields placed yet. Drag from above or click on document.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {fields.map((f) => (
                        <div
                          key={f.id}
                          onClick={() => {
                            setCurrentPage(f.page)
                            setActiveFieldId(f.id)
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            activeFieldId === f.id
                              ? 'border-primary bg-primary/5 text-foreground'
                              : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-medium truncate">{f.label}</span>
                            <span className="text-[10px] text-muted-foreground">
                              (p. {f.page})
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {f.is_suggestion ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAcceptSingleSuggestion(f.id)
                                }}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800"
                              >
                                Accept
                              </button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                {f.assigned_to === 'sender' ? 'Me' : 'Signer'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Page Info (Matching Mockup Screenshots 1 & 2) */}
            {sidebarTab === 'info' && (
              <div className="p-5 flex-1 overflow-y-auto space-y-6 text-foreground animate-in fade-in">
                {/* Title */}
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    Page Info
                  </h2>
                </div>

                {/* PROPERTIES */}
                <div className="space-y-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    PROPERTIES
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0 stroke-[1.6]" />
                      <span className="text-muted-foreground font-normal">Created:</span>
                      <span className="font-medium text-foreground">
                        {formatRelativeTime(docCreatedAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0 stroke-[1.6]" />
                      <span className="text-muted-foreground font-normal">Updated:</span>
                      <span className="font-medium text-foreground">
                        {formatRelativeTime(docUpdatedAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="h-4 w-4 rounded-full border border-muted-foreground/60 flex items-center justify-center shrink-0">
                        <User className="h-2.5 w-2.5 text-muted-foreground stroke-[2]" />
                      </div>
                      <span className="text-muted-foreground font-normal">Author:</span>
                      <span className="font-medium text-foreground truncate">
                        {docAuthor}
                      </span>
                    </div>
                  </div>
                </div>

                {/* DOCUMENT REVIEW */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setReviewOpen(!reviewOpen)}
                    className="w-full flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>DOCUMENT REVIEW</span>
                    {reviewOpen ? (
                      <ChevronUp className="h-3.5 w-3.5 stroke-[2]" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 stroke-[2]" />
                    )}
                  </button>

                  {reviewOpen && (
                    <div className="space-y-3 text-xs pl-0.5 animate-in fade-in">
                      {/* Step 1: Draft */}
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-full border-2 border-dashed border-zinc-500 flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
                        </div>
                        <span className="font-semibold text-foreground">Draft</span>
                      </div>

                      {/* Step 2: Waiting to sign */}
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="h-4 w-4 rounded-full border-2 border-dashed border-zinc-300" />
                        <span className="font-medium">Waiting to sign</span>
                      </div>

                      {/* Step 3: Opened */}
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="h-4 w-4 rounded-full border-2 border-dashed border-zinc-300" />
                        <span className="font-medium">Opened</span>
                      </div>

                      {/* Step 4: Completed */}
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="h-4 w-4 rounded-full border-2 border-dashed border-zinc-300" />
                        <span className="font-medium">Completed</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACTIONS */}
                <div className="space-y-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    ACTIONS
                  </h3>
                  <div className="space-y-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIsStarred(!isStarred)
                        toast({
                          title: isStarred ? 'Document unstarred' : 'Document starred',
                          description: isStarred
                            ? 'Removed from starred documents.'
                            : 'Added to your starred documents.',
                        })
                      }}
                      className="w-full flex items-center gap-2.5 p-1.5 -mx-1.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
                    >
                      <Star
                        className={`h-4 w-4 stroke-[1.8] ${
                          isStarred ? 'fill-amber-400 text-amber-500' : 'text-zinc-600'
                        }`}
                      />
                      <span className="font-medium text-foreground">
                        {isStarred ? 'Starred' : 'Star Document'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBackupsModalOpen(true)}
                      className="w-full flex items-center gap-2.5 p-1.5 -mx-1.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
                    >
                      <RotateCcw className="h-4 w-4 text-zinc-600 stroke-[1.8]" />
                      <span className="font-medium text-foreground">View Backups</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmOpen(true)}
                      className="w-full flex items-center gap-2.5 p-1.5 -mx-1.5 rounded-lg hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors text-left"
                    >
                      <Trash2 className="h-4 w-4 stroke-[1.8]" />
                      <span className="font-medium">Delete</span>
                    </button>
                  </div>
                </div>

                {/* STATS (Matching Screenshot 2 in 2x2 Grid) */}
                <div className="space-y-3 pt-1">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    STATS
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Words Card */}
                    <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-zinc-100 flex flex-col justify-between h-24 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold tracking-tight text-foreground">
                          {docStats.words.toLocaleString()}
                        </span>
                        <MessageSquare className="h-4 w-4 text-zinc-400 stroke-[1.6]" />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        Words
                      </span>
                    </div>

                    {/* Characters Card */}
                    <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-zinc-100 flex flex-col justify-between h-24 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold tracking-tight text-foreground">
                          {docStats.characters.toLocaleString()}
                        </span>
                        <span className="text-sm font-semibold text-zinc-400 select-none">
                          Aa
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        Characters
                      </span>
                    </div>

                    {/* Paragraphs Card */}
                    <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-zinc-100 flex flex-col justify-between h-24 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold tracking-tight text-foreground">
                          {docStats.paragraphs.toLocaleString()}
                        </span>
                        <span className="text-base font-medium text-zinc-400 select-none font-serif leading-none">
                          ¶
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        Paragraphs
                      </span>
                    </div>

                    {/* Read Time Card */}
                    <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-zinc-100 flex flex-col justify-between h-24 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold tracking-tight text-foreground">
                          {docStats.readTime}
                        </span>
                        <Clock className="h-4 w-4 text-zinc-400 stroke-[1.6]" />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        Read Time
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Sender Sign Modal (When sender signs their own field) */}
      {activeField && (
        <SignatureCaptureModal
          isOpen={senderSignModalOpen}
          onClose={() => setSenderSignModalOpen(false)}
          title={
            activeField.type === 'initials'
              ? 'Adopt your initials'
              : 'Adopt your signature'
          }
          defaultName={docAuthor}
          onSave={(dataUrl) => {
            handleUpdateActiveField({ value: dataUrl })
            setSenderSignModalOpen(false)
            toast({
              title: 'Signed',
              description: 'Your signature has been applied to this field.',
            })
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{docTitle}&quot;? This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteDocument}
            >
              {isDeleting ? 'Deleting...' : 'Delete permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Backups Dialog */}
      <Dialog open={backupsModalOpen} onOpenChange={setBackupsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Document Version History
            </DialogTitle>
            <DialogDescription>
              Watchpost Sign retains immutable original and working draft snapshots for
              tamper-evidence.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-3 text-xs">
            <div className="p-3 rounded-xl border bg-muted/30 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Current Working Draft</p>
                <p className="text-[11px] text-muted-foreground">
                  Updated {formatRelativeTime(docUpdatedAt)}
                </p>
              </div>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Active
              </span>
            </div>

            <div className="p-3 rounded-xl border bg-card flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Original Upload Snapshot</p>
                <p className="text-[11px] text-muted-foreground">
                  Created {formatRelativeTime(docCreatedAt)}
                </p>
              </div>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                Original
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBackupsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
