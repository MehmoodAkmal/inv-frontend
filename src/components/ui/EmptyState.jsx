/**
 * EmptyState — friendly, branded empty state component.
 * Usage: <EmptyState icon={<svg.../>} title="..." description="..." action={{ label: '+ Add', to: '/path' }} />
 * Or with a click handler: action={{ label: '+ Add', onClick: () => ... }}
 */
import { Link } from 'react-router-dom';

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-800/50 text-brand-700 dark:text-brand-accent flex items-center justify-center mb-4 shadow-sm">
        {icon ?? (
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs leading-relaxed">
          {description}
        </p>
      )}

      {/* CTA */}
      {action && (
        <div className="mt-5">
          {action.onClick ? (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-800 hover:bg-brand-700 dark:bg-brand-700 dark:hover:bg-brand-600 text-white text-xs font-semibold shadow-sm transition-all duration-150 hover:shadow-md active:scale-95"
            >
              {action.label}
            </button>
          ) : (
            <Link
              to={action.to}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-800 hover:bg-brand-700 dark:bg-brand-700 dark:hover:bg-brand-600 text-white text-xs font-semibold shadow-sm transition-all duration-150 hover:shadow-md active:scale-95"
            >
              {action.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
