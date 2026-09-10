import { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { StatCard, Badge, DataTable, DashboardLayout } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getBranchComparison } from '../services/reportService';

// ── Formatters ───────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtInt = (n) => Number(n ?? 0).toLocaleString('en-US');

const pct = (numerator, denominator) => {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
};

// ── Chart colors ─────────────────────────────────────────────────────────────
const CHART_COLORS = {
  Revenue: '#0d3b2e',
  COGS:    '#7fd4a8',
  OPEX:    '#f59e0b',
  Profit:  '#16a34a',
};

// ── Date helpers ─────────────────────────────────────────────────────────────
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

// ── Sub-components ────────────────────────────────────────────────────────────
function GroupedBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-3 shadow-lg text-xs min-w-[180px]">
      <p className="font-semibold text-neutral-800 dark:text-neutral-200 mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.fill }} />
              {entry.name}:
            </span>
            <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
              ${fmt(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-card border border-neutral-200 dark:border-neutral-800 p-5 animate-pulse">
      <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded mb-4" />
      <div className="h-8 w-32 bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
      <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
    </div>
  );
}

function MarginBar({ label, value, color, max = 100 }) {
  const widthPct = max > 0 ? Math.min((Math.max(value, 0) / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-neutral-500 dark:text-neutral-400 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${widthPct}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-mono text-xs font-semibold text-neutral-700 dark:text-neutral-300 w-12 text-right">
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

// Icons
const IconRevenue = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-4-4h8M9 6h6M6 18h12" />
  </svg>
);
const IconOPEX = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a4 4 0 00-8 0v2M5 9h14l1 12H4L5 9z" />
  </svg>
);
const IconProfit = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);
const IconBranch = () => (
  <svg className="w-5 h-5 text-brand-accent" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
  </svg>
);

