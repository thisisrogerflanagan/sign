import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ArrowLeft } from "lucide-react"

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#FCFDFE]">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign-in link expired</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Magic links are single-use and expire after a short period for your security.
        </p>

        <div className="mt-6 pt-2">
          <Button asChild className="w-full">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Request a fresh sign-in link
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
