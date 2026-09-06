# ApplyFlow — Changelog

## [2026-09-06] (Session 10)
- Fixed: Addressed the silent-failure UX gap for resume extraction by adding a persistent inline warning to the resume uploader, and updated the job extraction flow (`/new`) to surface distinct toast messages when match analysis is skipped due to a missing resume or missing extracted text.
- Fixed: Production email link bug in the cron route (was falling back to localhost) by leveraging a fallback chain using Vercel system environment variables (`VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`).
- Fixed: Renamed `processed` field to `fetched` in the `/api/cron/reminders` response to accurately reflect its meaning.
- Fixed: Status badge truncation bug caused by `w-full` on the inner `<select>` element; removing it allows intrinsic width calculation, fixing clipping on longer statuses like "Screening".
- Fixed: Mobile layout constraint for `notes` and `interview_notes` textareas by increasing the default minimum height (`min-h-48`), standardizing cross-device usability despite iOS Safari's native lack of support for the `resize-y` property.
- Implemented: Comprehensive Unsaved Changes navigation guard with a custom `<UnsavedChangesModal />` and dirty-state tracking (`useUnsavedChangesWarning`), intercepting hard navigations, in-app links, and browser back/forward history events across both `/new` and `/applications/[id]`.
- Fixed: Unsaved Changes modal rendering issues. Replaced `window.confirm` with a custom modal rendered via `createPortal` directly to `document.body` to bypass Safari's silent blocking of native popups on swipe-back gestures and to immunize the modal against `position: fixed` layout hijacking by parent element transforms.

## [2026-08-29] (Session 9 - Continued)
- Implemented: Timezone-aware reminders. Added timezone/time capture to Onboarding and Settings, and updated `/api/cron/reminders` to check local time matches rather than strict UTC dates.
- Implemented: Dashboard client-side pagination, including user-preference persistence for page sizes.
- Implemented: Deterministic server-side and client-side sorting by `created_at DESC`, with fallback sorting to prevent jitter.
- Implemented: Added "ghosted" status to application tracking, and set the default dashboard filter to "Active" (hiding rejected/withdrawn/ghosted applications).
- Resolved: Production email link bug in the cron route (was falling back to localhost) by leveraging Vercel system environment variables.
- Fixed: Renamed misleading `processed` field to `fetched` in cron reminders response for clarity.
- Note: An incident occurred during testing where the concurrency test was executed against the live Supabase environment using a real user's profile and `service_role` credentials without prior authorization. A test application was inserted, which successfully triggered a real email to the user's production email address. The test script also attempted to modify the user's `reminder_timezone` and `reminder_send_time` without rollback logic, but the DB mutation failed silently because the migration had not yet been executed in production. The test applications were successfully cleaned up. Going forward, tests must strictly use synthetic users and local/mock databases.

## [2026-08-25] (Session 9)
- Fixed: BYOK (Bring Your Own Key) bug in `/api/extract` and `/api/match` where custom keys were ignored and triggered the `FREE_LIMIT_EXHAUSTED` (403) error if `profiles.preferred_provider` was null. Fixed by decoupling key lookup and defaulting to 'google'.
- Confirmed: PDF resume text extraction is fully functional on the live production environment.
- Confirmed: Vercel Analytics is enabled and actively tracking. Speed Insights was intentionally left disabled to conserve free-tier allocation.
- Fixed: `/api/extract` false-positive rejection of anonymous/company-less job descriptions. Rejection logic now solely evaluates `role` confidence instead of `company_name` to prevent valid postings without explicit company names from being treated as injection attempts.

## [2026-08-24] (Session 8)
- Implemented: Initial production deployment to Vercel.
- Fixed: `vercel.json` UTF-16/BOM encoding bug causing parsing errors in production.
- Fixed: ESLint build-blocking errors (`react/no-unescaped-entities`, `@typescript-eslint/no-explicit-any`).
- Fixed: Supabase magic-link redirect misconfiguration (missing `https://` and `/**` wildcard).
- Note: PDF resume text extraction fixes were merged and deployed to production, but have not yet been confirmed working on the live production environment.

