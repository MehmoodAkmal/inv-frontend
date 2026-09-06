import { Children, useEffect, useId, useMemo, useRef, useState } from 'react';

/**
 * Shared styled select menu. It accepts the same option children and change
 * handlers as a native select, so existing form code can use it unchanged.
 */
export default function CustomSelect({
  children,
  value = '',
  onChange,
  name,
  id,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const generatedId = useId();
  const controlId = id ?? generatedId;
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
  const selected = options.find((option) => option.value === String(value));
  // Existing pages pass `input-field` from their former native select. Apply
  // sizing helpers to the wrapper, but prevent that field border/padding from
  // creating a second visible box around the custom trigger.
  const widthClassName = /\bw-auto\b/.test(className) ? 'w-auto' : 'w-full';
  const wrapperClassName = className
    .replace(/\binput-field\b/g, '')
    .replace(/\bw-(?:full|auto)\b/g, '')
    .trim();

  useEffect(() => {
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const keyboard = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', keyboard);
    };
  }, []);

  const choose = (nextValue) => {
    onChange?.({ target: { name, value: nextValue }, currentTarget: { name, value: nextValue } });
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={`relative inline-block align-top ${widthClassName} ${wrapperClassName}`}
    >
      <button
        id={controlId}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="input-field flex min-h-[42px] items-center justify-between gap-3 text-left disabled:opacity-60"
      >
        <span className={selected ? 'truncate' : 'truncate text-brand-400'}>
          {selected?.label ?? 'Select an option'}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-brand-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && !disabled && (
        <div
          className="absolute z-50 mt-1 max-h-60 w-full min-w-max overflow-y-auto rounded-lg border border-brand-200 bg-white py-1 shadow-card-lg"
          role="listbox"
          aria-labelledby={controlId}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              role="option"
              aria-selected={option.value === String(value)}
              onClick={() => choose(option.value)}
              className={`flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${option.value === String(value) ? 'bg-primary-50 font-medium text-primary-700' : 'text-brand-800 hover:bg-brand-50'}`}
            >
              <span className="truncate">{option.label}</span>
              {option.value === String(value) && (
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
