import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  getPlatformStats,
  getAdminOrganizations,
  getOrganizationDetail,
  toggleOrganizationStatus,
  updateOrganizationPlan,
  getSignupTrend,
  getMostActiveOrgs,
} from "../services/organizationService";
import Spinner from "../components/ui/Spinner";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Palette ───────────────────────────────────────────────────────────────
const C = { teal:"#3D7A7A", tealLt:"#7DBFB2", tealPale:"#C5D8D5", navy:"#001B29" };

// ── Helpers ───────────────────────────────────────────────────────────────
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric" });
const fmtFull = (d) => new Date(d).toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" });

// ── Chart tooltip ─────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-brand-900 text-white rounded-xl px-3 py-2 shadow-card-lg text-xs">
      <p className="font-bold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// ── Stat tile ─────────────────────────────────────────────────────────────
function StatTile({ label, value, sub, loading, barColor }) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full" style={{ background: barColor }} />
      <div className="pl-3">
        <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-extrabold text-brand-900 tracking-tight leading-none mt-1">
          {loading ? <span className="skeleton inline-block h-8 w-12 rounded" /> : value}
        </p>
        {sub && <p className="text-xs text-brand-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Skeleton rows ─────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      {[1,2,3,4,5,6].map(i => (
        <td key={i} className="px-4 py-3.5">
          <div className="skeleton h-3 rounded w-24" />
        </td>
      ))}
    </tr>
  );
}

// ── Plan badge ────────────────────────────────────────────────────────────
const PLAN_STYLE = {
  free:  "bg-brand-100 text-brand-600",
  basic: "bg-primary-50 text-primary-700",
  pro:   "bg-violet-50 text-violet-700",
};
const STATUS_STYLE = {
  trial:     "bg-amber-50 text-amber-700",
  active:    "bg-emerald-50 text-emerald-700",
  expired:   "bg-rose-50 text-rose-700",
  cancelled: "bg-brand-100 text-brand-500",
};

