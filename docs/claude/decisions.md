# ApplyFlow — Decisions Log

## [2026-08-20] Cookie Consent Scope
- Context: Need to add a cookie consent banner for compliance.
- Decision: Implemented an essential-only disclosure banner (no accept/reject toggle) because an audit confirmed there is zero analytics/tracking code in the codebase.

## [2026-08-20] extraction_confidence Schema Handling
- Context: `extraction_confidence` needed to be added to validate low-confidence soft-rejections.
- Decision: Added to `JobExtractionSchema` and the DB insert schema independently, preserving the existing AI Extraction Schema Decoupling decision to prevent tight coupling.

## [2026-08-20] Free-Tier Race Condition Fix
- Context: The `decrement_free_ai_uses` logic was vulnerable to race conditions under concurrent requests, allowing negative balances.
- Decision: Fixed via an atomic check-and-decrement RPC (`0013_atomic_decrement.sql`) and a route-level `decrementOrThrow` helper rather than application-level locking. Decrement only fires post-success to preserve the multi-model fallback resiliency guarantee.

## [2026-08-19] Auth SMTP State — Gmail SMTP Permanent
- Context: Supabase default mailer (~2 emails/hr) was blocking testing. Previously considered temporary until a domain purchase for Resend.
- Decision: Decided to stay on Gmail SMTP (applyflow.noreply@gmail.com, App Password auth, smtp.gmail.com:465 SSL) permanently for auth emails in exchange for zero cost. No custom domain purchase is planned.
- Scope: Supabase Auth magic-link delivery only. /api/cron/reminders is unaffected — separate Resend API code path, untouched.
- Trade-offs & Risks Accepted: Non-custom sender header, ~500/day volume cap, and account-suspension risk (Gmail isn't designed for automated app sending).
- Mitigation: If the Gmail account sending is ever flagged or suspended, auth emails will fail app-wide with no automatic fallback. A monitoring and alerting plan will be necessary if launch volume grows.

## [2026-08-19] Free-Tier AI Limits
- Context: Need to control API costs for users without their own API keys.
- Decision: Implemented 5 lifetime free AI uses (not recurring/resettable). This is enforced server-side with a hard stop until BYOK is added, and protected by a PostgreSQL trigger preventing client-side bypass via RLS.

## [2026-08-19] Data Export Formatting
- Context: The previous CSV export derived column headers dynamically from `Object.keys()` of the first application row, leading to misaligned columns when subsequent rows had fields the first row lacked (e.g. nulls).
- Decision: Implemented a strict 25-field explicit allowlist to ensure export column stability. `raw_jd` (large free text) is included in JSON exports but excluded from CSV/XLSX for tabular readability. `interview_stages` are chronologically sorted and flattened into a single string (`all_interview_stages`) for tabular exports. The `resumes` table is excluded.

## [2026-08-19] AI Extraction Schema Decoupling
- Context: A bug caused by a shared schema (`salary_max` leak into DB) demonstrated the risks of tightly coupling the AI extraction shape to the database insert shape.
- Decision: `JobExtractionSchema` and DB insert/update schemas (`ApplicationInsertSchema`) must never be coupled via `extend()` or `pick()`. They will be kept fully independent going forward.

## [2026-08-19] Dashboard Mobile Layout
- Context: The dashboard applications table was causing horizontal scrolling issues on narrow screens.
- Decision: Switched the table to a stacked-card layout on mobile (`md:table-row` / `block` pattern) instead of using scroll hints or horizontal scroll bars, providing a much better native mobile experience.

## [2026-08-19] Local-Mode Application Detail Routing
- Context: Users in local-only mode need access to application detail pages without triggering auth redirects.
- Decision: Added local-mode application detail access to the `middleware.ts` public route allowlist, scoped strictly to the `/applications/[id]` regex pattern.

## [2026-08-16] Impeccable Design Tool Experiment
- Context: Explored using the Impeccable design system to elevate the UI.
- Decision: The experiment was conducted on a separate branch and evaluated. We decided to discard it; the branch was deleted, and no changes were merged to `main`.

## [2026-08-16] BYOK Gemini-Only Scope
- Context: Multi-provider BYOK implementation highlighted schema-format mismatches (Type.OBJECT vs JSON Schema) between providers (OpenAI/Anthropic vs Gemini).
- Decision: Deferred support for other providers. BYOK UI and logic are strictly locked to Google Gemini for now, though underlying architecture (e.g., `getProvider()`) remains intact for future expansion.

## [2026-08-16] Magic Link Auth & SMTP State
- Context: Restructuring authentication and addressing email delivery blocks.
- Decision: Chose Magic Link (signInWithOtp) over Email+Password for both `/login` (shouldCreateUser: false) and `/signup` (shouldCreateUser: true). 
- Decision: Resend SMTP is in a temporary default-SMTP state pending a custom domain purchase due to sandbox restrictions.

## [2026-08-13] Multi-Model Fallback for Resiliency
- Context: A single provider outage (e.g. Gemini 503 or 429 quota errors) shouldn't fail the extraction process completely.
- Decision: Implemented a fallback chain (`gemini-3.5-flash` → `gemini-3-flash-preview` → `gemini-3.1-flash-lite-preview`) that automatically catches provider errors, temporarily blocks the failing model in Postgres, and retries the next model.
- Rejected alternatives: Relying solely on client-side retries or showing the raw provider error.

## [2026-08-13] Parallel AI Execution
- Context: Processing both the job description extraction and resume matching sequentially was too slow.
- Decision: Fired both requests concurrently since they don't depend on each other.
