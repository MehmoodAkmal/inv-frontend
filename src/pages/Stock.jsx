import CustomSelect from "../components/ui/CustomSelect";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { getStock, addStock, getMovements } from "../services/stockService";
import { getBranches, getBranchById } from "../services/branchService";
import { getItems } from "../services/itemService";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";

// ── Movement type config ──────────────────────────────────────────────────
const MOVEMENT_TYPE_STYLES = {
  purchase:      { label: "Purchase",      className: "bg-green-100 text-green-800" },
  sale:          { label: "Sale",          className: "bg-blue-100 text-blue-800"  },
  transfer_in:   { label: "Transfer In",   className: "bg-violet-100 text-violet-800" },
  transfer_out:  { label: "Transfer Out",  className: "bg-orange-100 text-orange-800" },
  adjustment:    { label: "Adjustment",    className: "bg-gray-100 text-gray-700"  },
};

function MovementBadge({ type }) {
  const cfg = MOVEMENT_TYPE_STYLES[type] ?? { label: type, className: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ── Add Stock form (defined outside Stock to keep identity stable) ─────────
function AddStockForm({ branches, items, userRole, allowedBranchId, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState({
    branchId: userRole !== "admin" ? (allowedBranchId ?? "") : "",
    itemId: "",
    quantity: "",
    note: "",
  });

  const change = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, quantity: Number(form.quantity) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Branch — admin picks, manager/cashier see their branch as read-only */}
      <div>
        <label className="label">Branch <span className="text-red-500">*</span></label>
        {userRole === "admin" ? (
          <CustomSelect name="branchId" required value={form.branchId} onChange={change} className="input-field">
            <option value="">Select branch</option>
            {branches.filter((b) => b.isActive).map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </CustomSelect>
        ) : (
          <input
            value={branches.find((b) => b._id === allowedBranchId)?.name ?? allowedBranchId ?? ""}
            disabled
            className="input-field"
          />
        )}
      </div>

      {/* Item */}
      <div>
        <label className="label">Item <span className="text-red-500">*</span></label>
        <CustomSelect name="itemId" required value={form.itemId} onChange={change} className="input-field">
          <option value="">Select item</option>
          {items.filter((i) => i.isActive).map((i) => (
            <option key={i._id} value={i._id}>{i.name}{i.sku ? ` — ${i.sku}` : ""}</option>
          ))}
        </CustomSelect>
      </div>

      {/* Quantity */}
      <div>
        <label className="label">Quantity <span className="text-red-500">*</span></label>
        <input
          name="quantity" type="number" min="1" step="1" required
          value={form.quantity} onChange={change}
          className="input-field" placeholder="e.g. 50"
        />
      </div>

      {/* Note */}
      <div>
        <label className="label">Note</label>
        <input
          name="note" type="text" value={form.note} onChange={change}
          className="input-field" placeholder="Optional note (e.g. supplier name)"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Spinner size="sm" className="mr-2" />}
          Add stock
        </button>
      </div>
    </form>
  );
}

// ── Pagination controls ────────────────────────────────────────────────────
function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages } = pagination;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-600">
      <span>
        Page {page} of {totalPages} &nbsp;·&nbsp; {pagination.total} total
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

