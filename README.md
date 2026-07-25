# ApplyFlow

AI-powered job application tracker that turns a pasted job posting into a structured, trackable application — complete with an AI-generated fit assessment against your resume.

Built to solve a real problem from my own job search: manually re-typing job postings into a spreadsheet, then guessing whether a role is actually worth applying to, is tedious and error-prone. ApplyFlow automates both.

![ApplyFlow Demo](./docs/screenshots/applyflow-vid-demo.gif)

## What it does

*   **Paste a job description** into the app.
    ![New Job Application](./docs/screenshots/new_job_application.png)
*   **AI extraction** — Gemini parses the raw text into structured fields: company, role, tech stack, salary range, location, source, recruiter contact, and notes.
*   **AI fit analysis** — the same job description is compared against your uploaded resume, producing a role fit and culture fit score (1–5), a priority rating (low/medium/high), and a list of matched strengths vs. gaps.
    ![AI Fit Analysis](./docs/screenshots/ai_fit_analysis.png)
*   **Review & save** — both results populate a single form; edit anything before saving.
*   **Track the pipeline** — every saved application moves through statuses (Draft → Applied → Screening → Interview → Offer / Rejected / Withdrawn) on a dashboard you can search and filter.
    ![Dashboard View](./docs/screenshots/dashboard.png)
*   **Optional follow-up reminders** — set a "next action date" on any application, and a scheduled job emails you a reminder ahead of it. Leave it blank if you don't need a nudge.

## Tech stack

**Frontend**
*   Next.js 15 (App Router), React 19
*   Tailwind CSS v4
*   next-themes (dark/light mode)
*   Lucide React (icons)

**Backend**
*   Next.js API routes (`/api/*`)
*   Supabase (PostgreSQL, Auth, Storage)
*   Row Level Security enforced at the database level — every query is scoped to `auth.uid()`

**AI**
*   Google Gemini API (`@google/genai`)
*   Multi-model fallback chain (`gemini-3.5-flash` → `gemini-3-flash-preview` → `gemini-3.1-flash-lite-preview`) with automatic retry when a model returns a 503 (high demand) or 429 (quota exceeded), so a single provider hiccup doesn't fail the request.
*   Temporary model blocking persisted in Postgres, shared across concurrent requests.

**Document processing**
*   `pdf-parse` and `mammoth` for extracting text from uploaded resumes (PDF/DOCX)

**Notifications**
*   Resend, used by a scheduled cron route to send follow-up reminder emails

## Architecture

### System Architecture

```mermaid
graph TD
    subgraph Client["Client (Browser)"]
        UI["React 19 / Next.js UI<br/><i>Dashboard & /new Form</i>"]
    end

    subgraph Server["Next.js Server (App Router)"]
        MW["Middleware<br/><i>Session Verification</i>"]
        ExtractRoute["/api/extract<br/><i>JD Extraction</i>"]
        MatchRoute["/api/match<br/><i>Resume Fit Analysis</i>"]
        CronRoute["/api/cron/reminders<br/><i>Scheduled Follow-ups</i>"]
        AILib["lib/ai/models.ts<br/><i>Fallback & Rate Limiting</i>"]
    end

    subgraph Cloud["Backend & External Services"]
        SupabaseDB[("Supabase Postgres<br/><i>Applications, Usage, RLS</i>")]
        SupabaseAuth["Supabase Auth"]
        SupabaseStorage["Supabase Storage<br/><i>Resume Files</i>"]
        Gemini["Google Gemini API<br/><i>3.5-Flash / 3-Flash</i>"]
        Resend["Resend API<br/><i>Email Reminders</i>"]
    end

    UI -->|HTTPS Requests| MW
    MW --> ExtractRoute
    MW --> MatchRoute
    
    ExtractRoute --> AILib
    MatchRoute --> AILib
    AILib -->|Prompt & Schema| Gemini
    
    ExtractRoute -->|Save Data| SupabaseDB
    MatchRoute -->|Save Data| SupabaseDB
    
    UI -->|Auth Check| SupabaseAuth
    UI -->|Upload Resumes| SupabaseStorage
    
    CronRoute -->|Query Due Reminders| SupabaseDB
    CronRoute -->|Send Email| Resend
```

