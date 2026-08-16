# ApplyFlow — Changelog

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
