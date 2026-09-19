import { Children, useEffect, useId, useMemo, useRef, useState } from 'react';

/**
 * CustomSelect — a polished, accessible dropdown that behaves exactly like a
 * native <select> or <input> inside a form.
 *
 * Design principles:
 *  - Always fills its parent container width (block-level, just like <input>).
 *  - Height matches the <input> height at each size so forms stay pixel-perfect.
 *  - No outer wrapper box — the trigger IS the element, same visual weight as Input.
 *
 * Props:
 *  value, onChange, name, id, disabled  — same API as native <select>
 *  size       : 'sm' | 'md' (default 'md')
 *  className  : extra classes on the root wrapper
 *  aria-label : accessible label
 *  placeholder: text shown when no option is selected (default 'Select…')
 */
export default function CustomSelect({
  children,
  value = '',
  onChange,
  name,
  id,
  disabled = false,
  size = 'md',
  className = '',
  placeholder = 'Select…',
  'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const generatedId = useId();
  const controlId = id ?? generatedId;

  // Parse <option> children into data objects
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

  // ── Size variants — must match Input component heights exactly ─────────────
  // 'sm'  → h-[30px]  (compact filter bars)
  // 'md'  → h-10      (standard form fields — same as <Input size="md">)
  const sizeStyles = {
    sm: {
      trigger: 'h-[30px] px-2.5 text-xs',
      chevron: 'w-3 h-3',
      option:  'px-3 py-1.5 text-xs',
    },
    md: {
      trigger: 'h-10 px-3 text-sm',
      chevron: 'w-4 h-4',
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
      target:        { name, value: nextValue },
      currentTarget: { name, value: nextValue },
    });
    setOpen(false);
  };

  return (
    // Root: block-level so it fills its parent, exactly like <input> does.
    // No border/background here — the trigger below IS the visual element.
    <div ref={rootRef} className={`relative w-full ${className}`}>

      {/* ── Trigger — visually identical to <Input> ──────────────────────── */}
      <button
        id={controlId}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        className={[
          // Fill full width of wrapper, flex row
          'w-full flex items-center justify-between',
          sz.trigger,
          // Shape — match Input's rounded-lg
          'rounded-lg border',
          // Colors — identical to Input idle state
          'bg-white dark:bg-neutral-900',
          'border-neutral-300 dark:border-neutral-600',
          'text-neutral-900 dark:text-neutral-100',
          // Focus ring — identical to Input focus
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1',
          // Hover
          'hover:border-neutral-400 dark:hover:border-neutral-500',
          // Disabled
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-50 dark:disabled:bg-neutral-800',
          // Open state — highlight border like focused input
          open
            ? 'border-primary-400 dark:border-primary-500 ring-2 ring-primary-100 dark:ring-primary-900/40'
            : '',
          'transition-all duration-150',
        ].join(' ')}
      >
        {/* Selected label or placeholder */}
        <span
          className={`truncate font-medium leading-none ${
            !selected ? 'text-neutral-400 dark:text-neutral-500' : ''
          }`}
        >
          {selected?.label ?? placeholder}
        </span>

        {/* Chevron icon */}
        <svg
          className={`shrink-0 ${sz.chevron} ml-2 text-neutral-400 dark:text-neutral-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* ── Dropdown Panel ─────────────────────────────────────────────────── */}
      {open && !disabled && (
        <div
          role="listbox"
          aria-labelledby={controlId}
          className={[
            'absolute z-50 left-0 right-0 mt-1',   // full width of trigger
            'max-h-56 overflow-y-auto',
            'rounded-lg border border-neutral-200 dark:border-neutral-700',
            'bg-white dark:bg-neutral-900',
            'shadow-card-md',
            'py-1',
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
                    ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300'
                    : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800',
                ].join(' ')}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && (
                  <svg
                    className="ml-2 h-3.5 w-3.5 shrink-0 text-primary-600 dark:text-primary-400"
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
