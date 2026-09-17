export default function SkeletonCard({
  count = 4,
  className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-5 shadow-card animate-pulse"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-24" />
            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800" />
          </div>
          <div className="h-7 bg-neutral-200 dark:bg-neutral-800 rounded w-32 mb-2" />
          <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-20" />
        </div>
      ))}
    </div>
  );
}
