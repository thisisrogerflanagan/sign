import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export default function EsignConsentPage() {
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
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-6 w-6" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Compliance Disclosure
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Electronic Signature Disclosure & Consent
          </h1>
          <p className="text-sm text-muted-foreground">
            Information regarding your rights and consent to use electronic records and
            signatures.
          </p>
        </header>

        <article className="prose prose-zinc dark:prose-invert text-sm leading-relaxed space-y-6">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              1. Consent to Conduct Business Electronically
            </h2>
            <p className="text-muted-foreground">
              By clicking &quot;Review & Sign&quot; or otherwise submitting an electronic
              signature on Scribbble, you affirmatively consent to receive electronic
              records and execute documents electronically in accordance with the United
              States Electronic Signatures in Global and National Commerce Act (15 U.S.C.
              § 7001 et seq.) and the Uniform Electronic Transactions Act (UETA).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              2. Legal Effect of Electronic Signatures
            </h2>
            <p className="text-muted-foreground">
              Your electronic signature (whether drawn on screen, selected as a styled
              font, or typed) carries the same legal weight, validity, and enforceability
              as a traditional handwritten ink signature on paper.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              3. Access and Retention of Copies
            </h2>
            <p className="text-muted-foreground">
              Upon completion of the signing process, a copy of the fully executed
              document will be transmitted directly to the email address provided. You may
              download, save, or print this document at any time.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              4. System Requirements
            </h2>
            <p className="text-muted-foreground">
              To review and electronically sign documents, you need:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>
                A device with internet connectivity (smartphone, tablet, laptop, or
                desktop).
              </li>
              <li>A modern web browser (such as Chrome, Safari, Firefox, or Edge).</li>
              <li>A valid email account capable of receiving attachments.</li>
              <li>Software capable of viewing PDF documents.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              5. Right to Withdraw Consent or Request Paper Copies
            </h2>
            <p className="text-muted-foreground">
              You may decline to sign electronically at any time by clicking the
              &quot;Decline to sign&quot; option on the document review screen. If you
              decline, no electronic contract will be executed through Scribbble, and you
              may contact the sender directly to arrange paper-based execution.
            </p>
          </section>
        </article>
      </div>
    </div>
  )
}
