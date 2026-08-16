import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { ThemeToggle } from "../components/ThemeToggle";

export const metadata: Metadata = {
  title: "ApplyFlow — AI-Powered Job Application Tracker",
  description: "Streamline your job search. Paste the job description, let AI extract the details, assess your fit, and remind you to follow up.",
  openGraph: {
    title: "ApplyFlow — AI-Powered Job Application Tracker",
    description: "Streamline your job search. Paste the job description, let AI extract the details, assess your fit, and remind you to follow up.",
    images: ["/images/dashboard.png"],
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 font-sans">
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          ApplyFlow
        </div>
        <nav className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/login" className="text-sm font-medium hover:text-blue-600 transition-colors">
            Log in
          </Link>
          <Link href="/dashboard" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors">
            Try without signup
          </Link>
        </nav>
      </header>

      <main className="flex flex-col items-center max-w-7xl mx-auto w-full px-6 pb-24">
        
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center mt-16 md:mt-24 mb-20 w-full max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Track your job applications with AI.
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-zinc-400 mb-10 max-w-2xl">
            Streamline your search. Paste the job description, let AI extract the details, 
            assess your fit, and remind you to follow up.
          </p>
          <Link href="/signup" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-medium shadow-md transition-transform hover:-translate-y-0.5">
            Start tracking for free
          </Link>

          <div className="mt-16 w-full rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800 shadow-2xl bg-zinc-50 dark:bg-zinc-900">
            <video 
              src="/videos/applyflow-vid-demo.mp4" 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-auto"
            />
          </div>
        </section>

        {/* How it Works */}
        <section className="w-full py-16 mb-16">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-gray-600 dark:text-zinc-400">Three simple steps to manage your entire job hunt.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-xl mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">Paste the description</h3>
              <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">
                Found a job you like? Just paste the raw job description text.
              </p>
              <div className="w-full aspect-[4/3] relative rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <Image 
                  src="/images/new_job_application.png" 
                  alt="New job application form" 
                  fill
                  className="object-cover object-top"
                />
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-xl mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">AI evaluates fit</h3>
              <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">
                We automatically extract the details and score the job against your resume.
              </p>
              <div className="w-full aspect-[4/3] relative rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <Image 
                  src="/images/ai_fit_analysis.png" 
                  alt="AI fit analysis" 
                  fill
                  className="object-cover object-top"
                />
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-xl mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Track progress</h3>
              <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">
                Move applications through your pipeline and never miss a follow-up.
              </p>
              <div className="w-full aspect-[4/3] relative rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <Image 
                  src="/images/dashboard.png" 
                  alt="Application dashboard" 
                  fill
                  className="object-cover object-left-top"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Origin Story */}
        <section className="w-full max-w-3xl mx-auto py-16 mb-8 text-center">
          <h2 className="text-3xl font-bold mb-6">Why I built ApplyFlow</h2>
          <p className="text-lg text-gray-600 dark:text-zinc-400 leading-relaxed mb-6">
            I built ApplyFlow after tracking 100+ job applications in a messy spreadsheet. It was exhausting to manually copy-paste details, remember when to follow up, and tailor my resume to every role.
          </p>
          <p className="text-lg text-gray-600 dark:text-zinc-400 leading-relaxed">
            ApplyFlow solves this by letting AI do the heavy lifting—extracting job details and assessing your fit instantly, so you can focus on what matters: landing the job.
          </p>
        </section>

        {/* Features Row */}
        <section className="w-full bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-8 md:p-12 border border-gray-200 dark:border-zinc-800 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <h2 className="text-3xl font-bold">Never drop the ball</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="mt-1 text-blue-600 dark:text-blue-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <div>
                  <strong className="block text-gray-900 dark:text-zinc-100">AI Job Extraction</strong>
                  <span className="text-sm text-gray-600 dark:text-zinc-400">Parses raw text into structured fields instantly.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 text-blue-600 dark:text-blue-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <div>
                  <strong className="block text-gray-900 dark:text-zinc-100">Pipeline Tracking</strong>
                  <span className="text-sm text-gray-600 dark:text-zinc-400">Search, filter, and track statuses from Draft to Offer.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 text-blue-600 dark:text-blue-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <div>
                  <strong className="block text-gray-900 dark:text-zinc-100">Follow-up Reminders</strong>
                  <span className="text-sm text-gray-600 dark:text-zinc-400">Set next action dates and receive email nudges.</span>
                </div>
              </li>
            </ul>
          </div>
          <div className="flex-1 w-full max-w-md rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-lg rotate-2 hover:rotate-0 transition-transform duration-300">
            <Image 
              src="/images/reminder_notification.jpg" 
              alt="Follow-up reminder" 
              width={600}
              height={400}
              className="w-full h-auto object-cover"
            />
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-zinc-800 py-12 text-center bg-white dark:bg-zinc-950">
        <h2 className="text-2xl font-bold mb-6">Ready to land your next role?</h2>
        <Link href="/signup" className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-lg font-medium transition-colors mb-10">
          Create your free account
        </Link>
        <p className="text-sm text-gray-500 dark:text-zinc-500">
          &copy; {new Date().getFullYear()} ApplyFlow. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
