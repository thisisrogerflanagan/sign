"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/"

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleSendMagicLink(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!email || cooldown > 0 || loading) return

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const origin = window.location.origin
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
        },
      })

      if (signInError) {
        throw signInError
      }

      setSent(true)
      setCooldown(60)
    } catch (err: any) {
      setError(err?.message || "We could not send the magic link. Please check your email and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
      <div className="mb-6 space-y-1.5 text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to Watchpost</h1>
        <p className="text-sm text-muted-foreground">
          No passwords to remember. We will email you a secure one-click sign in link.
        </p>
      </div>

      {sent ? (
        <div className="space-y-4 text-center">
          <div className="rounded-lg bg-green-50 p-4 border border-green-200/60 text-green-800 text-sm flex items-start gap-3 text-left">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Check your inbox</p>
              <p className="mt-0.5 text-xs text-green-700">
                We sent a magic link to <span className="font-semibold">{email}</span>. Click it to log in.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Did not receive it? Check your spam folder or request a new one below.
          </p>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={cooldown > 0 || loading}
            onClick={() => handleSendMagicLink()}
          >
            {cooldown > 0 ? `Resend link in ${cooldown}s` : "Resend magic link"}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSendMagicLink} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending link..." : "Send magic link"}
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#FCFDFE]">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
