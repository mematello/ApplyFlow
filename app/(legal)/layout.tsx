import Link from 'next/link';
import Image from 'next/image';
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
          <Link href="/" className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
            <Image src="/images/uppend-logo.jpg" alt="Uppend Logo" width={32} height={32} className="rounded-md object-contain shadow-sm" />
            <span className="text-xl font-bold text-black dark:text-white">
              Uppend
            </span>
          </Link>
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
