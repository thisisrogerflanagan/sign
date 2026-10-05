import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background py-16 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Watchpost Sign
        </Link>

        <header className="space-y-2 border-b pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Refund Policy</h1>
          <p className="text-sm text-muted-foreground">30-Day Money-Back Guarantee</p>
        </header>

        <article className="prose prose-zinc dark:prose-invert text-sm leading-relaxed space-y-6">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">1. Our 30-Day Promise</h2>
            <p className="text-muted-foreground">
              We stand behind Watchpost Sign. If for any reason Watchpost Sign does not suit your needs within 30 days of purchasing your lifetime founder license, we will provide a 100% full refund with no hassle.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">2. How to Request a Refund</h2>
            <p className="text-muted-foreground">
              You can trigger a refund directly from your account:
            </p>
            <ol className="list-decimal pl-5 text-muted-foreground space-y-1">
              <li>Log in to your Watchpost Sign account.</li>
              <li>Navigate to <strong>Account Settings</strong> &rarr; <strong>Plan & Monthly Usage</strong>.</li>
              <li>Click <strong>Request a refund</strong>.</li>
            </ol>
            <p className="text-muted-foreground mt-2">
              Alternatively, you can email <a href="mailto:support@watchposthq.com" className="text-primary underline">support@watchposthq.com</a> with the email address you used to purchase.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">3. Processing Time</h2>
            <p className="text-muted-foreground">
              Once initiated, refunds are processed through Stripe within 1–2 business days. It generally takes 5–10 business days for the credit to appear on your bank or credit card statement.
            </p>
          </section>
        </article>
      </div>
    </div>
  )
}
