'use client'

import React from 'react'
import { formatDistanceToNow } from 'date-fns'
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
  createdAt?: string | null
  updatedAt?: string | null
  author?: string | null
  status?: string
  fields?: PlacedFieldData[]
  signersCount?: number
  hasDocument?: boolean
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

function formatRelativeDate(dateStr?: string | null, fallback = 'Just now'): string {
  if (!dateStr) return fallback
  if (dateStr.endsWith('ago') || dateStr === 'Just now') return dateStr
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return dateStr
  }
}

export interface ReviewStep {
  id: string
  label: string
  completed: boolean
}

export function getReviewSteps(status = 'draft'): ReviewStep[] {
  const isSent =
    status === 'sent' ||
    status === 'viewed' ||
    status === 'completing' ||
    status === 'completed'
  const isViewed =
    status === 'viewed' || status === 'completing' || status === 'completed'
  const isCompleted = status === 'completed'

  return [
    {
      id: 'created',
      label: 'Document Created',
      completed: true,
    },
    {
      id: 'sent',
      label: 'Sent to Client',
      completed: isSent,
    },
    {
      id: 'viewed',
      label: 'Viewed by Client',
      completed: isViewed,
    },
    {
      id: 'completed',
      label: 'Document Completed',
      completed: isCompleted,
    },
  ]
}

export function InfoPanel({
  createdAt,
  uploadDate,
  updatedAt,
  author = 'Johnny Maitai',
  status = 'draft',
}: InfoPanelProps) {
  const displayCreated = formatRelativeDate(createdAt || uploadDate, 'Just now')
  const displayUpdated = formatRelativeDate(
    updatedAt || createdAt || uploadDate,
    'Just now'
  )
  const displayAuthor = author || 'Johnny Maitai'
  const reviewSteps = getReviewSteps(status)

  return (
    <aside
      aria-label="Document info panel"
      className="w-64 sm:w-72 shrink-0 flex flex-col h-full z-10 select-none"
    >
      {/* Title: Document Info */}
      <h1
        className="text-[26px] font-bold text-[#3B3B3D] tracking-tight"
        style={{ fontFamily: '"Airbnb Cereal", sans-serif' }}
      >
        Document Info
      </h1>

      {/* PROPERTIES Section */}
      <div className="mt-8">
        <h2
          className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#1A1C1E]/30"
          style={{ fontFamily: '"Airbnb Cereal", sans-serif' }}
        >
          PROPERTIES
        </h2>

        <div className="mt-3 flex flex-col gap-1.5">
          {/* Created */}
          <div className="flex items-center gap-2.5 text-[15px]">
            <img src="/icons/calendar.svg" alt="Created" className="w-6 h-6 shrink-0" />
            <div className="flex items-baseline min-w-0">
              <span className="text-[#1A1C1E]/40 font-medium mr-1.5">Created:</span>
              <span
                className="text-[#1A1C1E] font-normal truncate"
                style={{ fontFamily: '"Airbnb Cereal", sans-serif', fontWeight: 400 }}
              >
                {displayCreated}
              </span>
            </div>
          </div>

          {/* Updated */}
          <div className="flex items-center gap-2.5 text-[15px]">
            <img src="/icons/calendar.svg" alt="Updated" className="w-6 h-6 shrink-0" />
            <div className="flex items-baseline min-w-0">
              <span className="text-[#1A1C1E]/40 font-medium mr-1.5">Updated:</span>
              <span
                className="text-[#1A1C1E] font-normal truncate"
                style={{ fontFamily: '"Airbnb Cereal", sans-serif', fontWeight: 400 }}
              >
                {displayUpdated}
              </span>
            </div>
          </div>

          {/* Author */}
          <div className="flex items-center gap-2.5 text-[15px]">
            <img src="/icons/author.svg" alt="Author" className="w-6 h-6 shrink-0" />
            <div className="flex items-baseline min-w-0">
              <span className="text-[#1A1C1E]/40 font-medium mr-1.5">Author:</span>
              <span
                className="text-[#1A1C1E] font-normal truncate"
                style={{ fontFamily: '"Airbnb Cereal", sans-serif', fontWeight: 400 }}
              >
                {displayAuthor}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* REVIEW Section */}
      <div className="mt-8">
        <h2
          className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#1A1C1E]/30"
          style={{ fontFamily: '"Airbnb Cereal", sans-serif' }}
        >
          REVIEW
        </h2>

        <div className="mt-4 flex flex-col gap-3.5">
          {reviewSteps.map((step) => (
            <div key={step.id} className="flex items-center gap-3 text-[15px]">
              <img
                src={
                  step.completed
                    ? '/icons/review_completed.svg'
                    : '/icons/review_empty.svg'
                }
                alt={step.completed ? 'Completed' : 'Pending'}
                className="w-6 h-6 shrink-0"
              />
              <span className="text-[#1A1C1E]/40 font-medium truncate">{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
