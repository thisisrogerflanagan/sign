'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  AlertCircle,
  FileSignature,
  PenTool,
  Calendar,
  User,
  Type,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
import {
  FILTER_GROUP_CONTAINER_STYLE,
  FILTER_GROUP_CONTAINER_CLASS,
  FILTER_GROUP_BUTTON_BASE_CLASS,
} from '@/components/documents/home-feed-filters'
import { InfoPanel, PlacedFieldData } from './info-panel'
import { FieldPalette, PaletteItem } from './field-palette'
import { UploadArea } from './upload-area'

const DEFAULT_DIMENSIONS: Record<FieldType, { width: number; height: number }> = {
  signature: { width: 0.24, height: 0.055 },
  initials: { width: 0.12, height: 0.045 },
  date: { width: 0.18, height: 0.038 },
  name: { width: 0.22, height: 0.038 },
  text: { width: 0.24, height: 0.038 },
}

export interface SendFlowEditorProps {
  initialStep?: 'upload' | 'place'
  documentId?: string
  initialTitle?: string
  initialNumPages?: number
  initialCurrentPage?: number
  initialFields?: PlacedFieldData[]
}

export function SendFlowEditor({
  initialStep = 'upload',
  documentId: propDocId,
  initialTitle = 'Document',
  initialNumPages = 1,
  initialCurrentPage = 1,
  initialFields = [],
}: SendFlowEditorProps) {
  const router = useRouter()
  const { toast } = useToast()

  // Step state: 'upload' or 'place'
  const [step, setStep] = useState<'upload' | 'place'>(initialStep)
  const [documentId, setDocumentId] = useState<string>(propDocId || '')

  // Document metadata state
  const [docTitle, setDocTitle] = useState(initialTitle)
  const [fileName, setFileName] = useState('')
  const [fileSizeBytes, setFileSizeBytes] = useState<number | undefined>(undefined)
  const [docCreatedAt, setDocCreatedAt] = useState<string | null>(null)
  const [docUpdatedAt, setDocUpdatedAt] = useState<string | null>(null)
  const [docAuthor, setDocAuthor] = useState<string>('Johnny Maitai')
  const [docStatus, setDocStatus] = useState<string>('draft')
  const [pageCount, setPageCount] = useState<number>(initialNumPages)
  const [signers, setSigners] = useState<any[]>([])

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // PDF Viewer state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(initialCurrentPage)
  const [numPages, setNumPages] = useState<number>(initialNumPages)
  const [scale] = useState<number>(1.1)

  // Fields state
  const [fields, setFields] = useState<PlacedFieldData[]>(initialFields)
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null)
  const [savedStatus, setSavedStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Modals & Action states
  const [senderSignModalOpen, setSenderSignModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Refs
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())
  const pageContainerRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const renderTasksRef = useRef<Map<number, any>>(new Map())
  const renderTokenRef = useRef(0)
  const scrollTimeoutRef = useRef<number | null>(null)
  const pdfDocRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isDraggingRef = useRef<{
    id: string
    page: number
    startX: number
    startY: number
    origX: number
    origY: number
  } | null>(null)

  // Initial load if documentId is provided
  useEffect(() => {
    if (propDocId) {
      setDocumentId(propDocId)
      setStep('place')
      loadDocumentDetails(propDocId)
    }
  }, [propDocId])

  // Fetch document details & fields
  async function loadDocumentDetails(id: string) {
    try {
      setLoading(true)
      setError(null)

      const fileRes = await fetch(`/api/documents/${id}/file`)
      const fileData = await fileRes.json()

      if (!fileRes.ok) {
        throw new Error(fileData.error || 'Failed to load document')
      }

      setPdfUrl(fileData.url)
      setDocTitle(fileData.title || 'Document')
      setDocCreatedAt(fileData.createdAt)
      setDocUpdatedAt(fileData.updatedAt)
      setDocAuthor(fileData.author || 'Roger Flanagan')
      setDocStatus(fileData.status || 'draft')
      if (fileData.pageCount) {
        setPageCount(fileData.pageCount)
        setNumPages(fileData.pageCount)
      }
      if (Array.isArray(fileData.signers)) {
        setSigners(fileData.signers)
      }

      // Fetch saved fields
      const fieldsRes = await fetch(`/api/documents/${id}/fields`)
      const fieldsData = await fieldsRes.json()

      let loadedFields: PlacedFieldData[] = []
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

  // Auto-detect fields
  async function runAutoDetection(id: string) {
    try {
      const res = await fetch(`/api/documents/${id}/detect-fields`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok && Array.isArray(data.detected) && data.detected.length > 0) {
        const detectedFields: PlacedFieldData[] = data.detected.map((d: any) => ({
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
        triggerAutoSave(detectedFields, id)
      }
    } catch (detectErr) {
      console.error('Auto-detection error:', detectErr)
    }
  }

  // Debounced auto-save
  const triggerAutoSave = useCallback(
    (updatedFields: PlacedFieldData[], currentDocId?: string) => {
      const targetId = currentDocId || documentId
      if (!targetId) return
      setSavedStatus('Saving...')

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          setSaving(true)
          const res = await fetch(`/api/documents/${targetId}/fields`, {
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
      }, 800)
    },
    [documentId]
  )

  // High-DPI PDF page rendering
  const renderPage = useCallback(
    async (doc: any, pageNum: number, currentScale: number) => {
      const canvas = canvasRefs.current.get(pageNum)
      if (!canvas || !doc) return

      try {
        const page = await doc.getPage(pageNum)
        const context = canvas.getContext('2d')
        if (!context) return

        const containerWidth =
          canvas.parentElement?.clientWidth ||
          (scrollContainerRef.current ? scrollContainerRef.current.clientWidth - 48 : 960)
        const baseViewport = page.getViewport({ scale: 1 })
        const fitScale = Math.max(containerWidth / baseViewport.width, currentScale, 1.4)

        const outputScale = window.devicePixelRatio || 1
        const viewport = page.getViewport({ scale: fitScale * outputScale })

        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = '100%'
        canvas.style.height = 'auto'

        const renderContext = {
          canvasContext: context,
          viewport,
        }

        // Cancel previous task on this page if still running
        const existingTask = renderTasksRef.current.get(pageNum)
        if (existingTask) {
          try {
            existingTask.cancel()
          } catch {}
        }

        const renderTask = page.render(renderContext)
        renderTasksRef.current.set(pageNum, renderTask)
        try {
          await renderTask.promise
        } catch (err: any) {
          if (err?.name !== 'RenderingCancelledException') {
            console.error(`Failed to render page ${pageNum}:`, err)
          }
        } finally {
          if (renderTasksRef.current.get(pageNum) === renderTask) {
            renderTasksRef.current.delete(pageNum)
          }
        }
      } catch (renderErr) {
        console.error(`Failed to get page ${pageNum}:`, renderErr)
      }
    },
    []
  )

  const renderAllPages = useCallback(
    async (doc: any, currentScale: number) => {
      if (!doc) return
      const token = ++renderTokenRef.current
      for (let p = 1; p <= doc.numPages; p++) {
        if (renderTokenRef.current !== token) return
        await renderPage(doc, p, currentScale)
      }
    },
    [renderPage]
  )

  useEffect(() => {
    if (!pdfUrl) return

    let isCancelled = false

    async function loadDocument() {
      try {
        setLoading(true)
        setError(null)
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

        const loadingTask = pdfjs.getDocument({ url: pdfUrl! })
        const doc = await loadingTask.promise
        if (isCancelled) return

        pdfDocRef.current = doc
        setNumPages(doc.numPages)
        setPageCount(doc.numPages)
        setLoading(false)
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error loading PDF:', err)
          setError('Failed to load and render PDF pages')
          setLoading(false)
        }
      }
    }

    loadDocument()

    return () => {
      isCancelled = true
    }
  }, [pdfUrl])

  useEffect(() => {
    if (!pdfDocRef.current || loading) return

    renderAllPages(pdfDocRef.current, scale)

    let resizeTimer: NodeJS.Timeout
    function handleResize() {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (pdfDocRef.current) {
          renderAllPages(pdfDocRef.current, scale)
        }
      }, 150)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', handleResize)
    }
  }, [loading, numPages, scale, renderAllPages])

  useEffect(() => {
    return () => {
      renderTasksRef.current.forEach((task) => {
        try {
          task.cancel()
        } catch {}
      })
      renderTasksRef.current.clear()
    }
  }, [])

  // Smooth scroll to target page in fixed PDF card
  const scrollToPage = useCallback((pageNum: number) => {
    const container = scrollContainerRef.current
    const pageEl = pageContainerRefs.current.get(pageNum)
    if (container && pageEl) {
      const targetTop = pageEl.offsetTop - container.offsetTop
      container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' })
    } else if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setCurrentPage(pageNum)
  }, [])

  // Sync pager indicator with visible page on scroll
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current !== null) return
    scrollTimeoutRef.current = window.requestAnimationFrame(() => {
      scrollTimeoutRef.current = null
      const container = scrollContainerRef.current
      if (!container) return

      const containerTop = container.scrollTop
      const viewportHeight = container.clientHeight
      const focalPoint = containerTop + viewportHeight / 3

      let bestPage = currentPage
      let minDistance = Infinity

      for (let p = 1; p <= numPages; p++) {
        const pageEl = pageContainerRefs.current.get(p)
        if (pageEl) {
          const pageTop = pageEl.offsetTop
          const pageBottom = pageTop + pageEl.offsetHeight
          if (focalPoint >= pageTop && focalPoint <= pageBottom) {
            bestPage = p
            break
          }
          const distance = Math.min(
            Math.abs(pageTop - focalPoint),
            Math.abs(pageBottom - focalPoint)
          )
          if (distance < minDistance) {
            minDistance = distance
            bestPage = p
          }
        }
      }

      if (bestPage !== currentPage) {
        setCurrentPage(bestPage)
      }
    })
  }, [numPages, currentPage])

  // Handle Upload Submission
  async function handleUploadAndContinue() {
    if (!uploadFile || uploading) return
    setUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('title', uploadTitle || uploadFile.name.replace(/\.pdf$/i, ''))

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload document')
      }

      // Populate document info immediately
      const newDocId = data.documentId
      setDocumentId(newDocId)
      setDocTitle(data.title || uploadTitle || uploadFile.name)
      setFileName(uploadFile.name)
      setFileSizeBytes(uploadFile.size)
      setDocCreatedAt(new Date().toISOString())
      if (data.pageCount) {
        setPageCount(data.pageCount)
        setNumPages(data.pageCount)
      }

      // Transition to place step immediately (enables right panel immediately with no refresh!)
      setStep('place')

      // Update URL silently without full page refresh
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', `/send/${newDocId}/place`)
      }

      // Load document viewer & fields
      await loadDocumentDetails(newDocId)
    } catch (err: any) {
      setUploadError(err.message || 'Something went wrong during upload.')
    } finally {
      setUploading(false)
    }
  }

  // Adding field helper
  function addFieldAtCoords(
    item: PaletteItem,
    normX: number,
    normY: number,
    targetPage: number = currentPage
  ) {
    const dims = DEFAULT_DIMENSIONS[item.type]
    const clampedX = Math.max(0, Math.min(1 - dims.width, normX))
    const clampedY = Math.max(0, Math.min(1 - dims.height, normY))

    const newField: PlacedFieldData = {
      id: Math.random().toString(36).substring(2),
      type: item.type,
      label: item.defaultLabel,
      page: targetPage,
      x: Number(clampedX.toFixed(4)),
      y: Number(clampedY.toFixed(4)),
      width: dims.width,
      height: dims.height,
      required: true,
      assigned_to: 'signer',
      is_suggestion: false,
      value: null,
    }

    const updated = [...fields, newField]
    setFields(updated)
    setActiveFieldId(newField.id)
    triggerAutoSave(updated)

    toast({
      title: 'Field added',
      description: `${item.label} placed on page ${targetPage}.`,
    })
  }

  // Drag over / drop on canvas
  function handleCanvasDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handlePageDrop(e: React.DragEvent, targetPage: number) {
    e.preventDefault()
    e.stopPropagation()
    const itemId = e.dataTransfer.getData('text/plain')
    if (!itemId) return
    const item = {
      id: itemId,
      type: (itemId === 'initials'
        ? 'initials'
        : itemId === 'date'
          ? 'date'
          : itemId === 'signature'
            ? 'signature'
            : 'text') as FieldType,
      label: itemId.toUpperCase(),
      defaultLabel: itemId.charAt(0).toUpperCase() + itemId.slice(1),
      icon: FileSignature,
    }

    const pageEl = pageContainerRefs.current.get(targetPage)
    if (!pageEl) return
    const rect = pageEl.getBoundingClientRect()
    const dropX = e.clientX - rect.left
    const dropY = e.clientY - rect.top

    const dims = DEFAULT_DIMENSIONS[item.type]
    const normX = (dropX - (dims.width * rect.width) / 2) / rect.width
    const normY = (dropY - (dims.height * rect.height) / 2) / rect.height

    addFieldAtCoords(item, normX, normY, targetPage)
  }

  // Suggestions actions
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

  // Field editing
  function handleDeleteField(id: string) {
    const updated = fields.filter((f) => f.id !== id)
    setFields(updated)
    if (activeFieldId === id) {
      setActiveFieldId(null)
    }
    triggerAutoSave(updated)
  }

  function handleUpdateActiveField(updates: Partial<PlacedFieldData>) {
    if (!activeFieldId) return
    const updated = fields.map((f) => (f.id === activeFieldId ? { ...f, ...updates } : f))
    setFields(updated)
    triggerAutoSave(updated)
  }

  // Delete document action
  async function handleDeleteDocument() {
    if (!documentId) return
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

  // Save draft action
  async function handleManualSaveDraft() {
    if (!documentId) return
    try {
      setSaving(true)
      const res = await fetch(`/api/documents/${documentId}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      })
      if (!res.ok) throw new Error('Failed to save draft')
      setSavedStatus('Draft saved')
      toast({
        title: 'Draft saved',
        description: 'All changes have been successfully saved.',
      })
      setTimeout(() => setSavedStatus(null), 2500)
    } catch (err: any) {
      toast({
        title: 'Failed to save draft',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Send document / review action
  function handleSendDocument() {
    if (!documentId) return
    router.push(`/send/${documentId}/review`)
  }

  // Dragging existing field on canvas
  function startDragging(e: React.MouseEvent, field: PlacedFieldData) {
    e.stopPropagation()
    setActiveFieldId(field.id)
    isDraggingRef.current = {
      id: field.id,
      page: field.page,
      startX: e.clientX,
      startY: e.clientY,
      origX: field.x,
      origY: field.y,
    }

    function onMouseMove(moveEvent: MouseEvent) {
      if (!isDraggingRef.current) return
      const pageEl = pageContainerRefs.current.get(isDraggingRef.current.page)
      if (!pageEl) return
      const rect = pageEl.getBoundingClientRect()
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
  const suggestionCount = fields.filter((f) => f.is_suggestion).length
  const pages = Array.from({ length: Math.max(1, numPages || 1) }, (_, i) => i + 1)

  return (
    <div className="flex h-screen flex-col bg-[#FCFDFE] text-foreground">
      {/* Top Navbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/[0.04] bg-[#FCFDFE]/80 backdrop-blur-md px-4 sm:px-6 z-20">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {step === 'upload' ? 'Cancel' : 'Save draft & exit'}
            </Link>
          </Button>
        </div>

        {/* Stepper indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
              step === 'upload'
                ? 'bg-primary text-primary-foreground'
                : 'bg-zinc-200 text-zinc-800'
            }`}
          >
            {step === 'upload' ? '1' : '✓'}
          </span>
          <span
            className={
              step === 'upload'
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground'
            }
          >
            Upload
          </span>
          <span className="text-muted-foreground">&rarr;</span>
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
              step === 'place'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            2
          </span>
          <span
            className={
              step === 'place' ? 'font-semibold text-foreground' : 'text-muted-foreground'
            }
          >
            Place fields
          </span>
          <span className="text-muted-foreground">&rarr;</span>
          <span className="text-muted-foreground">Review & send</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-20" />
        </div>
      </header>

      {/* Main 3-Column Layout: Left Info Panel + Center Canvas + Right Field Palette */}
      <div className="flex flex-1 overflow-hidden p-4 sm:p-6 gap-6 bg-[#FCFDFE]">
        {/* LEFT SIDEBAR: Stand-Alone Info Panel with Tab Nav */}
        <InfoPanel
          documentTitle={docTitle}
          fileName={fileName || uploadFile?.name}
          pageCount={pageCount}
          fileSizeBytes={fileSizeBytes || uploadFile?.size}
          uploadDate={docCreatedAt}
          createdAt={docCreatedAt}
          updatedAt={docUpdatedAt}
          author={docAuthor}
          status={docStatus}
          fields={fields}
          signersCount={signers.length}
          hasDocument={step === 'place' || Boolean(documentId)}
          isUploading={uploading}
          isSaving={saving}
          isDeleting={isDeleting}
          savedStatus={savedStatus}
          onSaveDraft={handleManualSaveDraft}
          onSendDocument={handleSendDocument}
          onDeleteDraft={() => setDeleteConfirmOpen(true)}
        />

        {/* CENTER AREA: Document Canvas */}
        <main
          ref={containerRef}
          onClick={() => setActiveFieldId(null)}
          className="flex-1 min-w-0 h-full overflow-hidden flex flex-col items-stretch justify-start relative"
        >
          {step === 'upload' ? (
            <UploadArea
              file={uploadFile}
              title={uploadTitle}
              onFileSelect={(f) => {
                setUploadFile(f)
                setFileName(f.name)
                setFileSizeBytes(f.size)
                if (!uploadTitle) {
                  setUploadTitle(f.name.replace(/\.pdf$/i, ''))
                }
              }}
              onTitleChange={setUploadTitle}
              onContinueUpload={handleUploadAndContinue}
              uploading={uploading}
              error={uploadError}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-stretch gap-3 pb-2">
              {/* Auto-detect suggestions bar */}
              {suggestionCount > 0 && (
                <div className="shrink-0 w-full bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-2.5 shadow-sm flex items-center justify-between gap-3 text-amber-900 text-xs animate-in fade-in slide-in-from-top-2">
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
                      className="h-7 text-xs bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-100"
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

              {/* Header row above the document (same width as the document card, three zones) */}
              <div
                data-testid="send-header-row"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 w-full flex items-center justify-between gap-4 select-none min-h-[40px]"
              >
                {/* Left: prev/next button group (hidden on single-page documents) */}
                <div className="flex items-center justify-start min-w-[140px]">
                  {numPages > 1 && (
                    <div
                      data-testid="pager-button-group"
                      className={FILTER_GROUP_CONTAINER_CLASS}
                      style={FILTER_GROUP_CONTAINER_STYLE}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={currentPage <= 1}
                        onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                        className={cn(
                          FILTER_GROUP_BUTTON_BASE_CLASS,
                          'inline-flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none'
                        )}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Prev</span>
                      </Button>
                      <span
                        data-testid="page-indicator"
                        className="px-2 text-[13px] font-medium text-[#121417] tabular-nums whitespace-nowrap"
                      >
                        {`${currentPage} / ${numPages}`}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={currentPage >= numPages}
                        onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))}
                        className={cn(
                          FILTER_GROUP_BUTTON_BASE_CLASS,
                          'inline-flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none'
                        )}
                      >
                        <span>Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Center: document title element, centered */}
                <div className="flex-1 flex items-center justify-center min-w-0 px-2">
                  <span
                    data-testid="document-title"
                    className="font-semibold text-xs sm:text-sm truncate text-foreground/80 text-center"
                    title={docTitle}
                  >
                    {docTitle}
                  </span>
                </div>

                {/* Right: CTA buttons, right-aligned to document card edge */}
                <div className="flex items-center justify-end gap-3 min-w-[140px]">
                  {savedStatus && (
                    <span className="text-xs text-muted-foreground animate-in fade-in flex items-center gap-1">
                      <Check className="h-3.5 w-3.5 text-zinc-600" />
                      {savedStatus}
                    </span>
                  )}

                  <Button
                    size="sm"
                    onClick={handleSendDocument}
                    disabled={fields.length === 0}
                    data-testid="continue-to-review-button"
                    className="rounded-full shadow-xs"
                  >
                    Review & send
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Below the header: the PDF as a single fixed card with vertical scrollbar */}
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                data-testid="pdf-page-card"
                onClick={() => setActiveFieldId(null)}
                onDragOver={handleCanvasDragOver}
                onDrop={(e) => handlePageDrop(e, currentPage)}
                style={{ overflowY: 'auto' }}
                className="pdf-page-card w-full flex-1 min-h-0 relative cursor-default select-none p-4 sm:p-6"
              >
                {loading && (
                  <div className="flex flex-col items-center justify-center p-16 gap-3 text-muted-foreground min-w-[400px] min-h-[500px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm">Rendering PDF pages with retina clarity...</p>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center text-destructive text-sm max-w-md m-8">
                    <AlertCircle className="mx-auto h-6 w-6 mb-2" />
                    {error}
                  </div>
                )}

                <div
                  className={cn(
                    'flex flex-col gap-6 w-full',
                    (loading || error) && 'hidden'
                  )}
                >
                  {pages.map((pageNum) => {
                    const pageFields = fields.filter((f) => f.page === pageNum)
                    return (
                      <div
                        key={pageNum}
                        ref={(el) => {
                          if (el) pageContainerRefs.current.set(pageNum, el)
                          else pageContainerRefs.current.delete(pageNum)
                        }}
                        data-testid={`pdf-page-${pageNum}`}
                        data-page-number={pageNum}
                        onDragOver={handleCanvasDragOver}
                        onDrop={(e) => handlePageDrop(e, pageNum)}
                        className="relative w-full rounded-lg overflow-hidden bg-white shadow-xs border border-zinc-200/60"
                      >
                        <canvas
                          ref={(el) => {
                            if (el) canvasRefs.current.set(pageNum, el)
                            else canvasRefs.current.delete(pageNum)
                          }}
                          className="block w-full h-auto"
                        />

                        {/* Overlaid Placed Fields for this Page */}
                        {pageFields.map((field) => {
                          const isSelected = activeFieldId === field.id
                          const isSuggestion = !!field.is_suggestion

                          return (
                            <div
                              key={field.id}
                              data-testid={`field-placeholder-${field.id}`}
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
                              className={cn(
                                'field-placeholder group absolute flex items-center justify-between p-1.5 transition-colors cursor-move select-none',
                                isSelected && 'drag-over z-20',
                                !isSelected && 'z-10'
                              )}
                            >
                              <div className="flex items-center gap-1.5 text-[12px] text-[#8A8A8A] font-medium truncate pointer-events-none">
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
                                  <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.2 text-[9px] font-medium bg-zinc-200/80 text-zinc-700">
                                    ✨ Suggested
                                  </span>
                                )}

                                {field.assigned_to === 'sender' && !isSuggestion && (
                                  <span className="inline-flex items-center rounded px-1 py-0.2 text-[9px] font-medium bg-zinc-200/80 text-zinc-700">
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
                                    className="bg-zinc-800 hover:bg-zinc-900 text-white p-0.5 rounded shadow-sm transition-all"
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

                              {/* Floating Field Inspector Popover */}
                              {isSelected && (
                                <div
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                  style={
                                    field.y > 0.65
                                      ? { bottom: '100%', left: 0, marginBottom: '8px' }
                                      : { top: '100%', left: 0, marginTop: '8px' }
                                  }
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
                                          handleUpdateActiveField({
                                            assigned_to: 'signer',
                                          })
                                        }
                                        className={`py-1 px-2 rounded-lg border text-xs font-medium transition-colors ${
                                          field.assigned_to === 'signer'
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border text-muted-foreground hover:bg-muted'
                                        }`}
                                      >
                                        Signer
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUpdateActiveField({
                                            assigned_to: 'sender',
                                          })
                                        }
                                        className={`py-1 px-2 rounded-lg border text-xs font-medium transition-colors ${
                                          field.assigned_to === 'sender'
                                            ? 'border-zinc-800 bg-zinc-100 text-zinc-900 font-semibold'
                                            : 'border-border text-muted-foreground hover:bg-muted'
                                        }`}
                                      >
                                        Me (Sender)
                                      </button>
                                    </div>
                                  </div>

                                  {field.assigned_to === 'sender' && (
                                    <div className="pt-1">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="w-full text-xs h-7"
                                        onClick={() => setSenderSignModalOpen(true)}
                                      >
                                        {field.value ? 'Re-sign field' : 'Sign field now'}
                                      </Button>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between pt-1 border-t text-xs">
                                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                                      <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(e) =>
                                          handleUpdateActiveField({
                                            required: e.target.checked,
                                          })
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
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR: Insert Options (Gated) */}
        <FieldPalette
          disabled={step === 'upload'}
          fields={fields}
          activeFieldId={activeFieldId}
          currentPage={currentPage}
          onItemClick={(item) => addFieldAtCoords(item, 0.38, 0.45, currentPage)}
          onFieldClick={(id, p) => {
            setCurrentPage(p)
            setActiveFieldId(id)
            scrollToPage(p)
          }}
          onDeleteField={handleDeleteField}
          onAcceptSuggestion={handleAcceptSingleSuggestion}
        />
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete draft document?</DialogTitle>
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
    </div>
  )
}
