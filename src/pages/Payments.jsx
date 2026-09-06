import CustomSelect from "../components/ui/CustomSelect";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { recordPayment, getCustomerLedger, getOutstandingBalance } from "../services/paymentService";
import { getCustomers } from "../services/customerService";
import { getBranches } from "../services/branchService";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";

const fmt  = (n) => Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtd = (d) => new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });

// ── Entry badge ───────────────────────────────────────────────────────────
function EntryBadge({ type }) {
  return type === "payment" ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50">Payment</span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 ring-1 ring-violet-200/50">Sale</span>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────
function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-brand-100 text-xs text-brand-500">
      <span>Page {page} of {totalPages} · {total} entries</span>
      <div className="flex gap-2">
        <button className="btn-secondary py-1 px-3 text-xs" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</button>
        <button className="btn-secondary py-1 px-3 text-xs" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}

// ── Record Payment form (stable identity — defined outside) ───────────────
function RecordPaymentForm({ customers, branches, userRole, allowedBranchId, initialCustomerId, onSubmit, onCancel, saving }) {
  const isAdmin = userRole === "admin";
  const [form, setForm] = useState({
    branchId:        isAdmin ? "" : (allowedBranchId ?? ""),
    customerId:      initialCustomerId ?? "",
    amount:          "",
    referenceSaleId: "",
    note:            "",
  });

  // Sync if initialCustomerId changes (when opened from Pay button)
  useEffect(() => {
    if (initialCustomerId) setForm(p => ({ ...p, customerId: initialCustomerId }));
  }, [initialCustomerId]);

  const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const selected = customers.find(c => c._id === form.customerId);

  const handleSubmit = e => {
    e.preventDefault();
    onSubmit({
      branchId:        form.branchId || allowedBranchId,
      customerId:      form.customerId,
      amount:          Number(form.amount),
      referenceSaleId: form.referenceSaleId || null,
      note:            form.note || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isAdmin ? (
        <div>
          <label className="label">Branch <span className="text-rose-500">*</span></label>
          <CustomSelect name="branchId" required value={form.branchId} onChange={change} className="input-field">
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
        <label className="label">Customer <span className="text-rose-500">*</span></label>
        <CustomSelect name="customerId" required value={form.customerId} onChange={change} className="input-field">
          <option value="">Select customer</option>
          {customers.filter(c => c.isActive && c.currentBalance > 0).map(c => (
            <option key={c._id} value={c._id}>
              {c.name}{c.phone ? ` — ${c.phone}` : ""} · owes {fmt(c.currentBalance)}
            </option>
          ))}
        </CustomSelect>
        {selected && (
          <p className="text-xs text-amber-700 mt-1 font-medium">
            Outstanding: <strong>{fmt(selected.currentBalance)}</strong>
          </p>
        )}
      </div>

      <div>
        <label className="label">Amount <span className="text-rose-500">*</span></label>
        <input name="amount" type="number" min="0.01" step="0.01" required
          value={form.amount} onChange={change} className="input-field" placeholder="0.00" />
        {selected && Number(form.amount) > selected.currentBalance && (
          <p className="text-xs text-rose-600 mt-1">Exceeds outstanding balance.</p>
        )}
      </div>

      <div>
        <label className="label">Note</label>
        <input name="note" type="text" value={form.note} onChange={change}
          className="input-field" placeholder="Optional" />
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Spinner size="sm" className="mr-2" />}Record payment
        </button>
      </div>
    </form>
  );
}

// ── Ledger drawer ─────────────────────────────────────────────────────────
function LedgerDrawer({ customerId, customers, onClose }) {
  const [loading,    setLoading]    = useState(true);
  const [data,       setData]       = useState(null);
  const [pagination, setPagination] = useState(null);
  const [page,       setPage]       = useState(1);

  const customerInfo = customers.find(c => c._id === customerId);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCustomerLedger(customerId, { page, limit: 20 });
      setData(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      toast.error("Failed to load ledger");
    } finally {
      setLoading(false);
    }
  }, [customerId, page]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-brand-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-card-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-100 bg-brand-50/50">
          <div>
            <h2 className="text-sm font-bold text-brand-900">
              {data?.customer?.name ?? customerInfo?.name ?? "Customer"} — Ledger
            </h2>
            <p className="text-xs text-brand-400 mt-0.5">
              Current balance:&nbsp;
              <span className={`font-bold ${(data?.customer?.currentBalance ?? 0) > 0 ? "text-amber-700" : "text-emerald-600"}`}>
                {fmt(data?.customer?.currentBalance ?? 0)}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-brand-400 hover:bg-brand-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner size="lg" className="text-primary-500" /></div>
          ) : !data?.entries?.length ? (
            <div className="empty-state">
              <p className="empty-state-title">No ledger entries</p>
              <p className="empty-state-desc">Transactions will appear here</p>
            </div>
          ) : (
            <div className="px-6 py-4 space-y-2">
              {data.entries.map(entry => (
                <div key={entry._id}
                  className={`flex items-start gap-3 p-3 rounded-xl border
                    ${entry.type === "payment" ? "bg-emerald-50/60 border-emerald-100" : "bg-brand-50/60 border-brand-100"}`}>
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
                        Bal: <span className="font-semibold text-brand-700">{fmt(entry.balanceAfter)}</span>
                      </span>
                    </div>
                    {entry.note && <p className="text-xs text-brand-400 mt-0.5 truncate">{entry.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Main Payments page
// ══════════════════════════════════════════════════════════════════════════
export default function Payments() {
  const { user }  = useAuth();
  const isAdmin   = user?.role === "admin";
  const canRecord = ["admin","manager","cashier"].includes(user?.role);

  const [branches,     setBranches]     = useState([]);
  const [customers,    setCustomers]    = useState([]);
  const [outstanding,  setOutstanding]  = useState([]);
  const [outLoading,   setOutLoading]   = useState(true);
  const [filterBranch, setFilterBranch] = useState("");

  // Record payment modal
  const [payOpen,             setPayOpen]             = useState(false);
  const [preselectedCustomer, setPreselectedCustomer] = useState(null);
  const [saving,              setSaving]              = useState(false);

  // Ledger drawer
  const [ledgerCustomerId, setLedgerCustomerId] = useState(null);

  // Load reference data
  useEffect(() => {
    getBranches().then(r  => setBranches(r.data.data)).catch(() => {});
    getCustomers().then(r => setCustomers(r.data.data)).catch(() => {});
  }, []);

  const fetchOutstanding = useCallback(async () => {
    setOutLoading(true);
    try {
      const params = {};
      if (isAdmin && filterBranch) params.branchId = filterBranch;
      const { data } = await getOutstandingBalance(params);
      setOutstanding(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load outstanding balances");
    } finally {
      setOutLoading(false);
    }
  }, [isAdmin, filterBranch]);

  useEffect(() => { fetchOutstanding(); }, [fetchOutstanding]);

  const handlePayment = async (payload) => {
    setSaving(true);
    try {
      await recordPayment(payload);
      toast.success("Payment recorded");
      setPayOpen(false);
      setPreselectedCustomer(null);
      fetchOutstanding();
      getCustomers().then(r => setCustomers(r.data.data)).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record payment");
    } finally { setSaving(false); }
  };

  const openPayFor = (customerId, e) => {
    e?.stopPropagation();
    setPreselectedCustomer(customerId);
    setPayOpen(true);
  };

  const totalOutstanding = outstanding.reduce((s, c) => s + c.currentBalance, 0);

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Collect credit payments and view customer ledgers</p>
        </div>
        {canRecord && (
          <button className="btn-primary" onClick={() => { setPreselectedCustomer(null); setPayOpen(true); }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Record payment
          </button>
        )}
      </div>

      {/* ── Summary banner ────────────────────────────────────────────── */}
      {!outLoading && outstanding.length > 0 && (
        <div className="card p-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">Total Outstanding</p>
              <p className="text-2xl font-extrabold text-amber-700 tracking-tight">{fmt(totalOutstanding)}</p>
            </div>
          </div>
          <div className="h-10 w-px bg-brand-100 hidden sm:block" />
          <div>
            <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">Customers with Balance</p>
            <p className="text-2xl font-extrabold text-brand-900 tracking-tight">{outstanding.length}</p>
          </div>
        </div>
      )}

      {/* ── Branch filter ─────────────────────────────────────────────── */}
      {isAdmin && (
        <div className="flex items-end gap-3">
          <div>
            <label className="label">Branch</label>
            <CustomSelect value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
              className="input-field w-auto text-sm py-2">
              <option value="">All branches</option>
              {customers
                .filter((c, i, arr) => arr.findIndex(x => (x.branchId?._id ?? x.branchId) === (c.branchId?._id ?? c.branchId)) === i)
                .map(c => {
                  const bid = c.branchId?._id ?? c.branchId;
                  return <option key={bid} value={bid}>{bid}</option>;
                })
              }
            </CustomSelect>
          </div>
        </div>
      )}

      {/* ── Outstanding table ─────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-brand-100 bg-brand-50/50">
          <h3 className="text-xs font-bold text-brand-700 uppercase tracking-wider">Outstanding Balances</h3>
        </div>

        {outLoading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" className="text-primary-500" /></div>
        ) : outstanding.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="empty-state-title">All settled</p>
            <p className="empty-state-desc">No outstanding credit balances</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-100">
              <thead>
                <tr>
                  {["Customer","Phone","Balance","% of Total","Actions"].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-brand-50">
                {outstanding.map(c => {
                  const pct = totalOutstanding > 0 ? (c.currentBalance / totalOutstanding) * 100 : 0;
                  return (
                    <tr key={c._id} className="table-row">
                      <td className="table-td">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {c.name[0].toUpperCase()}
                          </div>
                          <span className="font-semibold text-brand-900 text-sm">{c.name}</span>
                        </div>
                      </td>
                      <td className="table-td">{c.phone || "—"}</td>
                      <td className="table-td">
                        <span className="text-amber-700 font-bold text-sm">{fmt(c.currentBalance)}</span>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-brand-100 rounded-full overflow-hidden w-20">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-brand-400">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-1.5">
                          <button className="btn-secondary py-1 px-2.5 text-xs"
                            onClick={() => setLedgerCustomerId(c._id)}>
                            Ledger
                          </button>
                          {canRecord && (
                            <button className="btn-primary py-1 px-2.5 text-xs"
                              onClick={e => openPayFor(c._id, e)}>
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Record Payment modal ─────────────────────────────────────── */}
      <Modal isOpen={payOpen} onClose={() => { setPayOpen(false); setPreselectedCustomer(null); }} title="Record payment">
        <RecordPaymentForm
          customers={customers}
          branches={branches}
          userRole={user?.role}
          allowedBranchId={user?.branchId}
          initialCustomerId={preselectedCustomer}
          onSubmit={handlePayment}
          onCancel={() => { setPayOpen(false); setPreselectedCustomer(null); }}
          saving={saving}
        />
      </Modal>

      {/* ── Ledger drawer ────────────────────────────────────────────── */}
      {ledgerCustomerId && (
        <LedgerDrawer
          customerId={ledgerCustomerId}
          customers={[...customers, ...outstanding]}
          onClose={() => setLedgerCustomerId(null)}
        />
      )}
    </div>
  );
}
