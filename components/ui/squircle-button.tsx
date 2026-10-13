'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface SquircleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string
  innerClassName?: string
  size?: number | string
}

export const SQUIRCLE_BOX_SHADOW =
  'rgba(0, 0, 0, 0.05) 0px 1px 1px 0px, rgba(0, 0, 0, 0.04) 0px 2px 2px 0px, rgba(0, 0, 0, 0.02) 0px 4px 2px 0px, rgba(0, 0, 0, 0.01) 0px 7px 2px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px'

export const SQUIRCLE_HOVER_BOX_SHADOW =
  'rgba(0, 0, 0, 0.08) 0px 2px 4px 0px, rgba(0, 0, 0, 0.06) 0px 4px 8px 0px, rgba(0, 0, 0, 0.04) 0px 8px 16px 0px, rgba(0, 0, 0, 0.06) 0px 0px 0px 1px'

export const SquircleButton = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  SquircleButtonProps
>(
  (
    {
      className,
      innerClassName,
      href,
      size = 40,
      children,
      style,
      onMouseEnter,
      onMouseLeave,
      ...props
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = React.useState(false)
    const sizeValue = typeof size === 'number' ? `${size}px` : size

    const outerStyle: React.CSSProperties = {
      width: sizeValue,
      height: sizeValue,
      background: 'white',
      boxShadow: isHovered ? SQUIRCLE_HOVER_BOX_SHADOW : SQUIRCLE_BOX_SHADOW,
      borderRadius: '50%',
      padding: '4px',
      transition:
        'box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
      ...({
        cornerShape: 'squircle',
        WebkitCornerShape: 'squircle',
      } as any),
      ...style,
    }

    const innerStyle: React.CSSProperties = {
      borderRadius: '50%',
      ...({
        cornerShape: 'squircle',
        WebkitCornerShape: 'squircle',
      } as any),
    }

    const content = (
      <div
        className={cn(
          'cta-squircle-inner flex h-full w-full items-center justify-center transition-colors group-hover:bg-[rgba(26,28,30,0.04)]',
          innerClassName
        )}
        style={innerStyle}
      >
        {children}
      </div>
    )

    const handleMouseEnter = (e: any) => {
      setIsHovered(true)
      onMouseEnter?.(e)
    }

    const handleMouseLeave = (e: any) => {
      setIsHovered(false)
      onMouseLeave?.(e)
    }

    if (href) {
      return (
        <Link
          href={href}
          ref={ref as React.Ref<HTMLAnchorElement>}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn(
            'cta-squircle-button group flex shrink-0 items-center justify-center p-[4px] transition-transform active:scale-95 select-none',
            className
          )}
          style={outerStyle}
          {...(props as any)}
        >
          {content}
        </Link>
      )
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={(props.type as any) || 'button'}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'cta-squircle-button group flex shrink-0 items-center justify-center p-[4px] transition-transform active:scale-95 select-none',
          className
        )}
        style={outerStyle}
        {...props}
      >
        {content}
      </button>
    )
  }
)

SquircleButton.displayName = 'SquircleButton'
