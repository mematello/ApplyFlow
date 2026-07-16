export default function SettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 w-full animate-pulse">
      <div className="mb-8">
        <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-32 mb-4"></div>
        <div className="h-10 bg-gray-200 dark:bg-zinc-800 rounded w-48"></div>
      </div>
      
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm mb-6">
          <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 dark:bg-zinc-800 rounded w-full"></div>
            <div className="h-10 bg-gray-200 dark:bg-zinc-800 rounded w-full"></div>
            <div className="h-10 bg-gray-200 dark:bg-zinc-800 rounded w-32 mt-4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
