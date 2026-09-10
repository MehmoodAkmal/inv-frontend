export function Badge({
  label,
  children,
  variant = 'neutral',
  dot = false,
  className = '',
}) {
  const content = label ?? children;

  const variants = {
    success:
      'bg-success-50 text-success-700 border-success-200/80 dark:bg-success-900/30 dark:text-success-300 dark:border-success-800/50',
    warning:
      'bg-warning-50 text-warning-700 border-warning-200/80 dark:bg-warning-900/30 dark:text-warning-300 dark:border-warning-800/50',
    danger:
      'bg-danger-50 text-danger-700 border-danger-200/80 dark:bg-danger-900/30 dark:text-danger-300 dark:border-danger-800/50',
    neutral:
      'bg-neutral-100 text-neutral-700 border-neutral-200/80 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700/60',
    info:
      'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800/50',
    brand:
      'bg-brand-50 text-brand-800 border-brand-200/80 dark:bg-brand-900/40 dark:text-brand-accent dark:border-brand-700/50',
    primary:
      'bg-brand-50 text-brand-800 border-brand-200/80 dark:bg-brand-900/40 dark:text-brand-accent dark:border-brand-700/50',
    default:
      'bg-neutral-100 text-neutral-700 border-neutral-200/80 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700/60',
  };

  const dotColors = {
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    neutral: 'bg-neutral-400',
    info: 'bg-sky-500',
    brand: 'bg-brand-accent',
    primary: 'bg-brand-accent',
    default: 'bg-neutral-400',
  };

  const selectedVariant = variants[variant] || variants.neutral;
  const selectedDotColor = dotColors[variant] || dotColors.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${selectedVariant} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedDotColor}`}
          aria-hidden="true"
        />
      )}
      <span>{content}</span>
    </span>
  );
}

export default Badge;
