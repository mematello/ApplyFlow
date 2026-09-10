# Uppend — Current State

*This file is the single source of truth for "what's true right now." It
is rewritten in place at the close of every session — not appended to.
Resolved items are removed here and folded into changelog.md /
decisions.md instead. Replaces the handoff_context_sessionN.md chain.
See architecture.md / decisions.md / schema.md / changelog.md for
anything not called out below as recently changed.*

*Last updated: 2026-09-10 (Session 15)*

## 1. Confirmed working / shipped

- **Uppend Rebrand:** Rebranded from ApplyFlow to Uppend across UI, metadata, local storage, and documentation. Merged to main via standard `--no-ff` commit.
- **IndexedDB Migration:** Deployed `migrateLegacyDb()` to securely transfer local user data from `applyflow_local` to `uppend_local` using an idempotent write-then-delete approach.
- **Gmail SMTP Account Migration:** Successfully migrated to the new Gmail sender address across Vercel and Supabase using an account rename to preserve sender reputation.

## 2. Open / blocking

- **Post-Account-Deletion UX Bug:** Browser back-navigation can restore a stale bfcache'd settings page that shows a false "Saved!" toast on an unauthorized request (server-side protection holds, but client feedback is misleading). Needs investigation and a dedicated fix branch (e.g., `fix/post-delete-session-and-local-merge`).
- **Silent Local-Data Merge on Auth:** `/migrate` runs unconditionally after any successful magic-link auth (login or signup), silently merging local IndexedDB data into the authenticated account without a confirmation prompt. Needs investigation and fix alongside the bug above.
- **Shared DB Environment Gap:** Testing branches currently risks polluting production data. We need to formalize separated environments (e.g., local mock or staging database).
- **Legal Pages:** `/terms` and `/privacy` are still draft-pending lawyer review. Discretionary, user's call on launch timing.
- **AGENTS.md Outdated Context:** The "Project Context" section of `AGENTS.md` still reads "ApplyFlow is an AI-powered job application tracker...". This was intentionally skipped during the rebrand but needs a manual update.

## 3. Next steps, priority order

**Backlog:**
1. JD URL-fetching feature — large, touches a Protected AI Route, needs its own full plan cycle, don't bundle with smaller tasks.

## 4. Future plans (not yet scoped)

- **Gamification:** application goals and related mechanics (e.g. streaks, targets, progress tracking) to motivate consistent job-search activity. Early-stage idea, not yet scoped or planned — flagged here for future discussion, not an active backlog item.
