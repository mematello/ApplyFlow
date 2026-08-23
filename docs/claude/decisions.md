# ApplyFlow — Decisions Log

## [2026-08-23] PDF Extraction Vercel Serverless Architecture Fixes
- Context: Resume extraction failed in production with "Cannot find module" and then "DOMMatrix is not defined".
- Root cause #1: `execSync`-based subprocess extraction wasn't traceable by Vercel's Node File Trace, causing `Cannot find module` in production. 
- Fix: refactored to direct `await import('pdf-parse')` inside the route handler.
- Root cause #2: `pdf-parse@2.x`'s underlying `pdfjs-dist` dependency requires browser-standard canvas APIs (`DOMMatrix`, `ImageData`, `Path2D`) even for text-only extraction, which don't exist in Node's serverless runtime. 
- Fix: added `@napi-rs/canvas` and injected polyfills into `globalThis` before the `pdf-parse` import, plus `serverExternalPackages` and `outputFileTracingIncludes` config in `next.config.ts`.
- Trade-off/accepted risk: injecting `DOMMatrix`/`ImageData`/`Path2D` into `globalThis` persists for the lifetime of a warm Lambda container, meaning it affects all subsequent requests on that container, not just PDF extraction ones. Accepted risk: low likelihood, but if any other dependency uses `typeof DOMMatrix !== 'undefined'` as a browser-vs-server detection heuristic, this could cause it to misbehave. Not currently known to affect anything in this codebase; flagged for awareness if unexplained behavior ever surfaces elsewhere. Note that Option B (scoped canvasFactory injection instead of global mutation, avoiding this risk) was not pursued due to time — flag as a possible future hardening item, not urgent.

## [2026-08-20] Resend to Nodemailer/Gmail SMTP Migration
- Context: We were using Resend for cron reminders and operator alerts, and Supabase's custom SMTP (via Gmail) for auth.
- Decision: Completely removed Resend and migrated all system emails (auth, cron reminders, operator alerts) to a shared Nodemailer transporter using Gmail SMTP (`applyflow.noreply@gmail.com`).
- Trade-offs & Risks Accepted: This creates a consolidated single point of failure. All communications now depend on one personal Gmail account with no custom domain, a ~500/day volume ceiling, and a risk of suspension (Gmail is not designed for automated app sending) with no fallback.
- Mitigation: A deliverability spot-check via Mail-Tester scored 9.5/10 (SPF/DKIM passing), but this was a single-point-in-time test and does not constitute ongoing monitoring. This risk is acknowledged and accepted for the current scale.

## [2026-08-20] Operator Alerting Dedup/Threshold Tradeoff
- Context: Need to alert operators when all AI models fail, without causing alert spam during a true failure cascade.
- Decision: Implemented a deduplication threshold (1-hour suppression window, 3-event threshold) backed by an atomic state lock in Postgres. Because `/api/extract` and `/api/match` fire in parallel, a single system-wide outage generates 2 events at a time. We explicitly accepted the tradeoff that this parallel structure means the 3-event threshold is reached on the *second* user attempt (4 events) rather than the third. It biases toward alerting slightly early, which is acceptable.

## [2026-08-20] AI Provider Error Classification & Regex Use
- Context: `parseGeminiError` conflated transient quota failures with permanent model deprecations and malformed request schemas. 
- Decision: Introduced a strict 3-way classification (`TEMPORARY_PROVIDER`, `PERMANENT_PROVIDER`, `TERMINAL_EXECUTION`). Because the Gemini API does not cleanly isolate a "deprecated" error code (it returns a generic 400), we rely on a keyword regex (`/(model|unsupported|deprecated|not found|retired)/i`) for 400s to classify `PERMANENT_PROVIDER`. This is a known fragility point accepted because no better signal exists. Unrecognized 4xx/5xx codes default safely to `TERMINAL_EXECUTION`.

## [2026-08-20] Permanent AI Block Duration
- Context: Deprecated models (`PERMANENT_PROVIDER`) must be removed from the fallback chain so they stop burning request latency.
- Decision: Set the block duration for permanently failed models to 30 days (`2592000` seconds). This is long enough to effectively auto-disable the model for the immediate future, giving operators ample time to push a code update removing it from `models.ts` without needing an emergency hotfix.

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
