import CustomSelect from '../components/ui/CustomSelect';
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  getAdminOrganizations,
  getOrganizationDetail,
  toggleOrganizationStatus,
  updateOrganizationPlan,
} from '../services/organizationService';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

// ── Helpers ───────────────────────────────────────────────────────────────
const fmtFull = (d) =>
  new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const PLAN_STYLE = {
  free: 'bg-brand-100 text-brand-600',
  basic: 'bg-primary-50 text-primary-700',
  pro: 'bg-violet-50 text-violet-700',
};
const STATUS_STYLE = {
  trial: 'bg-amber-50 text-amber-700',
  active: 'bg-emerald-50 text-emerald-700',
  expired: 'bg-rose-50 text-rose-700',
  cancelled: 'bg-brand-100 text-brand-500',
};

// ── Skeleton row ──────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="skeleton h-3 rounded w-20" />
        </td>
      ))}
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Org Detail Drawer
// ═══════════════════════════════════════════════════════════════════════════
function OrgDetailDrawer({ orgId, onClose, onStatusToggled, onPlanUpdated }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ subscriptionPlan: 'free', maxBranches: '1' });
  const [savingPlan, setSavingPlan] = useState(false);

  useEffect(() => {
    setLoading(true);
    getOrganizationDetail(orgId)
      .then((r) => {
        setDetail(r.data.data);
        setPlanForm({
          subscriptionPlan: r.data.data.subscriptionPlan,
          maxBranches: String(r.data.data.maxBranches),
        });
      })
      .catch(() => toast.error('Failed to load organization'))
      .finally(() => setLoading(false));
  }, [orgId]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await toggleOrganizationStatus(orgId);
      toast.success(res.data.message);
      setDetail((prev) => ({ ...prev, isActive: res.data.data.isActive }));
      onStatusToggled(orgId, res.data.data.isActive);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setToggling(false);
      setConfirmOpen(false);
    }
  };

  const handlePlanSave = async (e) => {
    e.preventDefault();
    setSavingPlan(true);
    try {
      const res = await updateOrganizationPlan(orgId, {
        subscriptionPlan: planForm.subscriptionPlan,
        maxBranches: Number(planForm.maxBranches),
      });
      toast.success('Plan updated');
      setDetail((prev) => ({
        ...prev,
        subscriptionPlan: res.data.data.subscriptionPlan,
        maxBranches: res.data.data.maxBranches,
      }));
      onPlanUpdated(orgId, res.data.data);
      setPlanOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSavingPlan(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-brand-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-card-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-brand-100 bg-brand-50/60 shrink-0">
          {loading ? (
            <div className="space-y-2">
              <div className="skeleton h-5 w-40 rounded" />
              <div className="skeleton h-3 w-24 rounded" />
            </div>
          ) : detail ? (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary-600 flex items-center justify-center text-lg font-bold text-white shrink-0">
                {detail.name[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-bold text-brand-900">{detail.name}</h2>
                <p className="text-xs text-brand-400 mt-0.5">
                  {detail.branchCount} branch{detail.branchCount !== 1 ? 'es' : ''} ·{' '}
                  {detail.userCount} user{detail.userCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          ) : null}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-400 hover:bg-brand-100 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-primary-500" />
          </div>
        ) : detail ? (
          <div className="flex-1 overflow-y-auto">
            {/* Status banner */}
            <div
              className={`px-6 py-3 flex items-center justify-between border-b ${detail.isActive ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${detail.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}
                />
                <span
                  className={`font-semibold text-xs ${detail.isActive ? 'text-emerald-700' : 'text-rose-700'}`}
                >
                  {detail.isActive ? 'Organization Active' : 'Organization Suspended'}
                </span>
              </div>
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={toggling}
                className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
                  detail.isActive
                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                }`}
              >
                {toggling ? <Spinner size="sm" /> : detail.isActive ? 'Suspend' : 'Reactivate'}
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Plan */}
              <div className="card p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">
                    Subscription
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${PLAN_STYLE[detail.subscriptionPlan] ?? 'bg-brand-100 text-brand-600'}`}
                    >
                      {detail.subscriptionPlan}
                    </span>
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLE[detail.subscriptionStatus] ?? 'bg-brand-100 text-brand-500'}`}
                    >
                      {detail.subscriptionStatus}
                    </span>
                  </div>
                  <p className="text-xs text-brand-400 mt-1">
                    Max branches:{' '}
                    <span className="font-semibold text-brand-700">{detail.maxBranches}</span>
                  </p>
                </div>
                <button
                  onClick={() => setPlanOpen(true)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Edit plan
                </button>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-3">
                  <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">
                    Created
                  </p>
                  <p className="text-sm font-semibold text-brand-900 mt-0.5">
                    {fmtFull(detail.createdAt)}
                  </p>
                </div>
                <div className="card p-3">
                  <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">
                    Last updated
                  </p>
                  <p className="text-sm font-semibold text-brand-900 mt-0.5">
                    {fmtFull(detail.updatedAt)}
                  </p>
                </div>
              </div>

              {/* Branches */}
              <div>
                <p className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-2">
                  Branches{' '}
                  <span className="text-brand-400 font-normal normal-case">
                    ({detail.branches.length})
                  </span>
                </p>
                {detail.branches.length === 0 ? (
                  <p className="text-xs text-brand-400 italic">No branches yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {detail.branches.map((b) => (
                      <div
                        key={b._id}
                        className="flex items-center justify-between px-3 py-2 bg-brand-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-3.5 h-3.5 text-brand-400 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"
                            />
                          </svg>
                          <span className="text-sm font-medium text-brand-800">{b.name}</span>
                        </div>
                        <span className={b.isActive ? 'badge-active' : 'badge-inactive'}>
                          {b.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Users */}
              <div>
                <p className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-2">
                  Users{' '}
                  <span className="text-brand-400 font-normal normal-case">
                    ({detail.users.length})
                  </span>
                </p>
                {detail.users.length === 0 ? (
                  <p className="text-xs text-brand-400 italic">No users yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {detail.users.map((u) => (
                      <div
                        key={u._id}
                        className="flex items-center gap-3 px-3 py-2.5 bg-brand-50 rounded-lg"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                          {u.firstName?.[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-brand-900 truncate">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-[10px] text-brand-400 truncate">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="badge-role capitalize text-[10px]">{u.role}</span>
                          {!u.isActive && (
                            <span className="badge-inactive text-[10px]">Inactive</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-brand-400 text-center py-8">Organization not found</p>
        )}

        {/* Confirm suspend/reactivate */}
        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleToggle}
          loading={toggling}
          title={detail?.isActive ? 'Suspend organization' : 'Reactivate organization'}
          message={
            detail?.isActive
              ? `Suspend "${detail?.name}"? Their users will be locked out on their next request.`
              : `Reactivate "${detail?.name}"? Their users will be able to log in again.`
          }
        />

        {/* Plan edit modal */}
        <Modal isOpen={planOpen} onClose={() => setPlanOpen(false)} title="Update plan">
          <form onSubmit={handlePlanSave} className="space-y-4">
            <div>
              <label className="label">Subscription plan</label>
              <CustomSelect
                value={planForm.subscriptionPlan}
                onChange={(e) => setPlanForm((p) => ({ ...p, subscriptionPlan: e.target.value }))}
                className="input-field"
              >
                {['free', 'basic', 'pro'].map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </CustomSelect>
            </div>
            <div>
              <label className="label">Max branches</label>
              <input
                type="number"
                min="1"
                required
                value={planForm.maxBranches}
                onChange={(e) => setPlanForm((p) => ({ ...p, maxBranches: e.target.value }))}
                className="input-field"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPlanOpen(false)}
                disabled={savingPlan}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={savingPlan}>
                {savingPlan && <Spinner size="sm" className="mr-2" />}Save changes
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Organizations Page
// ═══════════════════════════════════════════════════════════════════════════
export default function SuperAdminOrganizations() {
  const [orgs, setOrgs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, sortBy };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterPlan) params.plan = filterPlan;
      const r = await getAdminOrganizations(params);
      setOrgs(r.data.data);
      setPagination(r.data.pagination);
    } catch {
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, search, filterStatus, filterPlan]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const handleStatusToggled = (orgId, isActive) =>
    setOrgs((prev) => prev.map((o) => (o._id === orgId ? { ...o, isActive } : o)));

  const handlePlanUpdated = (orgId, data) =>
    setOrgs((prev) =>
      prev.map((o) =>
        o._id === orgId
          ? { ...o, subscriptionPlan: data.subscriptionPlan, maxBranches: data.maxBranches }
          : o
      )
    );

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-0.5">
            Platform Console
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-900 leading-none">
            Organizations
          </h1>
          <p className="text-sm text-brand-500 mt-1.5">
            {pagination
              ? `${pagination.total} organization${pagination.total !== 1 ? 's' : ''} registered`
              : 'Loading…'}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
          <span className="text-xs font-semibold text-primary-700">Super Admin</span>
        </div>
      </div>

      {/* ── Filters toolbar ───────────────────────────────────────────── */}
      <div className="card px-5 py-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[160px]">
          <label className="label">Search</label>
          <input
            type="text"
            placeholder="Organization name…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input-field text-sm py-2"
          />
        </div>
        <div>
          <label className="label">Status</label>
          <CustomSelect
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="input-field text-sm py-2 w-auto"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </CustomSelect>
        </div>
        <div>
          <label className="label">Plan</label>
          <CustomSelect
            value={filterPlan}
            onChange={(e) => {
              setFilterPlan(e.target.value);
              setPage(1);
            }}
            className="input-field text-sm py-2 w-auto"
          >
            <option value="">All plans</option>
            {['free', 'basic', 'pro'].map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </CustomSelect>
        </div>
        <div>
          <label className="label">Sort</label>
          <CustomSelect
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="input-field text-sm py-2 w-auto"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
          </CustomSelect>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-100">
            <thead>
              <tr>
                {[
                  'Organization',
                  'Plan',
                  'Subscription Status',
                  'Active',
                  'Branches',
                  'Users',
                  'Joined',
                  '',
                ].map((h) => (
                  <th key={h} className="table-th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-50">
              {loading ? (
                [1, 2, 3, 4, 5, 6].map((i) => <SkeletonRow key={i} />)
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="empty-state">
                      <svg
                        className="empty-state-icon"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"
                        />
                      </svg>
                      <p className="empty-state-title">No organizations found</p>
                      <p className="empty-state-desc">Try changing your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                orgs.map((org) => (
                  <tr
                    key={org._id}
                    onClick={() => setSelectedId(org._id)}
                    className="table-row cursor-pointer"
                  >
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 ${org.isActive ? 'bg-primary-600' : 'bg-brand-400'}`}
                        >
                          {org.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-brand-900">{org.name}</p>
                          <p className="text-[10px] text-brand-400 font-mono">
                            {org._id.toString().slice(-8)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="table-td">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${PLAN_STYLE[org.subscriptionPlan] ?? 'bg-brand-100 text-brand-600'}`}
                      >
                        {org.subscriptionPlan}
                      </span>
                    </td>

                    <td className="table-td">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLE[org.subscriptionStatus] ?? 'bg-brand-100 text-brand-500'}`}
                      >
                        {org.subscriptionStatus}
                      </span>
                    </td>

                    <td className="table-td">
                      {org.isActive ? (
                        <span className="badge-active">Active</span>
                      ) : (
                        <span className="badge-inactive">Suspended</span>
                      )}
                    </td>

                    <td className="table-td">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-brand-900">{org.branchCount}</span>
                        <span className="text-xs text-brand-400">/ {org.maxBranches}</span>
                      </div>
                      <div className="mt-1 h-1 w-14 bg-brand-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary-500"
                          style={{
                            width: `${Math.min((org.branchCount / org.maxBranches) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </td>

                    <td className="table-td text-sm font-medium text-brand-700">{org.userCount}</td>

                    <td className="table-td text-xs text-brand-400 whitespace-nowrap">
                      {fmtFull(org.createdAt)}
                    </td>

                    <td className="table-td" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedId(org._id)}
                        className="btn-secondary py-1 px-3 text-xs"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-brand-100 text-xs text-brand-500">
            <span>
              Page {page} of {pagination.totalPages} · {pagination.total} total
            </span>
            <div className="flex gap-2">
              <button
                className="btn-secondary py-1 px-3 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className="btn-secondary py-1 px-3 text-xs"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail drawer ─────────────────────────────────────────────── */}
      {selectedId && (
        <OrgDetailDrawer
          orgId={selectedId}
          onClose={() => setSelectedId(null)}
          onStatusToggled={handleStatusToggled}
          onPlanUpdated={handlePlanUpdated}
        />
      )}
    </div>
  );
}
