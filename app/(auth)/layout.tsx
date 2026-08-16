export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24 bg-gray-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border p-6 shadow-md bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        {children}
      </div>
    </div>
  );
}
