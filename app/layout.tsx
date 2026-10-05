import type { Metadata } from 'next'
import './globals.css'
import { PostHogProvider } from '@/components/posthog-provider'
import { Toaster } from '@/components/ui/toaster'
import { NetworkStatusBanner } from '@/components/network-status-banner'

export const metadata: Metadata = {
  title: 'Watchpost Sign — Simple, Honest E-Signatures',
  description: 'Single-user e-signature tool with lifetime pricing and fair-use terms.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <PostHogProvider>
          <NetworkStatusBanner />
          {children}
          <Toaster />
        </PostHogProvider>
      </body>
    </html>
  )
}