### Directory Structure

```text
app/
  (protected)/          → authenticated dashboard + "/new" application flow
  api/
    extract/            → AI job-description extraction endpoint
    match/              → AI resume-fit analysis endpoint
    cron/reminders/     → scheduled follow-up email job
lib/
  ai/models.ts          → model selection, fallback, and error-parsing logic
  supabase/             → browser / server / service-role Supabase clients
supabase/
  migrations/           → full database schema (see below)
docs/
  schema.md, prompts.md → internal notes on DB structure and prompt design
```

**Request flow for AI operations:**

```mermaid
sequenceDiagram
    autonumber
    
    participant Client as Client (Browser)
    participant NextApi as Next.js API Route<br/>(app/api/*)
    participant AI as AI Module / DB<br/>(lib/ai/models.ts)
    participant Gemini as Gemini API
    
    Note over Client, NextApi: Security Boundary: API Keys never touch browser
    
    Client->>NextApi: Initiates AI Operation (Extract / Match)
    
    Note right of NextApi: Server-side Auth Check
    
    loop Fallback Mechanism (up to max attempts)
        NextApi->>AI: Query available model
        AI-->>NextApi: Return active model name
        NextApi->>Gemini: Send prompt & JSON Schema
        
        alt Success
            Gemini-->>NextApi: Raw JSON response
        else Failure (503 / 429 Quota)
            Gemini-->>NextApi: 503 / 429 Error
            NextApi->>AI: Block model in DB temporarily
            Note right of NextApi: Retry loop with next available model
        end
    end
    
    Note right of NextApi: Parse & Validate against Zod Schema
    
    NextApi-->>Client: Structured JSON Response
```

## Database schema

| Table | Purpose |
| :--- | :--- |
| `profiles` | Per-user settings, including preferred AI model |
| `applications` | Core job application records — extracted fields, AI fit scores, pipeline status |
| `interview_stages` | Timestamped stages/notes tied to a specific application |
| `resumes` | Uploaded resume metadata + extracted text (files live in Supabase Storage) |
| `ai_model_usage` | Tracks daily request counts and temporary blocks per Gemini model |

All tables are protected by Row Level Security — users can only read/write their own data.

## Getting started

```bash
git clone https://github.com/mematello/ApplyFlow.git
cd applyflow
npm install
```

Create a `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
RESEND_API_KEY=
CRON_SECRET=
```

Set up the database by creating a Supabase project and applying the SQL files in `supabase/migrations/` (via `npx supabase db push` locally, or pasted into the Supabase SQL editor).
*(Note: If running the database strictly locally via Docker instead of the cloud, run `npx supabase start` before pushing migrations).*

```bash
npm run dev
```

## Notable engineering decisions

*   **Resilient AI calls:** rather than letting a single Gemini outage break the extraction flow, the app maintains an ordered fallback list of models, persists temporary blocks to the database (shared across concurrent requests), and returns clean, user-facing error messages instead of raw provider errors.
*   **Parallel AI execution:** extraction and resume matching don't depend on each other, so both requests fire concurrently and resolve to the same model where possible — cutting perceived wait time roughly in half.
*   **Honest AI framing:** the fit-analysis notes are deliberately written in the third person, as an analyst's assessment of the candidate — not first person "as if I wrote this myself" — so the tool never misrepresents AI output as the user's own reflection.

## Roadmap

*   [ ] Priority-based sort/filter on the dashboard
*   [ ] Resume versioning tied to specific applications
*   [ ] Analytics view (response rates, interview conversion, common tech stack requests)
*   [ ] Browser extension for one-click capture from job boards

## License

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
