# ApplyFlow

ApplyFlow is an AI-powered job application tracker designed to help you organize your job search, automatically extract data from job descriptions, and intelligently match your resume against role requirements.

## Features

- **Automated Data Extraction**: Paste a job description and have Gemini automatically extract the company name, role, tech stack, salary range, and more.
- **Resume Matching**: Upload your resumes (PDF/DOCX) and the system will automatically score your fit for a role, identifying exact strengths and missing skill gaps.
- **Smart Tracking**: Manage your applications through different stages (applied, interviewing, offered, rejected) and keep track of your next required actions.
- **Automated Email Reminders**: Get daily email notifications for scheduled follow-ups and next action dates via Vercel Cron and Resend.

## Tech Stack

- **Frontend / Backend**: [Next.js](https://nextjs.org/) (App Router, Server Actions, API Routes)
- **Database / Auth**: [Supabase](https://supabase.com/) & PostgreSQL
- **AI Processing**: Google [Gemini API](https://ai.google.dev/) (gemini-2.5-flash series)
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
   To set up your Supabase database schema, you must apply the SQL migrations found in the `supabase/migrations/` folder. They are numbered sequentially (e.g., `0001_init.sql`, `0002_rls.sql`, etc.) and should be run in order using the Supabase CLI or applied directly via your project's SQL editor.

   ```bash
   # If using Supabase CLI locally:
   supabase db push
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app.

## AI Model Fallback System

Because AI API quotas can be exhausted during heavy testing or bulk application entry, ApplyFlow includes a specialized internal fallback infrastructure. 

The system tracks daily request counts for each Gemini model in the database (`ai_model_usage` table). If the primary model (`gemini-2.5-flash`) hits a `429 Quota Exceeded` error, the system records the exact block time and automatically falls back to secondary models (like `gemini-2.5-flash-lite`) seamlessly. This ensures uninterrupted extraction and matching without needing manual intervention. You can configure your preferred primary model directly in the app's settings.
