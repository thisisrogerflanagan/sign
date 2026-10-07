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
  ZoomIn,
  ZoomOut,
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
}

export function SendFlowEditor({
  initialStep = 'upload',
  documentId: propDocId,
}: SendFlowEditorProps) {
  const router = useRouter()
  const { toast } = useToast()

  // Step state: 'upload' or 'place'
  const [step, setStep] = useState<'upload' | 'place'>(initialStep)
  const [documentId, setDocumentId] = useState<string>(propDocId || '')

  // Document metadata state
  const [docTitle, setDocTitle] = useState('Document')
  const [fileName, setFileName] = useState('')
  const [fileSizeBytes, setFileSizeBytes] = useState<number | undefined>(undefined)
  const [docCreatedAt, setDocCreatedAt] = useState<string | null>(null)
  const [docUpdatedAt, setDocUpdatedAt] = useState<string | null>(null)
  const [docAuthor, setDocAuthor] = useState<string>('Roger Flanagan')
  const [docStatus, setDocStatus] = useState<string>('draft')
  const [pageCount, setPageCount] = useState<number>(1)
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
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [numPages, setNumPages] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.1)

  // Fields state
  const [fields, setFields] = useState<PlacedFieldData[]>([])
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null)
  const [savedStatus, setSavedStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Modals & Action states
  const [senderSignModalOpen, setSenderSignModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Refs
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
      if (!canvasRef.current || !doc) return

      try {
        const page = await doc.getPage(pageNum)
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        if (!context) return

        const outputScale = window.devicePixelRatio || 1
        const viewport = page.getViewport({ scale: currentScale * outputScale })

        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = Math.floor(viewport.width / outputScale) + 'px'
        canvas.style.height = Math.floor(viewport.height / outputScale) + 'px'

        const renderContext = {
          canvasContext: context,
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
        setPageCount(doc.numPages)
        renderPage(doc, currentPage, scale)
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error rendering PDF:', err)
          setError('Failed to load and render PDF pages')
        }
      }
    }

    loadAndRender()

    return () => {
      isCancelled = true
    }
  }, [pdfUrl])

  useEffect(() => {
    if (pdfDocRef.current) {
      renderPage(pdfDocRef.current, currentPage, scale)
    }
  }, [currentPage, scale, renderPage])

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
  function addFieldAtCoords(item: PaletteItem, normX: number, normY: number) {
    const dims = DEFAULT_DIMENSIONS[item.type]
    const clampedX = Math.max(0, Math.min(1 - dims.width, normX))
    const clampedY = Math.max(0, Math.min(1 - dims.height, normY))

    const newField: PlacedFieldData = {
      id: Math.random().toString(36).substring(2),
      type: item.type,
      label: item.defaultLabel,
      page: currentPage,
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
      description: `${item.label} placed on page ${currentPage}.`,
    })
  }

  // Drag over / drop on canvas
  function handleCanvasDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleCanvasDrop(e: React.DragEvent) {
    e.preventDefault()
    const itemId = e.dataTransfer.getData('text/plain')
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

    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const dropX = e.clientX - rect.left
    const dropY = e.clientY - rect.top

    const dims = DEFAULT_DIMENSIONS[item.type]
    const normX = (dropX - (dims.width * rect.width) / 2) / rect.width
    const normY = (dropY - (dims.height * rect.height) / 2) / rect.height

    addFieldAtCoords(item, normX, normY)
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
              {step === 'upload' ? 'Cancel' : 'Save draft & exit'}
            </Link>
          </Button>
          {step === 'place' && (
            <>
              <div className="h-4 w-px bg-border hidden sm:block" />
              <span className="font-semibold text-sm truncate max-w-[200px] sm:max-w-xs">
                {docTitle}
              </span>
            </>
          )}
        </div>

        {/* Stepper indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
              step === 'upload'
                ? 'bg-primary text-primary-foreground'
                : 'bg-emerald-100 text-emerald-800'
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
          {savedStatus && (
            <span className="text-xs text-muted-foreground animate-in fade-in flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              {savedStatus}
            </span>
          )}

          {step === 'place' && (
            <Button
              size="sm"
              onClick={handleSendDocument}
              disabled={fields.length === 0}
              data-testid="continue-to-review-button"
            >
              Review & send
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Main 3-Column Layout: Left Info Panel + Center Canvas + Right Field Palette */}
      <div className="flex flex-1 overflow-hidden p-4 gap-4 bg-[#FCFDFE]">
        {/* LEFT SIDEBAR: Stand-Alone Info Panel with Tab Nav */}
        <InfoPanel
          documentTitle={docTitle}
          fileName={fileName || uploadFile?.name}
          pageCount={pageCount}
          fileSizeBytes={fileSizeBytes || uploadFile?.size}
          uploadDate={docCreatedAt}
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

        {/* CENTER AREA: Document Canvas (Upload area before upload, PDF viewer after) */}
        <main
          ref={containerRef}
          onClick={() => setActiveFieldId(null)}
          className="flex-1 min-w-0 h-full overflow-auto flex flex-col items-center justify-start bg-zinc-100/70 rounded-2xl border border-black/[0.04] p-6 relative"
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
            <>
              {/* Auto-detect suggestions bar */}
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
                  {/* Floating Pill Controls bar */}
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
                    onClick={() => setActiveFieldId(null)}
                    onDragOver={handleCanvasDragOver}
                    onDrop={handleCanvasDrop}
                    className="relative cursor-default rounded-lg shadow-xl bg-white select-none border border-zinc-200"
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
                          className={`group absolute flex items-center justify-between rounded-md p-1.5 transition-all cursor-move select-none ${
                            isSuggestion
                              ? isSelected
                                ? 'border-2 border-amber-600 bg-amber-100/90 text-amber-950 shadow-md ring-2 ring-amber-400 z-20'
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

                          {/* Floating Field Inspector Popover */}
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
                                        : 'border-border text-muted-foreground hover:bg-muted'
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
                                        ? 'border-purple-600 bg-purple-50 text-purple-800'
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
                </div>
              )}
            </>
          )}
        </main>

        {/* RIGHT SIDEBAR: Insert Options (Gated) */}
        <FieldPalette
          disabled={step === 'upload'}
          fields={fields}
          activeFieldId={activeFieldId}
          currentPage={currentPage}
          onItemClick={(item) => addFieldAtCoords(item, 0.38, 0.45)}
          onFieldClick={(id, p) => {
            setCurrentPage(p)
            setActiveFieldId(id)
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
