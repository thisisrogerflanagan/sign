import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface SquircleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string
  innerClassName?: string
  size?: number | string
}

export const SQUIRCLE_BOX_SHADOW =
  'rgba(0, 0, 0, 0.05) 0px 1px 1px 0px, rgba(0, 0, 0, 0.04) 0px 2px 2px 0px, rgba(0, 0, 0, 0.02) 0px 4px 2px 0px, rgba(0, 0, 0, 0.01) 0px 7px 2px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px'

export const SquircleButton = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  SquircleButtonProps
>(({ className, innerClassName, href, size = 40, children, style, ...props }, ref) => {
  const sizeValue = typeof size === 'number' ? `${size}px` : size

  const outerStyle: React.CSSProperties = {
    width: sizeValue,
    height: sizeValue,
    background: 'white',
    boxShadow: SQUIRCLE_BOX_SHADOW,
    borderRadius: '12px',
    padding: '4px',
    ...({
      cornerShape: 'superellipse(1.333)',
      WebkitCornerShape: 'superellipse(1.333)',
    } as any),
    ...style,
  }

  const innerStyle: React.CSSProperties = {
    borderRadius: '12px',
    ...({
      cornerShape: 'superellipse(1.333)',
      WebkitCornerShape: 'superellipse(1.333)',
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

  if (href) {
    return (
      <Link
        href={href}
        ref={ref as React.Ref<HTMLAnchorElement>}
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
})

SquircleButton.displayName = 'SquircleButton'
