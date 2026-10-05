'use client'

import React, { useEffect, useState } from 'react'

interface QuotaWidgetProps {
  used?: number
  limit?: number
}

export function QuotaWidget({ used = 0, limit = 50 }: QuotaWidgetProps) {
  const [animatedWidth, setAnimatedWidth] = useState(0)
  const percentage = Math.min(100, Math.max(0, (used / limit) * 100))

  useEffect(() => {
    // Trigger animation from 0% to the target percentage
    setAnimatedWidth(0)
    const timeout = setTimeout(() => {
      setAnimatedWidth(percentage)
    }, 60)
    return () => clearTimeout(timeout)
  }, [percentage])

  return (
    <div className="relative overflow-hidden rounded-2xl p-4 bg-[#B7DCED] text-[#121417] select-none shadow-sm">
      {/* Background signature watermark */}
      <img
        src="/images/signature-watermark.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-40 pointer-events-none select-none"
      />

      <div className="relative z-10 space-y-3.5">
        <h3 className="text-[17px] font-bold tracking-tight text-[#121417] leading-none">
          Signatures
        </h3>

        {/* Progress bar track (#121417) */}
        <div className="h-[6px] w-full rounded-full bg-[#121417] overflow-hidden">
          {/* Animated white fill bar */}
          <div
            className="h-full bg-white rounded-full transition-[width] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: `${animatedWidth}%` }}
          />
        </div>

        {/* Subtext */}
        <p className="text-[13px] text-[#121417] leading-none">
          <span className="font-bold">{used}</span> of{' '}
          <span className="font-bold">{limit}</span> signatures used
        </p>
      </div>
    </div>
  )
}
