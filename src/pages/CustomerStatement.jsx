import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import { useAuth } from '../context/AuthContext';
import { getCustomerLedger, recordPayment } from '../services/paymentService';
import { getSales } from '../services/saleService';

import {
  Badge,
  DataTable,
  DashboardLayout,
  Modal,
  CustomSelect,
  Spinner,
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
    hour: '2-digit',
    minute: '2-digit',
  });
};

const fmtdShort = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// ── Custom Tooltip for Recharts ─────────────────────────────────────────────
function StatementChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 shadow-xl text-xs space-y-1 z-50">
      <div className="flex items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-1">
        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{data.formattedDate}</span>
        <span
          className={`inline-flex px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
            data.type === 'payment'
              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              : data.type === 'sale'
                ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600'
          }`}
        >
          {data.type}
        </span>
      </div>
      {data.amount !== undefined && (
        <div className="flex items-center justify-between gap-4 text-neutral-600 dark:text-neutral-400">
          <span>Amount:</span>
          <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
            ${fmt(data.amount)}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 text-neutral-600 dark:text-neutral-400">
        <span>Running Balance:</span>
        <span className="font-mono font-bold text-brand-800 dark:text-brand-accent">
          ${fmt(data.balanceAfter)}
        </span>
      </div>
    </div>
  );
}