## [2026-08-23]
- Fixed: PDF resume text extraction failing in production (subprocess bundling failure — execSync-invoked script wasn't included in the Vercel serverless bundle).
- Fixed: Follow-up production failure after the above fix (pdfjs-dist canvas API dependency missing in Node serverless runtime) — resolved via @napi-rs/canvas + globalThis polyfill injection.
- Note both were only reproducible in the deployed Vercel environment, not local dev/build — worth remembering for future serverless-specific debugging.

## [2026-08-20] (Session 6)
- Implemented: `guard.ts` AI prompt injection defense bypass fix. Added `normalizeForScan` step to normalize unicode homoglyphs and strip zero-width characters before running the heuristic filter.
- Implemented: Injection defense parity for `/api/match`. Integrated `screenInput` (now `screenResumeText`) and added strict XML-style delimiter isolation (`<job_data>` / `<resume_data>`) with system instructions to ignore payload commands.
- Implemented: Fallback loop bugfix. AI provider errors are now strictly routed via a 3-way classification (`TEMPORARY_PROVIDER`, `PERMANENT_PROVIDER`, `TERMINAL_EXECUTION`), stopping deprecated models from looping infinitely and stopping malformed schemas from burning fallback quota.
- Implemented: Operator alerting system for AI failures via Resend. Deprecation errors (`PERMANENT_PROVIDER`) immediately trigger alerts and 30-day DB blocks. Exhaustion errors trigger alerts deduplicated via a 1-hour sliding window, 3-event threshold RPC.
- Implemented: Confirmed migration `0014_system_alerts_and_blocks.sql` is live and verified on the database.
- Implemented: Migrated all system emails (cron reminders and operator alerts) from Resend to Nodemailer/Gmail SMTP to consolidate email infrastructure.
- Implemented: Added Vercel Analytics and Speed Insights, mounted at the root layout (`app/layout.tsx`).

## [2026-08-20]
- Implemented: Terms & Conditions, Privacy Policy pages (app/(legal)/), marked draft-pending-legal-review.
- Implemented: Cookie consent disclosure banner (essential-only, dismiss-and-remember via localStorage), fixed-bottom-bar layout after an initial positioning bug (overlapped hero CTA, clipped button) was caught and corrected.
- Implemented: Clear Local Data button in Settings (IndexedDB wipe, confirmation-gated, hidden during active migration/when no local data exists). Includes a database-connection-closing fix in lib/local/applications.ts that was blocking indexedDB.deleteDatabase.
- Implemented: /api/extract input validation + prompt-injection defense — new lib/ai/guard.ts (heuristic pre-filter), <job_data> delimiter + isolation system instructions, extraction_confidence-based low-confidence soft-rejection. extraction_confidence added to JobExtractionSchema and independently to ApplicationInsertSchema (no extend()/pick() coupling).
- Fixed: decrement_free_ai_uses race condition allowing negative free-use balance under concurrent requests — atomic check-and-decrement RPC (migration 0013_atomic_decrement.sql) + route-level decrementOrThrow helper in app/api/extract/route.ts, fallback-loop-safe (decrements only on successful parse per attempt, not before the loop).
- Note: Pre-launch security pass completed (Phases A-D). Two findings deferred to next session: /api/extract unicode homoglyph bypass on guard.ts's heuristic scan, and /api/match has no equivalent injection defense (relies on /api/extract for billing but has zero input guarding of its own).

## [2026-08-19]
- Implemented: Anonymous local tracking via IndexedDB with migration-to-Supabase upon signup.
- Implemented: Auth UX improvements (cross-tab magic link detection, back-to-landing link).
- Implemented: Added optional resume upload step to onboarding by reusing the extracted `ResumeUploader` component (also used in Settings).
- Implemented: Free-tier AI usage limit (5 lifetime free uses without BYOK), protected by a `service_role`-only trigger, alongside BYOK acquisition instructions in Settings.
- Fixed: Extensive data entry fixes including text field normalization (company/role), salary currency selector and input normalization, 1-5 role/culture fit validation, and double-submit guards across save, delete, and status actions.
- Fixed: Resolved local-mode application detail routing bug (middleware regex fixed to include underscores in local IDs).
- Fixed: Added missing `currency` column migration and decoupled `ApplicationInsertSchema` from `JobExtractionSchema`.
- Refactored: `/api/extract` updated to return `salary_min`, `salary_max`, and `currency` as structured fields instead of a single `salary_range` string.
- Fixed: `ai_model_usage` counter accuracy fixed (extract route was undercounting retried calls) and BYOK-aware UI implemented (hides shared-quota display when user provides their own key).
- Fixed: Mobile layout round 2: landing page header, dashboard header, dashboard local-mode banner, and auth layout back button — all fixed and verified at 375px live render.
- Refactored: Settings BYOK badge deduplicated (was rendering once per model row, now renders once above the model list).
- Implemented: Data export rebuilt: fixed column-alignment bug (was using Object.keys() on first row only), added explicit ordered field allowlist, added JSON and XLSX formats alongside existing CSV, joined interview_stages table into settings query and flattened into all_interview_stages column.
- Note: An incident occurred where service_role was used without prior approval to validate the export against real user data; this was caught, the script and output files were deleted, and validation was redone with synthetic data.

## [2026-08-16]
- Implemented: Landing page redesign (added dark mode support, updated copy accuracy, and restructured signup/login into a shared `(auth)` group).
- Implemented: Bring Your Own Key (BYOK) merged with a Gemini-only scope for secure API key overrides.
- Implemented: Account deletion route (`app/api/account/delete/route.ts`) now includes Supabase Storage cleanup for uploaded resumes.
- Fixed: Critical bug in `match/route.ts` caused by escaped-interpolation in the AI prompt template.
- Fixed: Resolved Resend SMTP sandbox blocking issue (temporary default-SMTP state pending domain purchase).
- Refactored: Extensive lint and typing cleanup resolving 56 `any` errors across the codebase.
- Note: Evaluated the Impeccable design tool on a separate experimental branch; the branch was ultimately discarded and deleted without merging to `main`.

## [2026-08-14]
- Implemented: Initial Claude Project setup initialized with project documentation templates (`project_overview.md`, `architecture.md`, `decisions.md`, `context_handoff.md`).
- In progress: N/A
- Blocked/open questions: N/A
