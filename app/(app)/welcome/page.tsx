import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Send, FileSignature, ShieldCheck, ArrowRight } from 'lucide-react'

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#FCFDFE]">
      <div className="w-full max-w-xl rounded-2xl border bg-card p-8 sm:p-10 shadow-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Scribbble</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Your $49 Founder License is active. You have lifetime access with a generous
            50 signature requests per month fair-use limit.
          </p>
        </div>

        <div className="space-y-4 rounded-xl bg-muted/40 p-5 border">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Three quick steps to get started
          </h2>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-semibold">
                1
              </div>
              <div>
                <p className="text-sm font-medium">Send yourself a test request</p>
                <p className="text-xs text-muted-foreground">
                  Experience the signer flow firsthand with zero account creation
                  required. Test sends are free and do not count toward your monthly
                  quota.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-semibold">
                2
              </div>
              <div>
                <p className="text-sm font-medium">Set your signer display name</p>
                <p className="text-xs text-muted-foreground">
                  Let recipients know who is sending the document by checking your profile
                  settings.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-semibold">
                3
              </div>
              <div>
                <p className="text-sm font-medium">
                  Relax with our tamper-evident audit record
                </p>
                <p className="text-xs text-muted-foreground">
                  Every view and signature is recorded with exact server timestamps, IP
                  addresses, and hash verifications.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button asChild className="flex-1">
            <Link href="/send">
              <Send className="mr-2 h-4 w-4" />
              Send your first request
            </Link>
          </Button>

          <Button asChild variant="outline" className="flex-1">
            <Link href="/">
              Go to Home Feed
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
