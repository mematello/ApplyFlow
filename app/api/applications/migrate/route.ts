import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { Application } from '../../../../lib/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { applications } = await request.json();

    if (!Array.isArray(applications) || applications.length === 0) {
      return NextResponse.json({ message: 'No applications to migrate' }, { status: 200 });
    }

    // Fetch existing server applications for this user
    const { data: serverApps, error: fetchError } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id);

    if (fetchError) {
      console.error("Migration fetch error:", fetchError);
      return NextResponse.json({ error: 'Failed to fetch existing applications' }, { status: 500 });
    }

    const serverAppsList = (serverApps as Application[]) || [];
    
    // KNOWN SIMPLIFICATION: We match by company_name + role (case-insensitive).
    // This will incorrectly merge legitimate re-applications (same company/role, different cycle)
    // if a prior server record exists. Acceptable for Phase 1, not solved now.
    
    const newRecordsToInsert: any[] = [];
    const existingRecordsToUpdate: { id: string, payload: any }[] = [];

    for (const localApp of applications) {
      const match = serverAppsList.find(sa => 
        sa.company_name?.toLowerCase() === localApp.company_name?.toLowerCase() &&
        sa.role?.toLowerCase() === localApp.role?.toLowerCase()
      );

      if (match) {
        // Field-level merge: keep server record as base, fill in null/empty fields from local
        const updatePayload: any = {};
        let hasUpdates = false;

        for (const [key, localVal] of Object.entries(localApp)) {
          // skip id, user_id, timestamps
          if (['id', 'user_id', 'created_at', 'updated_at'].includes(key)) continue;

          const serverVal = (match as any)[key];
          
          // If server value is null or empty string, and local value is present, use local value
          if ((serverVal === null || serverVal === '' || serverVal === undefined) && 
              localVal !== null && localVal !== '' && localVal !== undefined) {
            
            // Handle arrays (tech_stack) specifically if empty
            if (Array.isArray(serverVal) && serverVal.length === 0 && Array.isArray(localVal) && localVal.length > 0) {
              updatePayload[key] = localVal;
              hasUpdates = true;
            } else if (!Array.isArray(serverVal)) {
              updatePayload[key] = localVal;
              hasUpdates = true;
            }
          }
        }

        if (hasUpdates) {
          existingRecordsToUpdate.push({ id: match.id, payload: updatePayload });
        }
      } else {
        // No match found, insert as a new row
        const newRecord = { ...localApp, user_id: user.id };
        delete newRecord.id; // let Supabase generate a proper UUID
        newRecordsToInsert.push(newRecord);
      }
    }

    // Execute updates
    for (const update of existingRecordsToUpdate) {
      const { error: updateError } = await supabase
        .from('applications')
        .update(update.payload)
        .eq('id', update.id)
        .eq('user_id', user.id); // Belt-and-suspenders
      
      if (updateError) {
        console.error("Migration update error:", updateError);
        // Continue with others even if one fails
      }
    }

    // Execute inserts
    if (newRecordsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('applications')
        .insert(newRecordsToInsert);
        
      if (insertError) {
        console.error("Migration insert error:", insertError);
        return NextResponse.json({ error: 'Failed to insert new migrated applications' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, inserted: newRecordsToInsert.length, updated: existingRecordsToUpdate.length }, { status: 200 });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
