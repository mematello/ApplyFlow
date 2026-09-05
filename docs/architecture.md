# ApplyFlow — Architecture

## High-level structure
```text
app/
  (auth)/               → Login, signup, and shared auth layout
  (protected)/          → Authenticated dashboard, new application flow, and settings
  (legal)/              → Static legal pages (Terms & Conditions, Privacy Policy)
  api/
    extract/            → AI job-description extraction endpoint
    match/              → AI resume-fit analysis endpoint (Billing rides on extract)
    cron/reminders/     → Scheduled follow-up email job (triggered via external cron-job.org)
    account/delete/     → Account deletion and storage cleanup
    applications/migrate/ → Endpoint for migrating local applications to Supabase
  migrate/              → Interstitial page for local-to-cloud migration
components/
  ThemeToggle.tsx       → Dark/light mode toggle
  ResumeUploader.tsx    → Shared component for resume uploads (used in Settings and Onboarding)
lib/
  utils/
    email.ts            → Shared Nodemailer transporter (lazy-verified) for all system emails
  ai/models.ts          → Model selection, fallback, and error-parsing logic
  ai/guard.ts           → Pre-filter heuristic scanning for AI prompt injection defense
  ai/alerting.ts        → Operator alerting for AI model exhaustion and deprecation
  supabase/             → Browser / server / service-role Supabase clients
  local/                → IndexedDB adapters (`db.ts`, `applications.ts`) for local-mode
  data-source.ts        → Data abstraction layer routing between Supabase and IndexedDB
docs/
  schema.md             → Database schema reference
```

## Data model
- **`users`** & **`profiles`**: Tied to Supabase Auth. Contains `free_ai_uses_remaining` (protected by trigger).
- **`applications`**: Core entity (company, role, status, AI fit scores). Includes `currency`.
- **`interview_stages`**: Tracks specific interview rounds per application.
- **`resumes`**: References to user's uploaded PDFs in Supabase Storage.
- **`ai_model_usage`**: Internal tracking for Gemini rate limits (shared across concurrent requests).
- **`user_api_keys`**: Encrypted user-provided API keys for BYOK.
- **`system_events` & **`system_alerts_state`**: State tracking for deduplicating operator alerts.

## Key conventions
- **State & Data Access**: Next.js App Router conventions with Server Components where possible.
- **Local-Mode Abstraction**: A unified data-source layer (`lib/data-source.ts`) handles transparent routing to either Supabase or IndexedDB based on authentication state.
- **Security & RLS**: All Supabase tables use Row Level Security (RLS) scoping data to `auth.uid()`. System alert tables use explicit deny-all policies.
- **Free Tier Restrictions**: Increments and decrements of `free_ai_uses_remaining` are handled exclusively via the `decrement_free_ai_uses` RPC. A Postgres trigger (`protect_free_ai_uses`) prevents client resets.
- **API Defense-in-Depth**: Server-side API routes explicitly re-scope database queries to the authenticated user, acting as a secondary defense layer alongside RLS.
- **PDF Resume Extraction**: Extraction runs directly in-process within `app/api/resumes/route.ts` (bypassing a previous subprocess model that failed Vercel bundling). It utilizes `pdf-parse` (and its underlying `pdfjs-dist` dependency), which requires browser canvas APIs even for text extraction. To support this in Vercel's Node runtime, we inject `@napi-rs/canvas` polyfills (`DOMMatrix`, `ImageData`, `Path2D`) into `globalThis`. Vercel deployment is stabilized via two settings in `next.config.ts`: `serverExternalPackages` (for the native canvas binaries) and `outputFileTracingIncludes` (to force the bundler to trace the dynamic `pdf.worker.mjs` path).
- **AI Prompt Injection Defense**: Both `/api/extract` and `/api/match` run inputs through `guard.ts` before sending to the model. Inputs are first passed through `normalizeForScan` (which strips zero-width characters and normalizes unicode homoglyphs to defend against bypass attacks) before heuristic scanning. At the prompt level, user inputs are isolated using XML-style delimiters (e.g. `<job_data>` and `<resume_data>`) with explicit system instructions to ignore commands within those blocks.
- **AI Calls & Fallback Classification**: API requests use a multi-model fallback chain (`gemini-3.5-flash` → `gemini-3-flash-preview` → `gemini-3.1-flash-lite-preview`). Provider errors are strictly mapped to a 3-way classification (`errorClass`):
  - `TEMPORARY_PROVIDER`: Quota/demand issues (429/503). Retries the next model in the chain.
  - `PERMANENT_PROVIDER`: Deprecation or model retirement (404, or 400 with specific keywords). Fails fast, permanently blocks the model for 30 days, and triggers an operator alert.
  - `TERMINAL_EXECUTION`: Malformed requests or schema failures. Fails fast immediately without burning downstream model quota.
- **Billing Relationship**: The `/api/match` route depends entirely on `/api/extract` for billing enforcement and free-tier decrementing. Since they fire in parallel, `/api/extract` acts as the billing gatekeeper; `/api/match` checks quota but does not deduct from it.
- **Operator Alerting**: The system actively pages operators via email (using Nodemailer/Gmail SMTP via `lib/utils/email.ts`) on critical AI failures. Alerts are triggered on model deprecation (`PERMANENT_PROVIDER`) and fallback chain exhaustion. Exhaustion alerts are deduplicated via a 1-hour sliding window suppressing duplicates, governed by a `record_exhaustion_event` RPC that locks a state row and trips at a >= 3 event threshold. The SMTP connection is "lazy-verified" (no handshake on import) to ensure `/api/extract` and `/api/match` don't pick up an implicit network dependency just by importing `alerting.ts`.
- **Settings & BYOK**: The `app/(protected)/settings/` page includes an "AI Providers & BYOK" section scoped to Google Gemini only, allowing users to override global limits securely.
- **Theme**: Dark mode is implemented via `next-themes` (system default + manual toggle).
- **Data Export & Privacy Controls**: Settings exposes a CSV/JSON/XLSX export and a 'Clear Local Data' IndexedDB wipe.
- **Auth & System Email Delivery**: Authentication emails, scheduled follow-up reminders (`/api/cron/reminders`), and operator alerts are all delivered via Gmail SMTP (`applyflow.noreply@gmail.com`). Resend has been completely removed to consolidate around a single email infrastructure. The `/api/cron/reminders` endpoint is triggered every minute by an external scheduler (cron-job.org) using a Bearer token with `CRON_SECRET`.
- **Analytics & Performance**: Vercel Analytics and Speed Insights are mounted once at the root layout level (`app/layout.tsx`) to track traffic and web vitals across the application.

## Known constraints
- **Gemini Rate Limits**: Requests can hit quota limits (`429`) or demand limits (`503`), necessitating the multi-model fallback design.
- **Client/Server Boundary**: API keys never touch the browser; all AI calls are handled securely in Next.js API routes.
- **Cron Scheduling limits**: Vercel Hobby plan restricts native cron jobs (`vercel.json`) to run at most once daily. As a result, the application relies on an external scheduler (cron-job.org) to handle high-frequency recurring tasks like the minute-resolution reminder emails.
