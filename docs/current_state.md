# ApplyFlow — Current State

*This file is the single source of truth for "what's true right now." It
is rewritten in place at the close of every session — not appended to.
Resolved items are removed here and folded into changelog.md /
decisions.md instead. Replaces the handoff_context_sessionN.md chain.
See architecture.md / decisions.md / schema.md / changelog.md for
anything not called out below as recently changed.*

*Last updated: 2026-09-07 (Session 11)*

## 1. Confirmed working / shipped

- **Silent-failure UX at /new:** Resume text-extraction failures are now surfaced at upload time (both Settings and Onboarding, via shared ResumeUploader) through a persistent inline warning, backed by a new additive `extractionFailed` flag on the `/api/resumes` success response. On `/new`, the extraction-complete toast now distinguishes "no default resume set" vs "current resume lacks text" instead of a bare success message when match analysis is silently skipped.
- **Save-confirmation UX at /applications/[id]:** A save-confirmation toast now renders adjacent to the sticky "Save Changes" button at the bottom of the form, in addition to the existing top-of-page toast (additive, not a relocation). Both toasts now auto-clear the moment the user resumes editing (wired into all three state-dirtying functions: `handleInputChange`, `handleTechKeyDown`, `removeTech`), replacing the previous behavior where a stale success message could persist through unsaved edits.
- **Unsaved Changes Warning:** Implemented dirty-state tracking with the `useUnsavedChangesWarning` hook and a custom `UnsavedChangesModal` dialog (using `createPortal` to prevent layout hijacking on long forms) to safely prompt for confirmation on hard navigations, in-app links, and browser back/forward history navigation when uncommitted changes exist in `/new` and `/applications/[id]`. Fully patched against iOS Safari's silent `window.confirm` suppression and verified extensively via automated and real-device testing.
- **Notes field mobile sizing:** Standardized long-form textareas (`notes`, `interview_notes`) to use `min-h-48 resize-y` across both `/new` and `/applications/[id]`, fixing cramped rendering on mobile viewports.
- **Status Badge Truncation:** Fixed an intrinsic-width calculation bug in `DashboardClient.tsx` that was causing longer statuses like "Interview" and "Screening" to be clipped/truncated in some browsers.
- **Email reminder link resolution:** Fixed a production bug where reminder emails linked to `localhost`. The `/api/cron/reminders` route now robustly resolves the domain via a fallback chain checking `APP_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, and `VERCEL_URL`.
- **Timezone-aware reminder emails:** Fully implemented, verified, and shipped. Includes timezone and time capture during Onboarding, editable preferences in Settings, and a self-healing `>=` time-match logic in the `/api/cron/reminders` cron route.
- **Database Migrations:** The migration for `reminder_timezone` and `reminder_send_time` in `profiles`, and the migration adding the `ghosted` status to the `application_status` enum, were both successfully run against the live production database.
- **External Cron Scheduler:** The `/api/cron/reminders` endpoint is now triggered by an external scheduler (cron-job.org) running every 1 minute.
- **Dashboard Enhancements:** Client-side pagination (with `localStorage` size preference), deterministic default sorting (`created_at DESC`), and a redesigned active-first Filter UI.

*Note: A testing incident occurred last session where `service_role` credentials were used against the live database without prior authorization during concurrency testing. This issue has been fully documented and resolved in `changelog.md` and requires no further action here.*

## 2. Open / blocking

- **Legal Pages:** `/terms` and `/privacy` are still draft-pending lawyer review. Discretionary, user's call on launch timing.

## 3. Next steps, priority order

**Backlog:**
1. "Source" field — convert to dropdown (LinkedIn, Indeed, JobStreet, Facebook, etc.) with free-text fallback.
2. Stale Resend-sandbox copy in login/signup pages (now fully wrong, not just sandboxed).
3. Mobile audit: `/new`, `/applications/[id]` body, `/onboarding`.
4. Legal review of `/terms`/`/privacy` — discretionary.
5. JD URL-fetching feature — large, touches a Protected AI Route, needs its own full plan cycle, don't bundle with smaller tasks.
6. `/api/extract`/`/api/match` terminal-error response asymmetry (422 vs 500) — minor cleanup, low priority.

## 4. Future plans (not yet scoped)

- **Gamification:** application goals and related mechanics (e.g. streaks, targets, progress tracking) to motivate consistent job-search activity. Early-stage idea, not yet scoped or planned — flagged here for future discussion, not an active backlog item.
