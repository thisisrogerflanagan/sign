'use client'

import React, { useState } from 'react'
import {
  FileText,
  Layers,
  HardDrive,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Trash2,
  User,
  PenTool,
  FileSignature,
  Type,
  CalendarDays,
  Loader2,
  Check,
} from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { FieldType } from '@/lib/supabase/types'

export interface PlacedFieldData {
  id: string
  type: FieldType
  label: string
  page: number
  x: number
  y: number
  width: number
  height: number
  required: boolean
  assigned_to: 'signer' | 'sender'
  is_suggestion?: boolean
  value?: string | null
}

export interface InfoPanelProps {
  documentTitle?: string
  fileName?: string
  pageCount?: number
  fileSizeBytes?: number
  fileSizeFormatted?: string
  uploadDate?: string | null
  status?: string
  fields: PlacedFieldData[]
  signersCount?: number
  hasDocument: boolean
  isUploading?: boolean
  isSaving?: boolean
  isDeleting?: boolean
  savedStatus?: string | null
  onSaveDraft?: () => void
  onSendDocument?: () => void
  onDeleteDraft?: () => void
  activeTab?: 'properties' | 'review' | 'actions' | 'stats'
  onTabChange?: (tab: 'properties' | 'review' | 'actions' | 'stats') => void
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes <= 0) {
    return '—'
  }
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDateSafe(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return format(d, 'MMM d, yyyy')
  } catch {
    return '—'
  }
}

