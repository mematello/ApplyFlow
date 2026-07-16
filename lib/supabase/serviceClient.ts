import { createClient } from '@supabase/supabase-js';

// SECURITY NOTE: This client bypasses RLS.
// It MUST ONLY be imported and used within server-side routes (e.g. /api/extract, /api/match, /api/models).
// Never expose this to the client-side or use it for general data fetching where RLS is expected to apply.
export function createServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase Service Role environment variables');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
