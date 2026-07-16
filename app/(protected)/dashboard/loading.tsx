export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 w-full animate-pulse">
      <div className="flex justify-between items-center mb-8">
        <div className="h-10 bg-gray-200 dark:bg-zinc-800 rounded w-1/4"></div>
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
          <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
          <div className="w-40 h-10 bg-gray-200 dark:bg-zinc-800 rounded-md"></div>
        </div>
      </div>
      
      {/* Filters skeleton */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="h-10 bg-gray-200 dark:bg-zinc-800 rounded-md w-full md:w-1/3"></div>
        <div className="h-10 bg-gray-200 dark:bg-zinc-800 rounded-md w-full md:w-1/4"></div>
      </div>
      
      {/* Table skeleton */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="h-12 bg-gray-50 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800"></div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-4 border-b border-gray-100 dark:border-zinc-800/50 flex items-center justify-between">
            <div className="space-y-3 w-1/3">
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/2"></div>
            </div>
            <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded-full w-24"></div>
            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-24"></div>
            <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-8 hidden md:block"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
