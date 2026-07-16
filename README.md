# ApplyFlow

ApplyFlow is an AI-powered job application tracker designed to help you organize your job search, automatically extract data from job descriptions, and intelligently match your resume against role requirements.

*(Note: Please refer to `.agents/AGENTS.md` for the AI-assisted development conventions and standing rules used in this project.)*

## Features

- **Automated Data Extraction**: Paste a job description and have Gemini automatically extract the company name, role, tech stack, salary range, and more.
- **Resume Matching**: Upload your resumes (PDF/DOCX) and the system will automatically score your fit for a role, generating a concise, first-person summary of the match for your own tracking notes.
- **Smart Tracking**: Manage your applications through different stages (applied, interviewing, offered, rejected) and keep track of your next required actions.
- **Automated Email Reminders**: Get daily email notifications for scheduled follow-ups and next action dates via Vercel Cron and Resend.

## Tech Stack

- **Frontend / Backend**: [Next.js](https://nextjs.org/) (App Router, Server Actions, API Routes)
- **Database / Auth**: [Supabase](https://supabase.com/) & PostgreSQL
- **AI Processing**: Google [Gemini API](https://ai.google.dev/) (gemini-3-flash-preview series)
- **Email Delivery**: [Resend](https://resend.com/)

## Local Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/mematello/ApplyFlow.git
   cd ApplyFlow
   npm install
   ```

2. **Environment Variables**
   Create a `.env.local` file in the root directory with the following keys:
   ```env
   # Supabase configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # AI integration
   GEMINI_API_KEY=your_google_gemini_api_key

   # Email delivery & Cron security
   RESEND_API_KEY=your_resend_api_key
   CRON_SECRET=a_secure_random_string_used_by_vercel_cron
   ```

3. **Database Migrations**
   To set up your Supabase database schema, you must apply the SQL migrations found in the `supabase/migrations/` folder.
   **ApplyFlow uses a manual migration workflow.** Migrations are written as numbered `.sql` files, but they are applied manually via the Supabase Dashboard SQL editor rather than using the CLI `db push` command. Execute them in numerical order (e.g., `0001_init.sql`, `0002_rls.sql`, etc.).

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app.

## AI Model Fallback System

Because AI API quotas can be exhausted during heavy testing or bulk application entry, ApplyFlow includes a specialized internal fallback infrastructure. 

The system tracks daily request counts for each Gemini model in the database (`ai_model_usage` table). If the primary model hits a `429 Quota Exceeded` error, the system records the exact block time and automatically falls back to secondary models seamlessly. This ensures uninterrupted extraction and matching without needing manual intervention. You can configure your preferred primary model directly in the app's settings.

The current fallback chain is:
1. `gemini-3.5-flash` (Primary/Default, capped at 20 req/day)
2. `gemini-3-flash-preview` (Fallback, ~1500 req/day)
3. `gemini-3.1-flash-lite-preview` (Last resort, ~1500 req/day)

## Roadmap (Phase 2+)

- **URL-Based Job Ingestion**: Automatically scrape and extract job details just by pasting a URL.
- **Duplicate Detection**: Warn users if they are applying to a role they've already tracked.
- **Browser Extension**: A companion extension to capture job details directly from job boards.
- **Multi-User Support**: Transition from a solo-developer tool to a multi-tenant platform.
