# PROJECT CONTEXT - Scribbble

Stack: Next.js (App Router, TypeScript) on Vercel; Supabase (Postgres,
Auth magic links, private Storage) as backend; Resend for transactional
email; PostHog for analytics; Sentry for errors. Styling: Tailwind +
shadcn/ui. PDF render: pdfjs-dist. PDF write: pdf-lib.

Product: single-user e-signature tool. Sender uploads a PDF, places
signature/initials/date/text fields, emails a signing link. Signer signs
in browser with NO account via a tokenized link. Both parties get the
signed PDF by email. $49 lifetime plan, 50 sends/month fair-use cap.

## Non-negotiables:

- App Router only. Server Components by default.
- Service-role Supabase key is server-only, never in client code.
- Signer access via 256-bit token in URL; store only SHA-256 hash.
- All PDFs in private buckets; access only via server-minted signed URLs.
- Field coordinates normalized 0-1 relative to page, never pixels.
- Audit events are append-only, written server-side with IP + user agent.
- All timestamps UTC in DB.
- Document statuses: draft, sent, viewed, completed, declined, voided,
  deleted. Transitions: draft->sent->viewed->completed; sent/viewed->
  declined; sent/viewed->voided; any->deleted.
- Capture errors to Sentry; product events to PostHog (IDs/counts only,
  never names, emails, titles, or document content).

## Copy tone:

- Warm, plain-spoken, human (Airbnb-style). No legalese in UI.
- The audit trail is called the "activity record" in user-facing copy.