export function InfoPanel({
  documentTitle,
  fileName,
  pageCount,
  fileSizeBytes,
  fileSizeFormatted,
  uploadDate,
  status = 'draft',
  fields = [],
  signersCount = 0,
  hasDocument,
  isUploading = false,
  isSaving = false,
  isDeleting = false,
  savedStatus,
  onSaveDraft,
  onSendDocument,
  onDeleteDraft,
  activeTab,
  onTabChange,
}: InfoPanelProps) {
  const [internalTab, setInternalTab] = useState<
    'properties' | 'review' | 'actions' | 'stats'
  >('properties')

  const currentTab = activeTab || internalTab
  const handleTabClick = (tab: 'properties' | 'review' | 'actions' | 'stats') => {
    if (onTabChange) {
      onTabChange(tab)
    } else {
      setInternalTab(tab)
    }
  }

  // --- Real Stats Calculations ---
  const signatureCount = fields.filter((f) => f.type === 'signature').length
  const initialsCount = fields.filter((f) => f.type === 'initials').length
  const dateCount = fields.filter((f) => f.type === 'date').length
  const textCount = fields.filter((f) => f.type === 'text' || f.type === 'name').length

  // --- Review Checklist Calculations ---
  // 1. All required fields placed (must have at least one required field or signature, and required count > 0)
  const requiredFields = fields.filter((f) => f.required)
  const hasRequiredFieldsPlaced = hasDocument && requiredFields.length > 0

  // 2. At least one signer added
  const hasSignerAdded = hasDocument && signersCount > 0

  // 3. Sender signed (if sender-signs is on)
  const senderFields = fields.filter((f) => f.assigned_to === 'sender')
  const senderSignsOn = senderFields.length > 0
  const senderSignedCount = senderFields.filter((f) => Boolean(f.value)).length
  const isSenderSigned = senderSignsOn ? senderSignedCount === senderFields.length : true

  // Display values for Properties
  const displayFileName =
    fileName || documentTitle || (hasDocument ? 'Document.pdf' : '—')
  const displayPageCount = pageCount
    ? `${pageCount} page${pageCount === 1 ? '' : 's'}`
    : hasDocument
      ? '1 page'
      : '—'
  const displayFileSize = fileSizeFormatted || formatBytes(fileSizeBytes)
  const displayUploadDate = formatDateSafe(uploadDate)

  return (
    <aside
      aria-label="Document info panel"
      className="w-72 shrink-0 bg-white rounded-2xl border border-black/[0.06] shadow-sm flex flex-col overflow-hidden h-full z-10"
    >
      {/* Tab Navigation — Floating pill controls */}
      <div className="p-3 border-b border-zinc-100 bg-zinc-50/50">
        <div className="grid grid-cols-4 gap-1 bg-zinc-100/80 p-1 rounded-xl text-xs font-medium text-zinc-600">
          <button
            type="button"
            onClick={() => handleTabClick('properties')}
            className={`py-1.5 px-1 rounded-lg text-center transition-all truncate text-[11px] ${
              currentTab === 'properties'
                ? 'bg-white text-zinc-900 font-semibold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Properties
          </button>
          <button
            type="button"
            onClick={() => handleTabClick('review')}
            className={`py-1.5 px-1 rounded-lg text-center transition-all truncate text-[11px] ${
              currentTab === 'review'
                ? 'bg-white text-zinc-900 font-semibold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Review
          </button>
          <button
            type="button"
            onClick={() => handleTabClick('actions')}
            className={`py-1.5 px-1 rounded-lg text-center transition-all truncate text-[11px] ${
              currentTab === 'actions'
                ? 'bg-white text-zinc-900 font-semibold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Actions
          </button>
          <button
            type="button"
            onClick={() => handleTabClick('stats')}
            className={`py-1.5 px-1 rounded-lg text-center transition-all truncate text-[11px] ${
              currentTab === 'stats'
                ? 'bg-white text-zinc-900 font-semibold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Stats
          </button>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* TAB 1: PROPERTIES */}
        {currentTab === 'properties' && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Document Properties
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Metadata and file information
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {/* File Name */}
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-50/70 border border-zinc-100">
                <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-600 mt-0.5 shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    File Name
                  </span>
                  <span
                    className="font-medium text-foreground truncate block text-xs mt-0.5"
                    title={displayFileName}
                  >
                    {displayFileName}
                  </span>
                </div>
              </div>

              {/* Page Count */}
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-50/70 border border-zinc-100">
                <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-600 mt-0.5 shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Page Count
                  </span>
                  <span className="font-medium text-foreground block text-xs mt-0.5">
                    {displayPageCount}
                  </span>
                </div>
              </div>

              {/* File Size */}
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-50/70 border border-zinc-100">
                <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-600 mt-0.5 shrink-0">
                  <HardDrive className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    File Size
                  </span>
                  <span className="font-medium text-foreground block text-xs mt-0.5">
                    {displayFileSize}
                  </span>
                </div>
              </div>

              {/* Upload Date */}
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-50/70 border border-zinc-100">
                <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-600 mt-0.5 shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Upload Date
                  </span>
                  <span className="font-medium text-foreground block text-xs mt-0.5">
                    {displayUploadDate}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REVIEW (Pre-send checklist) */}
        {currentTab === 'review' && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pre-Send Checklist
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Verify document readiness before sending
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Checklist 1: Required Fields */}
              <div
                className={`p-3 rounded-xl border transition-colors ${
                  hasRequiredFieldsPlaced
                    ? 'bg-emerald-50/50 border-emerald-200/60'
                    : 'bg-amber-50/50 border-amber-200/60'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {hasRequiredFieldsPlaced ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-xs">
                        Required fields
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                          hasRequiredFieldsPlaced
                            ? 'bg-emerald-100/80 text-emerald-800'
                            : 'bg-amber-100/80 text-amber-800'
                        }`}
                      >
                        {hasRequiredFieldsPlaced ? 'Ready' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {hasRequiredFieldsPlaced
                        ? `${requiredFields.length} required field${
                            requiredFields.length === 1 ? '' : 's'
                          } placed on document`
                        : hasDocument
                          ? 'Place at least one signature or required field'
                          : 'Upload a document to place fields'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Checklist 2: Signers Added */}
              <div
                className={`p-3 rounded-xl border transition-colors ${
                  hasSignerAdded
                    ? 'bg-emerald-50/50 border-emerald-200/60'
                    : 'bg-amber-50/50 border-amber-200/60'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {hasSignerAdded ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-xs">
                        Signer recipient
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                          hasSignerAdded
                            ? 'bg-emerald-100/80 text-emerald-800'
                            : 'bg-amber-100/80 text-amber-800'
                        }`}
                      >
                        {hasSignerAdded ? 'Added' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {hasSignerAdded
                        ? `${signersCount} signer${signersCount === 1 ? '' : 's'} configured`
                        : 'At least one signer is required before sending'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Checklist 3: Sender Signed */}
              <div
                className={`p-3 rounded-xl border transition-colors ${
                  isSenderSigned
                    ? 'bg-emerald-50/50 border-emerald-200/60'
                    : 'bg-amber-50/50 border-amber-200/60'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {isSenderSigned ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-xs">
                        Sender signature
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                          isSenderSigned
                            ? 'bg-emerald-100/80 text-emerald-800'
                            : 'bg-amber-100/80 text-amber-800'
                        }`}
                      >
                        {isSenderSigned ? 'Ready' : 'Action needed'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {senderSignsOn
                        ? isSenderSigned
                          ? `All ${senderFields.length} sender field${
                              senderFields.length === 1 ? '' : 's'
                            } signed by you`
                          : `${senderSignedCount} of ${senderFields.length} sender fields signed`
                        : 'No sender signature required for this document'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACTIONS */}
        {currentTab === 'actions' && (
          <div className="space-y-4 animate-in fade-in flex flex-col justify-between h-full">
            <div className="space-y-4">
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Document Actions
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Save progress or proceed with workflow
                </p>
              </div>

              {savedStatus && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[11px] flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>{savedStatus}</span>
                </div>
              )}

              <div className="space-y-2 pt-1">
                {/* Save Draft */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2 h-9 text-xs font-medium"
                  disabled={!hasDocument || isSaving}
                  onClick={onSaveDraft}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Save className="h-4 w-4 text-zinc-600" />
                  )}
                  <span>{isSaving ? 'Saving draft...' : 'Save draft'}</span>
                </Button>

                {/* Send Document */}
                <Button
                  type="button"
                  className="w-full justify-start gap-2 h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={!hasDocument || fields.length === 0}
                  onClick={onSendDocument}
                  data-testid="continue-to-review-button"
                >
                  <Send className="h-4 w-4" />
                  <span>Send document</span>
                </Button>
              </div>
            </div>

            {/* Destructive Action (Visually Separated at Bottom) */}
            <div className="pt-6 border-t border-zinc-100 mt-auto">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Danger Zone
              </span>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start gap-2 h-9 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200/60"
                disabled={!hasDocument || isDeleting}
                onClick={onDeleteDraft}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                ) : (
                  <Trash2 className="h-4 w-4 text-red-600" />
                )}
                <span>{isDeleting ? 'Deleting draft...' : 'Delete draft'}</span>
              </Button>
            </div>
          </div>
        )}

        {/* TAB 4: STATS */}
        {currentTab === 'stats' && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Document Stats
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Live document and field metrics
              </p>
            </div>

            {/* Current Status Pill */}
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">Status</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-zinc-200 text-zinc-800">
                {hasDocument ? status : 'Not uploaded'}
              </span>
            </div>

            {/* Signers Count */}
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-600">
                <User className="h-3.5 w-3.5" />
                <span className="text-muted-foreground text-xs font-medium">
                  Signers added
                </span>
              </div>
              <span className="text-sm font-bold text-foreground">{signersCount}</span>
            </div>

            {/* Fields By Type (Live Counts) */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Fields placed by type ({fields.length})
              </span>

              <div className="grid grid-cols-2 gap-2">
                {/* Signature */}
                <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <FileSignature className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-base font-bold text-foreground">
                      {signatureCount}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1">
                    Signature
                  </span>
                </div>

                {/* Initials */}
                <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <PenTool className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-base font-bold text-foreground">
                      {initialsCount}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1">Initials</span>
                </div>

                {/* Date */}
                <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <CalendarDays className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-base font-bold text-foreground">
                      {dateCount}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1">Date</span>
                </div>

                {/* Text */}
                <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <Type className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-base font-bold text-foreground">
                      {textCount}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1">Text</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
