import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration error: Missing service role key." }, { status: 500 });
  }

  // Create admin client bypassing RLS
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  // 1. Query for resumes to delete their storage files
  const { data: resumes } = await supabaseAdmin
    .from('resumes')
    .select('storage_path')
    .eq('user_id', user.id);

  if (resumes && resumes.length > 0) {
    const paths = resumes.map(r => r.storage_path).filter(Boolean);
    if (paths.length > 0) {
      // 2. Remove files from storage
      const { data, error: storageError } = await supabaseAdmin.storage.from('resumes').remove(paths);
      if (storageError) {
        // Log the error but proceed with account deletion
        console.error(`Storage removal failed for user ${user.id}. Orphaned paths:`, paths, "Error:", storageError);
      }
    }
  }

  // 3. Delete the auth user (this will cascade delete the database rows)
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("Error deleting user:", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
