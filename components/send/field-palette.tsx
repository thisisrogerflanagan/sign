'use client'

import React from 'react'
import { FileSignature, PenTool, Calendar, Type, GripVertical, Check } from 'lucide-react'
import { FieldType } from '@/lib/supabase/types'
import { PlacedFieldData } from './info-panel'

export interface PaletteItem {
  id: string
  type: FieldType
  label: string
  defaultLabel: string
  icon: React.ComponentType<{ className?: string }>
}

export const V1_PALETTE_ITEMS: PaletteItem[] = [
  {
    id: 'signature',
    type: 'signature',
    label: 'Signature *',
    defaultLabel: 'Signature',
    icon: FileSignature,
  },
  {
    id: 'initials',
    type: 'initials',
    label: 'Initials',
    defaultLabel: 'Initials',
    icon: PenTool,
  },
  {
    id: 'date',
    type: 'date',
    label: 'Date Signed',
    defaultLabel: 'Date Signed',
    icon: Calendar,
  },
  {
    id: 'text',
    type: 'text',
    label: 'Text',
    defaultLabel: 'Text',
    icon: Type,
  },
]

export interface FieldPaletteProps {
  disabled: boolean
  fields?: PlacedFieldData[]
  activeFieldId?: string | null
  currentPage?: number
  onItemClick?: (item: PaletteItem) => void
  onFieldClick?: (fieldId: string, page: number) => void
  onDeleteField?: (fieldId: string) => void
  onAcceptSuggestion?: (fieldId: string) => void
}

export function FieldPalette({
  disabled,
  fields = [],
  activeFieldId,
  onItemClick,
  onFieldClick,
  onAcceptSuggestion,
}: FieldPaletteProps) {
  const suggestionCount = fields.filter((f) => f.is_suggestion).length

  return (
    <aside
      aria-label="Insert options palette"
      className="w-72 shrink-0 bg-white rounded-2xl border border-black/[0.06] shadow-sm flex flex-col overflow-hidden h-full z-10"
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Insert Fields
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          {disabled
            ? 'Upload a document to start placing fields.'
            : 'Drag and drop any item to the document'}
        </p>
      </div>

      {/* Field Palette Items */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        <div className="space-y-2">
          {V1_PALETTE_ITEMS.map((item) => {
            const Icon = item.icon

            if (disabled) {
              return (
                <div
                  key={item.id}
                  aria-disabled="true"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/60 bg-zinc-50/50 text-zinc-400 text-xs opacity-50 cursor-not-allowed select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-sm text-zinc-400">
                      {item.label}
                    </span>
                  </div>
                  <GripVertical className="h-4 w-4 text-zinc-300" />
                </div>
              )
            }

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', item.id)
                }}
                onClick={() => onItemClick?.(item)}
                className="group flex items-center justify-between p-2.5 rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground text-xs cursor-grab active:cursor-grabbing transition-all select-none shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
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

        {/* Disabled informational helper */}
        {disabled && (
          <div className="pt-2">
            <p className="text-[11px] text-muted-foreground bg-zinc-50 p-3 rounded-xl border border-zinc-100 leading-relaxed text-center">
              Field placement unlocks automatically after your PDF is uploaded.
            </p>
          </div>
        )}

        {/* Placed Fields Summary (Visible when interactive) */}
        {!disabled && (
          <div className="pt-4 border-t border-zinc-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                Placed Fields ({fields.length})
              </span>
              {suggestionCount > 0 && (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium border border-amber-200/60">
                  {suggestionCount} suggested
                </span>
              )}
            </div>

            {fields.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center bg-zinc-50 rounded-xl border border-zinc-100">
                No fields placed yet. Drag from above or click to add.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {fields.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => onFieldClick?.(f.id, f.page)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
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
                            onAcceptSuggestion?.(f.id)
                          }}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors flex items-center gap-0.5 font-medium"
                        >
                          <Check className="h-2.5 w-2.5" />
                          Accept
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {f.assigned_to === 'sender' ? 'Me' : 'Signer'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