export default function CustomerStatement() {
  const { id: customerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const canRecordPayment = ['admin', 'manager', 'cashier'].includes(user?.role);

  // Statement Data State
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [entries, setEntries] = useState([]);

  // Sort toggle for ledger entries (true = oldest first / chronological; false = newest first)
  const [chronologicalOrder, setChronologicalOrder] = useState(true);

  // Modal State for Recording Payment
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payRefSale, setPayRefSale] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [customerSales, setCustomerSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);

  // Fetch full ledger for customer
  const fetchLedger = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      // Fetch up to 200 chronological entries for full statement and chart history
      const res = await getCustomerLedger(customerId, { limit: 200 });
      if (res.data?.success) {
        const d = res.data.data;
        setCustomer(d.customer);
        setEntries(d.entries || []);
      } else {
        toast.error(res.data?.message || 'Failed to load statement');
      }
    } catch (err) {
      console.error('fetchLedger error:', err);
      toast.error(err.response?.data?.message || 'Failed to load customer statement');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // When opening the payment modal, fetch customer's credit sales for optional reference linking
  const handleOpenPayModal = useCallback(async () => {
    setPayAmount('');
    setPayNote('');
    setPayRefSale('');
    setPayModalOpen(true);

    if (customerId) {
      setLoadingSales(true);
      try {
        const res = await getSales({ customerId, limit: 50 });
        if (res.data?.success) {
          setCustomerSales(res.data.data || []);
        }
      } catch {
        // Optional reference sale fetch failure is non-fatal
      } finally {
        setLoadingSales(false);
      }
    }
  }, [customerId]);

  // Handle Recording Payment submission
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amountNum = Number(payAmount);

    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid payment amount greater than 0');
      return;
    }

    const currentBal = customer?.currentBalance || 0;
    if (amountNum > currentBal) {
      toast.error(`Payment amount ($${fmt(amountNum)}) cannot exceed outstanding balance ($${fmt(currentBal)})`);
      return;
    }

    // Determine branchId: if admin, use customer's branch; else use assigned branch
    let targetBranchId = user?.branchId;
    if (isAdmin) {
      targetBranchId = customer?.branchId?._id ?? customer?.branchId ?? user?.branchId;
    }

    if (!targetBranchId) {
      toast.error('Could not determine branch for this transaction');
      return;
    }

    setSubmittingPayment(true);
    try {
      const payload = {
        customerId,
        branchId: targetBranchId,
        amount: amountNum,
        note: payNote.trim() || null,
        referenceSaleId: payRefSale || null,
      };

      const res = await recordPayment(payload);
      if (res.data?.success) {
        toast.success('Payment recorded successfully');
        setPayModalOpen(false);
        setPayAmount('');
        setPayNote('');
        setPayRefSale('');
        // Refresh customer ledger and balance
        fetchLedger();
      } else {
        toast.error(res.data?.message || 'Failed to record payment');
      }
    } catch (err) {
      console.error('recordPayment error:', err);
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Chart data: Chronological points with date and balanceAfter
  const chartData = useMemo(() => {
    if (!entries.length) {
      if (customer && customer.openingBalance !== undefined) {
        return [
          {
            index: 0,
            date: customer.createdAt || new Date().toISOString(),
            formattedDate: fmtdShort(customer.createdAt),
            type: 'Opening',
            amount: 0,
            balanceAfter: customer.openingBalance || 0,
          },
        ];
      }
      return [];
    }

    // Sort entries strictly oldest first for the chart time-series
    const chronological = [...entries].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const points = [];

    // Add opening balance start point if exists
    if (customer && customer.openingBalance !== undefined && customer.openingBalance > 0) {
      points.push({
        index: 0,
        date: customer.createdAt || chronological[0]?.createdAt,
        formattedDate: fmtdShort(customer.createdAt || chronological[0]?.createdAt),
        type: 'Opening',
        amount: customer.openingBalance,
        balanceAfter: customer.openingBalance,
      });
    }

    chronological.forEach((entry) => {
      points.push({
        index: points.length + 1,
        date: entry.createdAt,
        formattedDate: fmtdShort(entry.createdAt),
        fullDate: fmtd(entry.createdAt),
        type: entry.type === 'payment' ? 'Payment' : 'Sale',
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
      });
    });

    return points;
  }, [entries, customer]);

  // Sorted entries for data table display
  const displayEntries = useMemo(() => {
    const list = [...entries];
    return list.sort((a, b) => {
      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      return chronologicalOrder ? tA - tB : tB - tA;
    });
  }, [entries, chronologicalOrder]);

  // Columns for chronological DataTable
  const tableColumns = [
    {
      key: 'createdAt',
      label: 'Date & Time',
      render: (val) => (
        <span className="text-xs text-neutral-800 dark:text-neutral-200">
          {fmtd(val)}
        </span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      align: 'center',
      render: (val) => {
        const isPayment = val === 'payment';
        return (
          <Badge
            variant={isPayment ? 'success' : 'info'}
            label={isPayment ? 'Payment' : 'Sale'}
            dot
          />
        );
      },
    },
    {
      key: 'reference',
      label: 'Reference Invoice #',
      render: (_, row) => {
        if (row.referenceSaleId) {
          const saleId = row.referenceSaleId?._id || row.referenceSaleId;
          const shortId = String(saleId).slice(-6).toUpperCase();
          return (
            <span
              className="inline-flex items-center gap-1 font-mono text-xs text-brand-800 dark:text-brand-accent font-semibold"
              title={`Sale Reference: ${saleId}`}
            >
              #INV-{shortId}
            </span>
          );
        }
        if (row.type === 'payment') {
          return (
            <span className="text-xs text-neutral-400 dark:text-neutral-500 italic">
              Direct Payment
            </span>
          );
        }
        return <span className="text-xs text-neutral-400 dark:text-neutral-500">—</span>;
      },
    },
    {
      key: 'amount',
      label: 'Amount',
      type: 'currency',
      align: 'right',
      render: (val, row) => {
        const isPayment = row.type === 'payment';
        return (
          <span
            className={`font-mono text-sm font-bold ${
              isPayment
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-neutral-900 dark:text-neutral-100'
            }`}
          >
            {isPayment ? '−' : '+'}${fmt(val)}
          </span>
        );
      },
    },
    {
      key: 'balanceAfter',
      label: 'Running Balance After',
      type: 'currency',
      align: 'right',
      render: (val) => {
        const bal = Number(val || 0);
        return (
          <span
            className={`font-mono text-sm font-bold ${
              bal > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            ${fmt(bal)}
          </span>
        );
      },
    },
    {
      key: 'note',
      label: 'Note / Recorded By',
      render: (val, row) => (
        <div className="max-w-[180px] truncate text-xs">
          {val ? (
            <span className="text-neutral-700 dark:text-neutral-300 block truncate" title={val}>
              {val}
            </span>
          ) : (
            <span className="text-neutral-400 dark:text-neutral-500">—</span>
          )}
          {row.createdBy && (
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">
              by {row.createdBy.firstName} {row.createdBy.lastName}
            </span>
          )}
        </div>
      ),
    },
  ];

  const currentBal = customer?.currentBalance ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ── Breadcrumb & Nav Header ───────────────────────────────── */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/customer-ledgers')}
              className="inline-flex items-center justify-center p-2 rounded-lg text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Back to customer ledgers"
              title="Back to Customer Ledgers"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Link
                  to="/customer-ledgers"
                  className="text-xs font-medium text-neutral-500 hover:text-brand-800 dark:hover:text-brand-accent transition-colors"
                >
                  Customer Ledgers
                </Link>
                <span className="text-neutral-400 text-xs">/</span>
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  {customer?.name || 'Statement'}
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white mt-0.5">
                Customer Ledger Statement
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLedger}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm"
              title="Refresh ledger entries"
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

        {/* ── Customer Header Card ──────────────────────────────────── */}
        {loading && !customer ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-6 shadow-card animate-pulse">
            <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3 mb-4" />
            <div className="h-10 bg-neutral-100 dark:bg-neutral-800/60 rounded w-1/4" />
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-6 shadow-card">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left: Customer Info */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-brand-800 dark:bg-brand-700 text-brand-accent flex items-center justify-center text-xl font-mono font-bold shrink-0 shadow-md">
                  {(customer?.name?.[0] || 'C').toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                      {customer?.name}
                    </h2>
                    <Badge
                      variant={customer?.isActive !== false ? 'success' : 'neutral'}
                      label={customer?.isActive !== false ? 'Active Account' : 'Inactive'}
                      dot
                    />
                    {customer?.branch && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {customer.branch}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 mt-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="font-mono">{customer?.phone || 'No phone'}</span>
                    </span>
                    {customer?.address && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{customer.address}</span>
                      </span>
                    )}
                    <span className="text-neutral-400">
                      Opening: <span className="font-mono font-medium">${fmt(customer?.openingBalance || 0)}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Current Balance + Record Payment CTA */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 border-t lg:border-t-0 pt-4 lg:pt-0 border-neutral-100 dark:border-neutral-800">
                <div className="text-left sm:text-right">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">
                    Current Balance
                  </span>
                  <div className="mt-0.5">
                    <span
                      className={`font-mono text-3xl font-extrabold tracking-tight ${
                        currentBal > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      ${fmt(currentBal)}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500 block mt-0.5">
                    {currentBal > 0 ? 'Outstanding balance owed' : 'Account is fully settled'}
                  </span>
                </div>

                {canRecordPayment && (
                  <button
                    type="button"
                    onClick={handleOpenPayModal}
                    disabled={currentBal <= 0}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent border border-brand-700 hover:bg-brand-950 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Record Payment</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Line Chart: Balance Over Time ─────────────────────────── */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Balance Progression Over Time
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Historical point-in-time running balance after each credit sale and payment received.
              </p>
            </div>
            {chartData.length > 0 && (
              <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">
                {chartData.length} records
              </span>
            )}
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <Spinner size="lg" className="text-brand-800 dark:text-brand-accent" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600">
              <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <p className="text-xs">No historical balance entries recorded yet</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="currentColor"
                    className="text-neutral-200 dark:text-neutral-800"
                  />
                  <XAxis
                    dataKey="formattedDate"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#888888' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#888888' }}
                    tickFormatter={(v) => `$${v}`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip content={<StatementChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="balanceAfter"
                    stroke="#0d3b2e"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#7fd4a8', stroke: '#0d3b2e', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#7fd4a8', stroke: '#0d3b2e', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Chronological DataTable ─────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Ledger Transactions
              </h3>
              <span className="text-xs text-neutral-400 font-mono">
                ({entries.length} {entries.length === 1 ? 'entry' : 'entries'})
              </span>
            </div>

            {/* Sort order toggle */}
            <button
              type="button"
              onClick={() => setChronologicalOrder((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span>{chronologicalOrder ? 'Chronological (Oldest First)' : 'Newest First'}</span>
            </button>
          </div>

          <DataTable
            columns={tableColumns}
            data={displayEntries}
            loading={loading}
            emptyMessage="No ledger transactions found"
            emptySubMessage="When credit sales or payments occur, they will appear chronologically here."
          />
        </div>

        {/* ── Record Payment Modal Form ───────────────────────────────── */}
        <Modal
          isOpen={payModalOpen}
          onClose={() => !submittingPayment && setPayModalOpen(false)}
          title={`Record Payment — ${customer?.name || 'Customer'}`}
        >
          <form onSubmit={handleRecordPayment} className="space-y-4">
            {/* Balance Overview in Modal */}
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Current Outstanding
                </span>
                <p className="font-mono text-lg font-bold text-rose-600 dark:text-rose-400">
                  ${fmt(currentBal)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Branch
                </span>
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {customer?.branch || 'Assigned Branch'}
                </p>
              </div>
            </div>

            {/* Payment Amount */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Payment Amount ($) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                max={currentBal > 0 ? currentBal : undefined}
                step="0.01"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
                placeholder="0.00"
              />
              {Number(payAmount) > currentBal && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                  Payment cannot exceed current balance (${fmt(currentBal)}).
                </p>
              )}
            </div>

            {/* Optional Reference Sale Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Reference Sale / Invoice <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              {loadingSales ? (
                <div className="flex items-center gap-2 text-xs text-neutral-400 py-1">
                  <Spinner size="sm" />
                  <span>Loading sales...</span>
                </div>
              ) : (
                <CustomSelect
                  value={payRefSale}
                  onChange={(e) => setPayRefSale(e.target.value)}
                  className="w-full text-xs py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
                >
                  <option value="">No specific invoice (General Credit Payment)</option>
                  {customerSales.map((sale) => (
                    <option key={sale._id} value={sale._id}>
                      #INV-{sale._id.slice(-6).toUpperCase()} — ${fmt(sale.totalAmount)} (
                      {fmtdShort(sale.createdAt)})
                    </option>
                  ))}
                </CustomSelect>
              )}
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                Optionally link this payment to settle a specific credit sale invoice.
              </p>
            </div>

            {/* Note / Remarks */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Payment Note / Reference <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                maxLength={500}
                placeholder="e.g. Bank transfer ref #1234, cash at counter"
                className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                disabled={submittingPayment}
                className="px-4 py-2 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  submittingPayment ||
                  !payAmount ||
                  Number(payAmount) <= 0 ||
                  Number(payAmount) > currentBal
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent border border-brand-700 hover:bg-brand-950 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingPayment && <Spinner size="sm" />}
                <span>Record Payment</span>
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
