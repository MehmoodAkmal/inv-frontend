import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getCustomers } from '../services/customerService';
import { getOutstandingBalance } from '../services/paymentService';
import { getBranches } from '../services/branchService';

import {
  StatCard,
  DataTable,
  DashboardLayout,
  CustomSelect,
} from '../components/ui';

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtd = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getDaysSince = (d) => {
  if (!d) return null;
  const diff = Date.now() - new Date(d).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

export default function CustomerLedgers() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';
  const isManagerOrCashier = user?.role === 'manager' || user?.role === 'cashier';

  // State
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalOutstanding: 0,
    totalCollectedThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('all'); // 'all' | 'balance' | 'settled' | 'overdue'
  const [highestFirst, setHighestFirst] = useState(true);

  // Fetch branches
  useEffect(() => {
    getBranches()
      .then((res) => {
        if (res.data?.success) {
          setBranches(res.data.data || []);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch customers and summary
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (isAdmin && selectedBranch) {
        params.branchId = selectedBranch;
      }

      const [custRes, outRes] = await Promise.allSettled([
        getCustomers(params),
        getOutstandingBalance(params),
      ]);

      let custList = [];
      if (custRes.status === 'fulfilled' && custRes.value?.data?.success) {
        custList = custRes.value.data.data || [];
        setCustomers(custList);
      }

      if (outRes.status === 'fulfilled' && outRes.value?.data?.success) {
        const outSummary = outRes.value.data.summary;
        const outData = outRes.value.data.data || [];

        const totalOut =
          outSummary?.totalOutstanding ??
          outData.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0);

        setSummaryData({
          totalOutstanding: totalOut,
          totalCollectedThisMonth: outSummary?.totalCollectedThisMonth ?? 0,
        });
      } else {
        // Fallback calculation from customer list
        const totalOut = custList.reduce(
          (sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0),
          0
        );
        setSummaryData((prev) => ({
          ...prev,
          totalOutstanding: totalOut,
        }));
      }
    } catch (err) {
      console.error('CustomerLedgers fetch error:', err);
      toast.error('Failed to load customer ledger data');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedBranch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived calculations for overdue (>30 days with positive balance)
  const customersWithOverdueStatus = useMemo(() => {
    return customers.map((c) => {
      const lastTx = c.lastTransactionDate || c.updatedAt || c.createdAt;
      const daysSince = getDaysSince(lastTx);
      const isOverdue = (c.currentBalance || 0) > 0 && daysSince !== null && daysSince > 30;

      // Extract branch name
      let branchName = '—';
      if (c.branch) {
        branchName = c.branch;
      } else if (c.branchId?.name) {
        branchName = c.branchId.name;
      } else if (c.branchId) {
        const bid = c.branchId?._id ?? c.branchId;
        const match = branches.find((b) => b._id === bid);
        if (match) branchName = match.name;
      }

      return {
        ...c,
        lastTransactionDate: lastTx,
        daysSince,
        isOverdue,
        branchName,
      };
    });
  }, [customers, branches]);

  // Overall stats
  const overdueCount = useMemo(() => {
    return customersWithOverdueStatus.filter((c) => c.isOverdue).length;
  }, [customersWithOverdueStatus]);

  const totalOutstandingCalc = useMemo(() => {
    return summaryData.totalOutstanding > 0
      ? summaryData.totalOutstanding
      : customersWithOverdueStatus.reduce(
          (sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0),
          0
        );
  }, [summaryData.totalOutstanding, customersWithOverdueStatus]);

  // Filtered & Sorted data
  const filteredCustomers = useMemo(() => {
    return customersWithOverdueStatus
      .filter((c) => {
        // Name / Phone search
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesName = c.name?.toLowerCase().includes(q);
          const matchesPhone = c.phone?.toLowerCase().includes(q);
          if (!matchesName && !matchesPhone) return false;
        }

        // Branch filter (for admin)
        if (isAdmin && selectedBranch) {
          const bid = c.branchId?._id ?? c.branchId;
          if (bid !== selectedBranch) return false;
        }

        // Balance Status filter
        if (balanceFilter === 'balance' && (c.currentBalance || 0) <= 0) return false;
        if (balanceFilter === 'settled' && (c.currentBalance || 0) > 0) return false;
        if (balanceFilter === 'overdue' && !c.isOverdue) return false;

        return true;
      })
      .sort((a, b) => {
        if (highestFirst) {
          // Sort by highest balance first, then name
          const balDiff = (b.currentBalance || 0) - (a.currentBalance || 0);
          if (balDiff !== 0) return balDiff;
          return (a.name || '').localeCompare(b.name || '');
        }
        // Default alphabetical by name
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [customersWithOverdueStatus, search, isAdmin, selectedBranch, balanceFilter, highestFirst]);

  // Locked branch name for managers / cashiers
  const userBranchName = useMemo(() => {
    const branchId = user?.branchId;
    if (!branchId) return 'Assigned Branch';
    const b = branches.find((item) => item._id === branchId);
    return b?.name || 'Assigned Branch';
  }, [user, branches]);

  // Table Columns
  const columns = [
    {
      key: 'name',
      label: 'Customer Name',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-800 dark:bg-brand-700 text-brand-accent flex items-center justify-center text-xs font-mono font-bold shrink-0 shadow-sm">
            {(val?.[0] || 'C').toUpperCase()}
          </div>
          <div>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
              {val}
            </span>
            {row.address && (
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500 block truncate max-w-[200px]">
                {row.address}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'branchName',
      label: 'Branch',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
          {val}
        </span>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (val) => (
        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300">
          {val || '—'}
        </span>
      ),
    },
    {
      key: 'currentBalance',
      label: 'Current Balance',
      type: 'currency',
      align: 'right',
      sortable: true,
      render: (val, row) => {
        const balance = Number(val || 0);
        const isOverdue = row.isOverdue;

        return (
          <div className="flex flex-col items-end">
            <span
              className={`font-mono text-sm font-bold tracking-tight ${
                isOverdue
                  ? 'text-rose-600 dark:text-rose-400'
                  : balance > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              ${fmt(balance)}
            </span>
            {isOverdue && (
              <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded mt-0.5">
                Overdue
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'lastTransactionDate',
      label: 'Last Transaction Date',
      render: (val, row) => (
        <div>
          <span className="text-xs text-neutral-700 dark:text-neutral-300 block">
            {fmtd(val)}
          </span>
          {row.daysSince !== null && (
            <span
              className={`text-[11px] block font-mono ${
                row.isOverdue
                  ? 'text-rose-600 dark:text-rose-400 font-semibold'
                  : 'text-neutral-400 dark:text-neutral-500'
              }`}
            >
              {row.daysSince === 0
                ? 'Today'
                : row.daysSince === 1
                  ? '1 day ago'
                  : `${row.daysSince} days ago`}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'center',
      render: (_, row) => (
        <Link
          to={`/customers/${row._id}/ledger`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-brand-50 dark:bg-brand-900/40 text-brand-800 dark:text-brand-accent border border-brand-200/60 dark:border-brand-700/50 hover:bg-brand-100 dark:hover:bg-brand-900/70 transition-colors shadow-sm"
        >
          <span>View Ledger</span>
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ── Page Header ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Customer Ledgers
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-brand-50 text-brand-800 dark:bg-brand-900/60 dark:text-brand-accent border border-brand-200/60 dark:border-brand-700/50">
                Accounts Receivable
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Track customer credit accounts, overdue aging, and complete chronological statement history.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm"
              title="Refresh ledger data"
            >
              <svg
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ── Summary StatCards ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Outstanding Across Customers"
            value={`$${fmt(totalOutstandingCalc)}`}
            accentColor="warning"
            icon={
              <svg
                className="w-5 h-5 text-amber-600 dark:text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
            secondaryStats={[
              {
                label: 'Active Debtors',
                value: customersWithOverdueStatus.filter((c) => c.currentBalance > 0).length,
              },
              {
                label: 'Total Accounts',
                value: customers.length,
              },
            ]}
          />

          <StatCard
            label="Accounts Overdue >30 Days"
            value={overdueCount}
            accentColor="danger"
            icon={
              <svg
                className="w-5 h-5 text-rose-600 dark:text-rose-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            secondaryStats={[
              {
                label: 'Status',
                value: overdueCount > 0 ? 'Requires Follow-up' : 'All Current',
              },
              {
                label: 'Aging Threshold',
                value: '> 30 Days',
              },
            ]}
          />

          <StatCard
            label="Total Collected This Month"
            value={`$${fmt(summaryData.totalCollectedThisMonth)}`}
            accentColor="success"
            icon={
              <svg
                className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            secondaryStats={[
              {
                label: 'Period',
                value: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              },
              {
                label: 'Cash Inflow',
                value: 'Recovered Dues',
              },
            ]}
          />
        </div>

        {/* ── Search & Filter Bar ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-4 shadow-card">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left Controls: Search + Branch */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search input */}
              <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customer or phone…"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-md bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent transition-colors"
                />
                <svg
                  className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5"
                    aria-label="Clear search"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Branch Dropdown: Selectable for Admin, Locked for Manager/Cashier */}
              {isAdmin ? (
                <div className="w-48">
                  <CustomSelect
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="text-xs py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-md"
                  >
                    <option value="">All Branches</option>
                    {branches
                      .filter((b) => b.isActive)
                      .map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.name}
                        </option>
                      ))}
                  </CustomSelect>
                </div>
              ) : isManagerOrCashier ? (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-300">
                  <svg
                    className="w-3.5 h-3.5 text-neutral-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span className="truncate max-w-[150px] font-medium" title={userBranchName}>
                    {userBranchName}
                  </span>
                </div>
              ) : null}

              {/* Balance Status Filter Pills */}
              <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-md text-xs">
                <button
                  type="button"
                  onClick={() => setBalanceFilter('all')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    balanceFilter === 'all'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  All ({customers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceFilter('balance')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    balanceFilter === 'balance'
                      ? 'bg-white dark:bg-neutral-900 text-amber-600 dark:text-amber-400 shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  Has Balance
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceFilter('overdue')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    balanceFilter === 'overdue'
                      ? 'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  Overdue &gt;30d
                  {overdueCount > 0 && (
                    <span className="ml-1 px-1 py-0.2 bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded text-[10px] font-bold">
                      {overdueCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceFilter('settled')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    balanceFilter === 'settled'
                      ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  Settled
                </button>
              </div>
            </div>

            {/* Right Controls: Sort Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setHighestFirst((prev) => !prev)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                  highestFirst
                    ? 'bg-brand-900 text-brand-accent border-brand-800 shadow-sm'
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                }`}
                title="Toggle sort order"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                  />
                </svg>
                <span>{highestFirst ? 'Highest Balance First' : 'Alphabetical (A–Z)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Customers DataTable ─────────────────────────────────────── */}
        <DataTable
          columns={columns}
          data={filteredCustomers}
          loading={loading}
          emptyMessage="No customer accounts match criteria"
          emptySubMessage="Try clearing your search query or switching your balance filter."
          onRowClick={(row) => navigate(`/customers/${row._id}/ledger`)}
        />
      </div>
    </DashboardLayout>
  );
}
