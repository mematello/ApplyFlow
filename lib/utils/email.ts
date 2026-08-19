import nodemailer from 'nodemailer';

export const emailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

let isVerified = false;

// Verify connection lazily to catch auth issues without blocking module import
export async function verifyEmailTransporter(): Promise<boolean> {
  if (isVerified) return true;
  try {
    await emailTransporter.verify();
    isVerified = true;
    console.log('[Email Utility] SMTP Server verified and ready');
    return true;
  } catch (error) {
    console.error('[Email Utility] SMTP Connection Error:', error);
    return false;
  }
}
