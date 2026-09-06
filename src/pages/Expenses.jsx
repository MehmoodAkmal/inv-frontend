import CustomSelect from "../components/ui/CustomSelect";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { getExpenses, createExpense, updateExpense, deleteExpense } from "../services/expenseService";
import { getBranches } from "../services/branchService";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Spinner from "../components/ui/Spinner";

const fmt  = (n) => Number(n ?? 0).toFixed(2);
const fmtd = (d) => d ? new Date(d).toLocaleDateString() : "—";

const CATEGORIES = ["rent","utilities","transport","maintenance","supplies","misc"];
const CATEGORY_COLORS = {
  rent:        "bg-blue-100 text-blue-800",
  utilities:   "bg-yellow-100 text-yellow-800",
  transport:   "bg-orange-100 text-orange-800",
  maintenance: "bg-purple-100 text-purple-800",
  supplies:    "bg-green-100 text-green-800",
  misc:        "bg-gray-100 text-gray-700",
};

function CategoryBadge({ category }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${CATEGORY_COLORS[category] ?? "bg-gray-100 text-gray-700"}`}>
      {category}
    </span>
  );
}

function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-600">
      <span>Page {page} of {totalPages} · {total} total</span>
      <div className="flex gap-2">
        <button className="btn-secondary py-1 px-3 text-xs" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
        <button className="btn-secondary py-1 px-3 text-xs" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_FORM = { branchId: "", category: "misc", amount: "", description: "", date: today() };

// Form defined outside page component for stable React identity
function ExpenseForm({ branches, userRole, allowedBranchId, form, onChange, onSubmit, onCancel, saving, isEdit }) {
  const isAdmin = userRole === "admin";
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Branch — only shown on create, not edit */}
      {!isEdit && (
        isAdmin ? (
          <div>
            <label className="label">Branch <span className="text-red-500">*</span></label>
            <CustomSelect name="branchId" required value={form.branchId} onChange={onChange} className="input-field">
              <option value="">Select branch</option>
              {branches.filter((b) => b.isActive).map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </CustomSelect>
          </div>
        ) : (
          <div>
            <label className="label">Branch</label>
            <input value={branches.find((b) => b._id === allowedBranchId)?.name ?? "—"} disabled className="input-field" />
          </div>
        )
      )}

      <div>
        <label className="label">Category <span className="text-red-500">*</span></label>
        <CustomSelect name="category" required value={form.category} onChange={onChange} className="input-field">
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </CustomSelect>
      </div>

      <div>
        <label className="label">Amount <span className="text-red-500">*</span></label>
        <input name="amount" type="number" min="0.01" step="0.01" required
          value={form.amount} onChange={onChange} className="input-field" placeholder="0.00" />
      </div>

      <div>
        <label className="label">Date <span className="text-red-500">*</span></label>
        <input name="date" type="date" required value={form.date} max={today()}
          onChange={onChange} className="input-field" />
        <p className="text-xs text-gray-400 mt-1">Date the expense occurred (can be backdated).</p>
      </div>

      <div>
        <label className="label">Description</label>
        <input name="description" type="text" value={form.description} onChange={onChange}
          className="input-field" placeholder="Optional details" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Spinner size="sm" className="mr-2" />}
          {isEdit ? "Save changes" : "Record expense"}
        </button>
      </div>
    </form>
  );
}

export default function Expenses() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [expenses,   setExpenses]   = useState([]);
  const [branches,   setBranches]   = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);

  const [filterBranch,   setFilterBranch]   = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStart,    setFilterStart]    = useState("");
  const [filterEnd,      setFilterEnd]      = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [creating,   setCreating]   = useState(false);

  const [editOpen,   setEditOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm,   setEditForm]   = useState({ category: "misc", amount: "", description: "", date: today() });
  const [editing,    setEditing]    = useState(false);

  const [confirmOpen,    setConfirmOpen]    = useState(false);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [deleting,       setDeleting]       = useState(false);

  useEffect(() => {
    if (isAdmin) getBranches().then((r) => setBranches(r.data.data)).catch(() => {});
  }, [isAdmin]);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (isAdmin && filterBranch)   params.branchId  = filterBranch;
      if (filterCategory)            params.category  = filterCategory;
      if (filterStart)               params.startDate = filterStart;
      if (filterEnd)                 params.endDate   = filterEnd;
      const { data } = await getExpenses(params);
      setExpenses(data.data);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, filterBranch, filterCategory, filterStart, filterEnd, page]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  // Create
  const handleCreateChange = (e) => setCreateForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        branchId:    isAdmin ? createForm.branchId : user?.branchId,
        category:    createForm.category,
        amount:      Number(createForm.amount),
        description: createForm.description || null,
        date:        createForm.date,
      };
      await createExpense(payload);
      toast.success("Expense recorded");
      setCreateOpen(false);
      setCreateForm({ ...EMPTY_FORM });
      setPage(1);
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record expense");
    } finally { setCreating(false); }
  };

  // Edit
  const openEdit = (exp) => {
    setEditTarget(exp);
    setEditForm({
      category:    exp.category,
      amount:      String(exp.amount),
      description: exp.description ?? "",
      date:        exp.date ? new Date(exp.date).toISOString().slice(0, 10) : today(),
    });
    setEditOpen(true);
  };
  const handleEditChange = (e) => setEditForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleEdit = async (e) => {
    e.preventDefault();
    setEditing(true);
    try {
      await updateExpense(editTarget._id, {
        category:    editForm.category,
        amount:      Number(editForm.amount),
        description: editForm.description || null,
        date:        editForm.date,
      });
      toast.success("Expense updated");
      setEditOpen(false);
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update expense");
    } finally { setEditing(false); }
  };

  // Delete
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteExpense(deleteTarget._id);
      toast.success("Expense deleted");
      setConfirmOpen(false);
      setDeleteTarget(null);
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete expense");
    } finally { setDeleting(false); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track branch operating expenses</p>
        </div>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add expense
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        {isAdmin && (
          <div>
            <label className="label text-xs">Branch</label>
            <CustomSelect value={filterBranch} onChange={(e) => { setFilterBranch(e.target.value); setPage(1); }}
              className="input-field w-auto text-sm py-2">
              <option value="">All branches</option>
              {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </CustomSelect>
          </div>
        )}
        <div>
          <label className="label text-xs">Category</label>
          <CustomSelect value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            className="input-field w-auto text-sm py-2">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </CustomSelect>
        </div>
        <div>
          <label className="label text-xs">From</label>
          <input type="date" value={filterStart} onChange={(e) => { setFilterStart(e.target.value); setPage(1); }}
            className="input-field text-sm py-2" />
        </div>
        <div>
          <label className="label text-xs">To</label>
          <input type="date" value={filterEnd} onChange={(e) => { setFilterEnd(e.target.value); setPage(1); }}
            className="input-field text-sm py-2" />
        </div>
        {(filterBranch || filterCategory || filterStart || filterEnd) && (
          <button className="btn-secondary text-sm py-2" onClick={() => {
            setFilterBranch(""); setFilterCategory(""); setFilterStart(""); setFilterEnd(""); setPage(1);
          }}>Clear</button>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" className="text-primary-600" /></div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
            <p className="text-sm">No expenses found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Date","Category","Amount","Description","By","Actions"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {expenses.map((exp) => (
                    <tr key={exp._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{fmtd(exp.date)}</td>
                      <td className="px-5 py-4"><CategoryBadge category={exp.category} /></td>
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">{fmt(exp.amount)}</td>
                      <td className="px-5 py-4 text-sm text-gray-500 max-w-[180px] truncate">{exp.description || "—"}</td>
                      <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {exp.createdBy ? `${exp.createdBy.firstName} ${exp.createdBy.lastName}` : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button className="btn-secondary py-1 px-3 text-xs" onClick={() => openEdit(exp)}>Edit</button>
                          {isAdmin && (
                            <button className="btn-danger py-1 px-3 text-xs"
                              onClick={() => { setDeleteTarget(exp); setConfirmOpen(true); }}>
                              Delete
                            </button>
                          )}
                        </div>
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

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Record expense">
        <ExpenseForm
          branches={branches} userRole={user?.role} allowedBranchId={user?.branchId}
          form={createForm} onChange={handleCreateChange}
          onSubmit={handleCreate} onCancel={() => setCreateOpen(false)}
          saving={creating} isEdit={false}
        />
      </Modal>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit expense">
        <ExpenseForm
          branches={branches} userRole={user?.role} allowedBranchId={user?.branchId}
          form={editForm} onChange={handleEditChange}
          onSubmit={handleEdit} onCancel={() => setEditOpen(false)}
          saving={editing} isEdit={true}
        />
      </Modal>

      <ConfirmDialog isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDelete} loading={deleting}
        title="Delete expense"
        message={`Permanently delete this ${deleteTarget?.category} expense of ${fmt(deleteTarget?.amount)}? This cannot be undone.`} />
    </div>
  );
}
