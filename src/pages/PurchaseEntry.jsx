import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../utils/currency';
import { addStock, getStock, getMovements, getStockBatches } from '../services/stockService';
import { getItems } from '../services/itemService';
import { getBranches } from '../services/branchService';

import {
  DashboardLayout,
  CustomSelect,
  Spinner,
} from '../components/ui';

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n ?? 0).toLocaleString();

const fmtd = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const MOVEMENT_TYPE_BADGES = {
  purchase: {
    label: 'Purchase',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
    dot: 'bg-emerald-500',
  },
  sale: {
    label: 'Sale',
    bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50',
    dot: 'bg-blue-500',
  },
  transfer_in: {
    label: 'Transfer In',
    bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50',
    dot: 'bg-purple-500',
  },
  transfer_out: {
    label: 'Transfer Out',
    bg: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/50',
    dot: 'bg-orange-500',
  },
  adjustment: {
    label: 'Adjustment',
    bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
    dot: 'bg-amber-500',
  },
};

function MovementTypeBadge({ type }) {
  const cfg = MOVEMENT_TYPE_BADGES[type] || {
    label: type,
    bg: 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300',
    dot: 'bg-neutral-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
      {cfg.label}
    </span>
  );
}

const generateLotCode = (itemName) => {
  const prefix = itemName
    ? itemName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'LOT')
    : 'LOT';
  const now = new Date();
  const yr = String(now.getFullYear()).slice(-2);
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const da = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${yr}${mo}${da}-${rand}`;
};

// ── Top KPI Summary Bar Component ───────────────────────────────────────────
function PurchaseKpiBar({ branchId, refreshTrigger }) {
  const { currencySymbol } = useCurrency();
  const [stats, setStats] = useState({
    todayInflowQty: 0,
    todayInflowOutlay: 0,
    activeBatchesCount: 0,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      try {
        const [batchesRes, movementsRes] = await Promise.all([
          getStockBatches({ branchId: branchId || undefined, status: 'active' }).catch(() => ({ data: { data: [] } })),
          getMovements({ branchId: branchId || undefined, limit: 50 }).catch(() => ({ data: { data: [] } })),
        ]);

        const batches = batchesRes.data?.data || [];
        const movements = movementsRes.data?.data || [];

        // Calculate today's purchases
        const todayStr = new Date().toDateString();
        let todayQty = 0;
        let todayOutlay = 0;

        movements.forEach((m) => {
          if (m.type === 'purchase' && new Date(m.createdAt).toDateString() === todayStr) {
            const qty = Number(m.quantity) || 0;
            todayQty += qty;
            if (m.costPrice) {
              todayOutlay += qty * Number(m.costPrice);
            }
          }
        });

        if (isMounted) {
          setStats({
            todayInflowQty: todayQty,
            todayInflowOutlay: todayOutlay,
            activeBatchesCount: batches.length,
            loading: false,
          });
        }
      } catch (err) {
        console.error('loadStats error:', err);
        if (isMounted) setStats((p) => ({ ...p, loading: false }));
      }
    };

    loadStats();
    return () => {
      isMounted = false;
    };
  }, [branchId, refreshTrigger]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Today's Inflow Units */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 shadow-card hover:shadow-card-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Today's Inflow Quantity
            </p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                {stats.loading ? '…' : `+${fmt(stats.todayInflowQty)}`}
              </span>
              <span className="text-xs text-neutral-400 font-medium">units</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Stock added to inventory today</span>
        </p>
      </div>

      {/* 2. Today's Replenishment Outlay */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 shadow-card hover:shadow-card-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Today's Purchase Outlay
            </p>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="text-xs font-bold text-neutral-400">{currencySymbol}</span>
              <span className="font-mono text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                {stats.loading ? '…' : fmt(stats.todayInflowOutlay)}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/40 text-brand-800 dark:text-brand-accent border border-brand-200/60 dark:border-brand-700/50 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
          <span>Capital invested in new shipments</span>
        </p>
      </div>

      {/* 3. Active FIFO Batches */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 shadow-card hover:shadow-card-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Open Stock Batches
            </p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                {stats.loading ? '…' : fmt(stats.activeBatchesCount)}
              </span>
              <span className="text-xs text-neutral-400 font-medium">lots open</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          <span>Lots tracked with distinct cost prices</span>
        </p>
      </div>

      {/* 4. FIFO Valuation Engine Health */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 shadow-card hover:shadow-card-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              FIFO Costing Engine
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                100% Synchronized
              </span>
            </div>
          </div>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50 shrink-0">
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Real-time per-batch P&L active</span>
        </p>
      </div>
    </div>
  );
}

// ── Interactive Digital Goods Receipt Note (GRN) Voucher ────────────────────
function DigitalGrnVoucher({
  branchName,
  selectedItem,
  quantity,
  costPrice,
  sellingPrice,
  batchNumber,
  note,
  currentStock,
  loadingStock,
  onPrint,
}) {
  const { currencySymbol } = useCurrency();
  const addedQty = Number(quantity) || 0;
  const unitCost = Number(costPrice) || 0;
  const unitSale = Number(sellingPrice) || 0;
  const totalOutlay = addedQty * unitCost;
  const totalRevenue = addedQty * unitSale;
  const unitMargin = unitSale > 0 ? unitSale - unitCost : 0;
  const marginPct = unitSale > 0 ? Math.round((unitMargin / unitSale) * 100) : 0;
  const totalEstProfit = addedQty * unitMargin;
  const newStock = currentStock + addedQty;

  const [voucherSerial] = useState(() => {
    const today = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `GRN-${today}-${rand}`;
  });

  const isReady = Boolean(selectedItem && addedQty > 0 && unitCost > 0);

  return (
    <div
      id="grn-voucher-container"
      className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-card overflow-hidden flex flex-col"
    >
      {/* ── Voucher Header Banner (Deep Forest Green) ──────────────── */}
      <div className="bg-brand-900 dark:bg-brand-950 text-white p-5 border-b border-brand-800 relative overflow-hidden">
        {/* Decorative background watermark */}
        <div className="absolute -right-6 -bottom-6 text-brand-800/30 dark:text-brand-900/40 pointer-events-none select-none font-mono text-8xl font-black">
          GRN
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-accent animate-pulse"></span>
              <span className="text-[11px] font-mono uppercase tracking-widest text-brand-accent font-semibold">
                Official Receiving Slip
              </span>
            </div>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isReady
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/10 text-neutral-300 border-white/20'
              }`}
            >
              {isReady ? 'Ready to Commit' : 'Draft Voucher'}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">
                Goods Receipt Note
              </h3>
              <p className="text-[11px] font-mono text-brand-200/80 mt-0.5">
                {voucherSerial}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-brand-200/80 uppercase block">Receiving At</span>
              <span className="text-xs font-semibold text-white truncate max-w-[130px] block">
                {branchName || 'Main Branch'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Perforated / Cut Ticket Divider with Half-Circle Notches ── */}
      <div className="relative py-2 bg-neutral-50 dark:bg-neutral-800/40 border-y border-dashed border-neutral-200 dark:border-neutral-800">
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800"></div>
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800"></div>
        <div className="text-center text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
          ✦ Stock Intake Summary ✦
        </div>
      </div>

      {/* ── Voucher Content Area ────────────────────────────────────── */}
      <div className="p-5 space-y-4 flex-1">
        {!selectedItem ? (
          // Empty State: Sleek Waiting Blueprint
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/40 text-brand-800 dark:text-brand-accent mx-auto flex items-center justify-center border border-brand-200/60 dark:border-brand-700/50 shadow-sm">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="max-w-xs mx-auto">
              <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                Awaiting Product Selection
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                Choose an item on the left to compute real-time batch valuation, outlay, and FIFO lot parameters.
              </p>
            </div>

            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2 text-left text-xs text-neutral-600 dark:text-neutral-400 max-w-xs mx-auto">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Automated lot serial generation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Immediate inventory balance projection</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Live unit margin & profit forecasting</span>
              </div>
            </div>
          </div>
        ) : (
          // Active Filled Voucher Details
          <>
            {/* Item Particulars */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 block">
                    Target Inventory Item
                  </span>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate mt-0.5">
                    {selectedItem.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {selectedItem.sku && (
                      <span className="font-mono text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                        {selectedItem.sku}
                      </span>
                    )}
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Unit: <strong className="text-neutral-700 dark:text-neutral-300">{selectedItem.unit || 'unit'}</strong>
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-semibold text-neutral-400 block">Lot Code</span>
                  <span className="font-mono text-xs font-bold text-brand-800 dark:text-brand-accent bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded border border-brand-200 dark:border-brand-800 block mt-0.5">
                    {batchNumber || 'AUTO-ASSIGN'}
                  </span>
                </div>
              </div>

              {note && (
                <div className="mt-2.5 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 truncate">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">Ref:</span>
                  <span className="truncate">{note}</span>
                </div>
              )}
            </div>

            {/* Financial Breakdown Table */}
            <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-white dark:bg-neutral-900">
                <span className="text-neutral-500 dark:text-neutral-400">Items Received</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">
                  {addedQty > 0 ? `${fmt(addedQty)} ${selectedItem.unit || 'units'}` : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-white dark:bg-neutral-900">
                <span className="text-neutral-500 dark:text-neutral-400">Unit Purchase Cost</span>
                <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                  {unitCost > 0 ? `${currencySymbol} ${fmt(unitCost)}` : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-brand-50/50 dark:bg-brand-950/20 font-bold">
                <span className="text-brand-900 dark:text-brand-300">Total Lot Outlay</span>
                <span className="font-mono text-sm text-brand-900 dark:text-brand-accent">
                  {currencySymbol} {fmt(totalOutlay)}
                </span>
              </div>

              {unitSale > 0 && (
                <>
                  <div className="flex items-center justify-between p-2.5 bg-white dark:bg-neutral-900">
                    <span className="text-neutral-500 dark:text-neutral-400">Catalog Retail Price</span>
                    <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                      {currencySymbol} {fmt(unitSale)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-white dark:bg-neutral-900">
                    <span className="text-neutral-500 dark:text-neutral-400">Projected Retail Revenue</span>
                    <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                      {currencySymbol} {fmt(totalRevenue)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">
                    <span className="font-medium">Projected Batch Profit</span>
                    <span className="font-mono font-bold">
                      {currencySymbol} {fmt(totalEstProfit)}{' '}
                      <span className="text-[10px] font-normal text-emerald-700 dark:text-emerald-400">
                        (+{marginPct}%)
                      </span>
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Warehouse Stock Progression Visual */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Warehouse Stock Impact
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  +{addedQty} {selectedItem.unit}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-[10px] text-neutral-400 block">Current</span>
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    {loadingStock ? '…' : fmt(currentStock)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block">Inflow</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    +{fmt(addedQty)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-900/40 border border-brand-200/60 dark:border-brand-700/60">
                  <span className="text-[10px] text-brand-800 dark:text-brand-accent block">Projected</span>
                  <span className="text-xs font-bold text-brand-800 dark:text-brand-accent">
                    {fmt(newStock)}
                  </span>
                </div>
              </div>
            </div>

            {/* FIFO Accounting Notice */}
            <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-2 text-[11px] text-blue-800 dark:text-blue-300">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="leading-tight">
                This lot will be queued under <strong>First-In, First-Out (FIFO)</strong>. Future sales deduct cost at {currencySymbol} {fmt(unitCost)} until depleted.
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Voucher Footer Actions ──────────────────────────────────── */}
      {selectedItem && (
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (onPrint) {
                onPrint();
              } else {
                window.print();
              }
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Receipt Slip</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Reusable Purchase Entry Form ────────────────────────────────────────────
export function PurchaseEntryForm({
  preselectedItemId = '',
  preselectedBranchId = '',
  onSuccess,
  onCancel,
  isModal = false,
}) {
  const { user } = useAuth();
  const { currencySymbol } = useCurrency();
  const isAdmin = user?.role === 'admin';
  const managerBranchId = user?.branchId;

  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [stockMap, setStockMap] = useState(new Map());

  const [form, setForm] = useState({
    branchId: !isAdmin ? (managerBranchId ?? '') : (preselectedBranchId || ''),
    itemId: preselectedItemId || '',
    quantity: '',
    costPrice: '',
    sellingPrice: '',
    batchNumber: '',
    note: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [loadingCurrentStock, setLoadingCurrentStock] = useState(false);

  // Load active branches & items
  useEffect(() => {
    getBranches()
      .then((res) => {
        if (res.data?.success) setBranches(res.data.data || []);
      })
      .catch(() => {});

    getItems({ includeInactive: false })
      .then((res) => {
        if (res.data?.success) setItems(res.data.data || []);
      })
      .catch(() => {});
  }, []);

  // Pre-fill item prices when item is selected
  useEffect(() => {
    if (form.itemId && items.length > 0 && form.costPrice === '') {
      const itm = items.find((i) => i._id === form.itemId);
      if (itm) {
        setForm((p) => ({
          ...p,
          costPrice: itm.costPrice ?? '',
          sellingPrice: itm.sellingPrice ?? '',
        }));
      }
    }
  }, [form.itemId, items, form.costPrice]);

  // Manager locked branch name
  const userBranchName = useMemo(() => {
    if (!managerBranchId) return 'Assigned Branch';
    const b = branches.find((item) => item._id === managerBranchId);
    return b?.name || 'Assigned Branch';
  }, [managerBranchId, branches]);

  const activeBranchName = useMemo(() => {
    const targetId = isAdmin ? form.branchId : managerBranchId;
    const b = branches.find((item) => item._id === targetId);
    return b?.name || (isAdmin ? 'Selected Branch' : userBranchName);
  }, [isAdmin, form.branchId, managerBranchId, branches, userBranchName]);

  // Fetch current stock when branch or item changes
  useEffect(() => {
    const activeBranch = isAdmin ? form.branchId : managerBranchId;
    if (!activeBranch) return;

    setLoadingCurrentStock(true);
    getStock({ branchId: activeBranch })
      .then((res) => {
        if (res.data?.success) {
          const newMap = new Map();
          (res.data.data || []).forEach((s) => {
            const iId = s.itemId?._id ?? s.itemId;
            const bId = s.branchId?._id ?? s.branchId;
            if (iId && bId) {
              newMap.set(`${bId}:${iId}`, s.quantity || 0);
            }
          });
          setStockMap(newMap);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCurrentStock(false));
  }, [isAdmin, form.branchId, managerBranchId]);

  // Live Calculations
  const activeBranchId = isAdmin ? form.branchId : managerBranchId;
  const currentQuantity = useMemo(() => {
    if (!activeBranchId || !form.itemId) return 0;
    return stockMap.get(`${activeBranchId}:${form.itemId}`) ?? 0;
  }, [activeBranchId, form.itemId, stockMap]);

  const addedQuantity = Number(form.quantity) || 0;
  const newQuantity = currentQuantity + addedQuantity;

  const selectedItem = useMemo(() => {
    return items.find((i) => i._id === form.itemId);
  }, [items, form.itemId]);

  const unitCost = Number(form.costPrice) || 0;
  const unitSale = Number(form.sellingPrice) || 0;
  const totalInflowCost = addedQuantity * unitCost;
  const unitMargin = unitSale > 0 ? unitSale - unitCost : 0;
  const marginPct = unitSale > 0 ? Math.round((unitMargin / unitSale) * 100) : 0;

  // Auto-fill batch code helper
  const handleAutoGenerateBatch = () => {
    const code = generateLotCode(selectedItem?.name);
    setForm((p) => ({ ...p, batchNumber: code }));
    toast.success(`Generated lot code: ${code}`, { duration: 2500 });
  };

  const handleReset = () => {
    setForm({
      branchId: !isAdmin ? (managerBranchId ?? '') : (preselectedBranchId || ''),
      itemId: '',
      quantity: '',
      costPrice: '',
      sellingPrice: '',
      batchNumber: '',
      note: '',
    });
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const qty = Number(form.quantity);
    if (!qty || qty <= 0) {
      toast.error('Please enter a valid stock quantity (minimum 1)');
      return;
    }
    const branchToUse = isAdmin ? form.branchId : managerBranchId;
    if (!branchToUse) {
      toast.error('Branch is required');
      return;
    }
    if (!form.itemId) {
      toast.error('Item selection is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        branchId: branchToUse,
        itemId: form.itemId,
        quantity: qty,
        costPrice: form.costPrice !== '' ? Number(form.costPrice) : undefined,
        sellingPrice: form.sellingPrice !== '' ? Number(form.sellingPrice) : undefined,
        batchNumber: form.batchNumber?.trim() || undefined,
        note: form.note.trim() || null,
      };

      const res = await addStock(payload);
      if (res.data?.success) {
        toast.success(`Successfully recorded ${qty} ${selectedItem?.unit || 'units'} into stock with FIFO batch!`);
        // Reset form inputs (retain branch for rapid workflow)
        setForm((prev) => ({
          ...prev,
          itemId: '',
          quantity: '',
          costPrice: '',
          sellingPrice: '',
          batchNumber: '',
          note: '',
        }));

        // Update local stock map
        setStockMap((prev) => {
          const next = new Map(prev);
          next.set(`${branchToUse}:${form.itemId}`, newQuantity);
          return next;
        });

        if (onSuccess) onSuccess(res.data.data);
      } else {
        toast.error(res.data?.message || 'Failed to add stock');
      }
    } catch (err) {
      console.error('addStock error:', err);
      toast.error(err.response?.data?.message || 'Failed to record purchase entry');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Keyboard shortcut: Ctrl + Enter to submit ─────────────────────────────
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // ── Form Inner JSX ────────────────────────────────────────────────────────
  const formJSX = (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-5">
      {/* ── Section 1: Destination & Product Selection ──────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-900 dark:bg-brand-800 text-brand-accent text-[11px] font-bold flex items-center justify-center">
            1
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            Destination & Product Selection
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Branch Selection */}
          <div>
            <div className="h-5 flex items-center mb-1.5">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Receiving Branch <span className="text-rose-500">*</span>
              </label>
            </div>
            {isAdmin ? (
              <CustomSelect
                required
                value={form.branchId}
                onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
                className="w-full h-10 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-accent/50"
              >
                <option value="">Select Receiving Branch</option>
                {branches
                  .filter((b) => b.isActive)
                  .map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name} {b.city ? `(${b.city})` : ''}
                    </option>
                  ))}
              </CustomSelect>
            ) : (
              <div className="flex h-10 items-center gap-2 px-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950 shrink-0"></span>
                <span className="truncate">{userBranchName}</span>
                <span className="text-[10px] text-neutral-400 font-mono ml-auto shrink-0">Assigned Branch</span>
              </div>
            )}
          </div>

          {/* Item Selection */}
          <div>
            <div className="h-5 flex items-center mb-1.5">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Select Inventory Item <span className="text-rose-500">*</span>
              </label>
            </div>
            <CustomSelect
              required
              value={form.itemId}
              onChange={(e) => {
                const itmId = e.target.value;
                const itm = items.find((i) => i._id === itmId);
                setForm((p) => ({
                  ...p,
                  itemId: itmId,
                  costPrice: itm ? (itm.costPrice ?? '') : '',
                  sellingPrice: itm ? (itm.sellingPrice ?? '') : '',
                }));
              }}
              className="w-full h-10 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-accent/50"
            >
              <option value="">Search or Select Product...</option>
              {items
                .filter((i) => i.isActive)
                .map((i) => (
                  <option key={i._id} value={i._id}>
                    {i.name} {i.sku ? `[${i.sku}]` : ''} — Unit: {i.unit || 'unit'}
                  </option>
                ))}
            </CustomSelect>
          </div>
        </div>

        {/* Current Stock Indicator Pill */}
        {form.itemId && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 text-xs">
            <span className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Warehouse Stock Balance:</span>
              <strong className="font-mono text-neutral-900 dark:text-white">
                {loadingCurrentStock ? 'Checking…' : `${fmt(currentQuantity)} ${selectedItem?.unit || 'units'}`}
              </strong>
            </span>
            <span className="text-[11px] text-neutral-400 font-mono">
              SKU: {selectedItem?.sku || 'N/A'}
            </span>
          </div>
        )}
      </div>

      {/* ── Section 2: Lot Parameters & Inflow Volume ───────────────── */}
      <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-900 dark:bg-brand-800 text-brand-accent text-[11px] font-bold flex items-center justify-center">
            2
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            Inflow Quantity & Lot Identification
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Quantity Input */}
          <div>
            <div className="flex items-center justify-between h-5 mb-1.5">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Quantity to Inflow <span className="text-rose-500">*</span>
              </label>
              {selectedItem?.unit && (
                <span className="text-[11px] text-neutral-400">
                  Unit: <strong className="text-neutral-700 dark:text-neutral-300">{selectedItem.unit}</strong>
                </span>
              )}
            </div>

            <div className="relative rounded-lg shadow-sm">
              <input
                type="number"
                min="1"
                step="any"
                required
                value={form.quantity}
                onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                placeholder="e.g. 50"
                className="w-full h-10 pl-3.5 pr-16 text-sm font-mono font-semibold rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent"
              />
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs font-bold text-neutral-400 uppercase">
                {selectedItem?.unit || 'Units'}
              </div>
            </div>
          </div>

          {/* Batch Code with Auto-Gen Button */}
          <div>
            <div className="flex items-center justify-between h-5 mb-1.5">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Delivery / Lot Code
              </label>
              <button
                type="button"
                onClick={handleAutoGenerateBatch}
                className="text-[10px] font-semibold text-brand-700 dark:text-brand-accent hover:underline flex items-center gap-1"
                title="Generate timestamped lot code"
              >
                <span>⚡ Auto Generate</span>
              </button>
            </div>

            <input
              type="text"
              maxLength={50}
              value={form.batchNumber}
              onChange={(e) => setForm((p) => ({ ...p, batchNumber: e.target.value }))}
              placeholder="e.g. LOT-2609-8801"
              className="w-full h-10 px-3.5 text-sm font-mono uppercase rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent"
            />
          </div>
        </div>

        {/* Supplier Reference / Delivery Note */}
        <div>
          <div className="h-5 flex items-center mb-1.5">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Supplier Reference / Waybill / Note <span className="text-neutral-400 font-normal">(Optional)</span>
            </label>
          </div>
          <input
            type="text"
            maxLength={500}
            value={form.note}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            placeholder="e.g. Supplier invoice #INV-8821, Delivery truck #4"
            className="w-full h-10 px-3.5 text-sm rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent"
          />
        </div>
      </div>

      {/* ── Section 3: FIFO Batch Pricing & Valuation ───────────────── */}
      <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-brand-900 dark:bg-brand-800 text-brand-accent text-[11px] font-bold flex items-center justify-center">
              3
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              Pricing &amp; Cost Breakdown
            </h3>
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            Per-Lot Accounting
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Purchase Cost Price */}
          <div>
            <div className="h-5 flex items-center mb-1.5">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Purchase Cost Price ({currencySymbol}) <span className="text-rose-500">*</span>
              </label>
            </div>
            <div className="relative rounded-lg shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-neutral-400">
                {currencySymbol}
              </div>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={form.costPrice}
                onChange={(e) => setForm((p) => ({ ...p, costPrice: e.target.value }))}
                placeholder="e.g. 230"
                className="w-full h-10 pl-10 pr-3.5 text-sm font-mono font-semibold rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent"
              />
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">
              Unit cost recorded specifically for this incoming FIFO lot
            </p>
          </div>

          {/* Catalog Selling Price */}
          <div>
            <div className="flex items-center justify-between h-5 mb-1.5">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Catalog Selling Price ({currencySymbol})
              </label>
              {unitMargin > 0 && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  +{marginPct}% margin
                </span>
              )}
            </div>

            <div className="relative rounded-lg shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-neutral-400">
                {currencySymbol}
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={form.sellingPrice}
                onChange={(e) => setForm((p) => ({ ...p, sellingPrice: e.target.value }))}
                placeholder="e.g. 280"
                className="w-full h-10 pl-10 pr-3.5 text-sm font-mono font-semibold rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent"
              />
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">
              Updates retail catalog selling rate in system
            </p>
          </div>
        </div>

        {/* Financial Summary Strip for Modal Mode */}
        {isModal && addedQuantity > 0 && unitCost >= 0 && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs">
            <span className="text-emerald-900 dark:text-emerald-300">
              Total Inflow Outlay: <strong className="font-mono text-neutral-900 dark:text-white font-bold">{currencySymbol} {fmt(totalInflowCost)}</strong>
            </span>
            {unitSale > 0 && (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                +{marginPct}% Projected Margin
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Action Buttons ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2 order-2 sm:order-1 w-full sm:w-auto">
          {isModal && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReset}
              disabled={submitting || (!form.itemId && !form.quantity)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-semibold text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Clear Form
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
          <span className="hidden lg:inline text-[11px] text-neutral-400 font-mono">
            Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300">Enter</kbd>
          </span>

          <button
            type="submit"
            disabled={submitting || !form.itemId || !form.quantity || Number(form.quantity) < 1}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-semibold bg-brand-900 hover:bg-brand-950 dark:bg-brand-800 dark:hover:bg-brand-700 text-brand-accent border border-brand-700 hover:border-brand-600 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Spinner size="sm" />
            ) : (
              <svg className="w-4 h-4 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            )}
            <span>Record Stock Inflow</span>
          </button>
        </div>
      </div>
    </form>
  );

  // If used inside a Modal dialog, return standard clean form
  if (isModal) {
    return formJSX;
  }

  // Standalone Page Layout: 2-Column Responsive Split
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Left Column: Form Card */}
      <div className="lg:col-span-7 xl:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-card">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>Log Stock Inflow & Create Lot</span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Replenish branch inventory and register an immutable FIFO batch for precise P&L accounting.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-accent border border-brand-200 dark:border-brand-800">
            FIFO Engine
          </span>
        </div>

        {formJSX}
      </div>

      {/* Right Column: Interactive Digital Goods Receipt Note (GRN) Voucher */}
      <div className="lg:col-span-5 xl:col-span-5 sticky top-6">
        <DigitalGrnVoucher
          branchName={activeBranchName}
          selectedItem={selectedItem}
          quantity={form.quantity}
          costPrice={form.costPrice}
          sellingPrice={form.sellingPrice}
          batchNumber={form.batchNumber}
          note={form.note}
          currentStock={currentQuantity}
          loadingStock={loadingCurrentStock}
        />
      </div>
    </div>
  );
}

// ── Recent Movements Audit Table ───────────────────────────────────────────
export function RecentMovementsTable({ refreshTrigger }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const managerBranchId = user?.branchId;

  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [limit, setLimit] = useState(25);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit };
      if (!isAdmin && managerBranchId) {
        params.branchId = managerBranchId;
      }
      const res = await getMovements(params);
      if (res.data?.success) {
        setMovements(res.data.data || []);
      }
    } catch (err) {
      console.error('getMovements error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, managerBranchId, limit]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent, refreshTrigger]);

  // Filtered movements based on search query & type filter
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      // Type match
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;

      // Search match
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const itemName = m.itemId?.name?.toLowerCase() || '';
      const sku = m.itemId?.sku?.toLowerCase() || '';
      const branch = m.branchId?.name?.toLowerCase() || '';
      const note = m.note?.toLowerCase() || '';
      const creator = m.createdBy
        ? `${m.createdBy.firstName || ''} ${m.createdBy.lastName || ''}`.toLowerCase()
        : '';
      return (
        itemName.includes(q) ||
        sku.includes(q) ||
        branch.includes(q) ||
        note.includes(q) ||
        creator.includes(q)
      );
    });
  }, [movements, typeFilter, searchQuery]);

  // Counts for filter pills
  const counts = useMemo(() => {
    const res = { all: movements.length, purchase: 0, sale: 0, transfer: 0, adjustment: 0 };
    movements.forEach((m) => {
      if (m.type === 'purchase') res.purchase++;
      else if (m.type === 'sale') res.sale++;
      else if (m.type === 'transfer_in' || m.type === 'transfer_out') res.transfer++;
      else if (m.type === 'adjustment') res.adjustment++;
    });
    return res;
  }, [movements]);

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-card space-y-4">
      {/* ── Table Top Bar ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Recent Stock Movements
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              Audit Ledger
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Real-time immutable ledger of purchases, sales disbursements, transfers, and adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 focus:outline-none"
          >
            <option value={10}>Show 10</option>
            <option value={25}>Show 25</option>
            <option value={50}>Show 50</option>
          </select>

          <button
            type="button"
            onClick={fetchRecent}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors"
            title="Refresh movements"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
              typeFilter === 'all'
                ? 'bg-brand-900 text-brand-accent dark:bg-brand-800'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('purchase')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
              typeFilter === 'purchase'
                ? 'bg-emerald-700 text-white dark:bg-emerald-800'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
            }`}
          >
            Purchases ({counts.purchase})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('sale')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
              typeFilter === 'sale'
                ? 'bg-blue-700 text-white dark:bg-blue-800'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
            }`}
          >
            Sales ({counts.sale})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('adjustment')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
              typeFilter === 'adjustment'
                ? 'bg-amber-700 text-white dark:bg-amber-800'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
            }`}
          >
            Adjustments ({counts.adjustment})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter item, SKU, note..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
          />
        </div>
      </div>

      {/* ── Table Rows ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Spinner size="md" className="text-brand-800 dark:text-brand-accent" />
        </div>
      ) : filteredMovements.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <p className="text-xs text-neutral-400">No matching stock movements found.</p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-brand-700 dark:text-brand-accent font-semibold hover:underline"
            >
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-100 dark:border-neutral-800">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-neutral-200/80 dark:border-neutral-800">
              <tr>
                <th className="py-2.5 px-3.5">Date / Time</th>
                <th className="py-2.5 px-3.5">Item & SKU</th>
                <th className="py-2.5 px-3.5">Branch</th>
                <th className="py-2.5 px-3.5">Type</th>
                <th className="py-2.5 px-3.5 text-right">Inflow / Outflow</th>
                <th className="py-2.5 px-3.5 text-center">Stock Progression</th>
                <th className="py-2.5 px-3.5">Recorded By</th>
                <th className="py-2.5 px-3.5">Supplier Ref / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-neutral-800 dark:text-neutral-200">
              {filteredMovements.map((m) => {
                const isPositive = m.type === 'purchase' || m.type === 'transfer_in';
                const creator = m.createdBy
                  ? `${m.createdBy.firstName || ''} ${m.createdBy.lastName || ''}`.trim()
                  : 'System';
                const initials = creator
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <tr key={m._id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-3.5 whitespace-nowrap text-neutral-500 dark:text-neutral-400 font-mono text-[11px]">
                      {fmtd(m.createdAt)}
                    </td>
                    <td className="py-3 px-3.5 font-medium whitespace-nowrap">
                      <div>
                        <span className="text-neutral-900 dark:text-white font-semibold">{m.itemId?.name || 'Item'}</span>
                        {m.itemId?.sku && (
                          <span className="text-[10px] text-neutral-400 block font-mono mt-0.5">
                            {m.itemId.sku}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                      {m.branchId?.name || '—'}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <MovementTypeBadge type={m.type} />
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}
                      >
                        {isPositive ? '+' : '-'}{fmt(m.quantity)} {m.itemId?.unit || ''}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-center font-mono text-[11px] whitespace-nowrap text-neutral-500 dark:text-neutral-400">
                      <span>{fmt(m.previousQuantity)}</span>
                      <span className="mx-1.5 text-neutral-400">→</span>
                      <span className="font-semibold text-neutral-900 dark:text-white">{fmt(m.newQuantity)}</span>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap text-neutral-600 dark:text-neutral-400 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-[9px] font-bold flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                          {initials || 'S'}
                        </span>
                        <span>{creator || 'Staff'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 max-w-[200px] truncate text-neutral-500 dark:text-neutral-400 text-[11px]" title={m.note || ''}>
                      {m.note || <span className="italic text-neutral-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Table Footer count */}
      <div className="pt-2 flex items-center justify-between text-xs text-neutral-400">
        <span>Showing {filteredMovements.length} of {movements.length} logged movements</span>
        <span className="font-mono text-[11px]">FIFO Ledger Audit ID: #AUDIT-LEDGER-OK</span>
      </div>
    </div>
  );
}

// ── Standalone Page Component ───────────────────────────────────────────────
export default function PurchaseEntry() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const managerBranchId = user?.branchId;

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <DashboardLayout>
      <div className="w-full space-y-6 pb-12">
        {/* ── Page Header ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Purchase Entry
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                Stock Intake
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Record new inventory shipments, replenish branch stock, and track FIFO cost lots in real time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/stock"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors border border-neutral-200 dark:border-neutral-700 shadow-sm"
            >
              <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
              </svg>
              <span>View Stock Inventory</span>
            </Link>
          </div>
        </div>

        {/* ── Top Metric KPI Summary Bar ─────────────────────────────── */}
        <PurchaseKpiBar
          branchId={!isAdmin ? managerBranchId : undefined}
          refreshTrigger={refreshTrigger}
        />

        {/* ── Purchase Inflow Form & Live Digital GRN Voucher Split ───── */}
        <PurchaseEntryForm onSuccess={() => setRefreshTrigger((p) => p + 1)} />

        {/* ── Recent Movements Audit Trail ───────────────────────────── */}
        <RecentMovementsTable refreshTrigger={refreshTrigger} />
      </div>

      {/* ── Print Styles for Goods Receipt Note ───────────────────────── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #grn-voucher-container, #grn-voucher-container * {
            visibility: visible !important;
          }
          #grn-voucher-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
