# ApplyFlow — Current State

*This file is the single source of truth for "what's true right now." It
is rewritten in place at the close of every session — not appended to.
Resolved items are removed here and folded into changelog.md /
decisions.md instead. Replaces the handoff_context_sessionN.md chain.
See architecture.md / decisions.md / schema.md / changelog.md for
anything not called out below as recently changed.*

*Last updated: 2026-09-08 (Session 13)*

## 1. Confirmed working / shipped

- **Ghosted status validation & UI parity:** Added `'ghosted'` to API Zod validation schemas (`PatchSchema`, `ApplicationInsertSchema`) and frontend dropdown menus in `/new` and `/applications/[id]`, fixing 400 Bad Request errors when saving applications in ghosted status.
- **Source field dropdown:** Source field converted to dropdown (LinkedIn/Indeed/JobStreet/Facebook/Company Website/Referral/Other) with free-text fallback and AI auto-match. No DB/schema changes; `/api/extract` untouched.
- **Removed stale Resend-sandbox copy:** Cleaned up `login/page.tsx` and `signup/page.tsx` error fallbacks, merged privacy-policy bullet into Gmail SMTP entry.
- **Mobile layout inconsistencies:** Role Fit/Culture Fit grid on `/new` now responsive, removed `text-sm` from tech-stack inputs to prevent iOS Safari auto-zoom-on-focus.
- **Terminal error response:** `/api/match` now returns 422 instead of 500 on terminal errors.
- **Dashboard status filter dropdown:** Replaced native `<select>` with a custom button+dropdown pattern, fixing styling limitations and incidental clipping bug.

## 2. Open / blocking

- **Legal Pages:** `/terms` and `/privacy` are still draft-pending lawyer review. Discretionary, user's call on launch timing.

## 3. Next steps, priority order

**Backlog:**
1. JD URL-fetching feature — large, touches a Protected AI Route, needs its own full plan cycle, don't bundle with smaller tasks.

## 4. Future plans (not yet scoped)

- **Gamification:** application goals and related mechanics (e.g. streaks, targets, progress tracking) to motivate consistent job-search activity. Early-stage idea, not yet scoped or planned — flagged here for future discussion, not an active backlog item.

