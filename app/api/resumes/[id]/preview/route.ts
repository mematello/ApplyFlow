import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: resume, error: fetchError } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const { data, error } = await supabase.storage
      .from('resumes')
      .createSignedUrl(resume.storage_path, 60);

    if (error || !data) {
      return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 });
    }

    const isPdf = resume.storage_path.toLowerCase().endsWith('.pdf');
    return NextResponse.json({ 
      signedUrl: data.signedUrl,
      isPdf,
      extractedText: resume.extracted_text
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal Server Error', details: (err as Error).message }, { status: 500 });
  }
}
