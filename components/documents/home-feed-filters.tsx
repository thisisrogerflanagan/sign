'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SquircleButton, SQUIRCLE_BOX_SHADOW } from '@/components/ui/squircle-button'

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Waiting for signatures' },
  { key: 'viewed', label: 'Viewed' },
  { key: 'completed', label: 'Signed' },
  { key: 'voided', label: 'Cancelled' },
]

export function HomeFeedFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentStatus = searchParams.get('status') || 'all'

  function updateStatus(newStatus: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (newStatus === 'all') {
      params.delete('status')
    } else {
      params.set('status', newStatus)
    }

    params.delete('page')

    startTransition(() => {
      router.push(`/?${params.toString()}`)
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
    <div className="flex items-center gap-2 select-none shrink-0">
      {/* Filter Button Group */}
      <div
        className="flex items-center gap-0.5 h-[40px] shrink-0"
        style={containerStyle}
      >
        {STATUS_FILTERS.map((filter) => {
          const isActive = currentStatus === filter.key
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => updateStatus(filter.key)}
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

      {/* Action / Overflow Button */}
      <SquircleButton aria-label="More options" title="More options">
        <MoreHorizontal className="h-4 w-4 text-[#121417]" />
      </SquircleButton>
    </div>
  )
}
