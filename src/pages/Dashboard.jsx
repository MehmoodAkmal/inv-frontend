import { useState, useEffect, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import {
  StatCard,
  Badge,
  DataTable,
  DashboardLayout,
} from '../components/ui';

import { getDashboardSummary } from '../services/reportService';
import { getSales } from '../services/saleService';
import { getBranches } from '../services/branchService';
import { getItems } from '../services/itemService';
import { getExpenses } from '../services/expenseService';
import { getSalaryPayments } from '../services/salaryService';

// Currency and numeric formatters
const fmt = (n) =>
  Number(n ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtInt = (n) => Number(n ?? 0).toLocaleString('en-US');

// Custom chart tooltip
function ChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const cash = payload.find((p) => p.dataKey === 'cash')?.value || 0;
    const credit = payload.find((p) => p.dataKey === 'credit')?.value || 0;
    const total = cash + credit;

    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-3 shadow-lg text-xs">
        <p className="font-semibold text-neutral-800 dark:text-neutral-200 mb-2">{label}</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0d3b2e] dark:bg-[#1c5d47]" />
              Cash Sales:
            </span>
            <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
              ${fmt(cash)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#7fd4a8]" />
              Credit Sales:
            </span>
            <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
              ${fmt(credit)}
            </span>
          </div>
          <div className="pt-2 mt-1 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-6">
            <span className="font-medium text-neutral-500 dark:text-neutral-400">Total:</span>
            <span className="font-mono font-bold text-neutral-900 dark:text-neutral-50">
              ${fmt(total)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === 'cashier') {
    return <Navigate to="/pos" replace />;
  }

  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [branches, setBranches] = useState([]);
  const [itemsCount, setItemsCount] = useState(0);
  const [expensesMtd, setExpensesMtd] = useState(0);
  const [payrollStatus, setPayrollStatus] = useState('Up to date');
  const [chartData, setChartData] = useState([]);

  // Fetch consolidated dashboard data on mount
  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoading(true);
      try {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .slice(0, 10);
        const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

        const fourteenDaysAgo = new Date(today);
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
        const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().slice(0, 10);

        // Run API requests in parallel with existing auth pattern
        const [
          summaryRes,
          salesRes,
          branchesRes,
          itemsRes,
          fourteenDaySalesRes,
          expensesRes,
          salaryRes,
        ] = await Promise.allSettled([
          getDashboardSummary(),
          getSales({ limit: 5 }),
          getBranches(),
          getItems(),
          getSales({ startDate: fourteenDaysAgoStr, limit: 200 }),
          getExpenses({ startDate: firstDayOfMonth, limit: 100 }),
          getSalaryPayments({ month: currentMonthStr, limit: 20 }),
        ]);

        if (!isMounted) return;

        // 1. Dashboard summary
        if (summaryRes.status === 'fulfilled' && summaryRes.value?.data?.success) {
          setSummaryData(summaryRes.value.data.data);
        }

        // 2. Recent Sales
        if (salesRes.status === 'fulfilled' && salesRes.value?.data?.success) {
          setRecentSales(salesRes.value.data.data || []);
        }

        // 3. Branches
        if (branchesRes.status === 'fulfilled' && branchesRes.value?.data?.success) {
          setBranches(branchesRes.value.data.data || []);
        }

        // 4. Items count
        if (itemsRes.status === 'fulfilled' && itemsRes.value?.data?.success) {
          setItemsCount(itemsRes.value.data.data?.length || 0);
        }

        // 5. Total Expenses (MTD)
        if (expensesRes.status === 'fulfilled' && expensesRes.value?.data?.success) {
          const expList = expensesRes.value.data.data || [];
          const totalExp = expList.reduce((sum, item) => sum + (item.amount || 0), 0);
          setExpensesMtd(totalExp);
        }

        // 6. Payroll status
        if (salaryRes.status === 'fulfilled' && salaryRes.value?.data?.success) {
          const salaries = salaryRes.value.data.data || [];
          const hasPending = salaries.some((s) => s.status === 'pending');
          setPayrollStatus(hasPending ? 'Pending Review' : 'Disbursed');
        }

        // 7. Process 14-day chart data
        const dateMap = {};
        for (let i = 0; i < 14; i++) {
          const d = new Date(fourteenDaysAgo);
          d.setDate(d.getDate() + i);
          const dateKey = d.toISOString().slice(0, 10);
          const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          dateMap[dateKey] = {
            date: dateKey,
            day: dayLabel,
            cash: 0,
            credit: 0,
            total: 0,
          };
        }

        if (fourteenDaySalesRes.status === 'fulfilled' && fourteenDaySalesRes.value?.data?.success) {
          const salesList = fourteenDaySalesRes.value.data.data || [];
          salesList.forEach((sale) => {
            const saleDate = sale.createdAt?.slice(0, 10);
            if (dateMap[saleDate]) {
              const amt = Number(sale.totalAmount || 0);
              if (sale.paymentType === 'cash') {
                dateMap[saleDate].cash += amt;
              } else {
                dateMap[saleDate].credit += amt;
              }
              dateMap[saleDate].total += amt;
            }
          });
        }

        // Fallback to trend7Days if 14-day sales had no entries but trend7Days has entries
        const generatedDays = Object.values(dateMap);
        const hasSalesIn14Days = generatedDays.some((d) => d.total > 0);
        if (
          !hasSalesIn14Days &&
          summaryRes.status === 'fulfilled' &&
          Array.isArray(summaryRes.value?.data?.data?.trend7Days)
        ) {
          const trend7 = summaryRes.value.data.data.trend7Days;
          trend7.forEach((item) => {
            if (dateMap[item.date]) {
              dateMap[item.date].cash = item.cash || 0;
              dateMap[item.date].credit = item.credit || 0;
              dateMap[item.date].total = item.total || 0;
            }
          });
        }

        setChartData(Object.values(dateMap));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute branch lookup map
  const branchMap = useMemo(() => {
    const map = {};
    branches.forEach((b) => {
      map[b._id] = b.name;
    });
    return map;
  }, [branches]);

  // Derived metrics from summaryData
  const todaySales = summaryData?.today || {
    totalAmount: 0,
    cashSales: 0,
    creditSales: 0,
    saleCount: 0,
  };
  const yesterdaySales = summaryData?.yesterday || { totalAmount: 0 };
  const monthSales = summaryData?.thisMonth || { totalAmount: 0, saleCount: 0 };
  const outstandingCredit = summaryData?.outstandingCreditTotal ?? 0;
  const lowStockCount = summaryData?.lowStockItemCount ?? 0;

  // Trend calculation
  const todayTrend = useMemo(() => {
    if (!yesterdaySales.totalAmount || yesterdaySales.totalAmount <= 0) return null;
    const pct = ((todaySales.totalAmount - yesterdaySales.totalAmount) / yesterdaySales.totalAmount) * 100;
    return {
      value: `${Math.abs(pct).toFixed(1)}%`,
      direction: pct >= 0 ? 'up' : 'down',
    };
  }, [todaySales.totalAmount, yesterdaySales.totalAmount]);

  // Daily run-rate
  const dailyRunRate = useMemo(() => {
    const dayOfMonth = new Date().getDate();
    return dayOfMonth > 0 ? monthSales.totalAmount / dayOfMonth : 0;
  }, [monthSales.totalAmount]);

  // Table column configuration
  const columns = useMemo(
    () => [
      {
        key: 'invoiceNumber',
        label: 'Invoice #',
        render: (_, row) => (
          <span className="font-mono text-xs font-semibold text-brand-900 dark:text-brand-accent">
            {row.invoiceNumber || `INV-${(row._id || '').slice(-6).toUpperCase()}`}
          </span>
        ),
      },
      {
        key: 'createdAt',
        label: 'Timestamp',
        render: (val) => {
          if (!val) return '—';
          const d = new Date(val);
          return (
            <div className="text-xs">
              <span className="text-neutral-800 dark:text-neutral-200 block">
                {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="text-[11px] text-neutral-400 font-mono block">
                {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        },
      },
      {
        key: 'branchId',
        label: 'Branch',
        render: (val, row) => (
          <span className="text-xs text-neutral-700 dark:text-neutral-300">
            {branchMap[val] || row.branchName || 'Main Branch'}
          </span>
        ),
      },
      {
        key: 'customerId',
        label: 'Customer',
        render: (val) => (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-50 dark:bg-brand-900/60 text-brand-800 dark:text-brand-accent flex items-center justify-center text-[10px] font-mono font-bold">
              {(val?.name?.[0] || 'W').toUpperCase()}
            </div>
            <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[140px]">
              {val?.name || 'Walk-in Customer'}
            </span>
          </div>
        ),
      },
      {
        key: 'itemsCount',
        label: 'Items',
        type: 'number',
        align: 'right',
        render: (_, row) => (
          <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300">
            {row.items?.length || 1}
          </span>
        ),
      },
      {
        key: 'paymentType',
        label: 'Payment Mode',
        align: 'center',
        render: (val) => (
          <Badge
            variant={val === 'cash' ? 'success' : 'warning'}
            label={val === 'cash' ? 'CASH' : 'CREDIT'}
            dot
          />
        ),
      },
      {
        key: 'totalAmount',
        label: 'Total',
        type: 'currency',
        align: 'right',
        render: (val) => (
          <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white">
            ${fmt(val)}
          </span>
        ),
      },
    ],
    [branchMap]
  );

  // Formatted current date for page header
  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ── Page Header ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Executive Business Overview
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-brand-50 text-brand-800 dark:bg-brand-900/60 dark:text-brand-accent border border-brand-200/60 dark:border-brand-700/50">
                Live
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Consolidated real-time operational performance, revenue breakdowns, and inventory posture.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Date Display */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-300 shadow-sm">
              <svg className="w-3.5 h-3.5 text-brand-700 dark:text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">{currentDateFormatted}</span>
            </div>

            {/* Export Placeholder Button */}
            <button
              type="button"
              onClick={() => alert('Exporting dashboard summary report (CSV/PDF)...')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm"
              title="Export report snapshot"
            >
              <svg className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* ── 4 Hero StatCards in a Grid ─────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-5 animate-pulse">
                <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-800 rounded mb-4" />
                <div className="h-8 w-36 bg-neutral-200 dark:bg-neutral-800 rounded mb-3" />
                <div className="h-3 w-20 bg-neutral-100 dark:bg-neutral-800/60 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {/* Card 1: Today's Sales */}
            <StatCard
              label="Today's Sales"
              value={`$${fmt(todaySales.totalAmount)}`}
              accentColor="mint"
              trend={todayTrend}
              secondaryStats={[
                { label: 'Cash', value: `$${fmt(todaySales.cashSales)}` },
                { label: 'Credit', value: `$${fmt(todaySales.creditSales)}` },
              ]}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />

            {/* Card 2: Month Revenue */}
            <StatCard
              label="Month Revenue"
              value={`$${fmt(monthSales.totalAmount)}`}
              accentColor="brand"
              secondaryStats={[
                { label: 'Orders', value: fmtInt(monthSales.saleCount) },
                { label: 'Run Rate', value: `$${fmt(dailyRunRate)}/d` },
              ]}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />

            {/* Card 3: Outstanding Credit */}
            <StatCard
              label="Outstanding Credit"
              value={`$${fmt(outstandingCredit)}`}
              accentColor="warning"
              secondaryStats={[
                { label: 'Receivables', value: 'Active' },
                { label: 'Risk State', value: 'Unsettled' },
              ]}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              }
            />

            {/* Card 4: Low Stock Items */}
            <StatCard
              label="Low Stock Items"
              value={fmtInt(lowStockCount)}
              accentColor="danger"
              secondaryStats={[
                { label: 'Action', value: lowStockCount > 0 ? 'Restock Req.' : 'Optimal' },
                { label: 'Threshold', value: '≤ Reorder' },
              ]}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
          </div>
        )}

        {/* ── Secondary Row of Smaller Stat Tiles ────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Tile 1: Branches Count */}
          <Link
            to="/branches"
            className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-brand-300 dark:hover:border-brand-700 rounded-card p-4 shadow-card hover:shadow-card-md transition-all duration-150 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-neutral-400 group-hover:text-brand-800 dark:group-hover:text-brand-accent transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Branches
              </span>
              <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-mono text-xl font-bold text-neutral-900 dark:text-white">
                {loading ? '—' : branches.length || 1}
              </span>
              <span className="text-[11px] text-neutral-400">Locations</span>
            </div>
          </Link>

          {/* Tile 2: Total SKUs */}
          <Link
            to="/items"
            className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-brand-300 dark:hover:border-brand-700 rounded-card p-4 shadow-card hover:shadow-card-md transition-all duration-150 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-neutral-400 group-hover:text-brand-800 dark:group-hover:text-brand-accent transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Total SKUs
              </span>
              <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-mono text-xl font-bold text-neutral-900 dark:text-white">
                {loading ? '—' : fmtInt(itemsCount)}
              </span>
              <span className="text-[11px] text-neutral-400">Products</span>
            </div>
          </Link>

          {/* Tile 3: This Month's Transaction Count */}
          <Link
            to="/sales"
            className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-brand-300 dark:hover:border-brand-700 rounded-card p-4 shadow-card hover:shadow-card-md transition-all duration-150 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-neutral-400 group-hover:text-brand-800 dark:group-hover:text-brand-accent transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Month Orders
              </span>
              <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-mono text-xl font-bold text-neutral-900 dark:text-white">
                {loading ? '—' : fmtInt(monthSales.saleCount)}
              </span>
              <span className="text-[11px] text-neutral-400">Completed</span>
            </div>
          </Link>

          {/* Tile 4: Total Expenses (MTD) */}
          <Link
            to="/expenses"
            className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-brand-300 dark:hover:border-brand-700 rounded-card p-4 shadow-card hover:shadow-card-md transition-all duration-150 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-neutral-400 group-hover:text-brand-800 dark:group-hover:text-brand-accent transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Total Expenses
              </span>
              <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-mono text-xl font-bold text-neutral-900 dark:text-white">
                {loading ? '—' : `$${fmt(expensesMtd)}`}
              </span>
              <span className="text-[11px] text-neutral-400">MTD</span>
            </div>
          </Link>

          {/* Tile 5: Payroll Status */}
          <Link
            to="/salary"
            className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-brand-300 dark:hover:border-brand-700 rounded-card p-4 shadow-card hover:shadow-card-md transition-all duration-150 flex flex-col justify-between col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between text-neutral-400 group-hover:text-brand-800 dark:group-hover:text-brand-accent transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Payroll Status
              </span>
              <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                {loading ? '—' : payrollStatus}
              </span>
              <span className={`w-2 h-2 rounded-full ${payrollStatus === 'Disbursed' ? 'bg-success-500' : 'bg-warning-500'}`} />
            </div>
          </Link>
        </div>

        {/* ── Stacked Bar Chart Section ──────────────────────────────── */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-5 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Revenue Dynamics (Last 14 Days)
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Stacked daily comparison of cash settlements vs. credit extensions.
              </p>
            </div>

            {/* Custom Legend */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#0d3b2e] dark:bg-[#1c5d47]" />
                <span className="text-neutral-600 dark:text-neutral-300 font-medium">Cash Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#7fd4a8]" />
                <span className="text-neutral-600 dark:text-neutral-300 font-medium">Credit Sales</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center animate-pulse">
              <div className="space-y-3 w-full">
                <div className="h-40 bg-neutral-100 dark:bg-neutral-800/60 rounded w-full" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3 mx-auto" />
              </div>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-neutral-800" />
                  <XAxis
                    dataKey="day"
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
                    tickFormatter={(val) => (val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`)}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(13, 59, 46, 0.04)' }} />
                  <Bar
                    dataKey="cash"
                    name="Cash"
                    stackId="sales"
                    fill="#0d3b2e"
                    className="dark:fill-[#1c5d47]"
                  />
                  <Bar
                    dataKey="credit"
                    name="Credit"
                    stackId="sales"
                    fill="#7fd4a8"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Recent Sales Transactions Section ──────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Recent Sales Transactions
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Most recently recorded point of sale order receipts.
              </p>
            </div>

            <Link
              to="/sales"
              className="text-xs font-semibold text-brand-800 dark:text-brand-accent hover:underline inline-flex items-center gap-1"
            >
              <span>View All Sales</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <DataTable
            columns={columns}
            data={recentSales}
            loading={loading}
            emptyMessage="No sales recorded yet"
            emptySubMessage="When orders are processed at the POS terminal, they will display here in real time."
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
