export default function ApplicationLoading() {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 w-full animate-pulse pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-32 mb-4"></div>
          <div className="h-10 bg-gray-200 dark:bg-zinc-800 rounded w-64"></div>
        </div>
        <div className="h-10 bg-gray-200 dark:bg-zinc-800 rounded w-32"></div>
      </div>

      <div className="space-y-8">
        {/* Sections */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
            <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(6)].map((_, j) => (
                <div key={j}>
                  <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/3 mb-2"></div>
                  <div className="h-10 bg-gray-200 dark:bg-zinc-800 rounded w-full"></div>
                </div>
              ))}
            </div>
            {i === 0 && (
              <div className="mt-6">
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/4 mb-2"></div>
                <div className="h-12 bg-gray-200 dark:bg-zinc-800 rounded w-full"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
