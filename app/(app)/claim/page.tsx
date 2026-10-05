'use client'

import { useState } from 'react'
import { claimFounderPurchase } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sparkles, ArrowRight, HelpCircle } from 'lucide-react'

export default function ClaimPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    try {
      const res = await claimFounderPurchase(formData)
      if (res?.error) {
        setError(res.error)
      }
    } catch (err: any) {
      if (err?.message !== 'NEXT_REDIRECT') {
        setError(err?.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#FCFDFE]">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 space-y-1.5 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Claim your Founder access</h1>
          <p className="text-sm text-muted-foreground">
            Enter the email address you used when purchasing your $49 lifetime license.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Purchase email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="buyer@example.com"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Verifying purchase...' : 'Claim license & continue'}
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            Have not purchased yet?{' '}
            <a
              href="https://watchposthq.com"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Get lifetime access for $49
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
