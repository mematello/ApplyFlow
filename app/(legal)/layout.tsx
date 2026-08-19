import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 font-sans">
      <header className="px-4 py-6 border-b border-gray-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            ApplyFlow
          </div>
          <Link href="/" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12 pb-24">
        {children}
      </main>
    </div>
  );
}
