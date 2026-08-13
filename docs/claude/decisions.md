# ApplyFlow — Decisions Log

## [2026-08-13] Multi-Model Fallback for Resiliency
- Context: A single provider outage (e.g. Gemini 503 or 429 quota errors) shouldn't fail the extraction process completely.
- Decision: Implemented a fallback chain (`gemini-3.5-flash` → `gemini-3-flash-preview` → `gemini-3.1-flash-lite-preview`) that automatically catches provider errors, temporarily blocks the failing model in Postgres, and retries the next model.
- Rejected alternatives: Relying solely on client-side retries or showing the raw provider error.

## [2026-08-13] Parallel AI Execution
- Context: Processing both the job description extraction and resume matching sequentially was too slow.
- Decision: Fired both requests concurrently since they don't depend on each other.
