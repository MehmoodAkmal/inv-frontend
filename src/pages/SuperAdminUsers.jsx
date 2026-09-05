import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { getAllUsers } from "../services/organizationService";
import Spinner from "../components/ui/Spinner";

// ── Helpers ───────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" });

const ROLE_STYLE = {
  admin:   "bg-primary-50 text-primary-700 ring-1 ring-primary-200/60",
  manager: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
  cashier: "bg-teal-50 text-teal-700 ring-1 ring-teal-200/60",
};

// ── Skeleton row ──────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      {[1,2,3,4,5,6].map(i => (
        <td key={i} className="px-4 py-3.5">
          <div className="skeleton h-3 rounded" style={{ width: `${40 + i * 10}px` }} />
        </td>
      ))}
    </tr>
  );
}

// ── Role badge ────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_STYLE[role] ?? "bg-brand-100 text-brand-600"}`}>
      {role}
    </span>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────
function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-brand-100 text-xs text-brand-500">
      <span>Page {page} of {totalPages} · {total} total</span>
      <div className="flex gap-2">
        <button className="btn-secondary py-1 px-3 text-xs" disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}>Previous</button>
        <button className="btn-secondary py-1 px-3 text-xs" disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}

// ── Stats strip ───────────────────────────────────────────────────────────
function StatsStrip({ users }) {
  const counts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Total",    value: users.length,         color: "bg-primary-500" },
        { label: "Admins",   value: counts.admin   ?? 0,  color: "bg-primary-600" },
        { label: "Managers", value: counts.manager ?? 0,  color: "bg-violet-500"  },
        { label: "Cashiers", value: counts.cashier ?? 0,  color: "bg-teal-500"    },
      ].map(s => (
        <div key={s.label} className="card p-4 relative overflow-hidden">
          <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${s.color}`} />
          <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider pl-3">{s.label}</p>
          <p className="text-2xl font-extrabold text-brand-900 tracking-tight pl-3 mt-0.5">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main SuperAdmin Users Page
// ═══════════════════════════════════════════════════════════════════════════
export default function SuperAdminUsers() {
  const [users,        setUsers]        = useState([]);
  const [pagination,   setPagination]   = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filterRole,   setFilterRole]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page,         setPage]         = useState(1);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search)       params.search = search;
      if (filterRole)   params.role   = filterRole;
      if (filterStatus) params.status = filterStatus;
      const r = await getAllUsers(params);
      setUsers(r.data.data);
      setPagination(r.data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterRole, filterStatus]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-0.5">
            Platform Console
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-900 leading-none">
            Users
          </h1>
          <p className="text-sm text-brand-500 mt-1.5">
            {pagination ? `${pagination.total} user${pagination.total !== 1 ? "s" : ""} across all organizations` : "Loading…"}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
          <span className="text-xs font-semibold text-primary-700">Super Admin</span>
        </div>
      </div>

      {/* ── Stats (only when not loading) ─────────────────────────────── */}
      {!loading && users.length > 0 && (
        <StatsStrip users={users} />
      )}

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="card px-5 py-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="label">Search</label>
          <input
            type="text"
            placeholder="Name or email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input-field text-sm py-2"
          />
        </div>
        <div>
          <label className="label">Role</label>
          <select
            value={filterRole}
            onChange={e => { setFilterRole(e.target.value); setPage(1); }}
            className="input-field text-sm py-2 w-auto"
          >
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="input-field text-sm py-2 w-auto"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {(search || filterRole || filterStatus) && (
          <button
            className="btn-secondary text-sm py-2"
            onClick={() => { setSearch(""); setFilterRole(""); setFilterStatus(""); setPage(1); }}
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-100">
            <thead>
              <tr>
                {["User","Email","Role","Organization","Status","Joined"].map(h => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-50">
              {loading ? (
                [1,2,3,4,5,6].map(i => <SkeletonRow key={i} />)
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <div className="empty-state">
                      <svg className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="empty-state-title">No users found</p>
                      <p className="empty-state-desc">
                        {search || filterRole || filterStatus ? "Try changing your filters" : "No users registered yet"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : users.map(u => (
                <tr key={u._id} className="table-row">

                  {/* Name + avatar */}
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${u.isActive ? "bg-primary-600" : "bg-brand-300"}`}>
                        {u.firstName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-brand-900">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-[10px] text-brand-400 font-mono">
                          {u._id.toString().slice(-8)}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="table-td">
                    <span className="text-sm text-brand-700">{u.email}</span>
                  </td>

                  {/* Role */}
                  <td className="table-td">
                    <RoleBadge role={u.role} />
                  </td>

                  {/* Organization */}
                  <td className="table-td">
                    <span className="text-sm font-medium text-brand-700">
                      {u.organizationName ?? "—"}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="table-td">
                    {u.isActive ? (
                      <span className="badge-active">Active</span>
                    ) : (
                      <span className="badge-inactive">Inactive</span>
                    )}
                  </td>

                  {/* Joined */}
                  <td className="table-td text-xs text-brand-400 whitespace-nowrap">
                    {fmtDate(u.createdAt)}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>
    </div>
  );
}
