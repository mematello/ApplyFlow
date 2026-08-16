import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24 bg-gray-50 dark:bg-zinc-950 relative">
      <Link 
        href="/" 
        className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>
      <div className="w-full max-w-sm rounded-xl border p-6 shadow-md bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 mt-12 md:mt-0">
        {children}
      </div>
    </div>
  );
}