// ── Main component ────────────────────────────────────────────────────────────
export default function BranchComparison() {
  const { user } = useAuth();

  // ── All hooks BEFORE any conditional return ───────────────────────────────
  const [preset, setPreset]           = useState('thisMonth');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd]     = useState('');
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  const dateRange = useMemo(() => {
    if (preset === 'lastMonth') return getLastMonth();
    if (preset === 'custom' && customStart && customEnd)
      return { startDate: customStart, endDate: customEnd };
    return getThisMonth();
  }, [preset, customStart, customEnd]);

  const fetchData = useCallback(async () => {
    if (preset === 'custom' && (!customStart || !customEnd)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getBranchComparison(dateRange);
      setData(res.data?.data ?? res.data ?? null);
    } catch (err) {
      console.error('BranchComparison fetch error:', err);
      setError(err?.response?.data?.message ?? 'Failed to load branch comparison data.');
    } finally {
      setLoading(false);
    }
  }, [dateRange, preset, customStart, customEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Stable derived values — depend on `data` (stable reference), not inline arrays
  const branches = useMemo(() => data?.branches ?? [], [data]);

  const totals = useMemo(
    () =>
      branches.reduce(
        (acc, b) => ({
          totalRevenue:     acc.totalRevenue     + (b.totalRevenue     ?? 0),
          totalCOGS:        acc.totalCOGS        + (b.totalCOGS        ?? 0),
          grossProfit:      acc.grossProfit      + (b.grossProfit      ?? 0),
          totalExpenses:    acc.totalExpenses    + (b.totalExpenses    ?? 0),
          totalSalaries:    acc.totalSalaries    + (b.totalSalaries    ?? 0),
          netProfit:        acc.netProfit        + (b.netProfit        ?? 0),
          totalCashSales:   acc.totalCashSales   + (b.totalCashSales   ?? 0),
          totalCreditSales: acc.totalCreditSales + (b.totalCreditSales ?? 0),
          saleCount:        acc.saleCount        + (b.saleCount        ?? 0),
        }),
        { totalRevenue: 0, totalCOGS: 0, grossProfit: 0, totalExpenses: 0,
          totalSalaries: 0, netProfit: 0, totalCashSales: 0, totalCreditSales: 0, saleCount: 0 }
      ),
    [branches]
  );

  const chartData = useMemo(
    () =>
      branches.map((b) => ({
        name:    b.branchName,
        Revenue: b.totalRevenue,
        COGS:    b.totalCOGS,
        OPEX:    b.totalExpenses + b.totalSalaries,
        Profit:  b.netProfit,
      })),
    [branches]
  );

  const tableData = useMemo(() => {
    if (!branches.length) return [];
    return [
      ...branches,
      {
        _id:              '__totals__',
        branchName:       'TOTAL',
        totalRevenue:     totals.totalRevenue,
        totalCashSales:   totals.totalCashSales,
        totalCreditSales: totals.totalCreditSales,
        totalCOGS:        totals.totalCOGS,
        totalExpenses:    totals.totalExpenses,
        totalSalaries:    totals.totalSalaries,
        netProfit:        totals.netProfit,
        saleCount:        totals.saleCount,
        _isTotalsRow:     true,
      },
    ];
  }, [branches, totals]);

  // ── Admin guard (after all hooks) ─────────────────────────────────────────
  if (user && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // ── Derived display values ────────────────────────────────────────────────
  const consolidatedOPEX  = totals.totalExpenses + totals.totalSalaries;
  const topBranch         = branches[0] ?? null;
  const topBranchContrib  = topBranch && totals.netProfit !== 0
    ? pct(topBranch.netProfit, totals.netProfit)
    : 0;

  // ── Table columns ─────────────────────────────────────────────────────────
  const tableColumns = [
    {
      key:   'branchName',
      label: 'Branch',
      render: (val, row) => (
        <span className={`font-semibold ${row._isTotalsRow
          ? 'text-brand-900 dark:text-brand-accent text-xs uppercase tracking-widest'
          : 'text-neutral-900 dark:text-neutral-100'}`}>
          {val}
        </span>
      ),
    },
    {
      key:   'totalRevenue',
      label: 'Revenue',
      align: 'right',
      sortable: true,
      render: (val) => <span className="font-mono text-sm">${fmt(val)}</span>,
    },
    {
      key:   'totalCashSales',
      label: 'Cash',
      align: 'right',
      render: (val) => <span className="font-mono text-sm">${fmt(val)}</span>,
    },
    {
      key:   'totalCreditSales',
      label: 'Credit',
      align: 'right',
      render: (val) => (
        <span className="font-mono text-sm text-warning-600 dark:text-warning-400">${fmt(val)}</span>
      ),
    },
    {
      key:   'totalCOGS',
      label: 'COGS',
      align: 'right',
      render: (val) => <span className="font-mono text-sm">${fmt(val)}</span>,
    },
    {
      key:   'totalExpenses',
      label: 'Expenses',
      align: 'right',
      render: (val) => <span className="font-mono text-sm">${fmt(val)}</span>,
    },
    {
      key:   'totalSalaries',
      label: 'Payroll',
      align: 'right',
      render: (val) => <span className="font-mono text-sm">${fmt(val)}</span>,
    },
    {
      key:      'netProfit',
      label:    'Net Profit',
      align:    'right',
      sortable: true,
      render: (val, row) => {
        const margin = pct(val, row.totalRevenue);
        const isPos  = val >= 0;
        return (
          <div className="text-right">
            <div className={`font-mono text-sm font-semibold ${isPos
              ? 'text-success-600 dark:text-success-400'
              : 'text-danger-600 dark:text-danger-400'}`}>
              ${fmt(val)}
            </div>
            {!row._isTotalsRow && (
              <div className={`text-xs font-mono ${isPos ? 'text-success-500' : 'text-danger-500'}`}>
                {isPos ? '+' : ''}{margin.toFixed(1)}%
              </div>
            )}
          </div>
        );
      },
    },
    {
      key:   'saleCount',
      label: 'Orders',
      align: 'right',
      render: (val) => <span className="font-mono text-sm">{fmtInt(val)}</span>,
    },
  ];

  // ── Preset button helper ──────────────────────────────────────────────────
  const presetBtn = (key) =>
    `px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
      preset === key
        ? 'bg-brand-accent text-brand-900 font-semibold'
        : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700'
    }`;

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
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Branch Comparison
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Side-by-side performance analysis across all branches
          </p>
        </div>

        {/* Date range controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-1">
            <button className={presetBtn('thisMonth')} onClick={() => setPreset('thisMonth')}>
              This Month
            </button>
            <button className={presetBtn('lastMonth')} onClick={() => setPreset('lastMonth')}>
              Last Month
            </button>
            <button className={presetBtn('custom')} onClick={() => setPreset('custom')}>
              Custom
            </button>
          </div>
          {preset === 'custom' && (
            <div className="flex items-center gap-1.5">
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
      </div>

      {/* Hero StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              label="Consolidated Revenue"
              value={`$${fmt(totals.totalRevenue)}`}
              icon={<IconRevenue />}
              accentColor="brand"
              secondaryStats={[
                { label: 'Cash',   value: `$${fmt(totals.totalCashSales)}` },
                { label: 'Credit', value: `$${fmt(totals.totalCreditSales)}` },
              ]}
            />
            <StatCard
              label="Consolidated OPEX"
              value={`$${fmt(consolidatedOPEX)}`}
              icon={<IconOPEX />}
              accentColor="warning"
              secondaryStats={[
                { label: 'Expenses', value: `$${fmt(totals.totalExpenses)}` },
                { label: 'Salaries', value: `$${fmt(totals.totalSalaries)}` },
              ]}
            />
            <StatCard
              label="Net Retained Profit"
              value={`$${fmt(totals.netProfit)}`}
              icon={<IconProfit />}
              accentColor={totals.netProfit >= 0 ? 'success' : 'danger'}
              secondaryStats={[
                { label: 'Net Margin',   value: `${pct(totals.netProfit, totals.totalRevenue).toFixed(1)}%` },
                { label: 'Gross Margin', value: `${pct(totals.grossProfit, totals.totalRevenue).toFixed(1)}%` },
              ]}
            />
            {/* Top Performing Branch — dark brand card */}
            <div className="relative overflow-hidden rounded-card border border-brand-800 bg-brand-900 p-5">
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-brand-accent/10 blur-2xl pointer-events-none" />
              <div className="absolute top-3 right-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-brand-accent/20">
                  <IconBranch />
                </div>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-accent/70 mb-1">
                Top Performing Branch
              </p>
              <p className="font-bold text-xl text-white font-mono truncate mt-1">
                {topBranch?.branchName ?? '—'}
              </p>
              {topBranch ? (
                <>
                  <p className="font-mono text-sm text-brand-accent mt-0.5">
                    ${fmt(topBranch.netProfit)} net profit
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-white/60">
                      {topBranchContrib.toFixed(1)}% of total org profit
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-white/40 mt-2">No data for this period</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Grouped Bar Chart + Margin Profile */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-6">
        {/* Chart */}
        <div className="xl:col-span-3 bg-white dark:bg-neutral-900 rounded-card border border-neutral-200 dark:border-neutral-800 p-5">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-0.5">
            Revenue vs. COGS vs. OPEX vs. Profit
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
            Grouped comparison across all branches
          </p>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-accent border-t-transparent" />
            </div>
          ) : branches.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-neutral-400">
              No data for selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%" barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  width={52}
                />
                <Tooltip content={<GroupedBarTooltip />} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="Revenue" fill={CHART_COLORS.Revenue} radius={[3, 3, 0, 0]} maxBarSize={24} />
                <Bar dataKey="COGS"    fill={CHART_COLORS.COGS}    radius={[3, 3, 0, 0]} maxBarSize={24} />
                <Bar dataKey="OPEX"    fill={CHART_COLORS.OPEX}    radius={[3, 3, 0, 0]} maxBarSize={24} />
                <Bar dataKey="Profit"  fill={CHART_COLORS.Profit}  radius={[3, 3, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Margin Profile */}
        <div className="xl:col-span-2 bg-white dark:bg-neutral-900 rounded-card border border-neutral-200 dark:border-neutral-800 p-5">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-0.5">
            Operating Margin Profile
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
            Gross margin % vs. net margin % per branch
          </p>
          {loading ? (
            <div className="space-y-6 mt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2 animate-pulse">
                  <div className="h-3 w-28 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  <div className="h-2.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full" />
                  <div className="h-2.5 w-2/3 bg-neutral-100 dark:bg-neutral-800 rounded-full" />
                </div>
              ))}
            </div>
          ) : branches.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-neutral-400">
              No data for selected period
            </div>
          ) : (
            <div className="space-y-5 overflow-y-auto max-h-[280px] pr-1">
              {(() => {
                const maxGross = Math.max(...branches.map((x) => pct(x.grossProfit, x.totalRevenue)), 1);
                return branches.map((b) => {
                  const grossMargin = pct(b.grossProfit, b.totalRevenue);
                  const netMargin   = pct(b.netProfit,   b.totalRevenue);
                  return (
                    <div key={b.branchId?.toString() ?? b.branchName} className="space-y-1.5">
                      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 truncate">
                        {b.branchName}
                      </p>
                      <MarginBar label="Gross Margin" value={grossMargin} color="#7fd4a8"  max={maxGross} />
                      <MarginBar label="Net Margin"   value={Math.max(netMargin, 0)} color={netMargin >= 0 ? '#16a34a' : '#ef4444'} max={maxGross} />
                      {netMargin < 0 && (
                        <p className="text-xs text-danger-500 font-mono ml-[7.5rem]">
                          {netMargin.toFixed(1)}% (loss)
                        </p>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Detailed DataTable */}
      <div className="bg-white dark:bg-neutral-900 rounded-card border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Branch-Level Detail
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {branches.length} {branches.length === 1 ? 'branch' : 'branches'} · includes totals row
            </p>
          </div>
          {!loading && branches.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="success" dot label={`${branches.filter((b) => b.netProfit >= 0).length} profitable`} />
              {branches.filter((b) => b.netProfit < 0).length > 0 && (
                <Badge variant="danger" dot label={`${branches.filter((b) => b.netProfit < 0).length} at loss`} />
              )}
            </div>
          )}
        </div>
        <DataTable
          columns={tableColumns}
          data={tableData}
          loading={loading}
          emptyMessage="No branch data"
          emptySubMessage="No activity recorded for the selected period."
          tableClassName="[&_tr:last-child]:bg-neutral-50 [&_tr:last-child]:dark:bg-neutral-800/60 [&_tr:last-child]:font-semibold [&_tr:last-child]:border-t-2 [&_tr:last-child]:border-neutral-200 [&_tr:last-child]:dark:border-neutral-700"
        />
      </div>

      {/* Period footer */}
      {data && (
        <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-600 text-right font-mono">
          {'Period: '}
          {data.startDate
            ? new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—'}
          {' – '}
          {data.endDate
            ? new Date(data.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—'}
        </p>
      )}
    </DashboardLayout>
  );
}
