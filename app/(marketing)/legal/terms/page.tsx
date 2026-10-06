import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background py-16 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Scribbble
        </Link>

        <header className="space-y-2 border-b pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: October 2026</p>
        </header>

        <article className="prose prose-zinc dark:prose-invert text-sm leading-relaxed space-y-6">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              1. Introduction & The Deal
            </h2>
            <p className="text-muted-foreground">
              Scribbble is a single-user electronic signature tool operated by Scribbble.
              We offer a lifetime access plan for a one-time payment of $49 with a
              fair-use allocation of up to 50 signature requests per calendar month.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              2. Permitted Use & Quotas
            </h2>
            <p className="text-muted-foreground">
              Your license is for a single individual or company account. Signature
              requests are intended for genuine transactional agreements. Automated
              spamming or resale of API access is prohibited. Exceeding the 50 monthly
              requests threshold will temporarily pause new outgoing signature requests
              until the monthly cycle resets on the 1st of each month.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              3. Electronic Signatures & Legal Enforceability
            </h2>
            <p className="text-muted-foreground">
              Scribbble facilitates electronic signatures in accordance with the United
              States Electronic Signatures in Global and National Commerce Act (ESIGN) and
              Uniform Electronic Transactions Act (UETA). Both parties consent to
              conducting business electronically. Scribbble does not provide legal advice
              or guarantee the substantive legality of your agreements under specific
              state, federal, or international jurisdictions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              4. Data Ownership & Retention
            </h2>
            <p className="text-muted-foreground">
              You own all documents uploaded to Scribbble. We do not sell, inspect, or
              monetize your documents. Signed PDFs and tamper-evident activity logs remain
              archived for 10 years unless you explicitly request deletion through your
              account settings.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              5. Termination & Refunds
            </h2>
            <p className="text-muted-foreground">
              We honor a no-questions-asked 30-day money-back guarantee from your initial
              purchase date. You may request a refund directly from your account settings.
            </p>
          </section>
        </article>
      </div>
    </div>
  )
}
