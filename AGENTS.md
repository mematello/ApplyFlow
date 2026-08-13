## Project Context
ApplyFlow is an AI-powered job application tracker built as a solo-developer personal tool. It uses the Next.js App Router, Supabase (PostgreSQL, Auth, Storage) for the backend and database, and the Gemini API for intelligent data extraction and resume matching.

## Before Starting Any Task
- **Read `docs/schema.md` and `docs/prompts.md`** to understand the current state of the database and AI prompts. Do not assume prior session context is still accurate.

## Standing Rules
- **No Direct SQL Execution**: Never execute SQL migrations directly against the live Supabase project. Generate the migration file and stop; the human runs it manually in the Supabase SQL editor.
- **Protect AI Routes**: Never modify `/api/extract` or `/api/match` route logic as a side effect of an unrelated task. These are sensitive, heavily tested paths.
- **Client Usage**: Server-side Supabase access should use the standard server client (RLS-respecting) by default. Only use the service-role client (`lib/supabase/serviceClient.ts`) when a task explicitly requires bypassing RLS, and say so explicitly when proposing a plan that does.
- **Data Scoping**: Every new API route handling user data must scope queries to the authenticated user explicitly, even where RLS also enforces it (belt and suspenders).
- **Schema Changes**: When a plan involves a schema change, state it as an open question for approval rather than assuming it's fine, per our established workflow.
- **UI Tasks**: Purely presentational/UI tasks should not touch data-fetching, API routes, or RLS logic unless explicitly asked.

## Workflow
- Always produce an implementation plan before writing code, for review and approval. No direct-to-code changes on non-trivial tasks.

## Rule Maintenance
- Keep this file itself updated only when our actual working rules change. Don't let it drift into aspirational rules we don't really follow.
