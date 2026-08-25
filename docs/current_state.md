# ApplyFlow — Current State

*This file is the single source of truth for "what's true right now." It
is rewritten in place at the close of every session — not appended to.
Resolved items are removed here and folded into changelog.md /
decisions.md instead. Replaces the handoff_context_sessionN.md chain.
See architecture.md / decisions.md / schema.md / changelog.md for
anything not called out below as recently changed.*

*Last updated: 2026-08-25 (Session 9)*

## 1. Confirmed working / shipped

- **App is live on Vercel production.** Session 7's "ready to deploy"
  was aspirational, not verified — actual deploy happened this session
  and surfaced four production-only issues, all now resolved (below).
- Migration 0014 live, confirmed via smoke test (Session 7) — unchanged.
- Email fully unified on Gmail SMTP/nodemailer (auth, cron reminders,
  operator alerts); Resend fully removed (Session 7) — unchanged.
- `vercel.json` UTF-16/BOM encoding bug — fixed, confirmed via strict
  JSON parse.
- ESLint build-blocking errors (`react/no-unescaped-entities`,
  `@typescript-eslint/no-explicit-any`) — fixed, confirmed via clean
  `npm run build`.
- Supabase magic-link redirect misconfiguration (missing `https://` and
  `/**` wildcard, production + a preview branch) — fixed, confirmed via
  live login test.
- PDF resume extraction now confirmed on live production via real authenticated upload. Two sequential production-only root causes
  resolved: (1) `execSync` subprocess extraction invisible to Vercel's
  bundler → refactored to direct `await import('pdf-parse')`; (2)
  `pdfjs-dist` canvas API dependency missing in Node serverless → fixed
  via `@napi-rs/canvas` + `globalThis` polyfill, `serverExternalPackages`,
  `outputFileTracingIncludes`. Merged and deployed to production.
- BYOK free-tier gating bug fixed — `/api/extract` and `/api/match` now check `user_api_keys` directly instead of gating on `profiles.preferred_provider`.
- `/api/extract` false-positive rejection of anonymous/company-less JDs fixed — rejection now keys on `role` confidence only, not `company_name`.
- Vercel Analytics confirmed on.
- `AGENTS.md` updated: no git history rewrites without explicit prior
  approval.

## 2. Open / blocking

- Silent-failure UX gap — resume extraction failure is only visible in
  Settings; no signal at upload time or when fit analysis silently
  doesn't run. Not yet scoped.
- `/terms` and `/privacy` — still draft-pending lawyer review.
  Discretionary, user's call on launch timing.

## 3. Next steps, priority order

**Backlog:**
1. Silent-failure UX — surface extraction failure at the `/new` upload
   step, not just Settings.
2. Save-confirmation UX — no visible indicator that an application-detail
   edit saved successfully unless the user scrolls up; add inline/toast
   confirmation.
3. "Source" field — convert to dropdown (LinkedIn, Indeed, JobStreet,
   Facebook, etc.) with free-text fallback.
4. Stale Resend-sandbox copy in login/signup pages (now fully wrong, not
   just sandboxed).
5. Mobile audit: `/new`, `/applications/[id]` body, `/onboarding`.
6. Legal review of `/terms`/`/privacy` — discretionary.
7. JD URL-fetching feature — large, touches a Protected AI Route, needs
   its own full plan cycle, don't bundle with smaller tasks.
8. `/api/extract`/`/api/match` terminal-error response asymmetry
   (422 vs 500) — minor cleanup, low priority.

---

**Correction to prior record:** `handoff_context_session7.md`'s "no
remaining engineering blockers, ready to deploy" framing did not
anticipate the four production-only issues above, which only surfaced
on actual deploy. Its "no blockers" claim should not be trusted as a
predictor of deploy-readiness in future sessions — verify on live
production, not preview, before declaring an area closed. Its
"Immediate Next Steps" #1–2 are superseded by this file.
