export default function StatCard({
  label,
  value,
  icon,
  trend,
  accentColor = 'brand',
  secondaryStats,
  className = '',
}) {
  // Map accent colors to tinted background and icon text colors
  const accentClasses = {
    brand: 'bg-brand-50 text-brand-800 dark:bg-brand-900/50 dark:text-brand-accent border border-brand-200/50 dark:border-brand-700/40',
    mint: 'bg-brand-50 text-brand-700 dark:bg-brand-900/60 dark:text-brand-accent border border-brand-300/40 dark:border-brand-700/50',
    success: 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300 border border-success-200/60 dark:border-success-800/40',
    warning: 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300 border border-warning-200/60 dark:border-warning-800/40',
    danger: 'bg-danger-50 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300 border border-danger-200/60 dark:border-danger-800/40',
    neutral: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700',
  };

  const tintedSquare = accentClasses[accentColor] || accentClasses.brand;

  // Normalized trend object
  let trendData = null;
  if (trend) {
    if (typeof trend === 'object') {
      trendData = {
        value: trend.value,
        direction: trend.direction || 'neutral',
      };
    } else if (typeof trend === 'number') {
      trendData = {
        value: `${Math.abs(trend)}%`,
        direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral',
      };
    } else {
      trendData = { value: String(trend), direction: 'neutral' };
    }
  }

  return (
    <div
      className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-5 shadow-card transition-shadow hover:shadow-card-md flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Top Header Row: Label on Left, Tinted Icon Square on Top-Right */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 truncate">
              {label}
            </p>
            <div className="mt-2 flex items-baseline gap-2 flex-wrap">
              <span className="font-mono text-2xl lg:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                {value}
              </span>
            </div>
          </div>

          {icon && (
            <div
              className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${tintedSquare}`}
              aria-hidden="true"
            >
              <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
            </div>
          )}
        </div>

        {/* Trend Indicator */}
        {trendData && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs">
            {trendData.direction === 'up' && (
              <span className="inline-flex items-center gap-1 font-medium text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/30 px-1.5 py-0.5 rounded text-[11px]">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                {trendData.value}
              </span>
            )}
            {trendData.direction === 'down' && (
              <span className="inline-flex items-center gap-1 font-medium text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/30 px-1.5 py-0.5 rounded text-[11px]">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                {trendData.value}
              </span>
            )}
            {trendData.direction === 'neutral' && (
              <span className="inline-flex items-center gap-1 font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-[11px]">
                <span>•</span>
                {trendData.value}
              </span>
            )}
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">vs last period</span>
          </div>
        )}
      </div>

      {/* Secondary Stats Row */}
      {Array.isArray(secondaryStats) && secondaryStats.length > 0 && (
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 gap-2 text-xs">
          {secondaryStats.map((stat, idx) => (
            <div key={idx} className="min-w-0">
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block truncate">
                {stat.label}
              </span>
              <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200 block truncate mt-0.5">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

