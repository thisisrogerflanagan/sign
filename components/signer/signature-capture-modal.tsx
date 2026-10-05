'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pen, Type, Upload, RotateCcw, Check, X, Image as ImageIcon } from 'lucide-react'

export interface ScriptFontOption {
  id: string
  name: string
  fontFamily: string
  fontSize: string
  canvasFontSize: number
  styleDescription: string
}

export const SIGNATURE_FONTS: ScriptFontOption[] = [
  {
    id: 'caveat',
    name: 'Caveat',
    fontFamily: "'Caveat', cursive",
    fontSize: '36px',
    canvasFontSize: 52,
    styleDescription: 'Casual & modern',
  },
  {
    id: 'allura',
    name: 'Allura',
    fontFamily: "'Allura', cursive",
    fontSize: '42px',
    canvasFontSize: 60,
    styleDescription: 'Elegant & classic cursive',
  },
  {
    id: 'sacramento',
    name: 'Sacramento',
    fontFamily: "'Sacramento', cursive",
    fontSize: '38px',
    canvasFontSize: 56,
    styleDescription: 'Delicate connected script',
  },
  {
    id: 'homemade-apple',
    name: 'Homemade Apple',
    fontFamily: "'Homemade Apple', cursive",
    fontSize: '26px',
    canvasFontSize: 38,
    styleDescription: 'Authentic ink signature',
  },
]

interface SignatureCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (dataUrl: string) => void
  title?: string
  defaultName?: string
}

export function SignatureCaptureModal({
  isOpen,
  onClose,
  onSave,
  title = 'Adopt your signature',
  defaultName = '',
}: SignatureCaptureModalProps) {
  // Capture modes: 'type' (default, most popular), 'draw', 'upload'
  const [mode, setMode] = useState<'type' | 'draw' | 'upload'>('type')
  const [typedName, setTypedName] = useState(defaultName)
  const [selectedFontId, setSelectedFontId] = useState<string>('caveat')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const hasDrawnRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Reset or update name when defaultName changes
  useEffect(() => {
    if (defaultName && !typedName) {
      setTypedName(defaultName)
    }
  }, [defaultName, typedName])

  if (!isOpen) return null

  // 1. Drawing Canvas Handlers
  function startDrawing(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current
    if (!canvas) return
    isDrawingRef.current = true
    hasDrawnRef.current = true

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
  }

  function draw(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
  }

  function stopDrawing() {
    isDrawingRef.current = false
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasDrawnRef.current = false
  }

  // 2. Upload Handler
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, or WEBP).')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setUploadedImage(result)
    }
    reader.readAsDataURL(file)
  }

  // 3. Adopt & Export Signature
  async function handleAdopt() {
    if (mode === 'draw') {
      const canvas = canvasRef.current
      if (!canvas || !hasDrawnRef.current) return
      const dataUrl = canvas.toDataURL('image/png')
      onSave(dataUrl)
      onClose()
    } else if (mode === 'upload') {
      if (!uploadedImage) return
      onSave(uploadedImage)
      onClose()
    } else {
      // Type mode: render to high-res off-screen canvas using chosen self-hosted font
      const textToRender = (typedName || defaultName || 'Signature').trim()
      if (!textToRender) return

      const selectedFont =
        SIGNATURE_FONTS.find((f) => f.id === selectedFontId) || SIGNATURE_FONTS[0]

      // Ensure fonts are ready before rasterizing
      if (typeof document !== 'undefined' && document.fonts) {
        await document.fonts.ready
      }

      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = 600
      tempCanvas.height = 200
      const ctx = tempCanvas.getContext('2d')

      if (ctx) {
        ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
        ctx.fillStyle = '#0f172a'
        ctx.font = `${selectedFont.canvasFontSize}px ${selectedFont.fontFamily}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(textToRender, tempCanvas.width / 2, tempCanvas.height / 2)

        const dataUrl = tempCanvas.toDataURL('image/png')
        onSave(dataUrl)
        onClose()
      }
    }
  }

  const currentDisplayText = (typedName || defaultName || 'Your Signature').trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">
              Choose how you want your signature to look on this document.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3 Capture Mode Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-xl border bg-muted/50 p-1 text-xs">
            <button
              type="button"
              onClick={() => setMode('type')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium transition-all ${
                mode === 'type'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Type className="h-3.5 w-3.5" />
              Type
            </button>
            <button
              type="button"
              onClick={() => setMode('draw')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium transition-all ${
                mode === 'draw'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Pen className="h-3.5 w-3.5" />
              Draw
            </button>
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium transition-all ${
                mode === 'upload'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </button>
          </div>
        </div>

        {/* MODE 1: TYPE (Script Fonts) */}
        {mode === 'type' && (
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Type your full name"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className="text-sm h-10"
                autoFocus
              />
            </div>

            {/* Font Options Grid (4 self-hosted open-licensed fonts) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Select Script Style
              </label>

              <div className="grid grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-0.5">
                {SIGNATURE_FONTS.map((font) => {
                  const isSelected = selectedFontId === font.id

                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => setSelectedFontId(font.id)}
                      className={`relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                          : 'border-border bg-card hover:bg-muted/40 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {font.name}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>

                      {/* Script Preview */}
                      <div className="h-16 flex items-center justify-center overflow-hidden px-1">
                        <span
                          style={{
                            fontFamily: font.fontFamily,
                            fontSize: font.fontSize,
                          }}
                          className="text-foreground truncate max-w-full select-none"
                        >
                          {currentDisplayText}
                        </span>
                      </div>

                      <span className="text-[10px] text-muted-foreground/80 mt-1 truncate">
                        {font.styleDescription}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: DRAW */}
        {mode === 'draw' && (
          <div className="space-y-2">
            <div className="relative rounded-xl border bg-white overflow-hidden shadow-inner touch-none">
              <canvas
                ref={canvasRef}
                width={520}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-40 cursor-crosshair block"
              />
              <div className="absolute bottom-3 left-4 right-4 border-b border-dashed border-zinc-200 pointer-events-none" />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Draw with mouse, trackpad, or finger.</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearCanvas}
                className="h-7 text-xs text-muted-foreground"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* MODE 3: UPLOAD */}
        {mode === 'upload' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!uploadedImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors text-center space-y-2"
              >
                <div className="p-3 rounded-full bg-background border shadow-xs">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Click to upload signature image
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    PNG with transparent background looks best (max 5 MB)
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-40 border rounded-xl bg-white p-3 flex items-center justify-center overflow-hidden">
                  <img
                    src={uploadedImage}
                    alt="Uploaded signature"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUploadedImage(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="text-xs text-muted-foreground h-7"
                  >
                    Upload different image
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-[11px] text-muted-foreground">
            Legally binding under ESIGN Act & UETA.
          </p>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdopt}>
              <Check className="mr-1.5 h-4 w-4" />
              Adopt and place
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
