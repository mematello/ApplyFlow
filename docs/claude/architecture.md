# ApplyFlow — Architecture

## High-level structure
```text
app/
  (protected)/          → Authenticated dashboard & new application flow
  api/
    extract/            → AI job-description extraction endpoint
    match/              → AI resume-fit analysis endpoint
    cron/reminders/     → Scheduled follow-up email job
lib/
  ai/models.ts          → Model selection, fallback, and error-parsing logic
  supabase/             → Browser / server / service-role Supabase clients
docs/
  schema.md             → Database schema reference
```

## Data model
- **`users`** & **`profiles`**: Tied to Supabase Auth.
- **`applications`**: Core entity (company, role, status, AI fit scores).
- **`interview_stages`**: Tracks specific interview rounds per application.
- **`resumes`**: References to user's uploaded PDFs in Supabase Storage.
- **`ai_model_usage`**: Internal tracking for Gemini rate limits (shared across concurrent requests).

## Key conventions
- **State & Data Access**: Next.js App Router conventions with Server Components where possible.
- **Security & RLS**: All Supabase tables use Row Level Security (RLS) scoping data to `auth.uid()`.
- **API Defense-in-Depth**: Server-side API routes explicitly re-scope database queries to the authenticated user, acting as a secondary defense layer alongside RLS.
- **AI Calls**: API requests to Gemini are resilient; they use a multi-model fallback chain to avoid failure on 429/503 errors and persist temporary model blocks in Postgres. 

## Known constraints
- **Gemini Rate Limits**: Requests can hit quota limits (`429`) or demand limits (`503`), necessitating the multi-model fallback design.
- **Client/Server Boundary**: API keys never touch the browser; all AI calls are handled securely in Next.js API routes.
