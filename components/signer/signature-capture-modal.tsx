'use client'

import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pen, Type, RotateCcw, Check } from 'lucide-react'

interface SignatureCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (dataUrl: string) => void
  title?: string
}

export function SignatureCaptureModal({
  isOpen,
  onClose,
  onSave,
  title = 'Adopt your signature',
}: SignatureCaptureModalProps) {
  const [mode, setMode] = useState<'draw' | 'type'>('draw')
  const [typedName, setTypedName] = useState('')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const hasDrawnRef = useRef(false)

  if (!isOpen) return null

  // Drawing handlers
  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
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

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
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

  function handleAdopt() {
    if (mode === 'draw') {
      const canvas = canvasRef.current
      if (!canvas || !hasDrawnRef.current) return
      const dataUrl = canvas.toDataURL('image/png')
      onSave(dataUrl)
    } else {
      if (!typedName.trim()) return
      // Render typed text to temporary canvas as PNG
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = 400
      tempCanvas.height = 160
      const ctx = tempCanvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#0f172a'
        ctx.font = 'italic 44px "Brush Script MT", "Segoe Script", cursive, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(typedName.trim(), 200, 80)
        onSave(tempCanvas.toDataURL('image/png'))
      }
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl space-y-5 animate-in zoom-in-95">
        <div className="space-y-1 text-center">
          <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">
            Draw your signature or type your name with a script font.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border bg-muted/40 p-1 text-xs">
            <button
              type="button"
              onClick={() => setMode('draw')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                mode === 'draw'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Pen className="h-3.5 w-3.5" />
              Draw
            </button>
            <button
              type="button"
              onClick={() => setMode('type')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                mode === 'type'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Type className="h-3.5 w-3.5" />
              Type
            </button>
          </div>
        </div>

        {mode === 'draw' ? (
          <div className="space-y-2">
            <div className="relative rounded-xl border bg-white overflow-hidden shadow-inner touch-none">
              <canvas
                ref={canvasRef}
                width={460}
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
              <div className="absolute bottom-2 left-4 right-4 border-b border-dashed border-zinc-200 pointer-events-none" />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearCanvas}
                className="text-xs text-muted-foreground h-7"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              placeholder="Type your full name"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              className="text-base"
              autoFocus
            />
            <div className="flex h-36 items-center justify-center rounded-xl border bg-white p-4 shadow-inner">
              <span className="font-serif italic text-3xl sm:text-4xl text-foreground truncate max-w-full">
                {typedName || 'Your Signature'}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
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
  )
}
