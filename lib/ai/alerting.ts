import { Resend } from 'resend';
import { createServiceClient } from '../supabase/serviceClient';

export function sendOperatorAlert(subject: string, html: string) {
  if (!process.env.ALERT_EMAIL || !process.env.RESEND_API_KEY) {
    console.warn(`[Alerting] ALERT_EMAIL or RESEND_API_KEY not set. Suppressing alert: "${subject}"`);
    return;
  }
  
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Fire-and-forget: we do not await this in the critical path
  resend.emails.send({
    from: 'ApplyFlow Alerts <onboarding@resend.dev>', // Matching the existing /api/cron/reminders identity
    to: process.env.ALERT_EMAIL,
    subject,
    html
  }).catch((err: unknown) => {
    console.error("[Alerting] Failed to send operator alert:", err);
  });
}

export async function recordExhaustionAndCheckAlert(): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc('record_exhaustion_event');
    if (error) throw error;
    return data === true;
  } catch (err) {
    console.error(`[Alerting] Failed to record exhaustion event:`, err);
    return false;
  }
}
