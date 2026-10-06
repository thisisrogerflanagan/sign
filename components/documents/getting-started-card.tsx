'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, X, Send, Shield, Zap } from 'lucide-react'

export function GettingStartedCard({ hasDocuments }: { hasDocuments: boolean }) {
  const [dismissed, setDismissed] = useState(false)

  // Auto-hide if user already has multiple documents or dismissed it
  if (dismissed || hasDocuments) return null

  return (
    <div className="relative rounded-xl border bg-muted/30 p-4 text-xs space-y-2.5">
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-1.5 font-semibold text-foreground">
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        Getting Started
      </div>

      <p className="text-muted-foreground leading-relaxed">
        Scribbble lets you get PDFs signed without accounts, subscriptions, or complexity.
      </p>

      <div className="space-y-1.5 pt-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Zap className="h-3 w-3 text-primary" />
          <span>Place signatures, initials, dates, and text</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Send className="h-3 w-3 text-primary" />
          <span>Email links directly or copy one to send yourself</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="h-3 w-3 text-primary" />
          <span>Both parties receive completed PDFs + activity records</span>
        </div>
      </div>

      <div className="pt-2">
        <Link
          href="/send"
          className="inline-flex items-center font-medium text-primary hover:underline"
        >
          Send a test request &rarr;
        </Link>
      </div>
    </div>
  )
}
