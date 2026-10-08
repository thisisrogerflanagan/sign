'use client'

import React, { useState } from 'react'
import {
  FileSignature,
  PenTool,
  Calendar,
  Type,
  GripVertical,
  Check,
  Table2,
  LayoutGrid,
  Kanban,
  FileText,
  User,
} from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<'insert' | 'format' | 'style' | 'info'>(
    'insert'
  )
  const suggestionCount = fields.filter((f) => f.is_suggestion).length

  return (
    <aside
      aria-label="Insert options palette"
      className="w-72 shrink-0 flex flex-col h-full z-10 space-y-4 select-none"
    >
      {/* Craft Text Tabs Header matching Screenshot */}
      <div className="flex items-center gap-4 border-b border-zinc-200/60 pb-2 px-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('insert')}
          className={`font-semibold transition-colors pb-1 relative ${
            activeTab === 'insert'
              ? 'text-foreground after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Insert
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('format')}
          className={`font-medium transition-colors pb-1 relative ${
            activeTab === 'format'
              ? 'text-foreground after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Format
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('style')}
          className={`font-medium transition-colors pb-1 relative ${
            activeTab === 'style'
              ? 'text-foreground after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Style
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`font-medium transition-colors pb-1 relative ${
            activeTab === 'info'
              ? 'text-foreground after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Info
        </button>
      </div>

      {/* Subtitle helper matching Screenshot */}
      <div className="px-1">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {disabled
            ? 'Upload a document to start placing fields.'
            : 'Drag and drop any item to the document'}
        </p>
      </div>

      {/* Field Palette Items Group */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        <div className="space-y-2">
          {V1_PALETTE_ITEMS.map((item) => {
            const Icon = item.icon

            if (disabled) {
              return (
                <div
                  key={item.id}
                  aria-disabled="true"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-black/[0.04] bg-white/50 text-zinc-400 text-xs opacity-50 cursor-not-allowed select-none shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-medium text-xs text-zinc-400">
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
                className="group flex items-center justify-between p-2.5 rounded-xl border border-black/[0.04] bg-white text-foreground text-xs cursor-grab active:cursor-grabbing hover:border-black/10 transition-all select-none shadow-xs hover:shadow-xs active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-zinc-100 group-hover:bg-primary/10 group-hover:text-primary transition-colors flex items-center justify-center text-zinc-700">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-medium text-xs">{item.label}</span>
                </div>
                <div className="text-muted-foreground/60 group-hover:text-foreground transition-colors">
                  <GripVertical className="h-4 w-4" />
                </div>
              </div>
            )
          })}
        </div>

        {/* Collections Category matching Screenshot */}
        <div className="pt-2 space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground px-1">
            Collections
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-black/[0.04] bg-white text-foreground/70 text-xs select-none shadow-xs opacity-75">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                  <Table2 className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium text-xs">Table</span>
              </div>
              <GripVertical className="h-4 w-4 text-zinc-300" />
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-black/[0.04] bg-white text-foreground/70 text-xs select-none shadow-xs opacity-75">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                  <LayoutGrid className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium text-xs">Gallery</span>
              </div>
              <GripVertical className="h-4 w-4 text-zinc-300" />
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-black/[0.04] bg-white text-foreground/70 text-xs select-none shadow-xs opacity-75">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                  <Kanban className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium text-xs">Kanban</span>
              </div>
              <GripVertical className="h-4 w-4 text-zinc-300" />
            </div>
          </div>
        </div>

        {/* Disabled informational helper */}
        {disabled && (
          <div className="pt-2">
            <p className="text-[11px] text-muted-foreground bg-white p-3 rounded-xl border border-black/[0.04] leading-relaxed text-center shadow-xs">
              Field placement unlocks automatically after your PDF is uploaded.
            </p>
          </div>
        )}

        {/* Placed Fields Summary (Visible when interactive) */}
        {!disabled && (
          <div className="pt-3 border-t border-zinc-200/60 space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-semibold text-muted-foreground text-[11px]">
                Placed Fields ({fields.length})
              </span>
              {suggestionCount > 0 && (
                <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full font-medium border border-amber-200/60">
                  {suggestionCount} suggested
                </span>
              )}
            </div>

            {fields.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center bg-white rounded-xl border border-black/[0.04] shadow-xs">
                No fields placed yet. Drag from above or click to add.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {fields.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => onFieldClick?.(f.id, f.page)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all shadow-xs ${
                      activeFieldId === f.id
                        ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/20'
                        : 'border-black/[0.04] bg-white hover:border-black/10'
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
                          className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100 transition-colors flex items-center gap-0.5 font-medium"
                        >
                          <Check className="h-2.5 w-2.5" />
                          Accept
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-medium bg-zinc-100 px-1.5 py-0.5 rounded-full">
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
