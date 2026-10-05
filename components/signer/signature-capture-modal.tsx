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
  const pointsRef = useRef<{ x: number; y: number; pressure: number }[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Reset or update name when defaultName changes
  useEffect(() => {
    if (defaultName && !typedName) {
      setTypedName(defaultName)
    }
  }, [defaultName, typedName])

  // Sync canvas resolution to actual displayed DOM dimensions * devicePixelRatio
  useEffect(() => {
    if (mode !== 'draw' || !isOpen) return
    const canvas = canvasRef.current
    if (!canvas) return

    const updateCanvasResolution = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
      const displayWidth = Math.round(rect.width) || 520
      const displayHeight = Math.round(rect.height) || 180

      canvas.width = Math.floor(displayWidth * dpr)
      canvas.height = Math.floor(displayHeight * dpr)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = '#0f172a'
      }
    }

    const timer = setTimeout(updateCanvasResolution, 50)
    window.addEventListener('resize', updateCanvasResolution)
    window.addEventListener('orientationchange', updateCanvasResolution)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateCanvasResolution)
      window.removeEventListener('orientationchange', updateCanvasResolution)
    }
  }, [mode, isOpen])

  // Critical for iOS Safari and Android Chrome: prevent default page scrolling while touching canvas
  useEffect(() => {
    if (mode !== 'draw' || !isOpen) return
    const canvas = canvasRef.current
    if (!canvas) return

    const preventTouchScroll = (e: TouchEvent) => {
      if (e.target === canvas) {
        e.preventDefault()
      }
    }

    canvas.addEventListener('touchstart', preventTouchScroll, { passive: false })
    canvas.addEventListener('touchmove', preventTouchScroll, { passive: false })
    canvas.addEventListener('touchend', preventTouchScroll, { passive: false })

    return () => {
      canvas.removeEventListener('touchstart', preventTouchScroll)
      canvas.removeEventListener('touchmove', preventTouchScroll)
      canvas.removeEventListener('touchend', preventTouchScroll)
    }
  }, [mode, isOpen])

  if (!isOpen) return null

  // 1. Unified Pointer Drawing Handlers (Finger, Stylus/Apple Pencil, Mouse)
  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}

    isDrawingRef.current = true
    hasDrawnRef.current = true

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5

    pointsRef.current = [{ x, y, pressure }]

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.arc(x, y, 1.25, 0, Math.PI * 2)
    ctx.fillStyle = '#0f172a'
    ctx.fill()
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5

    const points = pointsRef.current
    points.push({ x, y, pressure })

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (points.length >= 3) {
      const p0 = points[points.length - 3]
      const p1 = points[points.length - 2]
      const p2 = points[points.length - 1]

      const mid1X = (p0.x + p1.x) / 2
      const mid1Y = (p0.y + p1.y) / 2
      const mid2X = (p1.x + p2.x) / 2
      const mid2Y = (p1.y + p2.y) / 2

      ctx.beginPath()
      ctx.moveTo(mid1X, mid1Y)
      ctx.quadraticCurveTo(p1.x, p1.y, mid2X, mid2Y)

      const strokeWidth = pressure
        ? Math.max(1.8, Math.min(4.2, 2.5 * pressure * 1.4))
        : 2.5

      ctx.lineWidth = strokeWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#0f172a'
      ctx.stroke()
    } else if (points.length === 2) {
      const p0 = points[0]
      const p1 = points[1]
      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#0f172a'
      ctx.stroke()
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    pointsRef.current = []
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    hasDrawnRef.current = false
    pointsRef.current = []
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4 animate-in fade-in">
      <div className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl border-t sm:border bg-card p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="text-xs text-muted-foreground">
              Choose how you want your signature to look on this document.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-2 rounded-lg -mr-1"
          >
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        </div>

        {/* 3 Capture Mode Tabs with 44px min touch targets */}
        <div className="flex justify-center shrink-0">
          <div className="grid grid-cols-3 w-full sm:w-auto sm:inline-flex rounded-xl border bg-muted/50 p-1 text-xs gap-1">
            <button
              type="button"
              onClick={() => setMode('type')}
              className={`flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-1.5 rounded-lg font-medium transition-all min-h-[44px] sm:min-h-0 ${
                mode === 'type'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Type className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              Type
            </button>
            <button
              type="button"
              onClick={() => setMode('draw')}
              className={`flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-1.5 rounded-lg font-medium transition-all min-h-[44px] sm:min-h-0 ${
                mode === 'draw'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Pen className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              Draw
            </button>
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-1.5 rounded-lg font-medium transition-all min-h-[44px] sm:min-h-0 ${
                mode === 'upload'
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Upload className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
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
                className="text-base sm:text-sm h-11 sm:h-10"
                autoFocus
              />
            </div>

            {/* Font Options Grid (4 self-hosted open-licensed fonts) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Select Script Style
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 sm:max-h-64 overflow-y-auto pr-0.5">
                {SIGNATURE_FONTS.map((font) => {
                  const isSelected = selectedFontId === font.id

                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => setSelectedFontId(font.id)}
                      className={`relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all min-h-[72px] ${
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

        {/* MODE 2: DRAW (Touch-optimized for iOS Safari & Android Chrome) */}
        {mode === 'draw' && (
          <div className="space-y-2.5">
            <div
              className="relative rounded-2xl border-2 border-zinc-200 bg-white overflow-hidden shadow-inner touch-none"
              style={{ touchAction: 'none' }}
            >
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="w-full h-52 sm:h-44 block cursor-crosshair touch-none select-none"
                style={{ touchAction: 'none' }}
              />
              {/* Signature Baseline Cue */}
              <div className="absolute bottom-4 left-6 right-6 border-b border-dashed border-zinc-300/80 pointer-events-none" />
              <div className="absolute bottom-1 right-3 text-[10px] font-mono text-zinc-300 select-none pointer-events-none">
                Sign above line
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span className="hidden sm:inline">
                Draw with finger, Apple Pencil, or mouse.
              </span>
              <span className="sm:hidden text-[11px] text-zinc-500 font-medium">
                Tip: Rotate phone horizontally for a wider pad
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                className="h-8 text-xs text-muted-foreground hover:text-foreground px-3"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
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
