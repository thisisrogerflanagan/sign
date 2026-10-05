import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: October 2026</p>
        </header>

        <article className="prose prose-zinc dark:prose-invert text-sm leading-relaxed space-y-6">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">1. Our Core Promise</h2>
            <p className="text-muted-foreground">
              We do not sell your personal data. We do not use your documents to train artificial intelligence models. Your documents are stored in private, access-controlled storage buckets and are only accessible via short-lived, cryptographically signed URLs.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>
            <p className="text-muted-foreground">
              <strong>Account Information:</strong> When you purchase and sign in, we collect your email address and preferred display name.<br />
              <strong>Document & Signer Information:</strong> We store the PDFs you upload, the email addresses and names of signers, and signature images.<br />
              <strong>Audit Record Data:</strong> To maintain legal enforceability under ESIGN/UETA, our server captures IP addresses, browser user agents, and exact timestamps when documents are viewed and signed.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">3. Service Providers</h2>
            <p className="text-muted-foreground">
              We rely on trusted infrastructure providers: Supabase (encrypted database and private file storage in US East), Vercel (edge delivery and hosting), Stripe (secure payment processing), Resend (transactional email delivery), and PostHog (privacy-conscious, anonymized product telemetry with PII scrubbed).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">4. Account Deletion & Rights</h2>
            <p className="text-muted-foreground">
              You can export all your signed documents and audit logs at any time from your settings page. You may also initiate immediate account deletion, which wipes your files from our storage buckets and deletes your database records.
            </p>
          </section>
        </article>
      </div>
    </div>
  )
}
