'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { cn } from '@/lib/utils'
import { SQUIRCLE_BOX_SHADOW } from '@/components/ui/squircle-button'

const ACTIVITY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'document_sent', label: 'Sent' },
  { key: 'document_viewed', label: 'Viewed' },
  { key: 'document_completed', label: 'Signed' },
  { key: 'document_voided', label: 'Cancelled' },
  { key: 'document_created', label: 'Created' },
]

export function ActivityFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentType = searchParams.get('type') || 'all'

  function updateFilter(newType: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (newType === 'all') {
      params.delete('type')
    } else {
      params.set('type', newType)
    }

    startTransition(() => {
      router.push(`/activity?${params.toString()}`)
    })
  }

  const containerStyle: React.CSSProperties = {
    background: 'white',
    boxShadow: SQUIRCLE_BOX_SHADOW,
    borderRadius: '12px',
    padding: '4px',
    ...({
      cornerShape: 'superellipse(1.333)',
      WebkitCornerShape: 'superellipse(1.333)',
    } as any),
  }

  return (
    <div className="flex items-center gap-0.5 h-[40px] shrink-0 select-none" style={containerStyle}>
      {ACTIVITY_FILTERS.map((filter) => {
        const isActive = currentType === filter.key
        return (
          <button
            key={filter.key}
            type="button"
            onClick={() => updateFilter(filter.key)}
            className={cn(
              'h-[32px] px-3 text-[13px] font-medium rounded-[8px] transition-colors whitespace-nowrap',
              isActive
                ? 'bg-[rgba(26,28,30,0.06)] text-[#121417]'
                : 'text-[#121417] hover:bg-[rgba(26,28,30,0.04)]'
            )}
          >
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}
