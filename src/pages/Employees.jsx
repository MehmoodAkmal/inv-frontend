import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { getEmployees, createEmployee, updateEmployee, deactivateEmployee } from "../services/employeeService";
import { getBranches } from "../services/branchService";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Spinner from "../components/ui/Spinner";

const fmt = (n) => Number(n ?? 0).toLocaleString();

const EMPTY_CREATE = { branchId: "", name: "", phone: "", designation: "", monthlySalary: "" };
const EMPTY_EDIT   = { name: "", phone: "", designation: "", monthlySalary: "" };

function EmployeeCreateForm({ branches, form, onChange, onSubmit, onCancel, saving }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">Branch <span className="text-red-500">*</span></label>
        <select name="branchId" required value={form.branchId} onChange={onChange} className="input-field">
          <option value="">Select branch</option>
          {branches.filter((b) => b.isActive).map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Name <span className="text-red-500">*</span></label>
        <input name="name" type="text" required value={form.name} onChange={onChange}
          className="input-field" placeholder="Employee name" />
      </div>
      <div>
        <label className="label">Phone</label>
        <input name="phone" type="text" value={form.phone} onChange={onChange}
          className="input-field" placeholder="e.g. 03001234567" />
      </div>
      <div>
        <label className="label">Designation</label>
        <input name="designation" type="text" value={form.designation} onChange={onChange}
          className="input-field" placeholder="e.g. Sales Staff, Helper" />
      </div>
      <div>
        <label className="label">Monthly salary <span className="text-red-500">*</span></label>
        <input name="monthlySalary" type="number" min="0" step="0.01" required
          value={form.monthlySalary} onChange={onChange}
          className="input-field" placeholder="0.00" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Spinner size="sm" className="mr-2" />}Add employee
        </button>
      </div>
    </form>
  );
}

function EmployeeEditForm({ form, onChange, onSubmit, onCancel, saving }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">Name <span className="text-red-500">*</span></label>
        <input name="name" type="text" required value={form.name} onChange={onChange} className="input-field" />
      </div>
      <div>
        <label className="label">Phone</label>
        <input name="phone" type="text" value={form.phone} onChange={onChange} className="input-field" />
      </div>
      <div>
        <label className="label">Designation</label>
        <input name="designation" type="text" value={form.designation} onChange={onChange} className="input-field" />
      </div>
      <div>
        <label className="label">Monthly salary <span className="text-red-500">*</span></label>
        <input name="monthlySalary" type="number" min="0" step="0.01" required
          value={form.monthlySalary} onChange={onChange} className="input-field" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Spinner size="sm" className="mr-2" />}Save changes
        </button>
      </div>
    </form>
  );
}

export default function Employees() {
  const [employees,  setEmployees]  = useState([]);
  const [branches,   setBranches]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filterBranch,     setFilterBranch]     = useState("");
  const [includeInactive,  setIncludeInactive]  = useState(false);

  const [createOpen,  setCreateOpen]  = useState(false);
  const [createForm,  setCreateForm]  = useState({ ...EMPTY_CREATE });
  const [creating,    setCreating]    = useState(false);

  const [editOpen,    setEditOpen]    = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [editForm,    setEditForm]    = useState({ ...EMPTY_EDIT });
  const [editing,     setEditing]     = useState(false);

  const [confirmOpen,      setConfirmOpen]      = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating,     setDeactivating]     = useState(false);

  useEffect(() => {
    getBranches().then((r) => setBranches(r.data.data)).catch(() => {});
  }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterBranch)     params.branchId        = filterBranch;
      if (includeInactive)  params.includeInactive = true;
      const { data } = await getEmployees(params);
      setEmployees(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [filterBranch, includeInactive]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleCreateChange = (e) => setCreateForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createEmployee({ ...createForm, monthlySalary: Number(createForm.monthlySalary) });
      toast.success("Employee added");
      setCreateOpen(false);
      setCreateForm({ ...EMPTY_CREATE });
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add employee");
    } finally { setCreating(false); }
  };

  const openEdit = (emp) => {
    setEditTarget(emp);
    setEditForm({ name: emp.name, phone: emp.phone ?? "", designation: emp.designation ?? "", monthlySalary: String(emp.monthlySalary) });
    setEditOpen(true);
  };
  const handleEditChange = (e) => setEditForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleEdit = async (e) => {
    e.preventDefault();
    setEditing(true);
    try {
      await updateEmployee(editTarget._id, { ...editForm, monthlySalary: Number(editForm.monthlySalary) });
      toast.success("Employee updated");
      setEditOpen(false);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update employee");
    } finally { setEditing(false); }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await deactivateEmployee(deactivateTarget._id);
      toast.success("Employee deactivated");
      setConfirmOpen(false);
      setDeactivateTarget(null);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate");
    } finally { setDeactivating(false); }
  };

  const branchName = (id) => branches.find((b) => b._id === id)?.name ?? "—";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage salaried staff (helpers, drivers, etc.)</p>
        </div>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add employee
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="label text-xs">Branch</label>
          <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}
            className="input-field w-auto text-sm py-2">
            <option value="">All branches</option>
            {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
          Show inactive
        </label>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" className="text-primary-600" /></div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-sm">No employees found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Name","Branch","Designation","Phone","Monthly Salary","Status","Actions"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">{emp.name}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{branchName(emp.branchId)}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{emp.designation || "—"}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{emp.phone || "—"}</td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">{fmt(emp.monthlySalary)}</td>
                    <td className="px-5 py-4">
                      <span className={emp.isActive ? "badge-active" : "badge-inactive"}>
                        {emp.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button className="btn-secondary py-1 px-3 text-xs" onClick={() => openEdit(emp)}>Edit</button>
                        {emp.isActive && (
                          <button className="btn-danger py-1 px-3 text-xs"
                            onClick={() => { setDeactivateTarget(emp); setConfirmOpen(true); }}>
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

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add employee">
        <EmployeeCreateForm branches={branches} form={createForm} onChange={handleCreateChange}
          onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} saving={creating} />
      </Modal>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit employee">
        <EmployeeEditForm form={editForm} onChange={handleEditChange}
          onSubmit={handleEdit} onCancel={() => setEditOpen(false)} saving={editing} />
      </Modal>

      <ConfirmDialog isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setDeactivateTarget(null); }}
        onConfirm={handleDeactivate} loading={deactivating}
        title="Deactivate employee"
        message={`Deactivate "${deactivateTarget?.name}"? Their salary history will be preserved.`} />
    </div>
  );
}
