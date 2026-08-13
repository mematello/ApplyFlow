# ApplyFlow — Project Overview

## What it is
ApplyFlow is an AI-powered job application tracker that turns a pasted job posting into a structured, trackable application — complete with an AI-generated fit assessment against your resume.

## Who it's for
Job seekers who want to streamline tracking their applications, avoid manually re-typing job descriptions, and quickly assess whether a role is worth applying to.

## Core features
- **AI Job Extraction:** Parses raw text into structured fields (company, role, tech stack, salary, location).
- **AI Fit Analysis:** Compares the job description against your uploaded resume to produce a fit score, priority rating, and matched strengths vs. gaps.
- **Pipeline Tracking:** Search, filter, and track applications through various statuses (Draft, Applied, Interview, etc.).
- **Follow-up Reminders:** Set next action dates and receive scheduled email nudges.

## Tech stack
- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS v4
- **Backend:** Next.js API Routes, Supabase (PostgreSQL, Auth, Storage)
- **AI:** Google Gemini API (Multi-model fallback chain)
- **Notifications:** Resend API for email reminders

## Non-goals
- Automating the actual submission of applications on company portals (ApplyFlow is strictly for tracking and assessment).
- Serving as a resume builder or editor (users upload their existing resumes).
