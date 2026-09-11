import { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { useAuth } from '../../context/AuthContext';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import { StatCard, Badge, DataTable, Modal, Spinner } from '../../components/ui';

import {
  getPlatformStats,
  getAdminOrganizations,
  getOrganizationDetail,
  toggleOrganizationStatus,
  updateOrganizationPlan,
  getSignupTrend,
  getMostActiveOrgs,
} from '../../services/organizationService';

// Formatters
const fmtInt = (n) => Number(n ?? 0).toLocaleString('en-US');
const fmtShortDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const fmtFullDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Custom Chart Tooltips (Strictly counts only, no financial data)
function SignupTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-neutral-900 text-white rounded-md p-2.5 shadow-lg text-xs border border-neutral-800">
        <p className="font-semibold text-neutral-200 mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-neutral-300">New Signups:</span>
          <span className="font-mono font-bold text-white">{payload[0]?.value ?? 0}</span>
        </div>
      </div>
    );
  }
  return null;
}

function ActivityTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-neutral-900 text-white rounded-md p-2.5 shadow-lg text-xs border border-neutral-800">
        <p className="font-semibold text-neutral-200 mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3D7A7A]" />
          <span className="text-neutral-300">Order/Sale Count:</span>
          <span className="font-mono font-bold text-white">{fmtInt(payload[0]?.value)}</span>
        </div>
      </div>
    );
  }
  return null;
}

