import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'onboarding-checklist-dismissed';
const STEPS_KEY = 'onboarding-checklist-steps';

const STEPS = [
  {
    id: 'add-product',
    label: 'Add your first product',
    hint: 'Go to Products and add what you sell.',
    to: '/items',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
      </svg>
    ),
  },
  {
    id: 'receive-stock',
    label: 'Record your opening stock',
    hint: 'Use "Buy / Receive Stock" to log your inventory.',
    to: '/purchase-entry',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'add-customer',
    label: 'Add your first customer',
    hint: 'Go to Customers and create a customer profile.',
    to: '/customers',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'make-sale',
    label: 'Make your first sale',
    hint: 'Go to Sales and record a transaction.',
    to: '/sales',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
];

export default function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(STORAGE_KEY) === 'true'
  );
  const [completedSteps, setCompletedSteps] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STEPS_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const allDone = completedSteps.length === STEPS.length;

  useEffect(() => {
    localStorage.setItem(STEPS_KEY, JSON.stringify(completedSteps));
  }, [completedSteps]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  const toggleStep = (id) => {
    setCompletedSteps((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // Auto-dismiss when all steps completed (after short delay so user sees it)
  useEffect(() => {
    if (allDone) {
      const t = setTimeout(() => handleDismiss(), 3000);
      return () => clearTimeout(t);
    }
  }, [allDone]);

  if (dismissed) return null;

  const doneCount = completedSteps.length;
  const pct = Math.round((doneCount / STEPS.length) * 100);

  return (
    <div className="bg-gradient-to-br from-brand-50 to-brand-100/60 dark:from-brand-950/60 dark:to-brand-900/30 border border-brand-200/70 dark:border-brand-800/60 rounded-card p-5 shadow-card relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.06] pointer-events-none" aria-hidden="true">
        <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full text-brand-800">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-brand-800 dark:text-brand-accent">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <h2 className="text-sm font-bold text-brand-900 dark:text-brand-accent">
              Getting Started
            </h2>
            {allDone && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-800 text-white dark:bg-brand-accent dark:text-brand-950 uppercase tracking-wide animate-pulse">
                Done! 🎉
              </span>
            )}
          </div>
          <p className="text-xs text-brand-700/80 dark:text-brand-300/70">
            Complete these steps to get your business up and running.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-md text-brand-500 hover:text-brand-800 dark:hover:text-brand-accent hover:bg-brand-200/60 dark:hover:bg-brand-800/40 transition-colors shrink-0 ml-2"
          aria-label="Dismiss getting started guide"
          title="Dismiss"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-brand-700 dark:text-brand-300">
            {doneCount} of {STEPS.length} completed
          </span>
          <span className="text-[11px] font-bold text-brand-800 dark:text-brand-accent">{pct}%</span>
        </div>
        <div className="h-1.5 bg-brand-200/60 dark:bg-brand-900/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-800 dark:bg-brand-accent rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Steps list */}
      <div className="space-y-2">
        {STEPS.map((step) => {
          const done = completedSteps.includes(step.id);
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-150 ${
                done
                  ? 'bg-white/60 dark:bg-brand-900/20 border-brand-200/50 dark:border-brand-800/40 opacity-60'
                  : 'bg-white dark:bg-neutral-900/60 border-brand-200/70 dark:border-brand-800/50 hover:border-brand-400 dark:hover:border-brand-600 hover:shadow-sm cursor-pointer'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleStep(step.id)}
                className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150 ${
                  done
                    ? 'bg-brand-800 dark:bg-brand-accent border-brand-800 dark:border-brand-accent'
                    : 'border-brand-300 dark:border-brand-700 hover:border-brand-600 dark:hover:border-brand-500'
                }`}
                aria-label={done ? `Mark "${step.label}" as incomplete` : `Mark "${step.label}" as complete`}
              >
                {done && (
                  <svg className="w-3 h-3 text-white dark:text-brand-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Icon + Text */}
              <Link
                to={step.to}
                className="flex-1 flex items-center gap-2.5 min-w-0 group"
                onClick={() => !done && toggleStep(step.id)}
              >
                <span className={`shrink-0 transition-colors ${done ? 'text-brand-400 dark:text-brand-600' : 'text-brand-700 dark:text-brand-400 group-hover:text-brand-800 dark:group-hover:text-brand-accent'}`}>
                  {step.icon}
                </span>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate transition-colors ${done ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-neutral-800 dark:text-neutral-200 group-hover:text-brand-800 dark:group-hover:text-brand-accent'}`}>
                    {step.label}
                  </p>
                  {!done && (
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
                      {step.hint}
                    </p>
                  )}
                </div>
              </Link>

              {/* Arrow (not done) */}
              {!done && (
                <svg className="w-3.5 h-3.5 text-brand-400 shrink-0 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
