export default function FormField({ label, error, required, children, hint }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-rose-600 mt-0.5">{error}</p>}
      {hint && !error && <p className="text-xs text-brand-400 mt-0.5">{hint}</p>}
    </div>
  );
}
