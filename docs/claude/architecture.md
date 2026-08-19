# ApplyFlow — Architecture

## High-level structure
```text
app/
  (auth)/               → Login, signup, and shared auth layout
  (protected)/          → Authenticated dashboard, new application flow, and settings
  api/
    extract/            → AI job-description extraction endpoint
    match/              → AI resume-fit analysis endpoint
    cron/reminders/     → Scheduled follow-up email job
    account/delete/     → Account deletion and storage cleanup
    applications/migrate/ → Endpoint for migrating local applications to Supabase
  migrate/              → Interstitial page for local-to-cloud migration
components/
  ThemeToggle.tsx       → Dark/light mode toggle
  ResumeUploader.tsx    → Shared component for resume uploads (used in Settings and Onboarding)
lib/
  ai/models.ts          → Model selection, fallback, and error-parsing logic
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

## Key conventions
- **State & Data Access**: Next.js App Router conventions with Server Components where possible.
- **Local-Mode Abstraction**: A unified data-source layer (`lib/data-source.ts`) handles transparent routing to either Supabase or IndexedDB based on authentication state.
- **Security & RLS**: All Supabase tables use Row Level Security (RLS) scoping data to `auth.uid()`.
- **Free Tier Restrictions**: Increments and decrements of `free_ai_uses_remaining` are handled exclusively via the `decrement_free_ai_uses` RPC. A Postgres trigger (`protect_free_ai_uses`) prevents client resets.
- **API Defense-in-Depth**: Server-side API routes explicitly re-scope database queries to the authenticated user, acting as a secondary defense layer alongside RLS.
- **AI Calls**: API requests to Gemini are resilient; they use a multi-model fallback chain to avoid failure on 429/503 errors and persist temporary model blocks in Postgres. 
- **Settings & BYOK**: The `app/(protected)/settings/` page includes an "AI Providers & BYOK" section scoped to Google Gemini only, allowing users to override global limits securely.
- **Theme**: Dark mode is implemented via `next-themes` (system default + manual toggle).
- **Data Export**: The Settings page fetches application data and joins `interview_stages` (`settings/page.tsx`). The export feature processes this locally to export multi-format tracking data (CSV, JSON, XLSX using the `xlsx`/SheetJS dependency), handling column alignment and timeline flattening without compromising the main application DB shape.
- **Auth Email Delivery**: Authentication emails are delivered via Gmail SMTP through Supabase custom SMTP (applyflow.noreply@gmail.com). This is a permanent solution; Resend is used solely for the `/api/cron/reminders` endpoint.

## Known constraints
- **Gemini Rate Limits**: Requests can hit quota limits (`429`) or demand limits (`503`), necessitating the multi-model fallback design.
- **Client/Server Boundary**: API keys never touch the browser; all AI calls are handled securely in Next.js API routes.
