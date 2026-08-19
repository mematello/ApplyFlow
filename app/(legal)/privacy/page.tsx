import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | ApplyFlow',
  description: 'Privacy Policy for ApplyFlow',
};

export default function PrivacyPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-4 rounded-md mb-8 border border-yellow-200 dark:border-yellow-900">
        <p className="font-semibold m-0 text-sm">
          Draft — pending legal review. This is boilerplate and does not constitute vetted legal advice.
        </p>
      </div>

      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Account Email:</strong> We collect your email address when you create an account to facilitate secure login via magic links and send application reminder notifications.</li>
          <li><strong>Job Descriptions:</strong> The raw job description text (`raw_jd`) you paste is processed to extract structured fields (e.g., company, role, requirements).</li>
          <li><strong>Resumes & Extracted Text:</strong> If you choose to upload a resume, the file is securely stored in Supabase Storage, and the extracted text is processed to generate AI fit scores.</li>
          <li><strong>AI Fit Scores:</strong> Generated metrics (role fit, culture fit, matching strengths and gaps) are saved alongside your application records.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">2. Local Mode Data & Deletion</h2>
        <p>
          If you use ApplyFlow without an account ("Local Mode"), your application data and AI scores are stored exclusively in your browser's <strong>IndexedDB</strong>. 
          This data remains on your device. You can permanently delete all local-mode data at any time by using the <strong>Clear Local Data</strong> control located in the Settings page. This action is irreversible and wipes your IndexedDB storage entirely.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">3. Third-Party Processors</h2>
        <p>ApplyFlow relies on the following third-party services to function:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Google Gemini API:</strong> Acts as our AI processor. The raw job descriptions and extracted resume text are sent to Gemini to generate structured data and fit scores. Note: Even if you use the "Bring Your Own Key" (BYOK) feature, your data still transits through Google's infrastructure.</li>
          <li><strong>Supabase:</strong> Our backend provider. For authenticated users, Supabase handles database storage, authentication, and secure file hosting for resumes (Supabase Storage).</li>
          <li><strong>Gmail SMTP:</strong> Used to deliver authentication magic links to your account email.</li>
          <li><strong>Resend:</strong> Used exclusively by our scheduled cron jobs to send you optional follow-up reminder emails regarding your applications.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">4. Essential Cookies & Storage</h2>
        <p>
          ApplyFlow does not use tracking, marketing, or analytics cookies. We use essential cookies required for Supabase authentication to maintain your secure session. 
          We also use your browser's local storage to remember non-sensitive UI preferences, such as your dark mode theme preference and cookie banner dismissal state.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">5. Contact Us</h2>
        <p>
          If you have any questions or concerns about this Privacy Policy or how your data is handled, please contact us.
        </p>
      </section>
    </div>
  );
}
