import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { getSales, getSaleById } from '../services/saleService';
import MinimalLayout from '../components/layout/MinimalLayout';
import { StatCard, DataTable, Modal } from '../components/ui';

const fmt = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatTime = (isoStr) => {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (isoStr) => {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function CashierSalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'yesterday' | 'week' | 'all'
  const [paymentFilter, setPaymentFilter] = useState(''); // '' | 'cash' | 'credit'
  const [searchQuery, setSearchQuery] = useState('');

  // Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      // Backend automatically scopes to cashier's branch via allowedBranchId
      const res = await getSales({ limit: 100 });
      if (res.data?.success) {
        setSales(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch sales history:', err);
      toast.error('Failed to load sales history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // View Receipt Handler
  const handleViewReceipt = async (sale) => {
    setSelectedSale(sale);
    setReceiptModalOpen(true);
    try {
      const res = await getSaleById(sale._id);
      if (res.data?.success) {
        setSelectedSale(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load full sale details:', err);
    }
  };

  // ── Filter logic ───────────────────────────────────────────────────────────
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    return sales.filter((s) => {
      const sDate = new Date(s.createdAt);

      // Date range
      if (dateFilter === 'today' && sDate < todayStart) return false;
      if (dateFilter === 'yesterday') {
        if (sDate < yesterdayStart || sDate >= todayStart) return false;
      }
      if (dateFilter === 'week' && sDate < weekStart) return false;

      // Payment Type
      if (paymentFilter && s.paymentType !== paymentFilter) return false;

      // Search Query (invoice number, note, or customer name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const ref = (s._id || '').toLowerCase();
        const note = (s.note || '').toLowerCase();
        const cust = (s.customerId?.name || '').toLowerCase();
        if (!ref.includes(q) && !note.includes(q) && !cust.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [sales, dateFilter, paymentFilter, searchQuery]);

  // ── Summary Metrics ────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    let totalRev = 0;
    let cashTotal = 0;
    let creditTotal = 0;

    filteredSales.forEach((s) => {
      const amt = Number(s.totalAmount) || 0;
      totalRev += amt;
      if (s.paymentType === 'cash') cashTotal += amt;
      else if (s.paymentType === 'credit') creditTotal += amt;
    });

    return {
      count: filteredSales.length,
      totalRevenue: totalRev,
      cashRevenue: cashTotal,
      creditRevenue: creditTotal,
    };
  }, [filteredSales]);

  // ── Table Column Definitions ───────────────────────────────────────────────
  const columns = [
    {
      key: 'createdAt',
      label: 'Date & Time',
      sortable: true,
      render: (val) => (
        <div>
          <div className="font-semibold text-neutral-900 dark:text-neutral-100">
            {formatTime(val)}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono">{formatDate(val)}</div>
        </div>
      ),
    },
    {
      key: '_id',
      label: 'Receipt / Ref #',
      render: (val) => (
        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
          #{String(val || '').slice(-6).toUpperCase()}
        </span>
      ),
    },
    {
      key: 'paymentType',
      label: 'Payment Method',
      sortable: true,
      render: (type) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
            type === 'cash'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-accent'
          }`}
        >
          {type === 'cash' ? 'Cash' : 'Credit'}
        </span>
      ),
    },
    {
      key: 'customerId',
      label: 'Customer / Account',
      render: (cust) => {
        if (!cust) return <span className="text-xs text-neutral-400 italic">Counter Sale</span>;
        return (
          <div>
            <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
              {cust.name}
            </div>
            {cust.phone && (
              <div className="text-[11px] text-neutral-400 font-mono">{cust.phone}</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'items',
      label: 'Items Sold',
      render: (itemsList = []) => {
        const totalItems = itemsList.reduce((sum, it) => sum + (it.quantity || 1), 0);
        return (
          <div className="text-xs">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              {totalItems} item{totalItems === 1 ? '' : 's'}
            </span>
            <span className="text-[11px] text-neutral-400 ml-1">
              ({itemsList.length} SKU{itemsList.length === 1 ? '' : 's'})
            </span>
          </div>
        );
      },
    },
    {
      key: 'totalAmount',
      label: 'Total Amount',
      type: 'currency',
      sortable: true,
      render: (val) => (
        <div className="text-right">
          <span className="font-mono text-sm font-bold text-neutral-900 dark:text-neutral-50">
            ${fmt(val)}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Receipt',
      align: 'center',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => handleViewReceipt(row)}
          className="p-1.5 rounded-lg text-brand-700 dark:text-brand-accent hover:bg-brand-50 dark:hover:bg-brand-950/40 font-semibold text-xs transition-colors flex items-center gap-1 mx-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>View</span>
        </button>
      ),
    },
  ];

  return (
    <MinimalLayout>
      <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-w-[1600px] mx-auto w-full">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight flex items-center gap-2">
              <span className="p-2 rounded-xl bg-brand-50 dark:bg-brand-900/50 text-brand-800 dark:text-brand-accent">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <span>Branch Sales History</span>
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Read-only register transactions scoped strictly to your assigned store counter.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchSales}
            className="btn-secondary self-start sm:self-auto text-xs py-2 px-3 flex items-center gap-1.5 shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        {/* ── Summary StatCards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Shift Sales"
            value={`$${fmt(metrics.totalRevenue)}`}
            subtitle={`${metrics.count} completed transactions`}
            icon={
              <svg className="w-5 h-5 text-brand-800 dark:text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Cash Collected"
            value={`$${fmt(metrics.cashRevenue)}`}
            subtitle="Immediate cash tender"
            icon={
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
          <StatCard
            title="Credit Charged"
            value={`$${fmt(metrics.creditRevenue)}`}
            subtitle="Added to customer balances"
            icon={
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            }
          />
          <StatCard
            title="Transactions"
            value={metrics.count}
            subtitle="Filtered transaction volume"
            icon={
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
        </div>

        {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <svg className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by receipt ID, note, or customer..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
          </div>

          {/* Date range pills */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl shrink-0">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: '7 Days' },
              { id: 'all', label: 'All' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDateFilter(t.id)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  dateFilter === t.id
                    ? 'bg-white dark:bg-neutral-900 text-brand-800 dark:text-brand-accent shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Payment Method filter */}
          <div className="w-full sm:w-36 shrink-0">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full py-1.5 px-3 text-xs bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
            >
              <option value="">All Payments</option>
              <option value="cash">Cash Only</option>
              <option value="credit">Credit Only</option>
            </select>
          </div>
        </div>

        {/* ── DataTable ──────────────────────────────────────────────────────── */}
        <DataTable
          columns={columns}
          data={filteredSales}
          loading={loading}
          emptyMessage="No sales transactions found"
          emptySubMessage={
            searchQuery || paymentFilter || dateFilter !== 'today'
              ? 'No sales matched your active filters.'
              : 'Transactions completed from the POS terminal will appear here automatically.'
          }
        />
      </div>

      {/* ── Modal: Receipt Details ───────────────────────────────────────────── */}
      <Modal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        title="Transaction Receipt"
        maxWidth="max-w-md"
      >
        {selectedSale && (
          <div className="space-y-4 mt-2">
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 space-y-3">
              <div className="flex justify-between items-start pb-2 border-b border-neutral-200 dark:border-neutral-700">
                <div>
                  <div className="text-[11px] uppercase font-bold text-neutral-400">
                    Receipt ID
                  </div>
                  <div className="font-mono text-sm font-bold text-neutral-900 dark:text-white">
                    #{String(selectedSale._id).slice(-8).toUpperCase()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-neutral-400">Date & Time</div>
                  <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {formatDate(selectedSale.createdAt)} · {formatTime(selectedSale.createdAt)}
                  </div>
                </div>
              </div>

              {/* Customer info if present */}
              {selectedSale.customerId && (
                <div className="flex justify-between items-center text-xs pb-2 border-b border-neutral-200 dark:border-neutral-700">
                  <span className="text-neutral-500">Customer:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {typeof selectedSale.customerId === 'object'
                      ? selectedSale.customerId?.name
                      : 'Account Customer'}
                  </span>
                </div>
              )}

              {/* Line items list */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase text-neutral-400">Items Purchased</div>
                <div className="divide-y divide-neutral-200/60 dark:divide-neutral-700/60 max-h-48 overflow-y-auto pr-1">
                  {selectedSale.items?.map((it, idx) => (
                    <div key={idx} className="py-1.5 flex justify-between text-xs">
                      <div>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {it.itemName}
                        </span>
                        <div className="text-[11px] text-neutral-400 font-mono">
                          {it.quantity} x ${fmt(it.sellingPrice)}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        ${fmt(it.lineTotal || it.quantity * it.sellingPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 space-y-1 text-xs">
                <div className="flex justify-between text-neutral-500">
                  <span>Subtotal</span>
                  <span className="font-mono">${fmt(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount</span>
                    <span className="font-mono">-${fmt(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-neutral-900 dark:text-white pt-1 border-t border-neutral-200 dark:border-neutral-700">
                  <span>Total Paid</span>
                  <span className="font-mono">${fmt(selectedSale.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-neutral-500 text-[11px] pt-1">
                  <span>Payment Type</span>
                  <span className="font-bold uppercase text-brand-800 dark:text-brand-accent">
                    {selectedSale.paymentType}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-secondary px-4 py-2 text-xs flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print Copy</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="btn-primary px-4 py-2 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </MinimalLayout>
  );
}
