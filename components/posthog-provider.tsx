"use client"

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

    if (key && typeof window !== 'undefined') {
      posthog.init(key, {
        api_host: host,
        person_profiles: 'identified_only',
        capture_pageview: false,
        // Disable autocapture completely on public signer pages to prevent accidental PII/noise
        autocapture: !window.location.pathname.startsWith('/sign/'),
        // Mask all inputs by default
        mask_all_element_attributes: true,
        mask_all_text: false,
      })
    }
  }, [])

  // Keep signer pages untracked by generic autocapture
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      if (pathname.startsWith('/sign/')) {
        posthog.config.autocapture = false
      } else {
        posthog.config.autocapture = true
      }
    }
  }, [pathname])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
