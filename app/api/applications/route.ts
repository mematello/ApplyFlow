import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { z } from 'zod';
import { JobExtractionSchema } from '../../../lib/schemas/extraction';

// Extend the extraction schema to include manual application fields
const ApplicationInsertSchema = JobExtractionSchema.extend({
  date_applied: z.string().nullable().optional(),
  status: z.enum(['draft', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn']).default('draft'),
  job_link: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).nullable().optional(),
  resume_version: z.string().nullable().optional(),
  cover_letter_sent: z.boolean().default(false),
  role_fit: z.number().nullable().optional(),
  culture_fit: z.number().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    // Validate payload against Zod schema
    const parsedData = ApplicationInsertSchema.parse(body);

    // Attach the authenticated user's ID
    const payload = {
      ...parsedData,
      user_id: user.id,
    };

    // Insert into Supabase and return the created row
    const { data, error } = await supabase
      .from('applications')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });

  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      const zodErr = err as unknown as { errors: unknown };
      return NextResponse.json({ error: 'Validation Error', details: zodErr.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error', details: (err as Error).message }, { status: 500 });
  }
}
