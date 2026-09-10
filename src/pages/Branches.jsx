import { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  getBranches,
  createBranch,
  updateBranch,
  deactivateBranch,
} from '../services/branchService';
import { getStaff } from '../services/staffService';
import { getEmployees } from '../services/employeeService';
import { getSales } from '../services/saleService';

import {
  StatCard,
  DashboardLayout,
  Modal,
  ConfirmDialog,
  Spinner,
} from '../components/ui';

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n ?? 0).toLocaleString();
const fmtCurrency = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const todayStr = () => new Date().toISOString().slice(0, 10);

const EMPTY_BRANCH_FORM = {
  name: '',
  address: '',
};

export default function Branches() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superAdmin';

  // State
  const [branches, setBranches] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [todaySales, setTodaySales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = create
  const [form, setForm] = useState({ ...EMPTY_BRANCH_FORM });
  const [saving, setSaving] = useState(false);

  // Deactivate Confirm Dialog
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  // ── Fetch Branches ────────────────────────────────────────────────────────
  const fetchBranchesData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBranches({ includeInactive: true });
      if (res.data?.success) {
        setBranches(res.data.data || []);
      }
    } catch (err) {
      console.error('getBranches error:', err);
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch Inline Stats (Staff count & Today's Sales) ───────────────────────
  const fetchStatsData = useCallback(async () => {
    try {
      const [staffRes, empRes, salesRes] = await Promise.allSettled([
        getStaff(),
        getEmployees(),
        getSales({ startDate: todayStr(), endDate: todayStr(), limit: 200 }),
      ]);

      if (staffRes.status === 'fulfilled' && staffRes.value?.data?.success) {
        setStaffList(staffRes.value.data.data || []);
      }
      if (empRes.status === 'fulfilled' && empRes.value?.data?.success) {
        setEmployeeList(empRes.value.data.data || []);
      }
      if (salesRes.status === 'fulfilled' && salesRes.value?.data?.success) {
        setTodaySales(salesRes.value.data.data || []);
      }
    } catch {
      // Non-fatal if inline stats fail
    }
  }, []);

  useEffect(() => {
    fetchBranchesData();
    fetchStatsData();
  }, [fetchBranchesData, fetchStatsData]);

  // Branch statistics lookup map
  const branchStatsMap = useMemo(() => {
    const map = new Map();

    branches.forEach((b) => {
      const bId = String(b._id);

      // Staff Count (App users + Employees)
      const appUsersCount = staffList.filter((s) => {
        const sBid = String(s.branchId?._id ?? s.branchId);
        return sBid === bId && s.isActive;
      }).length;

      const employeesCount = employeeList.filter((e) => {
        const eBid = String(e.branchId?._id ?? e.branchId);
        return eBid === bId && e.isActive;
      }).length;

      const totalStaff = appUsersCount + employeesCount;

      // Today's Sales Total
      const branchTodaySales = todaySales.filter((s) => {
        const sBid = String(s.branchId?._id ?? s.branchId);
        return sBid === bId;
      });

      const salesAmount = branchTodaySales.reduce(
        (sum, s) => sum + (s.totalAmount || 0),
        0
      );
      const salesCount = branchTodaySales.length;

      map.set(bId, {
        appUsersCount,
        employeesCount,
        totalStaff,
        todaySalesAmount: salesAmount,
        todaySalesCount: salesCount,
      });
    });

    return map;
  }, [branches, staffList, employeeList, todaySales]);

  // ── Overall Metrics ───────────────────────────────────────────────────────
  const overallMetrics = useMemo(() => {
    const activeBranches = branches.filter((b) => b.isActive);
    let totalOrgStaff = 0;
    let totalTodayRevenue = 0;

    activeBranches.forEach((b) => {
      const s = branchStatsMap.get(String(b._id));
      if (s) {
        totalOrgStaff += s.totalStaff;
        totalTodayRevenue += s.todaySalesAmount;
      }
    });

    return {
      activeCount: activeBranches.length,
      inactiveCount: branches.length - activeBranches.length,
      totalOrgStaff,
      totalTodayRevenue,
    };
  }, [branches, branchStatsMap]);

  // Filtered branches
  const filteredBranches = useMemo(() => {
    let list = branches;
    if (!includeInactive) {
      list = list.filter((b) => b.isActive);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.name?.toLowerCase().includes(q) ||
          b.address?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [branches, includeInactive, searchQuery]);

  // ── Modal Handlers ────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_BRANCH_FORM });
    setModalOpen(true);
  };

  const openEditModal = (branch, e) => {
    e?.stopPropagation();
    setEditTarget(branch);
    setForm({
      name: branch.name || '',
      address: branch.address || '',
    });
    setModalOpen(true);
  };

  const handleSaveSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Branch name is required');
      return;
    }

    setSaving(true);
    try {
      if (editTarget) {
        const payload = {
          name: form.name.trim(),
          address: form.address.trim() || undefined,
        };
        const res = await updateBranch(editTarget._id, payload);
        if (res.data?.success) {
          toast.success(`"${form.name.trim()}" updated successfully`);
          setModalOpen(false);
          fetchBranchesData();
        }
      } else {
        const payload = {
          name: form.name.trim(),
          address: form.address.trim() || undefined,
        };
        const res = await createBranch(payload);
        if (res.data?.success) {
          toast.success(`Branch "${form.name.trim()}" created successfully`);
          setModalOpen(false);
          fetchBranchesData();
        }
      }
    } catch (err) {
      console.error('branch save error:', err);
      toast.error(err.response?.data?.message || 'Failed to save branch');
    } finally {
      setSaving(false);
    }
  };

  // ── Deactivate / Reactivate Handlers ──────────────────────────────────────
  const openDeactivateModal = (branch, e) => {
    e?.stopPropagation();
    setDeactivateTarget(branch);
    setDeactivateOpen(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      const res = await deactivateBranch(deactivateTarget._id);
      if (res.data?.success) {
        toast.success(`Branch "${deactivateTarget.name}" deactivated`);
        setDeactivateOpen(false);
        setDeactivateTarget(null);
        fetchBranchesData();
      }
    } catch (err) {
      console.error('deactivateBranch error:', err);
      toast.error(err.response?.data?.message || 'Failed to deactivate branch');
    } finally {
      setDeactivating(false);
    }
  };

  const handleReactivateBranch = async (branch, e) => {
    e?.stopPropagation();
    try {
      const res = await updateBranch(branch._id, { isActive: true });
      if (res.data?.success) {
        toast.success(`Branch "${branch.name}" reactivated`);
        fetchBranchesData();
      }
    } catch (err) {
      console.error('reactivate branch error:', err);
      toast.error(err.response?.data?.message || 'Failed to reactivate branch');
    }
  };

  // Enforce Admin-only route guard
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ── Page Header ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Branch Management
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-brand-50 text-brand-800 dark:bg-brand-900/60 dark:text-brand-accent border border-brand-200/60 dark:border-brand-700/50">
                Locations
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Oversee retail branch network, monitor daily store sales, manage addresses, and configure staff allocations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 cursor-pointer select-none bg-white dark:bg-neutral-900 px-3 py-2 rounded-md border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="rounded border-neutral-300 text-brand-800 focus:ring-brand-accent"
              />
              <span>Show Inactive ({overallMetrics.inactiveCount})</span>
            </label>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent border border-brand-700 hover:bg-brand-950 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Add Branch</span>
            </button>
          </div>
        </div>

        {/* ── Summary StatCards ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Active Retail Branches"
            value={fmt(overallMetrics.activeCount)}
            accentColor="brand"
            icon={
              <svg className="w-5 h-5 text-brand-700 dark:text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            secondaryStats={[
              {
                label: 'Total Configured',
                value: branches.length,
              },
              {
                label: 'Inactive',
                value: overallMetrics.inactiveCount,
              },
            ]}
          />

          <StatCard
            label="Total Network Staff"
            value={`${fmt(overallMetrics.totalOrgStaff)} Members`}
            accentColor="success"
            icon={
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            secondaryStats={[
              {
                label: 'App Users',
                value: staffList.length,
              },
              {
                label: 'Salaried Staff',
                value: employeeList.length,
              },
            ]}
          />

          <StatCard
            label="Today's Network Sales"
            value={`$${fmtCurrency(overallMetrics.totalTodayRevenue)}`}
            accentColor="brand"
            icon={
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            secondaryStats={[
              {
                label: 'Date',
                value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              },
              {
                label: 'Transactions',
                value: todaySales.length,
              },
            ]}
          />
        </div>

        {/* ── Search Toolbar ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-3 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search branches by name or address…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-md bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-accent placeholder-neutral-400"
            />
          </div>

          <div className="text-xs text-neutral-400 font-mono">
            {filteredBranches.length} {filteredBranches.length === 1 ? 'branch location' : 'branch locations'}
          </div>
        </div>

        {/* ── Branch Cards Grid ───────────────────────────────────────── */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Spinner size="lg" className="text-brand-800 dark:text-brand-accent" />
            <span className="text-xs text-neutral-400 mt-2">Loading organization branches…</span>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-12 text-center shadow-card">
            <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-800 dark:text-brand-accent flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">No branches found</h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No branch matched your search "${searchQuery}".`
                : 'Click "+ Add Branch" to configure your first location.'}
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent hover:bg-brand-950 transition-colors"
            >
              + Add First Branch
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBranches.map((branch) => {
              const stats = branchStatsMap.get(String(branch._id)) || {
                totalStaff: 0,
                todaySalesAmount: 0,
                todaySalesCount: 0,
              };

              return (
                <div
                  key={branch._id}
                  className={`bg-white dark:bg-neutral-900 border rounded-card p-5 shadow-card hover:shadow-card-md transition-all flex flex-col justify-between ${
                    branch.isActive
                      ? 'border-neutral-200 dark:border-neutral-800'
                      : 'border-dashed border-neutral-300 dark:border-neutral-700 opacity-75'
                  }`}
                >
                  <div>
                    {/* Top row: Name, Icon, and Active Badge */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-800 dark:text-brand-accent flex items-center justify-center font-bold text-sm shrink-0 border border-brand-200/50 dark:border-brand-700/40">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">
                            {branch.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {branch.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active Store
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                                Inactive / Decommissioned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Top Action Icons: Edit & Deactivate */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => openEditModal(branch, e)}
                          className="p-1.5 rounded-md text-neutral-400 hover:text-brand-800 dark:hover:text-brand-accent hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          title="Edit branch details"
                          aria-label="Edit branch details"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Address with icon */}
                    <div className="flex items-start gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-4 min-h-[32px]">
                      <svg className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="line-clamp-2">
                        {branch.address || <span className="italic text-neutral-400">No address specified</span>}
                      </span>
                    </div>

                    {/* Inline Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-md bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 mb-4">
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
                          Staff Allocated
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-sm font-bold text-neutral-900 dark:text-white font-mono">
                            {stats.totalStaff}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            ({stats.appUsersCount} app, {stats.employeesCount} staff)
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
                          Today&apos;s Sales
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            ${fmtCurrency(stats.todaySalesAmount)}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            ({stats.todaySalesCount})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Footer: Deactivate / Reactivate Action */}
                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 font-mono">
                      ID: {String(branch._id).slice(-6)}
                    </span>

                    {branch.isActive ? (
                      <button
                        type="button"
                        onClick={(e) => openDeactivateModal(branch, e)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5 py-1 rounded transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        <span>Deactivate</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleReactivateBranch(branch, e)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-2.5 py-1 rounded transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Reactivate</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* "+ Add Branch" Dashed Action Card */}
            <button
              type="button"
              onClick={openCreateModal}
              className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-brand-600 dark:hover:border-brand-500 rounded-card p-6 flex flex-col items-center justify-center text-center transition-all bg-neutral-50/50 dark:bg-neutral-900/40 hover:bg-brand-50/30 dark:hover:bg-brand-900/20 group min-h-[240px]"
            >
              <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-900/60 text-brand-800 dark:text-brand-accent flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-brand-900 dark:group-hover:text-brand-accent">
                + Add New Branch
              </span>
              <p className="text-xs text-neutral-400 mt-1 max-w-[200px]">
                Create a new store location or regional warehouse facility.
              </p>
            </button>
          </div>
        )}

        {/* ── Add / Edit Branch Modal ─────────────────────────────────── */}
        <Modal
          isOpen={modalOpen}
          onClose={() => !saving && setModalOpen(false)}
          title={editTarget ? 'Edit Branch Location' : 'Add New Branch Location'}
        >
          <form onSubmit={handleSaveSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Branch Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Downtown Flagship, North Warehouse"
                className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Street Address / Location <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                maxLength={300}
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="e.g. 104 Market St, Suite 400, Chicago, IL 60601"
                className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent border border-brand-700 hover:bg-brand-950 transition-colors shadow-sm disabled:opacity-50"
              >
                {saving && <Spinner size="sm" />}
                <span>{editTarget ? 'Save Changes' : 'Create Branch'}</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* ── Deactivate Branch Confirmation Dialog ───────────────────── */}
        <ConfirmDialog
          isOpen={deactivateOpen}
          onClose={() => !deactivating && setDeactivateOpen(false)}
          onConfirm={handleDeactivateConfirm}
          loading={deactivating}
          title="Deactivate Branch"
          message={`Are you sure you want to deactivate "${deactivateTarget?.name}"? You can re-enable it later by toggling "Show Inactive".`}
        />
      </div>
    </DashboardLayout>
  );
}