// ── Main page ──────────────────────────────────────────────────────────────
export default function Stock() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [tab, setTab] = useState("stock"); // "stock" | "movements"

  // Shared reference data
  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);

  // ── Stock levels tab ────────────────────────────────────────────────────
  const [selectedBranch, setSelectedBranch] = useState("");
  const [stockRows, setStockRows] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockFetched, setStockFetched] = useState(false);

  // Add stock modal
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Movement history tab ────────────────────────────────────────────────
  const [movBranch, setMovBranch] = useState("");
  const [movItem, setMovItem] = useState("");
  const [movements, setMovements] = useState([]);
  const [movPagination, setMovPagination] = useState(null);
  const [movPage, setMovPage] = useState(1);
  const [movLoading, setMovLoading] = useState(false);

  // ── Load reference data on mount ────────────────────────────────────────
  useEffect(() => {
    if (isAdmin) {
      getBranches().then((r) => setBranches(r.data.data)).catch(() => {});
    } else if (user?.branchId) {
      getBranchById(user.branchId).then((r) => {
        setBranches([r.data.data]);
      }).catch(() => {});
    }
    getItems().then((r) => setItems(r.data.data)).catch(() => {});
  }, []);

  // ── Fetch stock levels ───────────────────────────────────────────────────
  const fetchStock = useCallback(async (branchId) => {
    setStockLoading(true);
    setStockFetched(false);
    try {
      const params = isAdmin ? { branchId } : {};
      const { data } = await getStock(params);
      setStockRows(data.data);
      setStockFetched(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load stock");
    } finally {
      setStockLoading(false);
    }
  }, [isAdmin]);

  // Non-admin roles load their own branch stock on mount
  useEffect(() => {
    if (!isAdmin) fetchStock();
  }, [isAdmin, fetchStock]);

  // ── Fetch movement history ───────────────────────────────────────────────
  const fetchMovements = useCallback(async () => {
    setMovLoading(true);
    try {
      const params = { page: movPage, limit: 50 };
      if (isAdmin && movBranch) params.branchId = movBranch;
      if (movItem) params.itemId = movItem;
      const { data } = await getMovements(params);
      setMovements(data.data);
      setMovPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load movements");
    } finally {
      setMovLoading(false);
    }
  }, [isAdmin, movBranch, movItem, movPage]);

  useEffect(() => {
    if (tab === "movements") fetchMovements();
  }, [tab, fetchMovements]);

  // ── Add stock ────────────────────────────────────────────────────────────
  const handleAddStock = async (formData) => {
    setSaving(true);
    try {
      const payload = { ...formData };
      if (!isAdmin) {
        // Non-admin: branchId comes from their JWT, not the form
        payload.branchId = user?.branchId;
      }
      await addStock(payload);
      toast.success("Stock added successfully");
      setAddOpen(false);
      // Re-fetch stock for whichever branch is currently shown
      if (isAdmin && selectedBranch) fetchStock(selectedBranch);
      else if (!isAdmin) fetchStock();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add stock");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const lowStockCount = stockRows.filter((s) => s.isLowStock).length;

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track inventory levels and purchase history</p>
        </div>
        {(user?.role === "admin" || user?.role === "manager") && (
          <button className="btn-primary" onClick={() => setAddOpen(true)}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add stock
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {[
          { key: "stock", label: "Stock Levels" },
          { key: "movements", label: "Movement History" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Stock Levels tab ────────────────────────────────────────────── */}
      {tab === "stock" && (
        <div>
          {isAdmin && (
            <div className="flex items-center gap-3 mb-4">
              <CustomSelect
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  if (e.target.value) fetchStock(e.target.value);
                  else setStockRows([]);
                }}
                className="input-field w-auto text-sm py-2"
                aria-label="Select branch to view stock"
              >
                <option value="">Select a branch…</option>
                {branches.filter((b) => b.isActive).map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </CustomSelect>
              {lowStockCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  {lowStockCount} low stock
                </span>
              )}
            </div>
          )}

          {!isAdmin && lowStockCount > 0 && (
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 000-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                {lowStockCount} item{lowStockCount > 1 ? "s" : ""} below reorder level
              </span>
            </div>
          )}

          <div className="card overflow-hidden">
            {stockLoading ? (
              <div className="flex justify-center py-16">
                <Spinner size="lg" className="text-primary-600" />
              </div>
            ) : isAdmin && !selectedBranch ? (
              <div className="text-center py-16 text-gray-400">
                <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                </svg>
                <p className="text-sm">Select a branch to view its stock levels</p>
              </div>
            ) : stockFetched && stockRows.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                </svg>
                <p className="text-sm">No stock found. Add stock to get started.</p>
              </div>
            ) : stockRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Item", "SKU", "Unit", "Quantity", "Reorder Level", "Status"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {stockRows.map((row) => (
                      <tr
                        key={row._id}
                        className={`transition-colors ${row.isLowStock ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-gray-50"}`}
                      >
                        <td className="px-5 py-4 text-sm font-medium text-gray-900">
                          {row.itemId?.name ?? "—"}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500 font-mono">
                          {row.itemId?.sku || "—"}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">
                          {row.itemId?.unit ?? "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-sm font-semibold ${row.isLowStock ? "text-amber-700" : "text-gray-900"}`}>
                            {row.quantity}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">
                          {row.itemId?.reorderLevel ?? 0}
                        </td>
                        <td className="px-5 py-4">
                          {row.isLowStock ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Low stock
                            </span>
                          ) : (
                            <span className="badge-active">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Movement History tab ─────────────────────────────────────────── */}
      {tab === "movements" && (
        <div>
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap mb-4">
            {isAdmin && (
              <CustomSelect
                value={movBranch}
                onChange={(e) => { setMovBranch(e.target.value); setMovPage(1); }}
                className="input-field w-auto text-sm py-2"
                aria-label="Filter movements by branch"
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </CustomSelect>
            )}
            <CustomSelect
              value={movItem}
              onChange={(e) => { setMovItem(e.target.value); setMovPage(1); }}
              className="input-field w-auto text-sm py-2"
              aria-label="Filter movements by item"
            >
              <option value="">All items</option>
              {items.map((i) => (
                <option key={i._id} value={i._id}>{i.name}</option>
              ))}
            </CustomSelect>
            <button className="btn-secondary py-2 px-4 text-sm" onClick={() => { setMovPage(1); fetchMovements(); }}>
              Apply
            </button>
          </div>

          <div className="card overflow-hidden">
            {movLoading ? (
              <div className="flex justify-center py-16">
                <Spinner size="lg" className="text-primary-600" />
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm">No movement records found.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Date", "Item", "Type", "Qty", "Before", "After", "Note", "By"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {movements.map((m) => (
                        <tr key={m._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(m.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                            {m.itemId?.name ?? "—"}
                            {m.itemId?.sku && (
                              <span className="ml-1 text-xs text-gray-400 font-mono">{m.itemId.sku}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <MovementBadge type={m.type} />
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            {m.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{m.previousQuantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{m.newQuantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-400 max-w-[160px] truncate">
                            {m.note || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                            {m.createdBy
                              ? `${m.createdBy.firstName} ${m.createdBy.lastName}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination pagination={movPagination} onPageChange={(p) => setMovPage(p)} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Stock modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add stock (purchase)">
        <AddStockForm
          branches={branches}
          items={items}
          userRole={user?.role}
          allowedBranchId={user?.branchId}
          onSubmit={handleAddStock}
          onCancel={() => setAddOpen(false)}
          saving={saving}
        />
      </Modal>
    </div>
  );
}
