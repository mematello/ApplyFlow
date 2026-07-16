import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { is_current } = await request.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (is_current) {
      // Unset others
      await supabase.from('resumes').update({ is_current: false }).eq('user_id', user.id);
    }

    const { data, error } = await supabase
      .from('resumes')
      .update({ is_current })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch first to get storage path
    const { data: resume, error: fetchError } = await supabase
      .from('resumes')
      .select('storage_path')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage.from('resumes').remove([resume.storage_path]);
    if (storageError) {
      console.error("Failed to delete from storage", storageError);
    }

    // Delete from DB
    const { error: dbError } = await supabase.from('resumes').delete().eq('id', id).eq('user_id', user.id);
    
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
