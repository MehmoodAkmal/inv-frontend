export default function Badge({ children, variant = "default", className = "" }) {
  const variants = {
    default: "bg-brand-100 text-brand-700 ring-1 ring-brand-200",
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    danger: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    info: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    primary: "bg-primary-50 text-primary-700 ring-1 ring-primary-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
