import CustomSelect from "../components/ui/CustomSelect";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  getCustomers, createCustomer, updateCustomer, deactivateCustomer,
} from "../services/customerService";
import { getBranches } from "../services/branchService";
import { recordPayment, getCustomerLedger } from "../services/paymentService";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Spinner from "../components/ui/Spinner";

// ── Helpers ───────────────────────────────────────────────────────────────
const fmt  = (n) => Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtd = (d) => new Date(d).toLocaleDateString("en-US", { day:"2-digit", month:"short", year:"numeric" });

// ── Skeleton row ──────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      {[1,2,3,4,5,6].map(i => (
        <td key={i} className="px-4 py-3.5">
          <div className="skeleton h-3 rounded w-24" />
        </td>
      ))}
    </tr>
  );
}

// ── Entry badge ───────────────────────────────────────────────────────────
function EntryBadge({ type }) {
  return type === "payment" ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50">
      Payment
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 ring-1 ring-violet-200/50">
      Sale
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Customer Detail Drawer — full ledger + quick payment
// ══════════════════════════════════════════════════════════════════════════
function CustomerDetailDrawer({ customer, branches, userRole, allowedBranchId, onClose, onCustomerUpdated }) {
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerData,    setLedgerData]    = useState(null);
  const [ledgerPag,     setLedgerPag]     = useState(null);
  const [page,          setPage]          = useState(1);

  // Quick payment form state
  const [payAmount, setPayAmount] = useState("");
  const [payNote,   setPayNote]   = useState("");
  const [paying,    setPaying]    = useState(false);
  const [showPay,   setShowPay]   = useState(false);

  const fetchLedger = useCallback(async () => {
    setLedgerLoading(true);
    try {
      const res = await getCustomerLedger(customer._id, { page, limit: 15 });
      setLedgerData(res.data.data);
      setLedgerPag(res.data.pagination);
    } catch {
      toast.error("Failed to load ledger");
    } finally {
      setLedgerLoading(false);
    }
  }, [customer._id, page]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) return;
    setPaying(true);
    try {
      const branchId = userRole === "admin"
        ? (customer.branchId?._id ?? customer.branchId)
        : allowedBranchId;

      await recordPayment({
        customerId: customer._id,
        amount:     Number(payAmount),
        branchId,
        note:       payNote || null,
      });
      toast.success("Payment recorded");
      setPayAmount("");
      setPayNote("");
      setShowPay(false);
      setPage(1);
      fetchLedger();
      onCustomerUpdated(); // refresh parent list
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record payment");
    } finally {
      setPaying(false);
    }
  };

  const balance = ledgerData?.customer?.currentBalance ?? customer.currentBalance;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-brand-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-card-lg overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-brand-100 bg-brand-50/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-600 flex items-center justify-center text-lg font-bold text-white shrink-0">
              {customer.name[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-900">{customer.name}</h2>
              <p className="text-xs text-brand-500 mt-0.5">{customer.phone || "No phone"}</p>
              {customer.address && <p className="text-xs text-brand-400">{customer.address}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-brand-400 hover:bg-brand-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Balance banner ───────────────────────────────────────── */}
        <div className={`px-6 py-4 flex items-center justify-between ${balance > 0 ? "bg-amber-50 border-b border-amber-100" : "bg-emerald-50 border-b border-emerald-100"}`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-500">Current Balance</p>
            <p className={`text-3xl font-extrabold tracking-tight mt-0.5 ${balance > 0 ? "text-amber-700" : "text-emerald-700"}`}>
              {fmt(balance)}
            </p>
            <p className="text-xs text-brand-400 mt-0.5">Opening: {fmt(customer.openingBalance)}</p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {balance > 0 && (
              <button
                onClick={() => setShowPay(!showPay)}
                className="btn-primary py-2 px-4 text-sm"
              >
                {showPay ? "Cancel" : "Record Payment"}
              </button>
            )}
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${customer.isActive ? "badge-active" : "badge-inactive"}`}>
              {customer.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* ── Quick payment form ────────────────────────────────────── */}
        {showPay && (
          <form onSubmit={handlePayment} className="px-6 py-4 bg-white border-b border-brand-100 space-y-3">
            <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">Quick Payment</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Amount *</label>
                <input
                  type="number" min="0.01" step="0.01" required
                  value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  className="input-field" placeholder="0.00"
                />
                {Number(payAmount) > balance && (
                  <p className="text-xs text-rose-600 mt-0.5">Exceeds balance ({fmt(balance)})</p>
                )}
              </div>
              <div>
                <label className="label">Note</label>
                <input
                  type="text" value={payNote} onChange={e => setPayNote(e.target.value)}
                  className="input-field" placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary py-1.5 px-4 text-xs" onClick={() => setShowPay(false)}>Cancel</button>
              <button
                type="submit" className="btn-primary py-1.5 px-4 text-xs"
                disabled={paying || !payAmount || Number(payAmount) > balance}
              >
                {paying && <Spinner size="sm" className="mr-1.5" />}
                Record
              </button>
            </div>
          </form>
        )}

        {/* ── Ledger timeline ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-3 flex items-center justify-between sticky top-0 bg-white border-b border-brand-100 z-10">
            <h3 className="text-xs font-bold text-brand-700 uppercase tracking-wider">
              Ledger History
              {ledgerPag && <span className="ml-2 font-normal text-brand-400">({ledgerPag.total} entries)</span>}
            </h3>
          </div>

          {ledgerLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" className="text-primary-500" />
            </div>
          ) : !ledgerData?.entries?.length ? (
            <div className="empty-state">
              <svg className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="empty-state-title">No ledger entries yet</p>
              <p className="empty-state-desc">Transactions will appear here</p>
            </div>
          ) : (
            <div className="px-6 py-4 space-y-2">
              {ledgerData.entries.map((entry, i) => (
                <div
                  key={entry._id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors
                    ${entry.type === "payment"
                      ? "bg-emerald-50/60 border-emerald-100"
                      : "bg-brand-50/60 border-brand-100"
                    }`}
                >
                  {/* Icon */}
                  <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0
                    ${entry.type === "payment" ? "bg-emerald-100" : "bg-violet-100"}`}>
                    {entry.type === "payment" ? (
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <EntryBadge type={entry.type} />
                      <span className="text-[10px] text-brand-400">{fmtd(entry.createdAt)}</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className={`text-sm font-bold ${entry.type === "payment" ? "text-emerald-700" : "text-brand-700"}`}>
                        {entry.type === "payment" ? "−" : "+"}{fmt(entry.amount)}
                      </span>
                      <span className="text-xs text-brand-400">
                        Balance: <span className="font-semibold text-brand-700">{fmt(entry.balanceAfter)}</span>
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-xs text-brand-400 mt-0.5 truncate">{entry.note}</p>
                    )}
                    {entry.createdBy && (
                      <p className="text-[10px] text-brand-300 mt-0.5">
                        by {entry.createdBy.firstName} {entry.createdBy.lastName}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {ledgerPag && ledgerPag.totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 text-xs text-brand-500">
                  <span>Page {page} of {ledgerPag.totalPages}</span>
                  <div className="flex gap-2">
                    <button className="btn-secondary py-1 px-3 text-xs" disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}>Prev</button>
                    <button className="btn-secondary py-1 px-3 text-xs" disabled={page >= ledgerPag.totalPages}
                      onClick={() => setPage(p => p + 1)}>Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Create / Edit forms — defined outside for stable React identity
// ══════════════════════════════════════════════════════════════════════════
function CustomerCreateForm({ branches, userRole, allowedBranchId, form, onChange, onSubmit, onCancel, saving }) {
  const isAdmin = userRole === "admin";
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isAdmin ? (
        <div>
          <label className="label">Branch <span className="text-rose-500">*</span></label>
          <CustomSelect name="branchId" required value={form.branchId} onChange={onChange} className="input-field">
            <option value="">Select branch</option>
            {branches.filter(b => b.isActive).map(b => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </CustomSelect>
        </div>
      ) : (
        <div>
          <label className="label">Branch</label>
          <input value={branches.find(b => b._id === allowedBranchId)?.name ?? "—"} disabled className="input-field" />
        </div>
      )}
      <div>
        <label className="label">Name <span className="text-rose-500">*</span></label>
        <input name="name" type="text" required value={form.name} onChange={onChange}
          className="input-field" placeholder="Customer full name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Phone</label>
          <input name="phone" type="text" value={form.phone} onChange={onChange}
            className="input-field" placeholder="03001234567" />
        </div>
        <div>
          <label className="label">Opening balance</label>
          <input name="openingBalance" type="number" min="0" step="0.01" value={form.openingBalance}
            onChange={onChange} className="input-field" placeholder="0.00" />
        </div>
      </div>
      <div>
        <label className="label">Address</label>
        <input name="address" type="text" value={form.address} onChange={onChange}
          className="input-field" placeholder="Optional" />
      </div>
      <p className="text-xs text-brand-400">Opening balance: set if migrating an existing customer with prior dues.</p>
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Spinner size="sm" className="mr-2" />}Add customer
        </button>
      </div>
    </form>
  );
}

function CustomerEditForm({ form, onChange, onSubmit, onCancel, saving }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">Name <span className="text-rose-500">*</span></label>
        <input name="name" type="text" required value={form.name} onChange={onChange} className="input-field" />
      </div>
      <div>
        <label className="label">Phone</label>
        <input name="phone" type="text" value={form.phone} onChange={onChange} className="input-field" />
      </div>
      <div>
        <label className="label">Address</label>
        <input name="address" type="text" value={form.address} onChange={onChange} className="input-field" />
      </div>
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Spinner size="sm" className="mr-2" />}Save changes
        </button>
      </div>
    </form>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Main Customers page
// ══════════════════════════════════════════════════════════════════════════
export default function Customers() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canWrite = user?.role === "admin" || user?.role === "manager";

  const [customers,       setCustomers]       = useState([]);
  const [branches,        setBranches]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [search,          setSearch]          = useState("");
  const [filterBranch,    setFilterBranch]    = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  // Drawer
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ branchId:"", name:"", phone:"", address:"", openingBalance:"0" });
  const [creating,   setCreating]   = useState(false);

  // Edit
  const [editOpen,   setEditOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm,   setEditForm]   = useState({ name:"", phone:"", address:"" });
  const [editing,    setEditing]    = useState(false);

  // Deactivate
  const [confirmOpen,      setConfirmOpen]      = useState(false);
  const [deactivating,     setDeactivating]     = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  useEffect(() => {
    getBranches().then(r => setBranches(r.data.data)).catch(() => {});
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (isAdmin && filterBranch) params.branchId = filterBranch;
      if (search)          params.search         = search;
      if (includeInactive) params.includeInactive = true;
      const { data } = await getCustomers(params);
      setCustomers(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, filterBranch, search, includeInactive]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // ── Derived stats ──────────────────────────────────────────────────────
  const totalOutstanding = customers.reduce((s, c) => s + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
  const withBalance      = customers.filter(c => c.currentBalance > 0).length;
  const settled          = customers.filter(c => c.currentBalance <= 0 && c.isActive).length;

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleCreateChange = e => setCreateForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createCustomer({
        ...createForm,
        openingBalance: Number(createForm.openingBalance || 0),
        branchId: isAdmin ? createForm.branchId : user?.branchId,
      });
      toast.success("Customer added");
      setCreateOpen(false);
      setCreateForm({ branchId:"", name:"", phone:"", address:"", openingBalance:"0" });
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add customer");
    } finally { setCreating(false); }
  };

  const openEdit = (c, e) => {
    e.stopPropagation();
    setEditTarget(c);
    setEditForm({ name: c.name, phone: c.phone ?? "", address: c.address ?? "" });
    setEditOpen(true);
  };
  const handleEditChange = e => setEditForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleEdit = async (e) => {
    e.preventDefault();
    setEditing(true);
    try {
      await updateCustomer(editTarget._id, editForm);
      toast.success("Customer updated");
      setEditOpen(false);
      if (selectedCustomer?._id === editTarget._id) {
        setSelectedCustomer(prev => ({ ...prev, ...editForm }));
      }
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    } finally { setEditing(false); }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await deactivateCustomer(deactivateTarget._id);
      toast.success("Customer deactivated");
      setConfirmOpen(false);
      setDeactivateTarget(null);
      if (selectedCustomer?._id === deactivateTarget._id) setSelectedCustomer(null);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate");
    } finally { setDeactivating(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Credit accounts and ledger management</p>
        </div>
        {canWrite && (
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add customer
          </button>
        )}
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────── */}
      {!loading && customers.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:"Total Customers", value: customers.length, color:"bg-primary-500" },
            { label:"With Balance",    value: withBalance,      color:"bg-amber-400" },
            { label:"Outstanding",     value: `${Number(totalOutstanding).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`, color:"bg-rose-400" },
          ].map(s => (
            <div key={s.label} className="card p-4 relative overflow-hidden">
              <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${s.color}`} />
              <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider pl-3">{s.label}</p>
              <p className="text-2xl font-extrabold text-brand-900 tracking-tight pl-3 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Search</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="input-field text-sm py-2 w-52" placeholder="Name…" />
        </div>
        {isAdmin && (
          <div>
            <label className="label">Branch</label>
            <CustomSelect value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
              className="input-field w-auto text-sm py-2">
              <option value="">All branches</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </CustomSelect>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-brand-600 cursor-pointer select-none mb-0.5">
          <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)}
            className="rounded border-brand-300 text-primary-600 focus:ring-primary-400" />
          Show inactive
        </label>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {loading ? (
          <table className="min-w-full">
            <tbody>{[1,2,3,4].map(i => <SkeletonRow key={i} />)}</tbody>
          </table>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="empty-state-title">No customers found</p>
            <p className="empty-state-desc">{search ? `No results for "${search}"` : "Add your first credit customer"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-100">
              <thead>
                <tr>
                  {["Customer","Phone","Address","Opening","Balance","Status",""].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-brand-50">
                {customers.map(c => (
                  <tr
                    key={c._id}
                    onClick={() => setSelectedCustomer(c)}
                    className="table-row cursor-pointer"
                  >
                    <td className="table-td">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {c.name[0].toUpperCase()}
                        </div>
                        <span className="font-semibold text-brand-900 text-sm">{c.name}</span>
                      </div>
                    </td>
                    <td className="table-td">{c.phone || "—"}</td>
                    <td className="table-td max-w-[140px] truncate text-brand-500">{c.address || "—"}</td>
                    <td className="table-td text-brand-500">{fmt(c.openingBalance)}</td>
                    <td className="table-td">
                      <span className={`font-bold text-sm ${c.currentBalance > 0 ? "text-amber-700" : "text-emerald-600"}`}>
                        {fmt(c.currentBalance)}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={c.isActive ? "badge-active" : "badge-inactive"}>
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="table-td" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button className="btn-secondary py-1 px-2.5 text-xs"
                          onClick={e => openEdit(c, e)}>Edit</button>
                        {c.isActive && canWrite && (
                          <button className="btn-danger py-1 px-2.5 text-xs"
                            onClick={e => { e.stopPropagation(); setDeactivateTarget(c); setConfirmOpen(true); }}>
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail drawer ─────────────────────────────────────────────── */}
      {selectedCustomer && (
        <CustomerDetailDrawer
          customer={selectedCustomer}
          branches={branches}
          userRole={user?.role}
          allowedBranchId={user?.branchId}
          onClose={() => setSelectedCustomer(null)}
          onCustomerUpdated={fetchCustomers}
        />
      )}

      {/* ── Modals ────────────────────────────────────────────────────── */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add customer">
        <CustomerCreateForm
          branches={branches} userRole={user?.role} allowedBranchId={user?.branchId}
          form={createForm} onChange={handleCreateChange}
          onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} saving={creating}
        />
      </Modal>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit customer">
        <CustomerEditForm
          form={editForm} onChange={handleEditChange}
          onSubmit={handleEdit} onCancel={() => setEditOpen(false)} saving={editing}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setDeactivateTarget(null); }}
        onConfirm={handleDeactivate} loading={deactivating}
        title="Deactivate customer"
        message={`Deactivate "${deactivateTarget?.name}"? They won't appear in credit sale or payment forms.`}
      />
    </div>
  );
}
