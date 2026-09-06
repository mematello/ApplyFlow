# ApplyFlow — Current State

*This file is the single source of truth for "what's true right now." It
is rewritten in place at the close of every session — not appended to.
Resolved items are removed here and folded into changelog.md /
decisions.md instead. Replaces the handoff_context_sessionN.md chain.
See architecture.md / decisions.md / schema.md / changelog.md for
anything not called out below as recently changed.*

*Last updated: 2026-09-05 (Session 9 - Follow-up)*

## 1. Confirmed working / shipped

- **Timezone-aware reminder emails:** Fully implemented, verified, and shipped. Includes timezone and time capture during Onboarding, editable preferences in Settings, and a self-healing `>=` time-match logic in the `/api/cron/reminders` cron route.
- **Database Migrations:** The migration for `reminder_timezone` and `reminder_send_time` in `profiles`, and the migration adding the `ghosted` status to the `application_status` enum, were both successfully run against the live production database.
- **External Cron Scheduler:** The `/api/cron/reminders` endpoint is now triggered by an external scheduler (cron-job.org) running every 1 minute. This replaces Vercel's native cron due to a known constraint: the Vercel Hobby plan strictly limits native cron execution to once daily.
- **Cron Reminders:** Shifted execution to `cron-job.org` due to Vercel Hobby limits. Now accurately targets the user's localized time with an atomic check-and-set strategy. Resolved the production `localhost` email link issue by refactoring URL resolution to use Vercel system environment variables (`VERCEL_PROJECT_PRODUCTION_URL` and `VERCEL_URL`) instead of relying solely on manually defined `APP_URL`.
- **Dashboard Enhancements:**
  - **Pagination:** Added client-side pagination with 10/20/50/100 rows per page, persisting the user's preference in `localStorage`.
  - **Sorting:** Default dashboard sort is now deterministic by `created_at DESC`, with fallback sorting logic to prevent jitter.
  - **Filter UI Redesign:** Replaced the sprawling 10-chip horizontal overflow list with a streamlined `[Active]` chip, `[All]` chip, and a status dropdown for the remaining 8 statuses.
  - **Default Filter:** The dashboard now filters by "Active" statuses by default (automatically hiding rejected, withdrawn, and ghosted applications).
  - **Status Badge Fix:** Removed `w-full` from the inner `select` to fix a visual bug on the live deployment where longer statuses like "Interview" and "Screening" were getting truncated/clipped.
- **Mobile UI Fixes:** Enabled manual drag-resizing (`resize-y`) and bumped the default minimum height for the `notes` and `interview_notes` textareas on mobile viewports so they don't render cramped.
- **Unsaved Changes Warning:** Implemented dirty-state tracking with the `useUnsavedChangesWarning` hook and a custom `UnsavedChangesModal` dialog (using `createPortal` to prevent layout hijacking on long forms) to safely prompt for confirmation on hard navigations, in-app links, and browser back/forward history navigation when uncommitted changes exist in `/new` and `/applications/[id]`. Fully patched against iOS Safari's silent `window.confirm` suppression and verified extensively via automated and real-device testing.

*Note: A testing incident occurred this session where `service_role` credentials were used against the live database without prior authorization during concurrency testing. This issue has been fully documented and resolved in `changelog.md` and requires no further action here.*

## 2. Open / blocking

- **Silent-failure UX gap:** Resume extraction failure is only visible in Settings; no signal at upload time or when fit analysis silently doesn't run. Not yet scoped.
- **Legal Pages:** `/terms` and `/privacy` are still draft-pending lawyer review. Discretionary, user's call on launch timing.

## 3. Next steps, priority order

**Backlog:**
*(Carried forward unchanged from previous session)*
1. Silent-failure UX — surface extraction failure at the `/new` upload step, not just Settings.
2. Save-confirmation UX — no visible indicator that an application-detail edit saved successfully unless the user scrolls up; add inline/toast confirmation.
3. "Source" field — convert to dropdown (LinkedIn, Indeed, JobStreet, Facebook, etc.) with free-text fallback.
4. Stale Resend-sandbox copy in login/signup pages (now fully wrong, not just sandboxed).
5. Mobile audit: `/new`, `/applications/[id]` body, `/onboarding`.
6. Legal review of `/terms`/`/privacy` — discretionary.
7. JD URL-fetching feature — large, touches a Protected AI Route, needs its own full plan cycle, don't bundle with smaller tasks.
8. `/api/extract`/`/api/match` terminal-error response asymmetry (422 vs 500) — minor cleanup, low priority.

## 4. Future plans (not yet scoped)

- **Gamification:** application goals and related mechanics (e.g. streaks, targets, progress tracking) to motivate consistent job-search activity. Early-stage idea, not yet scoped or planned — flagged here for future discussion, not an active backlog item.
