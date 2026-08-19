import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | ApplyFlow',
  description: 'Terms of Service for ApplyFlow',
};

export default function TermsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-4 rounded-md mb-8 border border-yellow-200 dark:border-yellow-900">
        <p className="font-semibold m-0 text-sm">
          Draft — pending legal review. This is boilerplate and does not constitute vetted legal advice.
        </p>
      </div>

      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
        <p>
          By accessing and using ApplyFlow (&quot;Service&quot;), you accept and agree to be bound by the terms and provision of this agreement. 
          If you do not agree to abide by these terms, please do not use this Service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
        <p>
          ApplyFlow is an AI-powered job application tracker that allows users to extract job descriptions, analyze resume fit, and track applications.
          The Service is provided &quot;as is&quot; and on an &quot;as available&quot; basis.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">3. User Data & Privacy</h2>
        <p>
          Your use of the Service is also governed by our Privacy Policy. By using ApplyFlow, you consent to the practices detailed in our Privacy Policy, including the processing of text and resumes via third-party AI APIs.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">4. Acceptable Use</h2>
        <p>
          You agree not to use the Service for any unlawful purpose or in any way that interrupts, damages, or impairs the service. We reserve the right to terminate access to the Service for any user who violates these Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">5. Disclaimer of Warranties</h2>
        <p>
          ApplyFlow makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">6. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. We will notify users of any material changes by posting the new Terms of Service on this page.
        </p>
      </section>
    </div>
  );
}
