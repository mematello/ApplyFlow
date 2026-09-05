import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase/serviceClient';
import { emailTransporter, verifyEmailTransporter } from '../../../../lib/utils/email';

export async function GET(req: Request) {
  try {
    const getBaseUrl = () => {
      if (process.env.APP_URL) {
        return process.env.APP_URL;
      }
      if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
      }
      if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
      }
      return 'http://localhost:3000';
    };

    // 1. Verify Vercel Cron authentication (only allow authorized requests)
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'test_secret'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Query Supabase (using Service Role to bypass RLS and access multiple users)
    const supabase = createServiceClient();
    
    // Verify SMTP connection before processing the batch
    const isSmtpReady = await verifyEmailTransporter();
    if (!isSmtpReady) {
      return NextResponse.json({ error: 'SMTP connection failed' }, { status: 500 });
    }

    // Fetch applications where reminders are enabled and not yet sent.
    // Note: We don't filter by next_action_date = today here because 'today' depends on the user's timezone.
    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        id,
        user_id,
        company_name,
        role,
        next_action,
        next_action_date,
        users ( email )
      `)
      .eq('reminder_enabled', true)
      .eq('next_action_reminder_sent', false)
      .not('next_action_date', 'is', null);

    if (error) {
      console.error('Error fetching applications for reminders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!applications || applications.length === 0) {
      return NextResponse.json({ message: 'No reminders to process.' });
    }

    // Fetch user profiles to personalize the greeting and get timezone preferences
    const userIds = [...new Set(applications.map((app) => app.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, reminder_timezone, reminder_send_time')
      .in('id', userIds);
      
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    const successfulSends: string[] = [];
    const failedSends: Record<string, unknown>[] = [];
    const now = new Date();

    // 3. Process each application
    for (const app of applications) {
      const profile = profileMap.get(app.user_id);
      const tz = profile?.reminder_timezone || 'UTC';
      const sendTime = profile?.reminder_send_time || '09:00:00';
      
      let localDate = '';
      let localTime = '';
      
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const parts = formatter.formatToParts(now);
        const p = Object.fromEntries(parts.map(pt => [pt.type, pt.value]));
        localDate = `${p.year}-${p.month}-${p.day}`;
        let localHour = p.hour;
        if (localHour === '24') localHour = '00';
        // Add seconds for string comparison against TIME types
        localTime = `${localHour}:${p.minute}:00`;
      } catch (e) {
        console.error(`Error formatting date for timezone ${tz}`, e);
        continue;
      }
      
      // Check condition: local_date == next_action_date AND local_time >= reminder_send_time
      if (localDate === app.next_action_date && localTime >= sendTime) {
        
        // Atomic check-and-set: prevent race conditions from duplicate scheduler invocations
        const { data: updateData, error: updateError } = await supabase
          .from('applications')
          .update({ next_action_reminder_sent: true })
          .eq('id', app.id)
          .eq('next_action_reminder_sent', false)
          .select('id');
          
        if (updateError || !updateData || updateData.length === 0) {
          console.log(`Skipping app ${app.id} - already sent or error acquiring lock`);
          continue;
        }

        const users = (app as { users?: { email?: string } | { email?: string }[] }).users;
        const email = Array.isArray(users) ? users[0]?.email : users?.email;
        if (!email) continue;

        const action = app.next_action || 'Follow up';
        const fullName = profile?.full_name;
        const firstName = fullName ? fullName.split(' ')[0] : 'there';
        
        try {
          const info = await emailTransporter.sendMail({
            from: `"ApplyFlow Reminders" <${process.env.SMTP_EMAIL || 'applyflow.noreply@gmail.com'}>`,
            to: email,
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
                      <a href="${getBaseUrl()}/applications/${app.id}" style="display: inline-block; background-color: #111827; color: #ffffff; font-weight: 600; font-size: 15px; text-decoration: none; padding: 12px 24px; border-radius: 6px; text-align: center; transition: background-color 0.2s;">View Application Details</a>
                    </div>
                  </div>
                </div>
                <div style="max-width: 500px; margin: 24px auto 0; text-align: center;">
                  <p style="margin: 0; font-size: 13px; color: #6b7280;">
                    You're receiving this because reminders are enabled for this application.<br>
                    <a href="${getBaseUrl()}/applications/${app.id}" style="color: #6b7280; text-decoration: underline;">Manage reminder settings &rarr;</a>
                  </p>
                </div>
              </div>
            `,
          });

          if (info.rejected && info.rejected.length > 0) {
            console.error(`Failed to send email to ${email} for app ${app.id}: rejected by server`);
            failedSends.push({ id: app.id, error: 'Rejected by server' });
            // Rollback the lock so it can be retried
            await supabase.from('applications').update({ next_action_reminder_sent: false }).eq('id', app.id);
          } else {
            console.log(`Successfully sent email to ${email} for app ${app.id} (MessageId: ${info.messageId})`);
            successfulSends.push(app.id);
          }
        } catch (e: unknown) {
          console.error(`Exception sending email for app ${app.id}:`, e);
          failedSends.push({ id: app.id, error: (e as Error).message });
          // Rollback the lock so it can be retried
          await supabase.from('applications').update({ next_action_reminder_sent: false }).eq('id', app.id);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      fetched: applications.length,
      successful: successfulSends.length,
      failed: failedSends.length,
      details: { successfulSends, failedSends }
    });

  } catch (err: unknown) {
    console.error('Cron reminder error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: (err as Error).message }, { status: 500 });
  }
}
