import CustomSelect from '../components/ui/CustomSelect';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { createSale, getSales, getSaleById } from '../services/saleService';
import { getBranches } from '../services/branchService';
import { getItems } from '../services/itemService';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';

// ── Helpers ───────────────────────────────────────────────────────────────
const fmt = (n) => Number(n ?? 0).toFixed(2);
const round2 = (n) => Math.round(Number(n) * 100) / 100;

// ── Badges ────────────────────────────────────────────────────────────────
function PaymentBadge({ type }) {
  return type === 'cash' ? (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      Cash
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
      Credit
    </span>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────
function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-600">
      <span>
        Page {page} of {totalPages} · {total} total
      </span>
      <div className="flex gap-2">
        <button
          className="btn-secondary py-1 px-3 text-xs"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          className="btn-secondary py-1 px-3 text-xs"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ── Line item row (defined outside Sales for stable identity) ─────────────
function LineItemRow({ line, index, items, onUpdate, onRemove }) {
  const selectedItem = items.find((i) => i._id === line.itemId);

  const handleField = (field, val) => onUpdate(index, { ...line, [field]: val });

  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      {/* Item */}
      <div className="col-span-5">
        {index === 0 && <label className="label">Item *</label>}
        <CustomSelect
          required
          value={line.itemId}
          onChange={(e) => {
            const item = items.find((i) => i._id === e.target.value);
            onUpdate(index, {
              ...line,
              itemId: e.target.value,
              sellingPrice: item ? String(item.sellingPrice) : '',
            });
          }}
          className="input-field"
        >
          <option value="">Select item</option>
          {items
            .filter((i) => i.isActive)
            .map((i) => (
              <option key={i._id} value={i._id}>
                {i.name}
                {i.sku ? ` (${i.sku})` : ''}
              </option>
            ))}
        </CustomSelect>
      </div>

      {/* Qty */}
      <div className="col-span-2">
        {index === 0 && <label className="label">Qty *</label>}
        <input
          type="number"
          min="1"
          step="1"
          required
          value={line.quantity}
          onChange={(e) => handleField('quantity', e.target.value)}
          className="input-field"
          placeholder="1"
        />
      </div>

      {/* Price */}
      <div className="col-span-3">
        {index === 0 && <label className="label">Unit Price *</label>}
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={line.sellingPrice}
          onChange={(e) => handleField('sellingPrice', e.target.value)}
          className="input-field"
          placeholder="0.00"
        />
      </div>

      {/* Line total */}
      <div className="col-span-1">
        {index === 0 && <label className="label">Total</label>}
        <p className="text-sm font-medium text-gray-700 py-2 text-right">
          {fmt(round2(Number(line.quantity || 0) * Number(line.sellingPrice || 0)))}
        </p>
      </div>

      {/* Remove */}
      <div className="col-span-1 flex items-end pb-0.5">
        {index === 0 && <div className="label invisible">X</div>}
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          aria-label="Remove line"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

const EMPTY_LINE = { itemId: '', quantity: '1', sellingPrice: '' };

// ── New Sale Form (defined outside Sales for stable identity) ─────────────
function NewSaleForm({
  branches,
  items,
  customers,
  userRole,
  allowedBranchId,
  onSubmit,
  onCancel,
  saving,
}) {
  const isAdmin = userRole === 'admin';

  const [form, setForm] = useState({
    branchId: isAdmin ? '' : (allowedBranchId ?? ''),
    paymentType: 'cash',
    customerId: '',
    discount: '0',
    amountPaid: '',
    note: '',
  });
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);

  const set = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  // Recalculate derived totals
  const subtotal = round2(
    lines.reduce((s, l) => s + round2(Number(l.quantity || 0) * Number(l.sellingPrice || 0)), 0)
  );
  const discount = round2(Number(form.discount || 0));
  const totalAmount = round2(subtotal - discount);

  // Auto-fill amountPaid for cash
  useEffect(() => {
    if (form.paymentType === 'cash') {
      setForm((p) => ({ ...p, amountPaid: String(totalAmount) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, form.paymentType]);

  const updateLine = (idx, updated) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? updated : l)));

  const removeLine = (idx) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const addLine = () => setLines((prev) => [...prev, { ...EMPTY_LINE }]);

  const amountPaid = round2(Number(form.amountPaid || 0));
  const balanceDue = round2(totalAmount - amountPaid);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (lines.some((l) => !l.itemId || !l.quantity || l.sellingPrice === '')) {
      toast.error('Fill in all item fields');
      return;
    }
    const payload = {
      branchId: form.branchId,
      paymentType: form.paymentType,
      customerId: form.customerId || null,
      items: lines.map((l) => ({
        itemId: l.itemId,
        quantity: Number(l.quantity),
        sellingPrice: Number(l.sellingPrice),
      })),
      discount: discount,
      amountPaid: amountPaid,
      note: form.note || null,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Branch — admin picks, others see locked branch */}
      {isAdmin ? (
        <div>
          <label className="label">
            Branch <span className="text-red-500">*</span>
          </label>
          <CustomSelect
            required
            value={form.branchId}
            onChange={(e) => set('branchId', e.target.value)}
            className="input-field"
          >
            <option value="">Select branch</option>
            {branches
              .filter((b) => b.isActive)
              .map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
          </CustomSelect>
        </div>
      ) : (
        <div>
          <label className="label">Branch</label>
          <input
            value={branches.find((b) => b._id === allowedBranchId)?.name ?? '—'}
            disabled
            className="input-field"
          />
        </div>
      )}

      {/* Payment type */}
      <div>
        <label className="label">
          Payment type <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-3">
          {['cash', 'credit'].map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="paymentType"
                value={t}
                checked={form.paymentType === t}
                onChange={() => {
                  set('paymentType', t);
                  set('customerId', '');
                }}
                className="text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 capitalize">{t}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Customer — required for credit, optional for cash */}
      <div>
        <label className="label">
          Customer {form.paymentType === 'credit' && <span className="text-red-500">*</span>}
        </label>
        <CustomSelect
          required={form.paymentType === 'credit'}
          value={form.customerId}
          onChange={(e) => set('customerId', e.target.value)}
          className="input-field"
        >
          <option value="">
            {form.paymentType === 'cash' ? 'No customer (optional)' : 'Select customer'}
          </option>
          {customers.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
              {c.phone ? ` — ${c.phone}` : ''}
            </option>
          ))}
        </CustomSelect>
      </div>

      {/* Line items */}
      <div>
        <label className="label">
          Items <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {lines.map((line, idx) => (
            <LineItemRow
              key={idx}
              index={idx}
              line={line}
              items={items}
              onUpdate={updateLine}
              onRemove={removeLine}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addLine}
          className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add item
        </button>
      </div>

      {/* Discount + totals summary */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span className="font-medium">{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between items-center text-gray-600">
          <span>Discount</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.discount}
            onChange={(e) => set('discount', e.target.value)}
            className="input-field w-28 py-1 text-right"
            placeholder="0.00"
          />
        </div>
        <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1.5">
          <span>Total</span>
          <span>{fmt(totalAmount)}</span>
        </div>
      </div>

      {/* Amount paid */}
      <div>
        <label className="label">
          Amount paid <span className="text-red-500">*</span>
          {form.paymentType === 'cash' && (
            <span className="ml-1 text-xs text-gray-400">(auto-filled for cash)</span>
          )}
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={form.amountPaid}
          onChange={(e) => set('amountPaid', e.target.value)}
          disabled={form.paymentType === 'cash'}
          className="input-field"
          placeholder="0.00"
        />
        {form.paymentType === 'credit' && amountPaid >= 0 && (
          <p className={`text-xs mt-1 ${balanceDue > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            Balance due after sale: {fmt(balanceDue)}
          </p>
        )}
      </div>

      {/* Note */}
      <div>
        <label className="label">Note</label>
        <input
          type="text"
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
          className="input-field"
          placeholder="Optional note"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Spinner size="sm" className="mr-2" />}
          Record sale
        </button>
      </div>
    </form>
  );
}

// ── Sale detail modal ─────────────────────────────────────────────────────
function SaleDetail({ sale, onClose }) {
  if (!sale) return null;
  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500">Date</p>
          <p className="font-medium">{new Date(sale.createdAt).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-500">Payment type</p>
          <PaymentBadge type={sale.paymentType} />
        </div>
        <div>
          <p className="text-gray-500">Customer</p>
          <p className="font-medium">{sale.customerId?.name ?? '—'}</p>
          {sale.customerId?.phone && (
            <p className="text-gray-400 text-xs">{sale.customerId.phone}</p>
          )}
        </div>
        <div>
          <p className="text-gray-500">Recorded by</p>
          <p className="font-medium">
            {sale.createdBy ? `${sale.createdBy.firstName} ${sale.createdBy.lastName}` : '—'}
          </p>
        </div>
        {sale.note && (
          <div className="col-span-2">
            <p className="text-gray-500">Note</p>
            <p className="font-medium">{sale.note}</p>
          </div>
        )}
      </div>

      {/* Line items table */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Items</p>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Item', 'Qty', 'Unit Price', 'Cost at Sale', 'Line Total'].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {(sale.items ?? []).map((line, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 font-medium text-gray-900">{line.itemName}</td>
                  <td className="px-3 py-2 text-gray-600">{line.quantity}</td>
                  <td className="px-3 py-2 text-gray-600">{fmt(line.sellingPrice)}</td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{fmt(line.costPriceAtSale)}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{fmt(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals summary */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>{fmt(sale.subtotal)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>Discount</span>
            <span>− {fmt(sale.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1">
          <span>Total</span>
          <span>{fmt(sale.totalAmount)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Amount paid</span>
          <span>{fmt(sale.amountPaid)}</span>
        </div>
        {sale.balanceDue > 0 && (
          <div className="flex justify-between font-semibold text-amber-700">
            <span>Balance due</span>
            <span>{fmt(sale.balanceDue)}</span>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

// ── Main Sales page ───────────────────────────────────────────────────────
export default function Sales() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Reference data
  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);

  // List state
  const [sales, setSales] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterBranch, setFilterBranch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [page, setPage] = useState(1);

  // New sale modal
  const [newOpen, setNewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detail modal
  const [detailSale, setDetailSale] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  // ── Load reference data ─────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      // Load branches for all roles (non-admin needs name display)
      getBranches()
        .then((r) => setBranches(r.data.data))
        .catch(() => {});
      // Load items
      getItems()
        .then((r) => setItems(r.data.data))
        .catch(() => {});
      // Load customers (separate so one failure does not block others)
      api
        .get('/customers')
        .then((r) => setCustomers(r.data.data ?? []))
        .catch(() => {});
    };
    load();
  }, []);

  // ── Fetch sales list ────────────────────────────────────────────────────
  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (isAdmin && filterBranch) params.branchId = filterBranch;
      if (filterType) params.paymentType = filterType;
      if (filterStart) params.startDate = filterStart;
      if (filterEnd) params.endDate = filterEnd;

      const { data } = await getSales(params);
      setSales(data.data);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load sales');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, filterBranch, filterType, filterStart, filterEnd, page]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // ── Create sale ─────────────────────────────────────────────────────────
  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      await createSale(payload);
      toast.success('Sale recorded');
      setNewOpen(false);
      setPage(1);
      fetchSales();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record sale');
    } finally {
      setSaving(false);
    }
  };

  // ── Open detail ─────────────────────────────────────────────────────────
  const openDetail = async (id) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailSale(null);
    try {
      const { data } = await getSaleById(id);
      setDetailSale(data.data);
    } catch {
      toast.error('Failed to load sale details');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-sm text-gray-500 mt-0.5">Record and review cash and credit sales</p>
        </div>
        <button className="btn-primary" onClick={() => setNewOpen(true)}>
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New sale
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        {isAdmin && (
          <div>
            <label className="label text-xs">Branch</label>
            <CustomSelect
              value={filterBranch}
              onChange={(e) => {
                setFilterBranch(e.target.value);
                setPage(1);
              }}
              className="input-field w-auto text-sm py-2"
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </CustomSelect>
          </div>
        )}
        <div>
          <label className="label text-xs">Type</label>
          <CustomSelect
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="input-field w-auto text-sm py-2"
          >
            <option value="">All types</option>
            <option value="cash">Cash</option>
            <option value="credit">Credit</option>
          </CustomSelect>
        </div>
        <div>
          <label className="label text-xs">From</label>
          <input
            type="date"
            value={filterStart}
            onChange={(e) => {
              setFilterStart(e.target.value);
              setPage(1);
            }}
            className="input-field text-sm py-2"
          />
        </div>
        <div>
          <label className="label text-xs">To</label>
          <input
            type="date"
            value={filterEnd}
            onChange={(e) => {
              setFilterEnd(e.target.value);
              setPage(1);
            }}
            className="input-field text-sm py-2"
          />
        </div>
        {(filterBranch || filterType || filterStart || filterEnd) && (
          <button
            className="btn-secondary text-sm py-2"
            onClick={() => {
              setFilterBranch('');
              setFilterType('');
              setFilterStart('');
              setFilterEnd('');
              setPage(1);
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-primary-600" />
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg
              className="w-10 h-10 mx-auto mb-3 opacity-40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm">No sales found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Date', 'Customer', 'Type', 'Total', 'Paid', 'Balance Due', 'By', ''].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {sales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {sale.customerId?.name ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentBadge type={sale.paymentType} />
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {fmt(sale.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{fmt(sale.amountPaid)}</td>
                      <td className="px-4 py-3 text-sm">
                        {sale.balanceDue > 0 ? (
                          <span className="font-medium text-amber-700">{fmt(sale.balanceDue)}</span>
                        ) : (
                          <span className="text-green-600">0.00</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {sale.createdBy
                          ? `${sale.createdBy.firstName} ${sale.createdBy.lastName}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="btn-secondary py-1 px-3 text-xs"
                          onClick={() => openDetail(sale._id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* New sale modal — wider to fit line items */}
      <Modal isOpen={newOpen} onClose={() => setNewOpen(false)} title="Record new sale">
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          <NewSaleForm
            branches={branches}
            items={items}
            customers={customers}
            userRole={user?.role}
            allowedBranchId={user?.branchId}
            onSubmit={handleCreate}
            onCancel={() => setNewOpen(false)}
            saving={saving}
          />
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Sale details">
        {detailLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" className="text-primary-600" />
          </div>
        ) : (
          <SaleDetail sale={detailSale} onClose={() => setDetailOpen(false)} />
        )}
      </Modal>
    </div>
  );
}
