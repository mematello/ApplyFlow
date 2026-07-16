import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase/serviceClient';
import { Resend } from 'resend';

export async function GET(req: Request) {
  try {
    // 1. Verify Vercel Cron authentication (only allow authorized requests)
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'test_secret'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resendApiKey = process.env.RESEND_API_KEY || 're_dummy_123';
    const resend = new Resend(resendApiKey);

    // 2. Query Supabase (using Service Role to bypass RLS and access multiple users)
    const supabase = createServiceClient();
    
    // Get current date string in YYYY-MM-DD format (UTC)
    // We compare with the database date_applied which is DATE type
    const today = new Date().toISOString().split('T')[0];

    // Join with public.users table to get the email
    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        id,
        company_name,
        role,
        next_action,
        users ( email )
      `)
      .eq('next_action_date', today)
      .eq('next_action_reminder_sent', false);

    if (error) {
      console.error('Error fetching applications for reminders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!applications || applications.length === 0) {
      return NextResponse.json({ message: 'No reminders to send today.' });
    }

    const successfulSends: string[] = [];
    const failedSends: any[] = [];

    // 3. Process each application and send email
    for (const app of applications) {
      const email = app.users?.email;
      if (!email) continue;

      const action = app.next_action || 'Follow up';
      
      try {
        const { data: resendData, error: resendError } = await resend.emails.send({
          from: 'ApplyFlow Reminders <onboarding@resend.dev>',
          to: email, // Resend free tier restricts this to the verified account email only
          subject: `Reminder: ${action} for ${app.role} at ${app.company_name}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>Application Reminder</h2>
              <p>You have a scheduled action for today:</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Company:</strong> ${app.company_name}</p>
                <p><strong>Role:</strong> ${app.role}</p>
                <p><strong>Action:</strong> ${action}</p>
              </div>
              <p>Log in to ApplyFlow to view more details and update your application status.</p>
            </div>
          `,
        });

        // 4. Update the reminder_sent flag ONLY if the email was successfully sent
        if (resendError) {
          console.error(`Failed to send email to ${email} for app ${app.id}:`, resendError);
          failedSends.push({ id: app.id, error: resendError });
        } else {
          console.log(`Successfully sent email to ${email} for app ${app.id} (Resend ID: ${resendData?.id})`);
          successfulSends.push(app.id);
          
          // Mark as sent
          await supabase
            .from('applications')
            .update({ next_action_reminder_sent: true })
            .eq('id', app.id);
        }
      } catch (e: any) {
        console.error(`Exception sending email for app ${app.id}:`, e);
        failedSends.push({ id: app.id, error: e.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: applications.length,
      successful: successfulSends.length,
      failed: failedSends.length,
      details: { successfulSends, failedSends }
    });

  } catch (err: any) {
    console.error('Cron reminder error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
