import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { addStock, getStock, getMovements } from '../services/stockService';
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
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
  },
  sale: {
    label: 'Sale',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50',
  },
  transfer_in: {
    label: 'Transfer In',
    className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50',
  },
  transfer_out: {
    label: 'Transfer Out',
    className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/50',
  },
  adjustment: {
    label: 'Adjustment',
    className: 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
  },
};

function MovementTypeBadge({ type }) {
  const cfg = MOVEMENT_TYPE_BADGES[type] || {
    label: type,
    className: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.className}`}>
      {cfg.label}
    </span>
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
  const isAdmin = user?.role === 'admin';
  const managerBranchId = user?.branchId;

  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [stockMap, setStockMap] = useState(new Map()); // `${branchId}:${itemId}` -> current quantity

  const [form, setForm] = useState({
    branchId: !isAdmin ? (managerBranchId ?? '') : (preselectedBranchId || ''),
    itemId: preselectedItemId || '',
    quantity: '',
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

  // Manager locked branch name
  const userBranchName = useMemo(() => {
    if (!managerBranchId) return 'Assigned Branch';
    const b = branches.find((item) => item._id === managerBranchId);
    return b?.name || 'Assigned Branch';
  }, [managerBranchId, branches]);

  // Fetch current stock when branch or item changes to compute live preview
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

  // Live Preview Calculation
  const activeBranchId = isAdmin ? form.branchId : managerBranchId;
  const currentQuantity = useMemo(() => {
    if (!activeBranchId || !form.itemId) return 0;
    return stockMap.get(`${activeBranchId}:${form.itemId}`) ?? 0;
  }, [activeBranchId, form.itemId, stockMap]);

  const addedQuantity = Number(form.quantity) || 0;
  const newQuantity = currentQuantity + addedQuantity;

  const selectedItem = items.find((i) => i._id === form.itemId);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        note: form.note.trim() || null,
      };

      const res = await addStock(payload);
      if (res.data?.success) {
        toast.success(`Added ${qty} ${selectedItem?.unit || 'units'} to stock!`);
        // Reset form inputs (retain branch for rapid multiple entries)
        setForm((prev) => ({
          ...prev,
          itemId: '',
          quantity: '',
          note: '',
        }));

        // Update local map
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Branch Selection */}
      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          Branch <span className="text-rose-500">*</span>
        </label>
        {isAdmin ? (
          <CustomSelect
            required
            value={form.branchId}
            onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
            className="w-full text-xs py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
          >
            <option value="">Select Receiving Branch</option>
            {branches
              .filter((b) => b.isActive)
              .map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
          </CustomSelect>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-300">
            <svg className="w-3.5 h-3.5 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="font-medium">{userBranchName}</span>
          </div>
        )}
      </div>

      {/* Item Selection */}
      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          Select Inventory Item <span className="text-rose-500">*</span>
        </label>
        <CustomSelect
          required
          value={form.itemId}
          onChange={(e) => setForm((p) => ({ ...p, itemId: e.target.value }))}
          className="w-full text-xs py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
        >
          <option value="">Select Product / Item</option>
          {items
            .filter((i) => i.isActive)
            .map((i) => (
              <option key={i._id} value={i._id}>
                {i.name} {i.sku ? `(${i.sku})` : ''} — Unit: {i.unit || 'piece'}
              </option>
            ))}
        </CustomSelect>
      </div>

      {/* Quantity & Live Preview */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Quantity to Add <span className="text-rose-500">*</span>
          </label>

          {/* Live Preview Indicator */}
          {form.itemId && (
            <div className="flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-900/40 text-brand-900 dark:text-brand-accent border border-brand-200 dark:border-brand-700/50">
              <span className="text-neutral-500 dark:text-neutral-400">Current:</span>
              <span className="font-bold">{loadingCurrentStock ? '…' : fmt(currentQuantity)}</span>
              <svg className="w-3.5 h-3.5 text-brand-700 dark:text-brand-accent mx-0.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span className="text-neutral-500 dark:text-neutral-400">New:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {fmt(newQuantity)}
              </span>
            </div>
          )}
        </div>

        <input
          type="number"
          min="1"
          step="1"
          required
          value={form.quantity}
          onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
          placeholder="e.g. 25"
          className="w-full px-3 py-2 text-sm font-mono rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
        />
        {selectedItem?.unit && (
          <p className="text-[11px] text-neutral-400 mt-1">
            Unit of measurement: <span className="font-medium text-neutral-600 dark:text-neutral-300">{selectedItem.unit}</span>
          </p>
        )}
      </div>

      {/* Optional Note */}
      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          Purchase Note / Invoice Reference <span className="text-neutral-400 font-normal">(Optional)</span>
        </label>
        <input
          type="text"
          maxLength={500}
          value={form.note}
          onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
          placeholder="e.g. Supplier invoice #INV-8821, Batch received in good order"
          className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
        />
      </div>

      {/* Form Buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
        {isModal && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={submitting || !form.itemId || !form.quantity || Number(form.quantity) < 1}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent border border-brand-700 hover:bg-brand-950 transition-colors shadow-sm disabled:opacity-50"
        >
          {submitting && <Spinner size="sm" />}
          <span>Record Stock Inflow</span>
        </button>
      </div>
    </form>
  );
}

// ── Recent Movements Mini Table ─────────────────────────────────────────────
export function RecentMovementsTable({ refreshTrigger }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const managerBranchId = user?.branchId;

  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 10 };
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
  }, [isAdmin, managerBranchId]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent, refreshTrigger]);

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-4 shadow-card">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
            Recent Stock Movements (Last 10)
          </h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Real-time audit log of inventory increments, sales dispatches, and adjustments.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchRecent}
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 transition-colors"
          title="Refresh movements"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="py-6 flex justify-center">
          <Spinner size="md" className="text-brand-800 dark:text-brand-accent" />
        </div>
      ) : movements.length === 0 ? (
        <div className="py-6 text-center text-xs text-neutral-400">
          No recent stock movements recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 font-semibold">
              <tr>
                <th className="py-2 px-3">Date / Time</th>
                <th className="py-2 px-3">Item</th>
                <th className="py-2 px-3">Branch</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3 text-right">Quantity</th>
                <th className="py-2 px-3 text-center">Movement (Prev → New)</th>
                <th className="py-2 px-3">Recorded By</th>
                <th className="py-2 px-3">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
              {movements.map((m) => {
                const isPositive = m.type === 'purchase' || m.type === 'transfer_in';
                const creator = m.createdBy
                  ? `${m.createdBy.firstName || ''} ${m.createdBy.lastName || ''}`.trim()
                  : 'System';

                return (
                  <tr key={m._id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30">
                    <td className="py-2.5 px-3 whitespace-nowrap text-neutral-500 dark:text-neutral-400 font-mono text-[11px]">
                      {fmtd(m.createdAt)}
                    </td>
                    <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                      <div>
                        <span>{m.itemId?.name || 'Item'}</span>
                        {m.itemId?.sku && (
                          <span className="text-[10px] text-neutral-400 block font-mono">
                            {m.itemId.sku}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                      {m.branchId?.name || '—'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <MovementTypeBadge type={m.type} />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                      <span className={isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {isPositive ? '+' : '-'}{fmt(m.quantity)} {m.itemId?.unit || ''}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] whitespace-nowrap text-neutral-500 dark:text-neutral-400">
                      <span>{fmt(m.previousQuantity)}</span>
                      <span className="mx-1 text-neutral-400">→</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{fmt(m.newQuantity)}</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-neutral-600 dark:text-neutral-400 text-[11px]">
                      {creator || 'Staff'}
                    </td>
                    <td className="py-2.5 px-3 max-w-[180px] truncate text-neutral-500 dark:text-neutral-400" title={m.note || ''}>
                      {m.note || <span className="italic text-neutral-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Standalone Page Component ───────────────────────────────────────────────
export default function PurchaseEntry() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Purchase Entry
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-brand-50 text-brand-800 dark:bg-brand-900/60 dark:text-brand-accent border border-brand-200/60 dark:border-brand-700/50">
                Stock Inflow
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Record new inventory shipments, replenish branch stock quantities, and audit incoming deliveries.
            </p>
          </div>

          <Link
            to="/stock"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-800 dark:text-brand-accent hover:underline self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Inventory</span>
          </Link>
        </div>

        {/* Purchase Entry Form Card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-5 shadow-card max-w-2xl">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white mb-1">
            Log Stock Receipt
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
            Select the receiving branch and item to see live pre- and post-stock calculation before committing.
          </p>

          <PurchaseEntryForm onSuccess={() => setRefreshTrigger((p) => p + 1)} />
        </div>

        {/* Recent Movements Audit Table */}
        <RecentMovementsTable refreshTrigger={refreshTrigger} />
      </div>
    </DashboardLayout>
  );
}
