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
        user_id,
        company_name,
        role,
        next_action,
        users ( email )
      `)
      .eq('next_action_date', today)
      .eq('reminder_enabled', true)
      .eq('next_action_reminder_sent', false);

    if (error) {
      console.error('Error fetching applications for reminders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!applications || applications.length === 0) {
      return NextResponse.json({ message: 'No reminders to send today.' });
    }

    // Fetch user profiles to personalize the greeting
    const userIds = [...new Set(applications.map((app) => app.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);
      
    const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

    const successfulSends: string[] = [];
    const failedSends: any[] = [];

    // 3. Process each application and send email
    for (const app of applications) {
      const email = app.users?.email;
      if (!email) continue;

      const action = app.next_action || 'Follow up';
      
      const fullName = profileMap.get(app.user_id);
      const firstName = fullName ? fullName.split(' ')[0] : 'there';
      
      try {
        const { data: resendData, error: resendError } = await resend.emails.send({
          from: 'ApplyFlow Reminders <onboarding@resend.dev>',
          to: email, // Resend free tier restricts this to the verified account email only
          subject: `Reminder: ${action} with ${app.company_name}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px; color: #111827;">
              <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                <div style="padding: 32px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">ApplyFlow</h1>
                </div>
                <div style="padding: 32px;">
                  <p style="margin-top: 0; margin-bottom: 24px; font-size: 16px; line-height: 24px; color: #374151;">
                    Hi ${firstName},<br><br>This is your scheduled reminder for your job application at <strong>${app.company_name}</strong>.
                  </p>
                  
                  <div style="background-color: #f3f4f6; border-left: 4px solid #111827; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 32px;">
                    <p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Next Action</p>
                    <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #111827;">${action}</p>
                    <p style="margin: 0; font-size: 15px; color: #4b5563;"><strong>Role:</strong> ${app.role}</p>
                  </div>

                  <div style="text-align: center;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/applications/${app.id}" style="display: inline-block; background-color: #111827; color: #ffffff; font-weight: 600; font-size: 15px; text-decoration: none; padding: 12px 24px; border-radius: 6px; text-align: center; transition: background-color 0.2s;">View Application Details</a>
                  </div>
                </div>
              </div>
              <div style="max-width: 500px; margin: 24px auto 0; text-align: center;">
                <p style="margin: 0; font-size: 13px; color: #6b7280;">
                  You're receiving this because reminders are enabled for this application.<br>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/applications/${app.id}" style="color: #6b7280; text-decoration: underline;">Manage reminder settings &rarr;</a>
                </p>
              </div>
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
