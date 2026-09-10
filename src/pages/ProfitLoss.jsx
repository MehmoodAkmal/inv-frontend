import { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

import { StatCard, Badge, DataTable, DashboardLayout } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getProfitLoss } from '../services/reportService';
import { getBranches } from '../services/branchService';
import { getExpenses } from '../services/expenseService';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pct = (numerator, denominator) => {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const EXPENSE_CATEGORY_LABELS = {
  rent:        'Rent',
  utilities:   'Utilities',
  transport:   'Transport',
  maintenance: 'Maintenance',
  supplies:    'Supplies',
  misc:        'Miscellaneous',
};

// Waterfall bar colours: positive flow = green, deductions = red/amber, result = brand
const WATERFALL_COLORS = {
  Revenue:     '#0d3b2e',   // brand-900
  COGS:        '#ef4444',   // danger
  'Gross Profit': '#7fd4a8', // brand-accent mint
  Expenses:    '#f59e0b',   // warning
  Salaries:    '#f97316',   // orange
  'Net Profit': '#16a34a',  // success-600
};

// ── Date helpers ──────────────────────────────────────────────────────────────
const toISO = (d) => d.toISOString().slice(0, 10);

const getThisMonth = () => {
  const now = new Date();
  return {
    startDate: toISO(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate:   toISO(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};
const getLastMonth = () => {
  const now = new Date();
  return {
    startDate: toISO(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    endDate:   toISO(new Date(now.getFullYear(), now.getMonth(), 0)),
  };
};
const getLast3Months = () => {
  const now = new Date();
  return {
    startDate: toISO(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
    endDate:   toISO(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconRevenue = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconCOGS = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
  </svg>
);
const IconGrossProfit = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const IconNetProfit = () => (
  <svg className="w-5 h-5 text-brand-accent" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-card border border-neutral-200 dark:border-neutral-800 p-5 animate-pulse">
      <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded mb-4" />
      <div className="h-8 w-36 bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
      <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
    </div>
  );
}

// ── Waterfall custom tooltip ──────────────────────────────────────────────────
function WaterfallTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const isDeduction = label === 'COGS' || label === 'Expenses' || label === 'Salaries';
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-3 shadow-lg text-xs min-w-[160px]">
      <p className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">{label}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-neutral-500">{isDeduction ? 'Cost' : 'Value'}:</span>
        <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
          {isDeduction ? '–' : ''}${fmt(Math.abs(entry.value))}
        </span>
      </div>
    </div>
  );
}

// ── Secondary stat tile ───────────────────────────────────────────────────────
function StatTile({ label, value, subLabel, colorClass = 'text-neutral-900 dark:text-neutral-100' }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-card border border-neutral-200 dark:border-neutral-800 px-4 py-3.5 flex flex-col gap-1">
      <span className="text-[11px] uppercase font-semibold tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <span className={`font-mono text-lg font-bold tracking-tight ${colorClass}`}>{value}</span>
      {subLabel && (
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{subLabel}</span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProfitLoss() {
  const { user } = useAuth();

  const isAdmin   = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  // ── All hooks first ───────────────────────────────────────────────────────
  const [preset, setPreset]           = useState('thisMonth');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd]     = useState('');

  // Admin-only: branch filter ('' = all branches)
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branches, setBranches]             = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  // P&L data
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Expense breakdown data
  const [expenses, setExpenses] = useState([]);

  const dateRange = useMemo(() => {
    if (preset === 'lastMonth')   return getLastMonth();
    if (preset === 'last3months') return getLast3Months();
    if (preset === 'custom' && customStart && customEnd)
      return { startDate: customStart, endDate: customEnd };
    return getThisMonth();
  }, [preset, customStart, customEnd]);

  // Load branches list for admin selector (once)
  useEffect(() => {
    if (!isAdmin) return;
    setBranchesLoading(true);
    getBranches()
      .then((res) => setBranches(res.data?.data ?? res.data?.branches ?? []))
      .catch(() => setBranches([]))
      .finally(() => setBranchesLoading(false));
  }, [isAdmin]);

  const fetchData = useCallback(async () => {
    if (preset === 'custom' && (!customStart || !customEnd)) return;
    setLoading(true);
    setError(null);

    const params = { ...dateRange };
    if (isAdmin && selectedBranch) params.branchId = selectedBranch;

    try {
      const [plRes, expRes] = await Promise.allSettled([
        getProfitLoss(params),
        getExpenses({ ...params, limit: 500 }),
      ]);

      if (plRes.status === 'fulfilled') {
        setData(plRes.value.data?.data ?? plRes.value.data ?? null);
      } else {
        throw plRes.reason;
      }

      if (expRes.status === 'fulfilled') {
        const raw = expRes.value.data?.data ?? expRes.value.data?.expenses ?? expRes.value.data ?? [];
        setExpenses(Array.isArray(raw) ? raw : []);
      } else {
        setExpenses([]);
      }
    } catch (err) {
      console.error('ProfitLoss fetch error:', err);
      setError(err?.response?.data?.message ?? 'Failed to load profit & loss data.');
    } finally {
      setLoading(false);
    }
  }, [dateRange, preset, customStart, customEnd, isAdmin, selectedBranch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Expense breakdown grouped by category
  const expenseBreakdown = useMemo(() => {
    const map = {};
    expenses.forEach((e) => {
      const cat = e.category ?? 'misc';
      map[cat] = (map[cat] ?? 0) + (e.amount ?? 0);
    });
    const totalExp = data?.totalExpenses ?? 0;
    const totalRev = data?.totalRevenue  ?? 0;
    return Object.entries(map)
      .map(([cat, amount]) => ({
        category:    EXPENSE_CATEGORY_LABELS[cat] ?? cat,
        amount:      Math.round(amount * 100) / 100,
        pctRevenue:  pct(amount, totalRev),
        pctExpenses: pct(amount, totalExp),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, data]);

  // Waterfall chart data
  const waterfallData = useMemo(() => {
    if (!data) return [];
    const { totalRevenue, totalCOGS, grossProfit, totalExpenses, totalSalaries, netProfit } = data;
    return [
      { name: 'Revenue',      value: totalRevenue  },
      { name: 'COGS',         value: -totalCOGS    },
      { name: 'Gross Profit', value: grossProfit   },
      { name: 'Expenses',     value: -totalExpenses },
      { name: 'Salaries',     value: -totalSalaries },
      { name: 'Net Profit',   value: netProfit     },
    ];
  }, [data]);

  // ── Role guard (after hooks) ──────────────────────────────────────────────
  if (user && !isAdmin && !isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── Preset button helper ──────────────────────────────────────────────────
  const presetBtn = (key) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      preset === key
        ? 'bg-brand-accent text-brand-900 font-semibold'
        : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700'
    }`;

  const d = data ?? {};

  // ── Expense breakdown table columns ───────────────────────────────────────
  const expCols = [
    {
      key:   'category',
      label: 'Category',
      render: (val) => (
        <span className="font-medium text-neutral-800 dark:text-neutral-200 capitalize">{val}</span>
      ),
    },
    {
      key:   'amount',
      label: 'Amount',
      align: 'right',
      sortable: true,
      render: (val) => <span className="font-mono text-sm">${fmt(val)}</span>,
    },
    {
      key:   'pctRevenue',
      label: '% of Revenue',
      align: 'right',
      render: (val) => (
        <div className="flex items-center justify-end gap-2">
          <div className="w-20 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-danger-400 rounded-full"
              style={{ width: `${Math.min(val, 100)}%` }}
            />
          </div>
          <span className="font-mono text-xs w-10 text-right">{val.toFixed(1)}%</span>
        </div>
      ),
    },
    {
      key:   'pctExpenses',
      label: '% of OPEX',
      align: 'right',
      render: (val) => (
        <div className="flex items-center justify-end gap-2">
          <div className="w-20 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-warning-400 rounded-full"
              style={{ width: `${Math.min(val, 100)}%` }}
            />
          </div>
          <span className="font-mono text-xs w-10 text-right">{val.toFixed(1)}%</span>
        </div>
      ),
    },
  ];

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-danger-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-danger-600 dark:text-danger-400">{error}</p>
          <button onClick={fetchData} className="mt-1 text-sm text-brand-accent hover:underline font-medium">
            Try again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              Profit &amp; Loss
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {isManager
                ? `Branch report · ${user?.branchName ?? 'Your branch'}`
                : 'Full income statement for the selected period'}
            </p>
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date preset pills */}
            <div className="flex items-center gap-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-1">
              <button className={presetBtn('thisMonth')}   onClick={() => setPreset('thisMonth')}>This Month</button>
              <button className={presetBtn('lastMonth')}   onClick={() => setPreset('lastMonth')}>Last Month</button>
              <button className={presetBtn('last3months')} onClick={() => setPreset('last3months')}>3 Months</button>
              <button className={presetBtn('custom')}      onClick={() => setPreset('custom')}>Custom</button>
            </div>

            {/* Admin branch selector */}
            {isAdmin && (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                disabled={branchesLoading}
                className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 disabled:opacity-50"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            )}

            {/* Manager: static branch label */}
            {isManager && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-brand-200 bg-brand-50 dark:bg-brand-900/30 dark:border-brand-800">
                <svg className="w-3.5 h-3.5 text-brand-accent shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs font-semibold text-brand-700 dark:text-brand-accent">
                  {user?.branchName ?? 'Your Branch'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Custom date range inputs */}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 self-start">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            />
            <span className="text-neutral-400 text-sm">–</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            />
          </div>
        )}
      </div>

      {/* ── Hero StatCards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            {/* Total Revenue */}
            <StatCard
              label="Total Revenue"
              value={`$${fmt(d.totalRevenue)}`}
              icon={<IconRevenue />}
              accentColor="brand"
              secondaryStats={[
                { label: 'Cash',   value: `$${fmt(d.totalCashSales)}` },
                { label: 'Credit', value: `$${fmt(d.totalCreditSales)}` },
              ]}
            />

            {/* Total COGS */}
            <StatCard
              label="Cost of Goods Sold"
              value={`$${fmt(d.totalCOGS)}`}
              icon={<IconCOGS />}
              accentColor="danger"
              secondaryStats={[
                { label: 'Gross Margin', value: `${pct(d.grossProfit, d.totalRevenue).toFixed(1)}%` },
                { label: 'COGS %',       value: `${pct(d.totalCOGS, d.totalRevenue).toFixed(1)}%` },
              ]}
            />

            {/* Gross Profit */}
            <StatCard
              label="Gross Profit"
              value={`$${fmt(d.grossProfit)}`}
              icon={<IconGrossProfit />}
              accentColor={d.grossProfit >= 0 ? 'success' : 'danger'}
              secondaryStats={[
                { label: 'Gross Margin', value: `${pct(d.grossProfit, d.totalRevenue).toFixed(1)}%` },
                { label: 'Orders',       value: (d.saleCount ?? 0).toLocaleString('en-US') },
              ]}
            />

            {/* Net Profit — dark brand card */}
            <div className={`relative overflow-hidden rounded-card border p-5 ${
              d.netProfit >= 0
                ? 'bg-brand-900 border-brand-800'
                : 'bg-danger-950 border-danger-900'
            }`}>
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/5 blur-2xl pointer-events-none" />
              <div className="absolute top-3 right-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  d.netProfit >= 0 ? 'bg-brand-accent/20' : 'bg-danger-500/20'
                }`}>
                  <IconNetProfit />
                </div>
              </div>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${
                d.netProfit >= 0 ? 'text-brand-accent/70' : 'text-danger-400/70'
              }`}>
                Net Profit
              </p>
              <p className={`font-bold text-2xl font-mono truncate mt-1 ${
                d.netProfit >= 0 ? 'text-white' : 'text-danger-300'
              }`}>
                ${fmt(d.netProfit)}
              </p>
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className={`text-xs ${d.netProfit >= 0 ? 'text-white/60' : 'text-danger-400/70'}`}>
                  Net Margin
                </span>
                <span className={`font-mono text-sm font-semibold ${
                  d.netProfit >= 0 ? 'text-brand-accent' : 'text-danger-400'
                }`}>
                  {pct(d.netProfit, d.totalRevenue).toFixed(1)}%
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Secondary stat tiles ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-neutral-900 rounded-card border border-neutral-200 dark:border-neutral-800 p-4 animate-pulse">
              <div className="h-2.5 w-16 bg-neutral-200 dark:bg-neutral-700 rounded mb-3" />
              <div className="h-6 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
            </div>
          ))
        ) : (
          <>
            <StatTile
              label="Total Expenses"
              value={`$${fmt(d.totalExpenses)}`}
              subLabel={`${pct(d.totalExpenses, d.totalRevenue).toFixed(1)}% of revenue`}
              colorClass="text-warning-600 dark:text-warning-400"
            />
            <StatTile
              label="Total Salaries"
              value={`$${fmt(d.totalSalaries)}`}
              subLabel={`${pct(d.totalSalaries, d.totalRevenue).toFixed(1)}% of revenue`}
              colorClass="text-orange-600 dark:text-orange-400"
            />
            <StatTile
              label="Cash Sales"
              value={`$${fmt(d.totalCashSales)}`}
              subLabel={`${pct(d.totalCashSales, d.totalRevenue).toFixed(1)}% of revenue`}
              colorClass="text-success-600 dark:text-success-400"
            />
            <StatTile
              label="Credit Sales"
              value={`$${fmt(d.totalCreditSales)}`}
              subLabel={`${pct(d.totalCreditSales, d.totalRevenue).toFixed(1)}% of revenue`}
              colorClass="text-warning-600 dark:text-warning-400"
            />
            <StatTile
              label="Outstanding Credit"
              value={`$${fmt(d.totalOutstandingCredit)}`}
              subLabel="Snapshot (all-time)"
              colorClass={d.totalOutstandingCredit > 0 ? 'text-danger-600 dark:text-danger-400' : 'text-neutral-700 dark:text-neutral-300'}
            />
          </>
        )}
      </div>

      {/* ── Waterfall Chart + Expense Breakdown ──────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-6">
        {/* Waterfall / Cascade chart — 3/5 */}
        <div className="xl:col-span-3 bg-white dark:bg-neutral-900 rounded-card border border-neutral-200 dark:border-neutral-800 p-5">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-0.5">
            P&amp;L Cascade
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
            Revenue → COGS → Gross Profit → Expenses → Salaries → Net Profit
          </p>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-accent border-t-transparent" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={waterfallData}
                margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
                barCategoryGap="28%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => {
                    const abs = Math.abs(v);
                    return `${v < 0 ? '–' : ''}$${abs >= 1000 ? `${(abs / 1000).toFixed(0)}k` : abs}`;
                  }}
                  width={56}
                />
                <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1.5} />
                <Tooltip content={<WaterfallTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={52}>
                  {waterfallData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={WATERFALL_COLORS[entry.name] ?? '#6b7280'}
                      fillOpacity={entry.value < 0 ? 0.85 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Legend */}
          {!loading && (
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              {waterfallData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: WATERFALL_COLORS[entry.name] ?? '#6b7280' }}
                  />
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{entry.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* P&L Summary Panel — 2/5 */}
        <div className="xl:col-span-2 bg-white dark:bg-neutral-900 rounded-card border border-neutral-200 dark:border-neutral-800 p-5 flex flex-col">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-0.5">
            Income Statement Summary
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
            {d.startDate
              ? new Date(d.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : '—'}
            {' – '}
            {d.endDate
              ? new Date(d.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : '—'}
          </p>

          {loading ? (
            <div className="space-y-3 flex-1 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-3 w-28 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 space-y-0 text-sm">
              {/* Revenue */}
              <SummaryRow label="Total Revenue"  value={`$${fmt(d.totalRevenue)}`}  bold />
              <SummaryRow label="– Cost of Goods" value={`($${fmt(d.totalCOGS)})`}   indent colorClass="text-danger-600 dark:text-danger-400" />
              <SummaryRow label="Gross Profit"   value={`$${fmt(d.grossProfit)}`}    bold borderTop colorClass={d.grossProfit >= 0 ? 'text-success-700 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'} />

              <div className="pt-2 mt-2" />

              <SummaryRow label="– Expenses"      value={`($${fmt(d.totalExpenses)})`} indent colorClass="text-warning-600 dark:text-warning-400" />
              <SummaryRow label="– Salaries"      value={`($${fmt(d.totalSalaries)})`} indent colorClass="text-orange-600 dark:text-orange-400" />

              <SummaryRow
                label="Net Profit"
                value={`$${fmt(d.netProfit)}`}
                bold
                borderTop
                colorClass={d.netProfit >= 0 ? 'text-success-700 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}
              />

              <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span>Gross Margin</span>
                  <span className="font-mono">{pct(d.grossProfit, d.totalRevenue).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span>Net Margin</span>
                  <span className={`font-mono font-semibold ${d.netProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                    {pct(d.netProfit, d.totalRevenue).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span>Total Orders</span>
                  <span className="font-mono">{(d.saleCount ?? 0).toLocaleString('en-US')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Expense Breakdown Table ──────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-card border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Expense Breakdown by Category
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Operational expenses grouped by type · excludes salaries
            </p>
          </div>
          {!loading && expenseBreakdown.length > 0 && (
            <Badge
              variant="warning"
              label={`${expenseBreakdown.length} ${expenseBreakdown.length === 1 ? 'category' : 'categories'}`}
            />
          )}
        </div>
        <DataTable
          columns={expCols}
          data={expenseBreakdown}
          loading={loading}
          emptyMessage="No expenses recorded"
          emptySubMessage="No expense entries found for the selected period."
        />
      </div>

      {/* Period footnote */}
      {d.startDate && (
        <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-600 text-right font-mono">
          {isManager ? 'Branch-scoped report · ' : ''}
          Period:{' '}
          {new Date(d.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          {' – '}
          {new Date(d.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}
    </DashboardLayout>
  );
}

// ── Summary row sub-component ─────────────────────────────────────────────────
function SummaryRow({ label, value, indent, bold, borderTop, colorClass = 'text-neutral-800 dark:text-neutral-200' }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${borderTop ? 'border-t border-neutral-200 dark:border-neutral-700 mt-1 pt-2' : ''}`}>
      <span className={`text-sm ${indent ? 'pl-4 text-neutral-500 dark:text-neutral-400' : 'text-neutral-700 dark:text-neutral-300'} ${bold ? 'font-semibold' : ''}`}>
        {label}
      </span>
      <span className={`font-mono text-sm ${bold ? 'font-bold' : ''} ${colorClass}`}>{value}</span>
    </div>
  );
}
