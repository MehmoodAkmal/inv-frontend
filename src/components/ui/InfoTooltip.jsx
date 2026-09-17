/**
 * InfoTooltip — small inline "?" icon that shows a tooltip on hover.
 * Usage: <InfoTooltip text="Cost of Goods Sold = total purchase cost of items sold." />
 */
import { useState } from 'react';

export default function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 flex items-center justify-center text-[10px] font-bold hover:bg-brand-100 dark:hover:bg-brand-900 hover:text-brand-700 dark:hover:text-brand-accent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        aria-label="More information"
      >
        ?
      </button>

      {show && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[11px] leading-relaxed shadow-lg z-50 pointer-events-none"
        >
          {text}
          {/* Arrow */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-100" />
        </span>
      )}
    </span>
  );
}
