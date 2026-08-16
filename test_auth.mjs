import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
  const email = `test-${Date.now()}@example.com`;
  console.log(`Testing with new email: ${email}`);

  const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email,
      create_user: true,
      gotrue_meta_security: {}
    })
  });

  const text = await res.text();
  console.log('HTTP Status:', res.status);
  console.log('Response body:', text);
}

run();
