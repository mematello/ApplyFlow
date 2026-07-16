import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { createServiceClient } from '../../../lib/supabase/serviceClient';
import { AI_MODELS } from '../../../lib/ai/models';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = createServiceClient();
    
    // Fetch user's preferred model
    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('preferred_model')
      .eq('id', user.id)
      .single();

    const preferredModel = profile?.preferred_model || AI_MODELS[0].name;

    // Fetch current usage for all models today
    const today = new Date().toISOString().split('T')[0];
    const { data: usageData } = await serviceSupabase
      .from('ai_model_usage')
      .select('*')
      .eq('date', today);

    const usageMap = new Map();
    if (usageData) {
      for (const row of usageData) {
        usageMap.set(row.model_name, row);
      }
    }

    // Prepare response data combining static config with live usage
    const models = AI_MODELS.map(model => {
      const usage = usageMap.get(model.name);
      return {
        ...model,
        request_count: usage?.request_count || 0,
        blocked_until: usage?.blocked_until || null,
        is_preferred: model.name === preferredModel
      };
    });

    return NextResponse.json({ data: models, preferredModel });
  } catch (error: any) {
    console.error("[Models API] Error:", error.message);
    return NextResponse.json({ error: 'Failed to fetch models status.' }, { status: 500 });
  }
}
