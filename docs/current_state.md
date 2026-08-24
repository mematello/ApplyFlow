# ApplyFlow — Current State

*This file is the single source of truth for "what's true right now." It
is rewritten in place at the close of every session — not appended to.
Resolved items are removed here and folded into changelog.md /
decisions.md instead. Replaces the handoff_context_sessionN.md chain.
See architecture.md / decisions.md / schema.md / changelog.md for
anything not called out below as recently changed.*

*Last updated: 2026-08-24 (Session 8)*

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
- PDF resume extraction — fixed, confirmed on **preview** deployment via
  real authenticated upload. Two sequential production-only root causes
  resolved: (1) `execSync` subprocess extraction invisible to Vercel's
  bundler → refactored to direct `await import('pdf-parse')`; (2)
  `pdfjs-dist` canvas API dependency missing in Node serverless → fixed
  via `@napi-rs/canvas` + `globalThis` polyfill, `serverExternalPackages`,
  `outputFileTracingIncludes`. Merged and deployed to production —
  **not yet confirmed on production itself**, see Open/Blocking.
- `AGENTS.md` updated: no git history rewrites without explicit prior
  approval.

## 2. Open / blocking

- **Blocking — PDF extraction not yet confirmed on production.** Fix is
  merged and deployed; only verified on preview. Needs one real upload
  test on the live production site.
- **Blocking (new) — BYOK key not recognized after free-tier
  exhaustion.** User added a personal Gemini key after exhausting the 5
  free credits; app still blocks with the free-limit message instead of
  recognizing the new key. Root cause unknown — likely a stale
  `free_ai_uses_remaining` check or client state not re-checking BYOK
  status after key save. Undermines BYOK for exactly the users who need
  it.
- Vercel Analytics/Speed Insights dashboard toggles — code merged
  (Session 7), still not confirmed flipped.
- Silent-failure UX gap — resume extraction failure is only visible in
  Settings; no signal at upload time or when fit analysis silently
  doesn't run. Not yet scoped.
- `/terms` and `/privacy` — still draft-pending lawyer review.
  Discretionary, user's call on launch timing.

## 3. Next steps, priority order

**Blocking / required next:**
1. Confirm PDF extraction + fit analysis on live production (not
   preview) via a real upload.
2. Investigate and fix BYOK-key-not-recognized-after-free-limit bug.
3. Flip Vercel Analytics + Speed Insights dashboard toggles.

**Backlog:**
4. Silent-failure UX — surface extraction failure at the `/new` upload
   step, not just Settings.
5. Save-confirmation UX — no visible indicator that an application-detail
   edit saved successfully unless the user scrolls up; add inline/toast
   confirmation.
6. "Source" field — convert to dropdown (LinkedIn, Indeed, JobStreet,
   Facebook, etc.) with free-text fallback.
7. Stale Resend-sandbox copy in login/signup pages (now fully wrong, not
   just sandboxed).
8. Mobile audit: `/new`, `/applications/[id]` body, `/onboarding`.
9. Legal review of `/terms`/`/privacy` — discretionary.
10. JD URL-fetching feature — large, touches a Protected AI Route, needs
    its own full plan cycle, don't bundle with smaller tasks.
11. `/api/extract`/`/api/match` terminal-error response asymmetry
    (422 vs 500) — minor cleanup, low priority.

---

**Correction to prior record:** `handoff_context_session7.md`'s "no
remaining engineering blockers, ready to deploy" framing did not
anticipate the four production-only issues above, which only surfaced
on actual deploy. Its "no blockers" claim should not be trusted as a
predictor of deploy-readiness in future sessions — verify on live
production, not preview, before declaring an area closed. Its
"Immediate Next Steps" #1–2 are superseded by this file.
