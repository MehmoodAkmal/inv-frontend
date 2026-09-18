import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../utils/currency';
import { exportToCsv } from '../utils/exportCsv';
import { getComprehensiveReport } from '../services/reportService';
import { getBranches } from '../services/branchService';
import Spinner from '../components/ui/Spinner';

// ── Chart Colors & Palettes ──────────────────────────────────────────────────
const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

export default function ExecutiveReports() {
  const { user } = useAuth();
  const { fmtCurr, currencySymbol } = useCurrency();
  const businessName = user?.organizationName || user?.businessName || 'Inventory Management';

  // ── Filter States ──────────────────────────────────────────────────────────
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const todayIso = now.toISOString().slice(0, 10);

  const [interval, setInterval] = useState('monthly'); // 'daily' | 'monthly' | '6months' | 'annually' | 'custom'
  const [selectedBranchId, setSelectedBranchId] = useState(''); // '' means all branches (overall)
  const [branches, setBranches] = useState([]);

  // Interval-specific parameter states
  const [dailyDate, setDailyDate] = useState(todayIso);
  const [monthVal, setMonthVal] = useState(currentMonth);
  const [yearVal, setYearVal] = useState(currentYear);
  const [halfVal, setHalfVal] = useState(currentMonth <= 6 ? 'H1' : 'H2');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(todayIso);

  // Data states
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Load Branches ──────────────────────────────────────────────────────────
  useEffect(() => {
    getBranches({ isActive: true })
      .then((res) => {
        setBranches(res.data?.data || []);
      })
      .catch((err) => {
        console.error('Failed to load branches:', err);
      });
  }, []);

  // ── Fetch Report Handler ───────────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = { interval };

      if (selectedBranchId && selectedBranchId !== 'all') {
        params.branchId = selectedBranchId;
      }

      if (interval === 'daily') {
        params.date = dailyDate;
      } else if (interval === 'monthly') {
        params.year = yearVal;
        params.month = monthVal;
      } else if (interval === '6months') {
        params.year = yearVal;
        params.half = halfVal;
      } else if (interval === 'annually') {
        params.year = yearVal;
      } else if (interval === 'custom') {
        if (!customStart || !customEnd) {
          toast.error('Please select both start and end dates');
          setLoading(false);
          return;
        }
        params.startDate = customStart;
        params.endDate = customEnd;
      }

      const res = await getComprehensiveReport(params);
      if (res.data?.success) {
        setReportData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch executive report:', err);
      toast.error(err.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [interval, selectedBranchId, dailyDate, monthVal, yearVal, halfVal, customStart, customEnd]);

  // Initial load
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const isOverall = !selectedBranchId || selectedBranchId === 'all';

  // Safe normalized values from reportData
  const meta = reportData?.meta || {};
  const fin = reportData?.financials || {};
  const sls = reportData?.sales || {};
  const inv = reportData?.inventory || {};
  const rec = reportData?.receivables || {};

  const totalRevenue = fin.totalRevenue ?? fin.revenue ?? 0;
  const totalCOGS = fin.totalCOGS ?? fin.cogs ?? 0;
  const grossProfit = fin.grossProfit ?? (totalRevenue - totalCOGS);
  const grossMarginPct = fin.grossMarginPct ?? (totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0);
  const totalExpenses = fin.totalExpenses ?? fin.expenses ?? 0;
  const totalSalaries = fin.totalSalaries ?? fin.salaries ?? 0;
  const totalOperatingCost = fin.totalOperatingCost ?? (totalExpenses + totalSalaries);
  const netProfit = fin.netProfit ?? (grossProfit - totalOperatingCost);
  const netMarginPct = fin.netMarginPct ?? (totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0);

  const saleCount = sls.saleCount ?? sls.totalTransactions ?? 0;
  const totalUnitsSold = sls.totalUnitsSold ?? 0;
  const avgTicketSize = sls.averageTicketSize ?? sls.avgTicketSize ?? 0;
  const totalCashSales = sls.totalCashSales ?? sls.cashSalesTotal ?? 0;
  const totalCreditSales = sls.totalCreditSales ?? sls.creditSalesTotal ?? 0;
  const totalDiscount = sls.totalDiscount ?? sls.totalDiscountsGiven ?? 0;
  const cashSalesPct = sls.cashSalesPct ?? (totalRevenue > 0 ? Math.round((totalCashSales / totalRevenue) * 100) : 0);

  const stockValCost = inv.valuationAtCost ?? inv.stockValueAtCost ?? 0;
  const stockValRetail = inv.valuationAtRetail ?? inv.stockValueAtRetail ?? 0;
  const potentialProfit = inv.potentialRetailProfit ?? inv.potentialProfit ?? Math.max(0, stockValRetail - stockValCost);
  const totalUnitsInStock = inv.totalUnitsInStock ?? inv.totalUnits ?? 0;
  const lowStockCount = inv.lowStockCount ?? inv.lowStockItemsCount ?? 0;

  const totalOutstandingDebt = rec.totalOutstandingCredit ?? rec.totalOutstandingDebt ?? rec.outstandingCustomerCredit ?? 0;
  const creditIssuedInPeriod = rec.periodCreditIssued ?? rec.creditIssuedInPeriod ?? rec.periodDebtIssued ?? 0;
  const debtCollectedInPeriod = rec.periodDebtCollected ?? rec.debtCollectedInPeriod ?? 0;
  const debtorCount = rec.debtorCount ?? 0;

  const topItems = (reportData?.topItems || []).map((it) => ({
    itemId: it.itemId || it._id,
    name: it.name || it.itemName || 'Item',
    sku: it.sku || '—',
    unit: it.unit || 'pcs',
    categoryName: it.categoryName || 'General',
    quantitySold: it.quantitySold ?? it.totalQty ?? it.totalQuantity ?? 0,
    revenueGenerated: it.revenueGenerated ?? it.totalRevenue ?? 0,
  }));

  const categoryBreakdown = (reportData?.categoryBreakdown || []).map((cat) => ({
    name: cat.categoryName || cat.name || 'Uncategorized',
    revenue: cat.revenue ?? cat.totalRevenue ?? 0,
    percentage: cat.percentage ?? cat.pctOfTotal ?? cat.percentOfTotal ?? 0,
  }));

  const branchBreakdown = (reportData?.branchBreakdown || []).map((b) => ({
    branchId: b.branchId || b._id,
    name: b.name || b.branchName || 'Branch',
    code: b.code || '—',
    revenue: b.revenue ?? b.totalRevenue ?? 0,
    cogs: b.cogs ?? 0,
    grossProfit: b.grossProfit ?? 0,
    expenses: b.expenses ?? 0,
    salaries: b.salaries ?? 0,
    netProfit: b.netProfit ?? 0,
    saleCount: b.saleCount ?? 0,
    contributionPct: b.contributionPct ?? b.contributionPercent ?? 0,
  }));

  // ── Export CSV Handler ─────────────────────────────────────────────────────
  const handleExportCsv = () => {
    if (!reportData) return;

    const filename = `Executive_Report_${meta.scope || 'consolidated'}_${meta.interval || 'period'}_${new Date().toISOString().slice(0, 10)}`;

    const rows = [
      ['EXECUTIVE BUSINESS REPORT', ''],
      ['Organization', businessName],
      ['Report Period', meta.periodLabel || ''],
      ['Scope', meta.scope === 'single_branch' ? `Branch: ${meta.branch?.name || ''}` : 'Overall Business (All Branches)'],
      ['Generated On', new Date(meta.generatedAt || Date.now()).toLocaleString()],
      ['', ''],
      ['1. FINANCIAL PERFORMANCE', 'Amount'],
      ['Gross Revenue', totalRevenue],
      ['Cost of Goods Sold (COGS)', totalCOGS],
      ['Gross Profit', grossProfit],
      ['Gross Profit Margin %', `${grossMarginPct}%`],
      ['Operating Expenses', totalExpenses],
      ['Payroll / Salaries', totalSalaries],
      ['Total Operating Overhead', totalOperatingCost],
      ['Net Profit', netProfit],
      ['Net Profit Margin %', `${netMarginPct}%`],
      ['', ''],
      ['2. SALES VOLUME & BREAKDOWN', 'Value'],
      ['Total Sales Transactions', saleCount],
      ['Total Units Sold', totalUnitsSold],
      ['Average Ticket / Order Value', avgTicketSize],
      ['Cash Sales', totalCashSales],
      ['Credit Sales', totalCreditSales],
      ['Total Discounts Given', totalDiscount],
      ['', ''],
      ['3. INVENTORY & RECEIVABLES', 'Value'],
      ['Stock Valuation at Cost', stockValCost],
      ['Stock Valuation at Retail', stockValRetail],
      ['Projected Inventory Profit', potentialProfit],
      ['Total Units in Stock', totalUnitsInStock],
      ['Low Stock Alert Items', lowStockCount],
      ['Outstanding Customer Debt', totalOutstandingDebt],
      ['Active Debtors Count', debtorCount],
      ['New Credit Extended in Period', creditIssuedInPeriod],
      ['Customer Debt Recovered in Period', debtCollectedInPeriod],
    ];

    if (topItems && topItems.length > 0) {
      rows.push(['', '']);
      rows.push(['TOP 5 BEST SELLING ITEMS', 'Qty Sold', 'Revenue Generated']);
      topItems.forEach((it) => {
        rows.push([it.name, it.quantitySold, it.revenueGenerated]);
      });
    }

    if (branchBreakdown && branchBreakdown.length > 0) {
      rows.push(['', '']);
      rows.push(['BRANCH BREAKDOWN', 'Revenue', 'COGS', 'Expenses', 'Salaries', 'Net Profit', 'Contribution %']);
      branchBreakdown.forEach((b) => {
        rows.push([b.name, b.revenue, b.cogs, b.expenses, b.salaries, b.netProfit, `${b.contributionPct}%`]);
      });
    }

    exportToCsv(filename, {
      headers: ['Metric / Section', 'Value / Details', 'Extra 1', 'Extra 2', 'Extra 3', 'Extra 4', 'Extra 5'],
      rows,
    });
    toast.success('Report exported to CSV');
  };

  // ── Print / Save PDF Handler ───────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 print:p-0 print:m-0 print:space-y-4">
      {/* ── Screen Controls Header (Hidden during Print) ───────────────────── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xs print:hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                Executive Business Reports
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-accent">
                Admin Exclusive
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Audit-ready financial statements, sales volume analytics, inventory health, and multi-branch contributions.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={fetchReport}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors shadow-xs"
              title="Refresh data"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!reportData || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors shadow-xs disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!reportData || loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-brand-800 hover:bg-brand-700 dark:bg-brand-700 dark:hover:bg-brand-600 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-200/80 dark:border-neutral-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Left: Scope / Branch Selection */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
              Audit Scope:
            </span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-accent shadow-xs min-w-[220px]"
            >
              <option value="">🏢 Overall Business (All Branches Combined)</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  📍 {b.name} {b.code ? `(${b.code})` : ''}
                </option>
              ))}
            </select>

            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
              isOverall
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
            }`}>
              {isOverall ? 'Consolidated Multi-Branch Audit' : 'Single Branch Audit'}
            </span>
          </div>

          {/* Right: Interval Segmented Switcher & Context Pickers */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80">
              {[
                { id: 'daily', label: 'Daily' },
                { id: 'monthly', label: 'Monthly' },
                { id: '6months', label: '6 Months' },
                { id: 'annually', label: 'Annual' },
                { id: 'custom', label: 'Custom' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInterval(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    interval === tab.id
                      ? 'bg-white dark:bg-neutral-900 text-brand-800 dark:text-brand-accent shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contextual Date Controls */}
            {interval === 'daily' && (
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-accent"
              />
            )}

            {interval === 'monthly' && (
              <div className="flex items-center gap-1.5">
                <select
                  value={monthVal}
                  onChange={(e) => setMonthVal(Number(e.target.value))}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100"
                >
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={yearVal}
                  onChange={(e) => setYearVal(Number(e.target.value))}
                  className="w-20 px-2.5 py-1.5 text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100"
                />
              </div>
            )}

            {interval === '6months' && (
              <div className="flex items-center gap-1.5">
                <select
                  value={halfVal}
                  onChange={(e) => setHalfVal(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100"
                >
                  <option value="H1">H1 (Jan - Jun)</option>
                  <option value="H2">H2 (Jul - Dec)</option>
                  <option value="rolling">Last 6 Months (Rolling)</option>
                </select>
                {halfVal !== 'rolling' && (
                  <input
                    type="number"
                    min="2020"
                    max="2035"
                    value={yearVal}
                    onChange={(e) => setYearVal(Number(e.target.value))}
                    className="w-20 px-2.5 py-1.5 text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100"
                  />
                )}
              </div>
            )}

            {interval === 'annually' && (
              <input
                type="number"
                min="2020"
                max="2035"
                value={yearVal}
                onChange={(e) => setYearVal(Number(e.target.value))}
                className="w-24 px-3 py-1.5 text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100"
              />
            )}

            {interval === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100"
                />
                <span className="text-xs text-neutral-400">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Official Print Header (Visible ONLY on print) ───────────────────── */}
      <div className="hidden print:block border-b-2 border-neutral-900 pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900 uppercase tracking-tight">
              {businessName}
            </h1>
            <p className="text-sm font-semibold text-neutral-600">
              Executive Business & Financial Audit Report
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Scope: <strong>{isOverall ? 'All Branches Combined (Consolidated)' : `Branch: ${reportData?.meta?.branch?.name || ''}`}</strong>
            </p>
          </div>
          <div className="text-right text-xs text-neutral-600">
            <p className="font-bold text-neutral-900">Period: {reportData?.meta?.periodLabel}</p>
            <p>Generated: {new Date().toLocaleString()}</p>
            <p>Auditor: {user?.firstName} {user?.lastName} (Admin)</p>
          </div>
        </div>
      </div>

      {/* ── Loading Spinner ─────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <Spinner size="lg" className="text-brand-800 dark:text-brand-500" />
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 animate-pulse">
            Compiling ledger, sales, expenses, and inventory aggregates...
          </p>
        </div>
      )}

      {/* ── Report Body ─────────────────────────────────────────────────────── */}
      {!loading && reportData && (
        <div className="space-y-6 print:space-y-4">
          {/* Active Period Header Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-900 to-brand-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm print:hidden">
            <div>
              <p className="text-xs font-mono tracking-wider text-brand-accent uppercase font-bold">
                Reporting Window
              </p>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                {reportData.meta.periodLabel}
              </h2>
            </div>
            <div className="text-left sm:text-right text-xs text-brand-200">
              <p>Dates: {new Date(reportData.meta.startDate).toLocaleDateString()} — {new Date(reportData.meta.endDate).toLocaleDateString()}</p>
              <p className="text-[11px] text-brand-300">Target: {isOverall ? 'Entire Organization' : reportData.meta.branch?.name}</p>
            </div>
          </div>

          {/* ── 1. Key Financial KPI Cards (6 Grid) ─────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Gross Revenue */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Total Gross Sales
              </p>
              <p className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white mt-1">
                {fmtCurr(totalRevenue)}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">
                {saleCount} sales transactions
              </p>
            </div>

            {/* Cost of Goods Sold */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                COGS (Inventory Cost)
              </p>
              <p className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                {fmtCurr(totalCOGS)}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">
                {totalUnitsSold} units sold
              </p>
            </div>

            {/* Gross Profit */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Gross Profit
              </p>
              <p className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
                {fmtCurr(grossProfit)}
              </p>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-300 mt-1">
                {grossMarginPct}% Margin
              </p>
            </div>

            {/* Operating Expenses */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Operating Expenses
              </p>
              <p className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
                {fmtCurr(totalExpenses)}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">
                Utilities, rent, bills
              </p>
            </div>

            {/* Staff Salaries */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Payroll & Salaries
              </p>
              <p className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">
                {fmtCurr(totalSalaries)}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">
                Disbursed to employees
              </p>
            </div>

            {/* Net Profit */}
            <div className={`p-4 rounded-2xl border shadow-xs ${
              netProfit >= 0
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
            }`}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Net Profit (P&L)
              </p>
              <p className={`text-xl sm:text-2xl font-black mt-1 ${
                netProfit >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}>
                {fmtCurr(netProfit)}
              </p>
              <p className={`text-[10px] font-bold mt-1 ${
                netProfit >= 0
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-rose-700 dark:text-rose-300'
              }`}>
                {netMarginPct}% Net Margin
              </p>
            </div>
          </div>

          {/* ── 2. Secondary Health Cards (Inventory & Receivables) ─────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Inventory Valuation at Cost */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Stock Valuation (Cost)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  {totalUnitsInStock} Units
                </span>
              </div>
              <p className="text-2xl font-black text-neutral-900 dark:text-white mt-2">
                {fmtCurr(stockValCost)}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Capital currently invested in inventory
              </p>
            </div>

            {/* Inventory Valuation at Retail */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Stock Value (Retail)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  +{fmtCurr(potentialProfit)} Profit
                </span>
              </div>
              <p className="text-2xl font-black text-neutral-900 dark:text-white mt-2">
                {fmtCurr(stockValRetail)}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Expected revenue if all on-hand stock is sold
              </p>
            </div>

            {/* Customer Receivables (Debt) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Outstanding Credit</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  {debtorCount} Debtors
                </span>
              </div>
              <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-2">
                {fmtCurr(totalOutstandingDebt)}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Money owed to the business by customers
              </p>
            </div>

            {/* Credit Flow in this Period */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Period Credit Flow</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                  Cash: {cashSalesPct}%
                </span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-neutral-500">Credit Issued:</span>
                  <span className="text-rose-600 font-bold">{fmtCurr(creditIssuedInPeriod)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-neutral-500">Debt Collected:</span>
                  <span className="text-emerald-600 font-bold">{fmtCurr(debtCollectedInPeriod)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. Visual Charts (Timeline Trend & Categories) ──────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
            {/* Revenue vs Expenses vs Profit Timeline */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Financial Performance Timeline
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Revenue vs. Expenses over this period
                  </p>
                </div>
              </div>
              <div className="h-64 w-full">
                {reportData.timelineTrend && reportData.timelineTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={reportData.timelineTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.6} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val, name) => [
                          fmtCurr(val),
                          name === 'revenue' ? 'Revenue' : name === 'expenses' ? 'Expenses' : 'Net Profit'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#0284c7" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                    No timeline transactions recorded for this period.
                  </div>
                )}
              </div>
            </div>

            {/* Sales by Category Breakdown */}
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-1">
                Category Contribution
              </h3>
              <p className="text-xs text-neutral-500 mb-4">Revenue breakdown by product category</p>
              <div className="h-44 w-full">
                {categoryBreakdown && categoryBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="revenue"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={65}
                        paddingAngle={3}
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => [fmtCurr(val), 'Revenue']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                    No category sales in this period.
                  </div>
                )}
              </div>
              <div className="space-y-1.5 mt-2 max-h-36 overflow-y-auto pr-1">
                {categoryBreakdown.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="truncate text-neutral-700 dark:text-neutral-300 font-medium">{cat.name}</span>
                    </div>
                    <span className="font-bold text-neutral-900 dark:text-white">{cat.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 4. Multi-Branch Contribution Table (Overall Mode Only) ──────── */}
          {isOverall && branchBreakdown && branchBreakdown.length > 0 && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/60 dark:bg-neutral-900/60">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
                    Multi-Branch Contribution Breakdown
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Comparative breakdown across all active company branches
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-brand-700 dark:text-brand-accent">
                  {branchBreakdown.length} Branches Active
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-800/50 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4 text-right">Revenue</th>
                      <th className="py-3 px-4 text-right">COGS</th>
                      <th className="py-3 px-4 text-right">Gross Profit</th>
                      <th className="py-3 px-4 text-right">Expenses</th>
                      <th className="py-3 px-4 text-right">Salaries</th>
                      <th className="py-3 px-4 text-right">Net Profit</th>
                      <th className="py-3 px-4 text-right">Share %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {branchBreakdown.map((b) => (
                      <tr key={b.branchId} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-neutral-900 dark:text-white">
                          <div>{b.name}</div>
                          <span className="text-[10px] font-mono text-neutral-400">{b.code}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                          {fmtCurr(b.revenue)}
                        </td>
                        <td className="py-3 px-4 text-right text-neutral-500 font-mono">
                          {fmtCurr(b.cogs)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-blue-700 dark:text-blue-400">
                          {fmtCurr(b.grossProfit)}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-600 font-mono">
                          {fmtCurr(b.expenses)}
                        </td>
                        <td className="py-3 px-4 text-right text-purple-600 font-mono">
                          {fmtCurr(b.salaries)}
                        </td>
                        <td className={`py-3 px-4 text-right font-bold ${
                          b.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {fmtCurr(b.netProfit)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-neutral-700 dark:text-neutral-300">
                          {b.contributionPct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 5. P&L Statement & Top 5 Items Grid ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* P&L Statement Table */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Profit & Loss Statement
                </h3>
                <p className="text-xs text-neutral-500">Summary of income, cost of goods, and overheads</p>
              </div>
              <div className="p-4 divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                <div className="py-2.5 flex justify-between items-center">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">1. Gross Revenue (Total Sales)</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{fmtCurr(totalRevenue)}</span>
                </div>
                <div className="py-2.5 pl-4 flex justify-between items-center text-neutral-500">
                  <span>• Cash Sales</span>
                  <span>{fmtCurr(totalCashSales)}</span>
                </div>
                <div className="py-2.5 pl-4 flex justify-between items-center text-neutral-500">
                  <span>• Credit Sales (Receivables)</span>
                  <span>{fmtCurr(totalCreditSales)}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center text-amber-700 dark:text-amber-400">
                  <span className="font-semibold">2. Less: Cost of Goods Sold (COGS)</span>
                  <span className="font-bold">({fmtCurr(totalCOGS)})</span>
                </div>
                <div className="py-2.5 flex justify-between items-center font-bold text-blue-700 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20 px-2 rounded-lg">
                  <span>Gross Profit</span>
                  <span>{fmtCurr(grossProfit)}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center text-rose-700 dark:text-rose-400">
                  <span className="font-semibold">3. Less: Operating Expenses</span>
                  <span className="font-bold">({fmtCurr(totalExpenses)})</span>
                </div>
                <div className="py-2.5 flex justify-between items-center text-purple-700 dark:text-purple-400">
                  <span className="font-semibold">4. Less: Salaries & Payroll</span>
                  <span className="font-bold">({fmtCurr(totalSalaries)})</span>
                </div>
                <div className={`py-3 flex justify-between items-center text-sm font-black px-2.5 rounded-xl ${
                  netProfit >= 0
                    ? 'bg-emerald-100/70 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-rose-100/70 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300'
                }`}>
                  <span>Net Operating Profit</span>
                  <span>{fmtCurr(netProfit)}</span>
                </div>
              </div>
            </div>

            {/* Top 5 Best-Selling Products Table */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Top 5 Best-Selling Products
                </h3>
                <p className="text-xs text-neutral-500">Highest revenue drivers for this period</p>
              </div>
              <div className="p-0">
                {topItems && topItems.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-800/50 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-4">#</th>
                        <th className="py-2.5 px-4">Item Name</th>
                        <th className="py-2.5 px-4 text-center">Qty</th>
                        <th className="py-2.5 px-4 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {topItems.map((it, idx) => (
                        <tr key={it.itemId || idx} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                          <td className="py-2.5 px-4 font-bold text-neutral-400">{idx + 1}</td>
                          <td className="py-2.5 px-4">
                            <span className="font-bold text-neutral-900 dark:text-white block">{it.name}</span>
                            <span className="text-[10px] font-mono text-neutral-400">{it.sku}</span>
                          </td>
                          <td className="py-2.5 px-4 text-center font-semibold text-neutral-700 dark:text-neutral-300">
                            {it.quantitySold} {it.unit}
                          </td>
                          <td className="py-2.5 px-4 text-right font-black text-neutral-900 dark:text-white font-mono">
                            {fmtCurr(it.revenueGenerated)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-xs text-neutral-400">
                    No sales recorded for items in this period.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Official Print Signatures Footer (Visible ONLY on print) ─────── */}
          <div className="hidden print:block pt-12 mt-8 border-t border-neutral-400">
            <div className="grid grid-cols-3 gap-8 text-xs text-neutral-700">
              <div className="border-t border-neutral-900 pt-2 text-center">
                <p className="font-bold">Prepared By</p>
                <p className="text-[11px] text-neutral-500">Accountant / Manager</p>
              </div>
              <div className="border-t border-neutral-900 pt-2 text-center">
                <p className="font-bold">Verified By</p>
                <p className="text-[11px] text-neutral-500">Audit Department</p>
              </div>
              <div className="border-t border-neutral-900 pt-2 text-center">
                <p className="font-bold">Authorized Signatory</p>
                <p className="text-[11px] text-neutral-500">Executive Administration</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
