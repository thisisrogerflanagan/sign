# Watchpost Sign — Product & Engineering Roadmap

> Simple, fast, and honest e-signatures for solo freelancers and boutique studios. Go from PDF to ready-to-send in under 60 seconds.

---

## 🎯 Current Status: Phase 1 (Completed ✅)

- [x] **5 Core Send Field Types:** Signature, Initials, Date Signed, Full Name, and generic Text.
- [x] **Rule-based Auto-Detection Engine:** Scans PDF text geometry and interactive AcroForms to suggest field boxes on upload.
- [x] **Retina Canvas Rendering:** High-DPI device pixel ratio scaling for crisp document display on Mac/Retina screens.
- [x] **Page Info & Document Stats:** Live extraction of Word Count, Character Count, Paragraph Count, and estimated Read Time.
- [x] **Sender Pre-Signing ("Me"):** Freelancer can sign their own signature/initials fields before dispatching to the client.
- [x] **Tamper-Evident Activity Trail:** Append-only audit events for creation, viewing, signing, and completion.
- [x] **Git & Quality Guardrails:** Husky pre-commit hooks, lint-staged (Prettier), and TypeScript validation.

---

## 🚀 Phase 2: Signer Experience & Growth Loop (In Progress ⚡)

- [x] **Mobile-First Signer Layout:** Optimized touch signature drawing on iOS Safari and Android Chrome with dynamic DPR scaling and guided field navigation.
- [ ] **Custom Message & Branding Preview:** Allow sender to preview the client email and signing page before sending.
- [x] **Download Receipts & Completion Email:** Attach the finalized flattened PDF directly to the confirmation email sent to both parties.
- [ ] **Audit Trail Certificate Page:** Optional single-page summary appended to the completed PDF displaying IPs, timestamps, and hashes.

---

## 📦 Phase 3: Templates & Repeat Senders

- [ ] **Save as Template:** After confirming field placements on a contract, save as a reusable template.
- [ ] **One-Click Send from Template:** Upload a new version or pick a template, enter the client name & email, and send in 10 seconds.
- [ ] **Default Document Message:** Global sender setting for default email note.

---

## 🛡️ Phase 4: Production Hardening & Testing

- [x] **Automated PDF Flattening Tests:** Unit tests verifying `flattenPdf()` produces valid, uncorrupted PDFs across various page orientations and scales.
- [x] **Auto-Detection Precision Benchmark:** Test suite with standard sample contracts to maintain >90% precision.
- [x] **Playwright E2E Smoke Test:** Automated end-to-end test simulating upload -> placement -> signing -> PDF download.
- [x] **Automated Screenshot Capture ("Robot Clicker"):** Dedicated Playwright harness (`npm run shots`) generating 2x Retina screenshots across all 18 sender, signer, mobile, and error states.
- [ ] **Staging vs. Production Supabase Environment:** Dedicated separate projects for local development/staging and live production.

---

## 📋 Engineering Workflow Rules

1. **Feature Branching:** Never build experimental features directly on `main`. Cut a short-lived branch: `feat/<name>` or `fix/<name>`.
2. **Pre-commit Gate:** All commits must pass Husky hooks (`prettier` and `tsc --noEmit`).
3. **Backward-Compatible Schemas:** New fields or metadata must never break running instances. Always provide fallback codecs or migrations.
4. **Precision > Recall:** For auto-detection, a missed field is a 2-second user drag; a misplaced field breaks trust. Tune heuristics conservatively.
