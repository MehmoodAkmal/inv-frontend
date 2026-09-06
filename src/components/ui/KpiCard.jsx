export default function KpiCard({ label, value, sub, icon, accent = "teal", trend, trendLabel }) {
  const colors = {
    teal:  { bar: "#3D7A7A", bg: "#F0F7F6", ic: "#3D7A7A" },
    amber: { bar: "#f59e0b", bg: "#fffbeb", ic: "#f59e0b" },
    rose:  { bar: "#f43f5e", bg: "#fff1f2", ic: "#f43f5e" },
    emerald:{ bar: "#10b981", bg: "#ecfdf5", ic: "#10b981" },
    slate: { bar: "#94a3b8", bg: "#f8fafc", ic: "#94a3b8" },
    blue:  { bar: "#3b82f6", bg: "#eff6ff", ic: "#3b82f6" },
  };
  const c = colors[accent] ?? colors.slate;
  const isUp = trend !== undefined ? trend >= 0 : true;
  return (
    <div className="stat-card relative overflow-hidden flex items-center gap-3">
      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ background: c.bar }} />
      <div className="p-2.5 rounded-xl shrink-0" style={{ background: c.bg }}>
        <span style={{ color: c.ic }}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="stat-card-label">{label}</p>
        <p className="stat-card-value">{value}</p>
        <div className="flex items-center gap-2 mt-1">
          {trend !== undefined && (
            <span className={`text-xs font-bold ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
              {isUp ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {trendLabel && <span className="stat-card-sub">{trendLabel}</span>}
        </div>
        {sub && <p className="stat-card-sub">{sub}</p>}
      </div>
    </div>
  );
}
