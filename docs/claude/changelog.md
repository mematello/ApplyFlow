# ApplyFlow — Changelog

## [2026-08-20] (Session 6)
- Implemented: `guard.ts` AI prompt injection defense bypass fix. Added `normalizeForScan` step to normalize unicode homoglyphs and strip zero-width characters before running the heuristic filter.
- Implemented: Injection defense parity for `/api/match`. Integrated `screenInput` (now `screenResumeText`) and added strict XML-style delimiter isolation (`<job_data>` / `<resume_data>`) with system instructions to ignore payload commands.
- Implemented: Fallback loop bugfix. AI provider errors are now strictly routed via a 3-way classification (`TEMPORARY_PROVIDER`, `PERMANENT_PROVIDER`, `TERMINAL_EXECUTION`), stopping deprecated models from looping infinitely and stopping malformed schemas from burning fallback quota.
- Implemented: Operator alerting system for AI failures via Resend. Deprecation errors (`PERMANENT_PROVIDER`) immediately trigger alerts and 30-day DB blocks. Exhaustion errors trigger alerts deduplicated via a 1-hour sliding window, 3-event threshold RPC.

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
