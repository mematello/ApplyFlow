import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { z } from 'zod';

// Excludes id, user_id, created_at, raw_jd, extraction_confidence from being patched directly here
const PatchSchema = z.object({
  company_name: z.string(),
  role: z.string(),
  tech_stack: z.array(z.string()),
  salary_range: z.string().nullable(),
  location: z.string().nullable(),
  source: z.string().nullable(),
  recruiter_name: z.string().nullable(),
  contact_info: z.string().nullable(),
  notes: z.string().nullable(),
  date_applied: z.string().nullable(),
  status: z.enum(['draft', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn']),
  job_link: z.string().nullable(),
  priority: z.enum(['low', 'medium', 'high']).nullable(),
  resume_version: z.string().nullable(),
  cover_letter_sent: z.boolean(),
  role_fit: z.number().nullable(),
  culture_fit: z.number().nullable(),
  rejection_reason: z.string().nullable(),
  next_action: z.string().nullable(),
  next_action_date: z.string().nullable(),
  reminder_enabled: z.boolean().optional(),
  interview_stage: z.string().nullable(),
  interview_notes: z.string().nullable(),
}).partial();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsedData = PatchSchema.parse(body);

    const { data: existingApp, error: fetchError } = await supabase
      .from('applications')
      .select('next_action_date')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 });
    }

    const payloadToUpdate: any = {
      ...parsedData,
      updated_at: new Date().toISOString(),
    };

    if (parsedData.next_action_date !== undefined && parsedData.next_action_date !== existingApp.next_action_date) {
      payloadToUpdate.next_action_reminder_sent = false;
    }

    const { data, error } = await supabase
      .from('applications')
      .update(payloadToUpdate)
      .eq('id', id)
      .eq('user_id', user.id) // Explicit safety check to restrict update to row owner
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: (err as any).errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
