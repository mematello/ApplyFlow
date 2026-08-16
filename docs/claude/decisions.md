# ApplyFlow — Decisions Log

## [2026-08-16] Impeccable Design Tool Experiment
- Context: Explored using the Impeccable design system to elevate the UI.
- Decision: The experiment was conducted on a separate branch and evaluated. We decided to discard it; the branch was deleted, and no changes were merged to `main`.

## [2026-08-16] BYOK Gemini-Only Scope
- Context: Multi-provider BYOK implementation highlighted schema-format mismatches (Type.OBJECT vs JSON Schema) between providers (OpenAI/Anthropic vs Gemini).
- Decision: Deferred support for other providers. BYOK UI and logic are strictly locked to Google Gemini for now, though underlying architecture (e.g., `getProvider()`) remains intact for future expansion.

## [2026-08-16] Magic Link Auth & SMTP State
- Context: Restructuring authentication and addressing email delivery blocks.
- Decision: Chose Magic Link (signInWithOtp) over Email+Password for both `/login` (shouldCreateUser: false) and `/signup` (shouldCreateUser: true). 
- Decision: Resend SMTP is in a temporary default-SMTP state pending a custom domain purchase due to sandbox restrictions.

## [2026-08-13] Multi-Model Fallback for Resiliency
- Context: A single provider outage (e.g. Gemini 503 or 429 quota errors) shouldn't fail the extraction process completely.
- Decision: Implemented a fallback chain (`gemini-3.5-flash` → `gemini-3-flash-preview` → `gemini-3.1-flash-lite-preview`) that automatically catches provider errors, temporarily blocks the failing model in Postgres, and retries the next model.
- Rejected alternatives: Relying solely on client-side retries or showing the raw provider error.

## [2026-08-13] Parallel AI Execution
- Context: Processing both the job description extraction and resume matching sequentially was too slow.
- Decision: Fired both requests concurrently since they don't depend on each other.
