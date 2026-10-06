# Scribbble — Verification & Failure Drill Report

**Date:** October 2026  
**Build Status:** Clean Production Build (`next build --webpack` passing, 0 TypeScript/Webpack errors)  
**Total Routes:** 22 routes (Static, Dynamic Route Handlers, Edge Middleware)

---

## 1. Non-Negotiables Verification

| Rule                         | Verification Method                                                                                                     | Result                                                                                        |
| :--------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| **App Router Only**          | Audited imports against `next/router` across codebase                                                                   | **PASSED** (0 references to legacy router)                                                    |
| **Server-Only Service Role** | Audited `SUPABASE_SERVICE_ROLE_KEY` across `components/`, `app/(auth)/`, `app/sign/`                                    | **PASSED** (Only referenced in `lib/supabase/admin.ts`)                                       |
| **Token Hashing at Rest**    | Audited `/api/envelopes/send` and `/api/sign` routes                                                                    | **PASSED** (256-bit crypto token generated; only SHA-256 hash stored in DB)                   |
| **Private PDF Storage**      | Audited Supabase storage configuration & file routes                                                                    | **PASSED** (All access mediated by short-lived server-minted signed URLs)                     |
| **Normalized Coordinates**   | Audited editor placement and flattener logic                                                                            | **PASSED** (Coordinates stored 0–1 relative to page; PDF flattener scales to physical points) |
| **Append-Only Audit Trail**  | Audited `audit_events` table & RLS policies                                                                             | **PASSED** (Zero client update/delete grants; inserts via service role with IP/UA)            |
| **All Timestamps UTC**       | Audited migrations and application dates                                                                                | **PASSED** (`timestamptz` stored as UTC in Postgres)                                          |
| **Canonical State Machine**  | Tested state transitions (`draft` &rarr; `sent` &rarr; `viewed` &rarr; `completed` / `declined` / `voided` / `deleted`) | **PASSED** (CHECK constraint + server route guards)                                           |
| **Privacy & Scrubbing**      | Sentry `beforeSend` + PostHog provider                                                                                  | **PASSED** (Tokens and sign bodies redacted; autocapture disabled on `/sign/*`)               |

---

## 2. Failure Drill Sweep

- [x] **Signer dead-link edges:**
  - Voided requests render the canceled request screen.
  - Deleted documents display the not-found view.
  - Expired links (>90 days) render the contact-sender view.
  - Completed documents render the already-signed view with timestamp.
- [x] **File upload hardening:**
  - Non-PDF files rejected with client and server validation.
  - Files > 10 MB rejected with explicit size indicator.
  - Password-protected and corrupted PDFs caught and rejected by `pdf-lib` without creating orphaned drafts.
- [x] **Fair-use quota enforcement:**
  - Non-test sends check current UTC month in `usage_counters`.
  - 51st send blocked with fair-use message; `usage_cap_hit` event recorded.
  - Test sends (`is_test: true`) bypass quota increments and are free.
- [x] **Signing completion pipeline:**
  - Signer captures signatures via canvas drawing or styled font typing.
  - pdf-lib inverts Y-axis correctly from web canvas to PDF coordinates.
  - Completed PDF saved to `signed` bucket and emailed to both parties with attachments.
- [x] **Observability & Rate Limiting:**
  - In-memory rate limiting blocks spam calls to `/api/sign/*`.
  - Sentry scrubber strips request bodies and masks tokens.
  - PostHog tracks IDs and counts only without PII.