export default function PlatformDashboard({ initialTab = 'overview' }) {
  const { user } = useAuth();

  // Route-level security check
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== 'superAdmin') {
    const fallback = user.role === 'cashier' ? '/pos' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  // State: Overall loading
  const [statsLoading, setStatsLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);

  // State: Stats
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    activeOrganizations: 0,
    suspendedOrganizations: 0,
    newOrganizationsThisMonth: 0,
    totalUsers: 0,
    totalBranches: 0,
  });

  // State: Organizations Table
  const [organizations, setOrganizations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 15 });

  // State: Charts
  const [trendDays, setTrendDays] = useState(30);
  const [signupTrend, setSignupTrend] = useState([]);
  const [activeOrgs, setActiveOrgs] = useState([]);

  // State: Organization Detail Modal
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [orgDetail, setOrgDetail] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [editPlan, setEditPlan] = useState('');
  const [editMaxBranches, setEditMaxBranches] = useState(1);
  const [savingPlan, setSavingPlan] = useState(false);

  // 1. Fetch Platform Stats
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await getPlatformStats();
      if (res?.data?.success) {
        setStats(res.data.data || {});
      }
    } catch (err) {
      console.error('Failed to load platform stats:', err);
      toast.error('Could not load platform metrics');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // 2. Fetch Organizations List
  const loadOrganizations = useCallback(async () => {
    try {
      setTableLoading(true);
      const params = {
        page,
        limit: pagination.limit,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter) params.status = statusFilter;
      if (planFilter) params.plan = planFilter;

      const res = await getAdminOrganizations(params);
      if (res?.data?.success) {
        setOrganizations(res.data.data || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
      toast.error('Could not load organizations list');
    } finally {
      setTableLoading(false);
    }
  }, [page, pagination.limit, searchQuery, statusFilter, planFilter]);

  // 3. Fetch Charts Data
  const loadCharts = useCallback(async () => {
    try {
      setChartsLoading(true);
      const [trendRes, activeRes] = await Promise.allSettled([
        getSignupTrend({ days: trendDays }),
        getMostActiveOrgs({ limit: 8, days: 30 }),
      ]);

      if (trendRes.status === 'fulfilled' && trendRes.value?.data?.success) {
        const trendData = (trendRes.value.data.data || []).map((d) => ({
          ...d,
          formattedDate: fmtShortDate(d.date),
        }));
        setSignupTrend(trendData);
      }

      if (activeRes.status === 'fulfilled' && activeRes.value?.data?.success) {
        // Privacy Rule: Sanitize to strictly organizationName and saleCount
        const sanitized = (activeRes.value.data.data || []).map((o) => ({
          organizationName: o.organizationName || 'Unnamed Org',
          saleCount: Number(o.saleCount || 0),
        }));
        setActiveOrgs(sanitized);
      }
    } catch (err) {
      console.error('Failed to load telemetry charts:', err);
    } finally {
      setChartsLoading(false);
    }
  }, [trendDays]);

  // Initial Data Fetch
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  // Scroll to section if initialTab is specified
  useEffect(() => {
    let targetId = null;
    if (initialTab === 'organizations') targetId = 'organizations-section';
    else if (initialTab === 'trends') targetId = 'trends-section';
    else if (initialTab === 'activity') targetId = 'activity-section';

    if (targetId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [initialTab]);

  // Toggle Organization Status (Active <-> Suspended)
  const handleToggleStatus = async (orgId, currentActive) => {
    setTogglingId(orgId);
    // Optimistic UI update
    setOrganizations((prev) =>
      prev.map((o) => (o._id === orgId ? { ...o, isActive: !currentActive } : o))
    );
    if (orgDetail && orgDetail._id === orgId) {
      setOrgDetail((prev) => ({ ...prev, isActive: !currentActive }));
    }

    try {
      const res = await toggleOrganizationStatus(orgId);
      if (res?.data?.success) {
        const newStatus = res.data.data?.isActive;
        toast.success(
          `Organization ${newStatus ? 'activated' : 'suspended'} successfully`
        );
        // Refresh platform stats to keep active/suspended counts accurate
        loadStats();
      } else {
        throw new Error(res?.data?.message || 'Toggle failed');
      }
    } catch (err) {
      console.error('Failed to toggle organization status:', err);
      toast.error('Failed to update organization status');
      // Revert optimistic update
      setOrganizations((prev) =>
        prev.map((o) => (o._id === orgId ? { ...o, isActive: currentActive } : o))
      );
      if (orgDetail && orgDetail._id === orgId) {
        setOrgDetail((prev) => ({ ...prev, isActive: currentActive }));
      }
    } finally {
      setTogglingId(null);
    }
  };

  // Open Details Modal
  const handleViewDetails = async (org) => {
    setSelectedOrgId(org._id);
    setEditPlan(org.subscriptionPlan || 'free');
    setEditMaxBranches(org.maxBranches || 1);
    setOrgDetail(org);
    setModalLoading(true);

    try {
      const res = await getOrganizationDetail(org._id);
      if (res?.data?.success && res.data.data) {
        const detail = res.data.data;
        setOrgDetail(detail);
        setEditPlan(detail.subscriptionPlan || 'free');
        setEditMaxBranches(detail.maxBranches || 1);
      }
    } catch (err) {
      console.error('Failed to fetch org details:', err);
      // Fallback to row data already present
    } finally {
      setModalLoading(false);
    }
  };

  // Save Plan Updates from Modal
  const handleSavePlan = async () => {
    if (!selectedOrgId) return;
    setSavingPlan(true);
    try {
      const res = await updateOrganizationPlan(selectedOrgId, {
        subscriptionPlan: editPlan,
        maxBranches: Number(editMaxBranches),
      });
      if (res?.data?.success) {
        toast.success('Subscription plan updated');
        setOrganizations((prev) =>
          prev.map((o) =>
            o._id === selectedOrgId
              ? { ...o, subscriptionPlan: editPlan, maxBranches: Number(editMaxBranches) }
              : o
          )
        );
        setOrgDetail((prev) =>
          prev ? { ...prev, subscriptionPlan: editPlan, maxBranches: Number(editMaxBranches) } : prev
        );
      } else {
        throw new Error(res?.data?.message || 'Plan update failed');
      }
    } catch (err) {
      console.error('Failed to update plan:', err);
      toast.error(err?.response?.data?.message || 'Failed to update plan');
    } finally {
      setSavingPlan(false);
    }
  };

  // Helper for Plan badge styles
  const renderPlanBadge = (plan) => {
    const p = (plan || 'free').toLowerCase();
    let variant = 'neutral';
    if (p === 'pro') variant = 'primary';
    else if (p === 'basic') variant = 'brand';
    return (
      <Badge
        variant={variant}
        label={p.toUpperCase()}
      />
    );
  };

  // DataTable Column Definitions
  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Organization',
        render: (val, row) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-brand-900 dark:text-brand-accent flex items-center justify-center text-xs font-bold font-mono border border-neutral-200 dark:border-neutral-700 shrink-0">
              {(val?.[0] || 'O').toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-xs text-neutral-900 dark:text-white block truncate">
                {val || 'Unnamed Organization'}
              </span>
              <span className="font-mono text-[10px] text-neutral-400 block truncate">
                ID: {(row._id || '').slice(-6).toUpperCase()}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'subscriptionPlan',
        label: 'Plan',
        render: (val) => renderPlanBadge(val),
      },
      {
        key: 'isActive',
        label: 'Status & Action',
        render: (val, row) => {
          const isRowToggling = togglingId === row._id;
          return (
            <div className="flex items-center gap-3">
              <Badge
                variant={val ? 'success' : 'danger'}
                label={val ? 'Active' : 'Suspended'}
                dot
              />
              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(val)}
                disabled={isRowToggling}
                onClick={() => handleToggleStatus(row._id, val)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 ${
                  val ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-700'
                } ${isRowToggling ? 'opacity-50 cursor-wait' : ''}`}
                title={val ? 'Suspend Organization' : 'Reactivate Organization'}
              >
                <span className="sr-only">Toggle organization status</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    val ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        },
      },
      {
        key: 'branchCount',
        label: 'Branches',
        align: 'right',
        render: (val) => (
          <span className="font-mono text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            {val ?? 0}
          </span>
        ),
      },
      {
        key: 'userCount',
        label: 'Users',
        align: 'right',
        render: (val) => (
          <span className="font-mono text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            {val ?? 0}
          </span>
        ),
      },
      {
        key: 'createdAt',
        label: 'Signup Date',
        render: (val) => (
          <span className="text-xs text-neutral-600 dark:text-neutral-400">
            {fmtFullDate(val)}
          </span>
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right',
        render: (_, row) => (
          <button
            type="button"
            onClick={() => handleViewDetails(row)}
            className="text-xs font-semibold text-brand-700 dark:text-brand-accent hover:underline inline-flex items-center gap-1 transition-colors"
          >
            <span>View Details</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ),
      },
    ],
    [togglingId]
  );

  // TopBar Organization Search Input (Replaces branch selector at platform level)
  const orgSearchInput = (
    <div className="relative w-56 sm:w-80">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        data-testid="org-search-topbar"
        placeholder="Search organizations..."
        aria-label="Search organizations"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setPage(1);
        }}
        className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent"
      />
    </div>
  );

  return (
    <SuperAdminLayout branchSelector={orgSearchInput}>
      <div className="space-y-6">
        {/* ── Page Header ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Platform Dashboard
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-700/50">
                SuperAdmin
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Cross-tenant telemetry, organization provisioning posture, and global platform health.
            </p>
          </div>

          {/* Quick Refresh Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                loadStats();
                loadOrganizations();
                loadCharts();
                toast.success('Telemetry refreshed');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm"
              title="Refresh platform telemetry"
            >
              <svg className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ── 5 StatCards from GET /admin/stats ───────────────────────── */}
        {statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-5 animate-pulse">
                <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-800 rounded mb-3" />
                <div className="h-8 w-28 bg-neutral-200 dark:bg-neutral-800 rounded mb-2" />
                <div className="h-3 w-16 bg-neutral-100 dark:bg-neutral-800/60 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Total Organizations */}
            <StatCard
              label="Total Organizations"
              value={fmtInt(stats.totalOrganizations)}
              accentColor="brand"
              secondaryStats={[
                { label: 'Active', value: fmtInt(stats.activeOrganizations) },
                { label: 'Suspended', value: fmtInt(stats.suspendedOrganizations) },
              ]}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
            />

            {/* 2. Active Organizations */}
            <StatCard
              label="Active Organizations"
              value={fmtInt(stats.activeOrganizations)}
              accentColor="mint"
              secondaryStats={[
                {
                  label: 'Health Rate',
                  value: stats.totalOrganizations
                    ? `${((stats.activeOrganizations / stats.totalOrganizations) * 100).toFixed(0)}%`
                    : '100%',
                },
              ]}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />

            {/* 3. New Signups This Month */}
            <StatCard
              label="New Signups This Month"
              value={fmtInt(stats.newOrganizationsThisMonth)}
              accentColor="warning"
              secondaryStats={[
                { label: 'Cadence', value: 'Current Month' },
              ]}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              }
            />

            {/* 4. Total Users */}
            <StatCard
              label="Total Users"
              value={fmtInt(stats.totalUsers)}
              accentColor="primary"
              secondaryStats={[
                { label: 'Scope', value: 'Tenant Staff' },
              ]}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />

            {/* 5. Total Branches */}
            <StatCard
              label="Total Branches"
              value={fmtInt(stats.totalBranches)}
              accentColor="purple"
              secondaryStats={[
                { label: 'Network', value: 'Storefronts' },
              ]}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                </svg>
              }
            />
          </div>
        )}

        {/* ── Dual Telemetry Charts Row ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Chart 1: Signup Trend (7 Cols) */}
          <div id="trends-section" className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-5 shadow-card flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Tenant Signup Velocity
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Daily onboarded organizations over the selected telemetry window.
                </p>
              </div>

              {/* 30 / 90 Days Toggle */}
              <div className="inline-flex rounded-md p-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTrendDays(30)}
                  className={`px-3 py-1 font-semibold rounded transition-colors ${
                    trendDays === 30
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  30 Days
                </button>
                <button
                  type="button"
                  onClick={() => setTrendDays(90)}
                  className={`px-3 py-1 font-semibold rounded transition-colors ${
                    trendDays === 90
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  90 Days
                </button>
              </div>
            </div>

            {chartsLoading ? (
              <div className="h-64 flex items-center justify-center animate-pulse">
                <div className="h-44 w-full bg-neutral-100 dark:bg-neutral-800/60 rounded" />
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={signupTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-neutral-800" />
                    <XAxis
                      dataKey="formattedDate"
                      stroke="#9ca3af"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<SignupTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#signupGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: Most Active Organizations (5 Cols) */}
          <div id="activity-section" className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-5 shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-1">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Most Active Organizations
                </h3>
                <span className="text-[11px] font-mono text-neutral-400">
                  Last 30 Days
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                Top tenants ranked strictly by processed transaction volume.
              </p>

              {chartsLoading ? (
                <div className="h-56 flex items-center justify-center animate-pulse">
                  <div className="h-40 w-full bg-neutral-100 dark:bg-neutral-800/60 rounded" />
                </div>
              ) : activeOrgs.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-xs text-neutral-400">
                  <span>No recorded sales activity in this window</span>
                </div>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={activeOrgs}
                      layout="vertical"
                      margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" className="dark:stroke-neutral-800" />
                      <XAxis
                        type="number"
                        stroke="#9ca3af"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="organizationName"
                        stroke="#9ca3af"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={90}
                        tickFormatter={(name) => (name.length > 12 ? `${name.slice(0, 12)}…` : name)}
                      />
                      <Tooltip content={<ActivityTooltip />} />
                      <Bar
                        dataKey="saleCount"
                        fill="#3D7A7A"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Mandatory Privacy Caption */}
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-4 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Financial data is private to each organization and not shown here.</span>
            </p>
          </div>
        </div>

        {/* ── Organizations DataTable Section ────────────────────────── */}
        <div id="organizations-section" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Organizations Directory
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Provisioned tenants, subscription tiers, and real-time operational switches.
              </p>
            </div>

            {/* Table Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <select
                aria-label="Filter by Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md px-2.5 py-1.5 text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-accent shadow-sm"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>

              {/* Plan Filter */}
              <select
                aria-label="Filter by Plan"
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md px-2.5 py-1.5 text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-accent shadow-sm"
              >
                <option value="">All Plans</option>
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
              </select>

              {/* Reset Filters */}
              {(statusFilter || planFilter || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('');
                    setPlanFilter('');
                    setSearchQuery('');
                    setPage(1);
                  }}
                  className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 px-2 py-1 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          <DataTable
            columns={columns}
            data={organizations}
            loading={tableLoading}
            emptyMessage="No organizations found"
            emptySubMessage={
              searchQuery || statusFilter || planFilter
                ? 'Try adjusting your search criteria or filter selections.'
                : 'No organizations have onboarded yet.'
            }
          />

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 text-xs text-neutral-500 dark:text-neutral-400">
              <span>
                Showing page <span className="font-semibold">{pagination.page}</span> of{' '}
                <span className="font-semibold">{pagination.totalPages}</span> ({pagination.total} total orgs)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-medium text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-medium text-neutral-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Organization Details Modal ─────────────────────────────── */}
        <Modal
          isOpen={Boolean(selectedOrgId)}
          onClose={() => {
            setSelectedOrgId(null);
            setOrgDetail(null);
          }}
          title={orgDetail?.name || 'Organization Details'}
          maxWidth="max-w-xl"
        >
          {modalLoading && !orgDetail ? (
            <div className="py-12 flex justify-center items-center">
              <Spinner size="lg" />
            </div>
          ) : orgDetail ? (
            <div className="space-y-5">
              {/* Header Status & Plan Badges */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={orgDetail.isActive ? 'success' : 'danger'}
                    label={orgDetail.isActive ? 'Active' : 'Suspended'}
                    dot
                  />
                  {renderPlanBadge(orgDetail.subscriptionPlan)}
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(orgDetail._id, orgDetail.isActive)}
                  disabled={togglingId === orgDetail._id}
                  className={`text-xs font-semibold px-2.5 py-1 rounded border transition-colors ${
                    orgDetail.isActive
                      ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  {orgDetail.isActive ? 'Suspend Organization' : 'Reactivate Organization'}
                </button>
              </div>

              {/* Organization Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80">
                  <span className="text-neutral-400 block mb-0.5">Organization ID</span>
                  <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200 select-all block truncate">
                    {orgDetail._id}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80">
                  <span className="text-neutral-400 block mb-0.5">Registered On</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
                    {fmtFullDate(orgDetail.createdAt)}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80">
                  <span className="text-neutral-400 block mb-0.5">Allocated Branches</span>
                  <span className="font-mono text-base font-bold text-neutral-900 dark:text-white block">
                    {orgDetail.branchCount ?? 0}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80">
                  <span className="text-neutral-400 block mb-0.5">Provisioned Users</span>
                  <span className="font-mono text-base font-bold text-neutral-900 dark:text-white block">
                    {orgDetail.userCount ?? 0}
                  </span>
                </div>
              </div>

              {/* Subscription Plan & Limits Configuration */}
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  Subscription Tier & Quotas
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                      Tier
                    </label>
                    <select
                      value={editPlan}
                      onChange={(e) => setEditPlan(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md px-2.5 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-accent"
                    >
                      <option value="free">Free</option>
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                      Max Branches Allowed
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={editMaxBranches}
                      onChange={(e) => setEditMaxBranches(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md px-2.5 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-accent"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSavePlan}
                    disabled={savingPlan}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-brand-900 dark:bg-brand-accent dark:text-neutral-900 text-white text-xs font-semibold hover:bg-brand-800 transition-colors disabled:opacity-50"
                  >
                    {savingPlan ? <Spinner size="sm" /> : null}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}
