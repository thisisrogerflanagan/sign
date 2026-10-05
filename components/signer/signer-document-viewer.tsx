'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileCheck,
  FileSignature,
  Calendar,
  Type,
  User,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
  Ban,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SignatureCaptureModal } from './signature-capture-modal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SignerDocumentViewerProps {
  token: string
  documentId: string
  documentTitle: string
  pageCount: number
  senderDisplayName: string
  signerName: string
  signerEmail: string
  fields: any[]
  pdfUrl: string
}

export function SignerDocumentViewer({
  token,
  documentId,
  documentTitle,
  pageCount,
  senderDisplayName,
  signerName,
  signerEmail,
  fields: initialFields,
  pdfUrl,
}: SignerDocumentViewerProps) {
  // Stepper state: 'landing' -> 'signing' -> 'review'
  const [step, setStep] = useState<'landing' | 'signing' | 'review'>('landing')
  const [fields, setFields] = useState<any[]>(initialFields)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.1)
  const [loadingPdf, setLoadingPdf] = useState(true)

  // Modals & interaction
  const [signatureModalOpen, setSignatureModalOpen] = useState(false)
  const [textModalOpen, setTextModalOpen] = useState(false)
  const [textInputValue, setTextInputValue] = useState('')
  const [activeField, setActiveField] = useState<any | null>(null)
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [declined, setDeclined] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pdfDocRef = useRef<any>(null)
  const router = useRouter()

  // 1. Render PDF with pdfjs-dist
  useEffect(() => {
    if (step === 'landing' || !pdfUrl) return

    let isCancelled = false

    async function loadPdf() {
      try {
        setLoadingPdf(true)
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

        const loadingTask = pdfjs.getDocument({ url: pdfUrl })
        const doc = await loadingTask.promise
        if (isCancelled) return

        pdfDocRef.current = doc
        renderPage(doc, currentPage, scale)
      } catch (err) {
        console.error('Signer PDF load error:', err)
      } finally {
        setLoadingPdf(false)
      }
    }

    loadPdf()
    return () => {
      isCancelled = true
    }
  }, [step, pdfUrl])

  const renderPage = useCallback(
    async (doc: any, pageNum: number, currentScale: number) => {
      if (!doc || !canvasRef.current) return

      try {
        const page = await doc.getPage(pageNum)
        // Crisp Retina vector rasterization: render at true native pixel density (min 2x)
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
        const outputScale = Math.max(dpr, 2)
        const viewport = page.getViewport({ scale: currentScale * outputScale })

        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        if (!context) return

        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = Math.floor(viewport.width / outputScale) + 'px'
        canvas.style.height = Math.floor(viewport.height / outputScale) + 'px'

        await page.render({
          canvasContext: context,
          viewport,
        }).promise
      } catch (err) {
        console.error('Error rendering signer page:', err)
      }
    },
    []
  )

  useEffect(() => {
    if (pdfDocRef.current && step !== 'landing') {
      renderPage(pdfDocRef.current, currentPage, scale)
    }
  }, [currentPage, scale, step, renderPage])

  // 2. Field Value Updates
  async function saveFieldValue(fieldId: string, value: string) {
    // Optimistic UI update
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId ? { ...f, value, filled_at: new Date().toISOString() } : f
      )
    )

    try {
      await fetch(`/api/sign/${token}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId, value }),
      })
    } catch (err) {
      console.error('Failed to sync field value:', err)
    }
  }

  // Auto-fill date and name fields once entering signing step
  useEffect(() => {
    if (step === 'signing' && fields.length > 0) {
      const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })

      fields.forEach((f) => {
        if (!f.value) {
          if (f.type === 'date') {
            saveFieldValue(f.id, today)
          } else if (f.type === 'name' && signerName) {
            saveFieldValue(f.id, signerName)
          }
        }
      })
    }
  }, [step, fields, signerName])

  function handleFieldClick(field: any) {
    setActiveField(field)
    if (field.type === 'signature' || field.type === 'initials') {
      setSignatureModalOpen(true)
    } else if (field.type === 'date') {
      const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
      saveFieldValue(field.id, field.value || today)
    } else if (field.type === 'name') {
      saveFieldValue(field.id, field.value || signerName || 'Signer')
    } else if (field.type === 'text') {
      setTextInputValue(field.value || '')
      setTextModalOpen(true)
    }
  }

  // 3. Decline Action
  async function handleDecline() {
    try {
      await fetch(`/api/sign/${token}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason }),
      })
      setDeclined(true)
      setDeclineDialogOpen(false)
    } catch (err) {
      console.error('Decline error:', err)
    }
  }

  // 4. Complete Action
  async function handleComplete() {
    setCompleting(true)
    try {
      const res = await fetch(`/api/sign/${token}/complete`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to complete signing')

      setDownloadUrl(data.downloadUrl)
      setCompleted(true)
    } catch (err: any) {
      alert(err.message || 'Failed to complete document.')
    } finally {
      setCompleting(false)
    }
  }

  // Progress metrics
  const requiredFields = fields.filter((f) => f.required)
  const filledRequiredFields = requiredFields.filter((f) => !!f.value)
  const allRequiredFilled = requiredFields.length === filledRequiredFields.length

  // Edge view: Just declined
  if (declined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FCFDFE]">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center space-y-4 shadow-sm animate-in fade-in">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
            <Ban className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Request declined</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You declined to sign &quot;{documentTitle}&quot;. We have notified{' '}
            {senderDisplayName}.
          </p>
        </div>
      </div>
    )
  }

  // Edge view: Completed & Done
  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FCFDFE]">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center space-y-5 shadow-sm animate-in fade-in">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight">You&apos;re all done!</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              &quot;{documentTitle}&quot; has been signed. A final PDF with the
              tamper-evident activity record has been emailed to{' '}
              <span className="font-semibold text-foreground">{signerEmail}</span>.
            </p>
          </div>

          {downloadUrl && (
            <div className="pt-2">
              <Button asChild className="w-full">
                <a href={downloadUrl} target="_blank" rel="noreferrer" download>
                  Download signed PDF
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Step 1: Signer Landing View
  if (step === 'landing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FCFDFE]">
        <div className="w-full max-w-lg rounded-2xl border bg-card p-8 shadow-sm space-y-6 text-center animate-in fade-in">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileSignature className="h-6 w-6" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{documentTitle}</h1>
            <p className="text-sm text-muted-foreground">
              Sent by <strong className="text-foreground">{senderDisplayName}</strong>{' '}
              &bull; {pageCount} page{pageCount === 1 ? '' : 's'}
            </p>
          </div>

          <div className="rounded-xl bg-muted/40 p-4 border text-left text-xs space-y-2 text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Electronic Signature Disclosure & Consent
            </p>
            <p>
              By clicking <strong>Review & Sign</strong>, you agree to review and
              electronically sign this document. You understand that your electronic
              signature is legally binding to the same extent as a pen-and-paper signature
              under the ESIGN Act and UETA.
            </p>
            <p>
              <Link
                href="/legal/esign-consent"
                target="_blank"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Read our full Electronic Records Disclosure
                <ExternalLink className="h-3 w-3" />
              </Link>
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button className="w-full" size="lg" onClick={() => setStep('signing')}>
              Review & Sign Document
            </Button>
            <div>
              <button
                type="button"
                onClick={() => setDeclineDialogOpen(true)}
                className="text-xs text-muted-foreground hover:text-destructive underline transition-colors"
              >
                I decline to sign this document
              </button>
            </div>
          </div>
        </div>

        {/* Decline Dialog */}
        <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Decline to sign &quot;{documentTitle}&quot;?</DialogTitle>
              <DialogDescription>
                The sender will be notified that you declined this signature request.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Input
                placeholder="Optional reason for declining"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeclineDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDecline}>
                Decline request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  const pageFields = fields.filter((f) => f.page === currentPage)

  // Step 2 & 3: Signing & Review Views
  return (
    <div className="flex h-screen flex-col bg-[#FCFDFE]">
      {/* Signer Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 sm:px-6 z-20">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate max-w-xs">{documentTitle}</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            &bull; Sent by {senderDisplayName}
          </span>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {filledRequiredFields.length} of {requiredFields.length}
            </span>{' '}
            required fields filled
          </div>

          <Button
            size="sm"
            onClick={handleComplete}
            disabled={!allRequiredFilled || completing}
            className="shadow-sm"
          >
            {completing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finalizing...
              </>
            ) : (
              <>
                <FileCheck className="mr-1.5 h-4 w-4" />
                Sign and finish
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 overflow-auto p-4 sm:p-8 flex flex-col items-center justify-start bg-zinc-100/90">
        <div className="space-y-4 flex flex-col items-center">
          {/* Controls Bar */}
          <div className="flex items-center gap-4 bg-background/95 backdrop-blur-sm rounded-full border px-4 py-1.5 shadow-sm text-xs sticky top-0 z-10">
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
                Page {currentPage} of {pageCount}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage >= pageCount}
                onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
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

          {/* PDF Viewer Canvas */}
          <div className="relative rounded-lg shadow-xl bg-white border border-zinc-200 select-none">
            <canvas ref={canvasRef} className="block" />

            {/* Overlaid Placed Fields for Signer */}
            {pageFields.map((field) => {
              const hasVal = !!field.value

              return (
                <div
                  key={field.id}
                  onClick={() => handleFieldClick(field)}
                  style={{
                    position: 'absolute',
                    left: `${field.x * 100}%`,
                    top: `${field.y * 100}%`,
                    width: `${field.width * 100}%`,
                    height: `${field.height * 100}%`,
                  }}
                  className={`cursor-pointer flex items-center justify-center p-1 rounded border-2 transition-all ${
                    hasVal
                      ? 'border-emerald-600 bg-emerald-50/90 text-emerald-900 shadow-sm'
                      : 'border-amber-500 bg-amber-50/80 hover:bg-amber-100 text-amber-900 animate-pulse'
                  }`}
                >
                  {hasVal ? (
                    field.type === 'signature' || field.type === 'initials' ? (
                      /* Render image signature */
                      <img
                        src={field.value}
                        alt="Signature"
                        className="h-full w-full object-contain pointer-events-none"
                      />
                    ) : (
                      /* Render text/date value */
                      <span className="text-xs font-semibold truncate px-1 pointer-events-none">
                        {field.value}
                      </span>
                    )
                  ) : (
                    /* Prompt to fill */
                    <div className="flex items-center gap-1 text-[11px] font-semibold">
                      {field.type === 'signature' && (
                        <FileSignature className="h-3.5 w-3.5" />
                      )}
                      {field.type === 'initials' && (
                        <span className="font-bold text-xs">IN</span>
                      )}
                      {field.type === 'date' && <Calendar className="h-3.5 w-3.5" />}
                      {field.type === 'name' && <User className="h-3.5 w-3.5" />}
                      {field.type === 'text' && <Type className="h-3.5 w-3.5" />}
                      <span>
                        Tap to {field.type === 'name' ? 'fill name' : field.type}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* Signature & Initials Capture Modal */}
      <SignatureCaptureModal
        isOpen={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
        title={
          activeField?.type === 'initials'
            ? 'Adopt your initials'
            : 'Adopt your signature'
        }
        defaultName={signerName}
        onSave={(dataUrl) => {
          if (activeField) {
            saveFieldValue(activeField.id, dataUrl)
          }
        }}
      />

      {/* Free Text Input Dialog */}
      <Dialog open={textModalOpen} onOpenChange={setTextModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeField?.label || 'Enter information'}</DialogTitle>
            <DialogDescription>
              Please enter the requested information to complete this field.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              placeholder={activeField?.label || 'Type here...'}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (activeField) {
                    saveFieldValue(activeField.id, textInputValue.trim())
                    setTextModalOpen(false)
                  }
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTextModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (activeField) {
                  saveFieldValue(activeField.id, textInputValue.trim())
                  setTextModalOpen(false)
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
