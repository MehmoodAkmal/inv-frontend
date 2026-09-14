import { forwardRef, useState, useId } from 'react';

/**
 * Shared Input Component for all forms across the project.
 * Provides unified styling, dark/light mode support, optional label, error messaging,
 * helper text, left/right icons, and automatic password visibility toggle.
 */
const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    hint,
    required = false,
    type = 'text',
    size = 'md',
    icon,
    leftIcon,
    rightIcon,
    showPasswordToggle = true,
    wrapperClassName = '',
    className = '',
    id,
    disabled = false,
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [showPassword, setShowPassword] = useState(false);

  const effectiveLeftIcon = leftIcon || icon;
  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

  // Size styling variants
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-md',
    md: 'px-3.5 py-2 text-sm rounded-lg',
    lg: 'px-4 py-2.5 text-base rounded-xl',
  }[size] || 'px-3.5 py-2 text-sm rounded-lg';

  const paddingLeft = effectiveLeftIcon ? (size === 'sm' ? 'pl-8' : size === 'lg' ? 'pl-11' : 'pl-9.5') : '';
  const paddingRight = (isPassword && showPasswordToggle) || rightIcon
    ? (size === 'sm' ? 'pr-8' : size === 'lg' ? 'pr-11' : 'pr-9.5')
    : '';

  const inputElement = (
    <div className="relative w-full">
      {/* Left Icon */}
      {effectiveLeftIcon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
          {effectiveLeftIcon}
        </div>
      )}

      {/* Core Input Field */}
      <input
        ref={ref}
        id={inputId}
        type={effectiveType}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : helperText || hint ? `${inputId}-hint` : undefined}
        className={`
          w-full block transition-all duration-150
          bg-white dark:bg-neutral-800
          text-neutral-900 dark:text-neutral-100
          placeholder-neutral-400 dark:placeholder-neutral-500
          border ${
            error
              ? 'border-rose-500 dark:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
              : 'border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-accent/25 focus:border-brand-accent'
          }
          disabled:bg-neutral-100 dark:disabled:bg-neutral-900/60 disabled:text-neutral-400 dark:disabled:text-neutral-600 disabled:cursor-not-allowed
          ${sizeClasses}
          ${paddingLeft}
          ${paddingRight}
          ${className}
        `}
        {...rest}
      />

      {/* Right Icon or Password Visibility Toggle */}
      {isPassword && showPasswordToggle ? (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors focus:outline-none"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      ) : rightIcon ? (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
          {rightIcon}
        </div>
      ) : null}
    </div>
  );

  // If no label or error, return the input directly
  if (!label && !error && !helperText && !hint) {
    return inputElement;
  }

  const helper = error || helperText || hint;

  return (
    <div className={`space-y-1.5 w-full ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1 select-none"
        >
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}

      {inputElement}

      {helper && (
        <p
          id={error ? `${inputId}-error` : `${inputId}-hint`}
          className={`text-xs flex items-center gap-1 mt-1 ${
            error ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          {error && (
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span>{helper}</span>
        </p>
      )}
    </div>
  );
});

export default Input;
