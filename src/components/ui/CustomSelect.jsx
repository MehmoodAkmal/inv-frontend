import { Children, useEffect, useId, useMemo, useRef, useState } from 'react';

/**
 * CustomSelect — a polished, accessible dropdown component.
 *
 * Props:
 *  - value, onChange, name, id, disabled  — same as native <select>
 *  - size       : 'sm' | 'md' (default 'md') — controls height & font size
 *  - fullWidth  : boolean (default false)     — stretch to fill container
 *  - className  : extra classes on the wrapper div
 *  - aria-label : accessible label
 *
 * Children should be <option> elements, same as a native <select>.
 */
export default function CustomSelect({
  children,
  value = '',
  onChange,
  name,
  id,
  disabled = false,
  size = 'md',
  fullWidth = false,
  className = '',
  'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const generatedId = useId();
  const controlId = id ?? generatedId;

  // Parse option children
  const options = useMemo(
    () =>
      Children.toArray(children)
        .filter((child) => child?.type === 'option')
        .map((child) => ({
          value: String(child.props.value ?? ''),
          label: child.props.children,
          disabled: Boolean(child.props.disabled),
        })),
    [children]
  );

  const selected = options.find((o) => o.value === String(value));

  // ── Size variants ─────────────────────────────────────────────────────────
  const sizeStyles = {
    sm: {
      trigger: 'h-[30px] px-2.5 text-xs gap-2',
      icon:    'w-3 h-3',
      option:  'px-3 py-1.5 text-xs',
    },
    md: {
      trigger: 'h-10 px-3 text-sm gap-2.5',
      icon:    'w-4 h-4',
      option:  'px-3.5 py-2 text-sm',
    },
  };
  const sz = sizeStyles[size] ?? sizeStyles.md;

  // ── Close on outside click / Escape ───────────────────────────────────────
  useEffect(() => {
    const onMouseDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const choose = (nextValue) => {
    onChange?.({
      target: { name, value: nextValue },
      currentTarget: { name, value: nextValue },
    });
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={`relative inline-block align-top ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {/* ── Trigger Button ─────────────────────────────────────────────── */}
      <button
        id={controlId}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        className={[
          // Layout
          'flex items-center justify-between',
          fullWidth ? 'w-full' : 'min-w-[120px]',
          sz.trigger,
          // Appearance
          'rounded-lg border',
          'bg-white dark:bg-neutral-900',
          'border-neutral-200 dark:border-neutral-700',
          'text-neutral-800 dark:text-neutral-100',
          // Focus ring
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
          // Hover
          'hover:border-neutral-300 dark:hover:border-neutral-600',
          // Disabled
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Open state — highlight border
          open ? 'border-brand-400 dark:border-brand-500 ring-2 ring-brand-200 dark:ring-brand-900' : '',
          'transition-all duration-150',
        ].join(' ')}
      >
        <span className={`truncate font-medium ${!selected ? 'text-neutral-400 dark:text-neutral-500' : ''}`}>
          {selected?.label ?? 'Select…'}
        </span>
        {/* Chevron */}
        <svg
          className={`shrink-0 ${sz.icon} text-neutral-400 dark:text-neutral-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* ── Dropdown Panel ─────────────────────────────────────────────── */}
      {open && !disabled && (
        <div
          role="listbox"
          aria-labelledby={controlId}
          className={[
            'absolute z-50 mt-1 overflow-y-auto',
            'w-full min-w-[140px] max-h-56',
            'rounded-xl border border-neutral-200 dark:border-neutral-700',
            'bg-white dark:bg-neutral-900',
            'shadow-lg shadow-black/10 dark:shadow-black/40',
            'py-1',
            'animate-in fade-in-0 zoom-in-95 duration-100',
          ].join(' ')}
        >
          {options.map((option) => {
            const isSelected = option.value === String(value);
            return (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(option.value)}
                className={[
                  'flex w-full items-center justify-between',
                  sz.option,
                  'text-left font-medium transition-colors duration-100',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                  isSelected
                    ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300'
                    : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800',
                ].join(' ')}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && (
                  <svg
                    className="ml-2 h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
