'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UploadCloud, FileText, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export default function SendUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function validateAndSelectFile(selectedFile: File) {
    setError(null)

    if (
      selectedFile.type !== 'application/pdf' &&
      !selectedFile.name.toLowerCase().endsWith('.pdf')
    ) {
      setError('Please select a valid PDF file. Other file types cannot be processed.')
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(
        `File is too large (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB). The maximum allowed size is 10 MB.`
      )
      return
    }

    setFile(selectedFile)
    if (!title) {
      setTitle(selectedFile.name.replace(/\.pdf$/i, ''))
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0])
    }
  }

  async function handleUploadAndContinue() {
    if (!file || uploading) return
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title || file.name.replace(/\.pdf$/i, ''))

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload document')
      }

      // Successfully created draft; navigate to place fields step
      router.push(`/send/${data.documentId}/place`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong during upload. Please try again.')
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FCFDFE] pb-16">
      {/* Step Header */}
      <div className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Cancel
            </Link>
          </Button>

          {/* Stepper indicator */}
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
              1
            </span>
            <span className="font-semibold text-foreground">Upload</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="text-muted-foreground">Place fields</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="text-muted-foreground">Review & send</span>
          </div>

          <div className="w-16" />
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 pt-10 sm:px-6">
        <div className="space-y-2 text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Upload a document to send</h1>
          <p className="text-sm text-muted-foreground">
            Upload the PDF you want to get signed. Up to 10 MB.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive flex items-start gap-3">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm space-y-6">
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-[#FCFDFE]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              data-testid="upload-pdf-input"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  validateAndSelectFile(e.target.files[0])
                }
              }}
            />

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB &bull; Click to choose
                  another file
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    PDF files only &bull; Up to 10 MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Title Field */}
          {file && (
            <div className="space-y-2 animate-in fade-in">
              <Label htmlFor="title">Document Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Master Services Agreement"
                disabled={uploading}
                data-testid="document-title-input"
              />
              <p className="text-[11px] text-muted-foreground">
                This title is visible to your signer and shown on confirmation emails.
              </p>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <Button
              className="w-full"
              disabled={!file || uploading}
              onClick={handleUploadAndContinue}
              data-testid="upload-continue-button"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading & verifying PDF...
                </>
              ) : (
                'Continue to place fields'
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