// ═══════════════════════════════════════════════════════════════════════════
// Org Detail Drawer
// ═══════════════════════════════════════════════════════════════════════════
function OrgDetailDrawer({ orgId, onClose, onStatusToggled, onPlanUpdated }) {
  const [detail,   setDetail]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [toggling, setToggling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Plan edit
  const [planOpen,  setPlanOpen]  = useState(false);
  const [planForm,  setPlanForm]  = useState({ subscriptionPlan:"free", maxBranches:"1" });
  const [savingPlan, setSavingPlan] = useState(false);

  useEffect(() => {
    setLoading(true);
    getOrganizationDetail(orgId)
      .then(r => {
        setDetail(r.data.data);
        setPlanForm({
          subscriptionPlan: r.data.data.subscriptionPlan,
          maxBranches:      String(r.data.data.maxBranches),
        });
      })
      .catch(() => toast.error("Failed to load organization"))
      .finally(() => setLoading(false));
  }, [orgId]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await toggleOrganizationStatus(orgId);
      toast.success(res.data.message);
      setDetail(prev => ({ ...prev, isActive: res.data.data.isActive }));
      onStatusToggled(orgId, res.data.data.isActive);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally { setToggling(false); setConfirmOpen(false); }
  };

  const handlePlanSave = async (e) => {
    e.preventDefault();
    setSavingPlan(true);
    try {
      const res = await updateOrganizationPlan(orgId, {
        subscriptionPlan: planForm.subscriptionPlan,
        maxBranches:      Number(planForm.maxBranches),
      });
      toast.success("Plan updated");
      setDetail(prev => ({
        ...prev,
        subscriptionPlan: res.data.data.subscriptionPlan,
        maxBranches:      res.data.data.maxBranches,
      }));
      onPlanUpdated(orgId, res.data.data);
      setPlanOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update plan");
    } finally { setSavingPlan(false); }
  };

  const willSuspend = detail?.isActive;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-brand-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-card-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-brand-100 bg-brand-50/60 shrink-0">
          {loading ? (
            <div className="space-y-2"><div className="skeleton h-5 w-40 rounded" /><div className="skeleton h-3 w-24 rounded" /></div>
          ) : detail ? (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary-600 flex items-center justify-center text-lg font-bold text-white shrink-0">
                {detail.name[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-bold text-brand-900">{detail.name}</h2>
                <p className="text-xs text-brand-400 mt-0.5">
                  {detail.branchCount} branch{detail.branchCount !== 1 ? "es" : ""} · {detail.userCount} user{detail.userCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          ) : null}
          <button onClick={onClose} className="p-1.5 rounded-lg text-brand-400 hover:bg-brand-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" className="text-primary-500" /></div>
        ) : detail ? (
          <div className="flex-1 overflow-y-auto">

            {/* Status banner */}
            <div className={`px-6 py-3 flex items-center justify-between text-sm border-b ${detail.isActive ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${detail.isActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                <span className={`font-semibold text-xs ${detail.isActive ? "text-emerald-700" : "text-rose-700"}`}>
                  {detail.isActive ? "Organization Active" : "Organization Suspended"}
                </span>
              </div>
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={toggling}
                className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
                  detail.isActive
                    ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                    : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                }`}
              >
                {toggling ? <Spinner size="sm" /> : (detail.isActive ? "Suspend" : "Reactivate")}
              </button>
            </div>

            {/* Meta info */}
            <div className="px-6 py-5 space-y-4">

              {/* Plan card */}
              <div className="card p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">Subscription</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${PLAN_STYLE[detail.subscriptionPlan] ?? "bg-brand-100 text-brand-600"}`}>
                      {detail.subscriptionPlan}
                    </span>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLE[detail.subscriptionStatus] ?? "bg-brand-100 text-brand-500"}`}>
                      {detail.subscriptionStatus}
                    </span>
                  </div>
                  <p className="text-xs text-brand-400 mt-1">Max branches: {detail.maxBranches}</p>
                </div>
                <button onClick={() => setPlanOpen(true)} className="btn-secondary py-1.5 px-3 text-xs">
                  Edit plan
                </button>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="card p-3">
                  <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">Created</p>
                  <p className="text-sm font-semibold text-brand-900 mt-0.5">{fmtFull(detail.createdAt)}</p>
                </div>
                <div className="card p-3">
                  <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">Last updated</p>
                  <p className="text-sm font-semibold text-brand-900 mt-0.5">{fmtFull(detail.updatedAt)}</p>
                </div>
              </div>

              {/* Branches */}
              <div>
                <p className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-2">
                  Branches ({detail.branches.length})
                </p>
                {detail.branches.length === 0 ? (
                  <p className="text-xs text-brand-400 italic">No branches</p>
                ) : (
                  <div className="space-y-1.5">
                    {detail.branches.map(b => (
                      <div key={b._id} className="flex items-center justify-between px-3 py-2 bg-brand-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                          </svg>
                          <span className="text-sm font-medium text-brand-800">{b.name}</span>
                        </div>
                        <span className={b.isActive ? "badge-active" : "badge-inactive"}>
                          {b.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Users */}
              <div>
                <p className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-2">
                  Users ({detail.users.length})
                </p>
                {detail.users.length === 0 ? (
                  <p className="text-xs text-brand-400 italic">No users</p>
                ) : (
                  <div className="space-y-1.5">
                    {detail.users.map(u => (
                      <div key={u._id} className="flex items-center gap-3 px-3 py-2 bg-brand-50 rounded-lg">
                        <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {u.firstName?.[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-brand-900 truncate">{u.firstName} {u.lastName}</p>
                          <p className="text-[10px] text-brand-400 truncate">{u.email}</p>
                        </div>
                        <span className="badge-role capitalize text-[10px]">{u.role}</span>
                        {!u.isActive && <span className="badge-inactive text-[10px]">Inactive</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-brand-400 text-center py-8">Not found</p>
        )}

        {/* Confirm toggle */}
        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleToggle}
          loading={toggling}
          title={willSuspend ? "Suspend organization" : "Reactivate organization"}
          message={willSuspend
            ? `Suspend "${detail?.name}"? Their users will be locked out immediately on their next request.`
            : `Reactivate "${detail?.name}"? Their users will be able to log in again.`}
        />

        {/* Plan edit modal */}
        <Modal isOpen={planOpen} onClose={() => setPlanOpen(false)} title="Update plan">
          <form onSubmit={handlePlanSave} className="space-y-4">
            <div>
              <label className="label">Subscription plan</label>
              <select
                value={planForm.subscriptionPlan}
                onChange={e => setPlanForm(p => ({ ...p, subscriptionPlan: e.target.value }))}
                className="input-field"
              >
                {["free","basic","pro"].map(p => (
                  <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Max branches</label>
              <input
                type="number" min="1" required
                value={planForm.maxBranches}
                onChange={e => setPlanForm(p => ({ ...p, maxBranches: e.target.value }))}
                className="input-field"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" className="btn-secondary" onClick={() => setPlanOpen(false)} disabled={savingPlan}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={savingPlan}>
                {savingPlan && <Spinner size="sm" className="mr-2" />}Save
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main SuperAdmin Dashboard
// ═══════════════════════════════════════════════════════════════════════════
export default function SuperAdminDashboard() {
  const { user } = useAuth();

  // Platform stats
  const [stats,      setStats]      = useState(null);
  const [statsLoad,  setStatsLoad]  = useState(true);

  // Orgs list
  const [orgs,       setOrgs]       = useState([]);
  const [orgPag,     setOrgPag]     = useState(null);
  const [orgsLoad,   setOrgsLoad]   = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPlan,   setFilterPlan]   = useState("");
  const [sortBy,       setSortBy]       = useState("newest");
  const [page,         setPage]         = useState(1);

  // Charts
  const [trend,      setTrend]      = useState([]);
  const [trendDays,  setTrendDays]  = useState(30);
  const [trendLoad,  setTrendLoad]  = useState(true);
  const [activeOrgs, setActiveOrgs] = useState([]);
  const [activeLoad, setActiveLoad] = useState(true);

  // Drawer
  const [selectedOrgId, setSelectedOrgId] = useState(null);

  // ── Loaders ───────────────────────────────────────────────────────────
  useEffect(() => {
    getPlatformStats()
      .then(r => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setStatsLoad(false));
    getMostActiveOrgs({ days: 30, limit: 8 })
      .then(r => setActiveOrgs(r.data.data))
      .catch(() => {})
      .finally(() => setActiveLoad(false));
  }, []);

  useEffect(() => {
    setTrendLoad(true);
    getSignupTrend({ days: trendDays })
      .then(r => setTrend(r.data.data))
      .catch(() => {})
      .finally(() => setTrendLoad(false));
  }, [trendDays]);

  const fetchOrgs = useCallback(async () => {
    setOrgsLoad(true);
    try {
      const params = { page, limit: 10, sortBy };
      if (search)       params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterPlan)   params.plan   = filterPlan;
      const r = await getAdminOrganizations(params);
      setOrgs(r.data.data);
      setOrgPag(r.data.pagination);
    } catch { toast.error("Failed to load organizations"); }
    finally { setOrgsLoad(false); }
  }, [page, sortBy, search, filterStatus, filterPlan]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  // ── Drawer callbacks ──────────────────────────────────────────────────
  const handleStatusToggled = (orgId, isActive) => {
    setOrgs(prev => prev.map(o => o._id === orgId ? { ...o, isActive } : o));
    // Refresh stats
    getPlatformStats().then(r => setStats(r.data.data)).catch(() => {});
  };

  const handlePlanUpdated = (orgId, data) => {
    setOrgs(prev => prev.map(o =>
      o._id === orgId
        ? { ...o, subscriptionPlan: data.subscriptionPlan, maxBranches: data.maxBranches }
        : o
    ));
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-7">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-0.5">Platform Console</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-900 leading-none">
            Super Admin
          </h1>
          <p className="text-sm text-brand-500 mt-1.5">{user?.firstName} {user?.lastName}</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
          <span className="text-xs font-semibold text-primary-700">Super Admin</span>
        </div>
      </div>

      {/* ── 6 KPI tiles ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label:"Total Orgs",      key:"totalOrganizations",       color:C.teal    },
          { label:"Active",          key:"activeOrganizations",      color:"#10b981" },
          { label:"Suspended",       key:"suspendedOrganizations",   color:"#f43f5e" },
          { label:"New This Month",  key:"newOrganizationsThisMonth",color:"#f59e0b" },
          { label:"Total Users",     key:"totalUsers",               color:C.tealLt  },
          { label:"Total Branches",  key:"totalBranches",            color:"#8b5cf6" },
        ].map(t => (
          <StatTile
            key={t.key}
            label={t.label}
            value={stats?.[t.key] ?? "—"}
            loading={statsLoad}
            barColor={t.color}
          />
        ))}
      </div>

      {/* ── Charts row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Signup trend chart — 2/3 width */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-brand-900">New Organization Signups</h3>
              <p className="text-xs text-brand-400 mt-0.5">Organizations created per day</p>
            </div>
            <select
              value={trendDays}
              onChange={e => setTrendDays(Number(e.target.value))}
              className="input-field w-auto text-xs py-1.5"
            >
              {[7,14,30,90].map(d => <option key={d} value={d}>Last {d} days</option>)}
            </select>
          </div>
          {trendLoad ? (
            <div className="h-44 flex items-center justify-center"><Spinner size="lg" className="text-primary-400" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <AreaChart data={trend} margin={{ top:4, right:4, left:-24, bottom:0 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.teal} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.teal} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.tealPale} strokeOpacity={0.5} />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize:10, fill:"#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize:10, fill:"#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Area type="monotone" dataKey="count" name="Signups"
                  stroke={C.teal} strokeWidth={2} fill="url(#trendGrad)"
                  dot={false} activeDot={{ r:4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Most active orgs — 1/3 width */}
        <div className="card p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-brand-900">Most Active Orgs</h3>
            <p className="text-xs text-brand-400 mt-0.5">By sale count — last 30 days</p>
          </div>
          {activeLoad ? (
            <div className="h-44 flex items-center justify-center"><Spinner size="lg" className="text-primary-400" /></div>
          ) : activeOrgs.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-brand-400">No sales data</div>
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <BarChart data={activeOrgs} layout="vertical" margin={{ top:0, right:8, left:0, bottom:0 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize:10, fill:"#64748b" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="organizationName" tick={{ fontSize:10, fill:"#64748b" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="saleCount" name="Sales" radius={[0,4,4,0]} maxBarSize={18}>
                  {activeOrgs.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? C.teal : C.tealPale} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Organizations table ───────────────────────────────────────── */}
      <div className="card overflow-hidden">

        {/* Table toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-brand-100 flex-wrap">
          <div className="flex-1">
            <h2 className="text-sm font-bold text-brand-900">All Organizations</h2>
            {orgPag && <p className="text-xs text-brand-400 mt-0.5">{orgPag.total} total</p>}
          </div>
          {/* Search */}
          <input
            type="text" placeholder="Search name…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input-field text-sm py-2 w-44"
          />
          {/* Status filter */}
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="input-field text-sm py-2 w-auto">
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          {/* Plan filter */}
          <select value={filterPlan} onChange={e => { setFilterPlan(e.target.value); setPage(1); }}
            className="input-field text-sm py-2 w-auto">
            <option value="">All plans</option>
            {["free","basic","pro"].map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
          </select>
          {/* Sort */}
          <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}
            className="input-field text-sm py-2 w-auto">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-100">
            <thead>
              <tr>
                {["Organization","Plan","Status","Branches","Users","Joined",""].map(h => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-50">
              {orgsLoad ? (
                [1,2,3,4,5].map(i => <SkeletonRow key={i} />)
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-brand-400">
                    No organizations found
                  </td>
                </tr>
              ) : orgs.map(org => (
                <tr
                  key={org._id}
                  onClick={() => setSelectedOrgId(org._id)}
                  className="table-row cursor-pointer"
                >
                  <td className="table-td">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 ${org.isActive ? "bg-primary-600" : "bg-brand-400"}`}>
                        {org.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-brand-900">{org.name}</p>
                        <p className="text-[10px] text-brand-400 font-mono">{org._id.toString().slice(-8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${PLAN_STYLE[org.subscriptionPlan] ?? "bg-brand-100 text-brand-600"}`}>
                      {org.subscriptionPlan}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLE[org.subscriptionStatus] ?? "bg-brand-100 text-brand-500"}`}>
                        {org.subscriptionStatus}
                      </span>
                      {!org.isActive && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 ring-1 ring-rose-200/50">
                          Suspended
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-brand-900">{org.branchCount}</span>
                      <span className="text-xs text-brand-400">/ {org.maxBranches}</span>
                    </div>
                    <div className="mt-1 h-1 w-14 bg-brand-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min((org.branchCount / org.maxBranches) * 100, 100)}%`,
                        background: C.teal,
                      }} />
                    </div>
                  </td>
                  <td className="table-td text-sm text-brand-600 font-medium">{org.userCount}</td>
                  <td className="table-td text-xs text-brand-400">{fmtFull(org.createdAt)}</td>
                  <td className="table-td" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedOrgId(org._id)}
                      className="btn-secondary py-1 px-3 text-xs"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {orgPag && orgPag.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-brand-100 text-xs text-brand-500">
            <span>Page {page} of {orgPag.totalPages} · {orgPag.total} organizations</span>
            <div className="flex gap-2">
              <button className="btn-secondary py-1 px-3 text-xs" disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}>Previous</button>
              <button className="btn-secondary py-1 px-3 text-xs" disabled={page >= orgPag.totalPages}
                onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail drawer ──────────────────────────────────────────────── */}
      {selectedOrgId && (
        <OrgDetailDrawer
          orgId={selectedOrgId}
          onClose={() => setSelectedOrgId(null)}
          onStatusToggled={handleStatusToggled}
          onPlanUpdated={handlePlanUpdated}
        />
      )}
    </div>
  );
}
