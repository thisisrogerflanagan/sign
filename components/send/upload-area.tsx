'use client'

import React, { useRef, useState } from 'react'
import { UploadCloud, FileText, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { THUMBNAIL_CARD_STYLE } from '@/components/documents/document-thumbnail'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export interface UploadAreaProps {
  file: File | null
  title: string
  onFileSelect: (file: File) => void
  onTitleChange: (title: string) => void
  onContinueUpload: () => void
  uploading: boolean
  error: string | null
}

export function UploadArea({
  file,
  title,
  onFileSelect,
  onTitleChange,
  onContinueUpload,
  uploading,
  error,
}: UploadAreaProps) {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileValidation(selectedFile: File) {
    if (
      selectedFile.type !== 'application/pdf' &&
      !selectedFile.name.toLowerCase().endsWith('.pdf')
    ) {
      alert('Please select a valid PDF file. Other file types cannot be processed.')
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      alert(
        `File is too large (${(selectedFile.size / (1024 * 1024)).toFixed(
          1
        )} MB). The maximum allowed size is 10 MB.`
      )
      return
    }

    onFileSelect(selectedFile)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileValidation(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="w-full flex flex-col items-center justify-center p-4">
      {/* Upload area card matching All docs thumbnail style exactly */}
      <div
        style={THUMBNAIL_CARD_STYLE}
        className="w-full max-w-xl bg-white rounded-[4px] border border-black/[0.04] p-8 sm:p-10 space-y-6"
      >
        <div className="space-y-1.5 text-center">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Upload a document to send
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Upload the PDF you want to get signed. Up to 10 MB.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive flex items-start gap-3">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

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
                handleFileValidation(e.target.files[0])
              }
            }}
          />

          {file ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground truncate max-w-xs">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB &bull; Click to choose another
                file
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

        {/* Title Field (shown when file is selected) */}
        {file && (
          <div className="space-y-2 animate-in fade-in">
            <Label htmlFor="title" className="text-xs font-medium">
              Document Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="e.g. Master Services Agreement"
              disabled={uploading}
              data-testid="document-title-input"
              className="text-xs sm:text-sm h-9"
            />
            <p className="text-[11px] text-muted-foreground">
              This title is visible to your signer and shown on confirmation emails.
            </p>
          </div>
        )}

        {/* Submit Action */}
        <div className="pt-2">
          <Button
            className="w-full h-10 text-xs sm:text-sm font-semibold"
            disabled={!file || uploading}
            onClick={onContinueUpload}
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
    </div>
  )
}
