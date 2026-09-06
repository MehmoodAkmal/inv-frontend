import CustomSelect from "../components/ui/CustomSelect";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  getStaff, createStaff, updateStaff, deactivateStaff,
  getStaffPermissions, updateStaffPermissions, resetStaffPermissions,
} from "../services/staffService";
import { getBranches } from "../services/branchService";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Spinner from "../components/ui/Spinner";

const EMPTY_CREATE = { firstName: "", lastName: "", email: "", password: "", role: "cashier", branchId: "" };
const EMPTY_EDIT = { firstName: "", lastName: "", branchId: "" };

const ROLE_LABELS = { manager: "Manager", cashier: "Cashier" };
const MODULE_LABELS = {
  sales: "Sales", stock: "Stock", customers: "Customers", payments: "Payments",
  expenses: "Expenses", salary: "Salary", reports: "Reports", categories: "Categories",
  items: "Items", branches: "Branches",
};
const ACTION_LABELS = {
  view: "View", create: "Create", edit: "Edit", deactivate: "Deactivate",
  addPurchase: "Add purchase", record: "Record", viewLedger: "View ledger",
  dashboard: "Dashboard", profitLoss: "Profit & loss", lowStock: "Low stock",
};

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBranch, setFilterBranch] = useState("");

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editing, setEditing] = useState(false);

  // Deactivate confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  // Per-user permissions modal
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [permissionTarget, setPermissionTarget] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [permissionCatalog, setPermissionCatalog] = useState({});
  const [hasCustomPermissions, setHasCustomPermissions] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsSaving, setPermissionsSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterBranch ? { branchId: filterBranch } : {};
      const [staffRes, branchRes] = await Promise.all([
        getStaff(params),
        getBranches(),
      ]);
      setStaff(staffRes.data.data);
      setBranches(branchRes.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [filterBranch]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const branchName = (id) => branches.find((b) => b._id === id)?.name ?? "—";

  // ── Create ─────────────────────────────────────────────────
  const handleCreateChange = (e) =>
    setCreateForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createStaff(createForm);
      toast.success("Staff member created");
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create staff");
    } finally {
      setCreating(false);
    }
  };

  // ── Edit ───────────────────────────────────────────────────
  const openEdit = (member) => {
    setEditTarget(member);
    setEditForm({
      firstName: member.firstName,
      lastName: member.lastName,
      branchId: member.branchId?._id ?? member.branchId ?? "",
    });
    setEditOpen(true);
  };

  const handleEditChange = (e) =>
    setEditForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditing(true);
    try {
      await updateStaff(editTarget._id, editForm);
      toast.success("Staff member updated");
      setEditOpen(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update staff");
    } finally {
      setEditing(false);
    }
  };

  // ── Deactivate ─────────────────────────────────────────────
  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await deactivateStaff(deactivateTarget._id);
      toast.success("Staff member deactivated");
      setConfirmOpen(false);
      setDeactivateTarget(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate");
    } finally {
      setDeactivating(false);
    }
  };

  const openPermissions = async (member) => {
    setPermissionTarget(member);
    setPermissionsOpen(true);
    setPermissionsLoading(true);
    try {
      const { data } = await getStaffPermissions(member._id);
      setPermissions(data.data.permissions);
      setPermissionCatalog(data.data.catalog);
      setHasCustomPermissions(data.data.hasCustomPermissions);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load permissions");
      setPermissionsOpen(false);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const togglePermission = (module, action) => {
    setPermissions((current) => ({
      ...current,
      [module]: { ...current[module], [action]: !current[module]?.[action] },
    }));
  };

  const savePermissions = async () => {
    setPermissionsSaving(true);
    try {
      await updateStaffPermissions(permissionTarget._id, permissions);
      setHasCustomPermissions(true);
      toast.success("Permissions updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update permissions");
    } finally {
      setPermissionsSaving(false);
    }
  };

  const resetPermissions = async () => {
    setPermissionsSaving(true);
    try {
      await resetStaffPermissions(permissionTarget._id);
      const { data } = await getStaffPermissions(permissionTarget._id);
      setPermissions(data.data.permissions);
      setHasCustomPermissions(false);
      toast.success("Permissions reset to role defaults");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset permissions");
    } finally {
      setPermissionsSaving(false);
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage managers and cashiers</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Branch filter */}
          <CustomSelect
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="input-field w-auto text-sm py-2"
            aria-label="Filter by branch"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </CustomSelect>
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add staff
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-primary-600" />
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm">No staff found. Add your first member.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Name", "Email", "Role", "Branch", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {staff.map((m) => (
                  <tr key={m._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">
                      {m.firstName} {m.lastName}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{m.email}</td>
                    <td className="px-5 py-4">
                      <span className="badge-role">{ROLE_LABELS[m.role] ?? m.role}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {branchName(m.branchId?._id ?? m.branchId)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={m.isActive ? "badge-active" : "badge-inactive"}>
                        {m.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-secondary py-1 px-3 text-xs"
                          onClick={() => openEdit(m)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-secondary py-1 px-3 text-xs"
                          onClick={() => openPermissions(m)}
                        >
                          Permissions
                        </button>
                        {m.isActive && (
                          <button
                            className="btn-danger py-1 px-3 text-xs"
                            onClick={() => { setDeactivateTarget(m); setConfirmOpen(true); }}
                          >
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

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add staff member">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="s-fn" className="label">First name <span className="text-red-500">*</span></label>
              <input id="s-fn" name="firstName" type="text" required value={createForm.firstName}
                onChange={handleCreateChange} className="input-field" placeholder="Jane" />
            </div>
            <div>
              <label htmlFor="s-ln" className="label">Last name <span className="text-red-500">*</span></label>
              <input id="s-ln" name="lastName" type="text" required value={createForm.lastName}
                onChange={handleCreateChange} className="input-field" placeholder="Smith" />
            </div>
          </div>
          <div>
            <label htmlFor="s-email" className="label">Email <span className="text-red-500">*</span></label>
            <input id="s-email" name="email" type="email" required value={createForm.email}
              onChange={handleCreateChange} className="input-field" placeholder="jane@example.com" />
          </div>
          <div>
            <label htmlFor="s-pwd" className="label">Password <span className="text-red-500">*</span></label>
            <input id="s-pwd" name="password" type="password" required value={createForm.password}
              onChange={handleCreateChange} className="input-field" placeholder="Min. 6 characters" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="s-role" className="label">Role <span className="text-red-500">*</span></label>
              <CustomSelect id="s-role" name="role" required value={createForm.role}
                onChange={handleCreateChange} className="input-field">
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
              </CustomSelect>
            </div>
            <div>
              <label htmlFor="s-branch" className="label">Branch <span className="text-red-500">*</span></label>
              <CustomSelect id="s-branch" name="branchId" required value={createForm.branchId}
                onChange={handleCreateChange} className="input-field">
                <option value="">Select branch</option>
                {branches.filter((b) => b.isActive).map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </CustomSelect>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating && <Spinner size="sm" className="mr-2" />}
              Create member
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit staff member">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="e-fn" className="label">First name</label>
              <input id="e-fn" name="firstName" type="text" value={editForm.firstName}
                onChange={handleEditChange} className="input-field" />
            </div>
            <div>
              <label htmlFor="e-ln" className="label">Last name</label>
              <input id="e-ln" name="lastName" type="text" value={editForm.lastName}
                onChange={handleEditChange} className="input-field" />
            </div>
          </div>
          <div>
            <label htmlFor="e-branch" className="label">Branch</label>
            <CustomSelect id="e-branch" name="branchId" value={editForm.branchId}
              onChange={handleEditChange} className="input-field">
              <option value="">Select branch</option>
              {branches.filter((b) => b.isActive).map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </CustomSelect>
          </div>
          <p className="text-xs text-gray-400">Email and role cannot be changed after creation.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setEditOpen(false)} disabled={editing}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={editing}>
              {editing && <Spinner size="sm" className="mr-2" />}
              Save changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Per-user permissions modal */}
      <Modal
        isOpen={permissionsOpen}
        onClose={() => setPermissionsOpen(false)}
        title={`Permissions — ${permissionTarget?.firstName ?? ""} ${permissionTarget?.lastName ?? ""}`}
        maxWidth="max-w-3xl"
      >
        {permissionsLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-600" /></div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              {hasCustomPermissions
                ? "This user has custom access settings."
                : `Currently inheriting the ${ROLE_LABELS[permissionTarget?.role] ?? "staff"} role defaults.`}
            </p>
            <div className="max-h-[52vh] overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(permissionCatalog).map(([module, actions]) => (
                <fieldset key={module} className="rounded-lg border border-gray-200 p-3">
                  <legend className="px-1 text-sm font-semibold text-gray-800">{MODULE_LABELS[module] ?? module}</legend>
                  <div className="space-y-2">
                    {actions.map((action) => (
                      <label key={action} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(permissions[module]?.[action])}
                          onChange={() => togglePermission(module, action)}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        {ACTION_LABELS[action] ?? action}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 pt-5">
              <button type="button" className="text-sm text-primary-700 hover:text-primary-800 disabled:opacity-50"
                onClick={resetPermissions} disabled={permissionsSaving || !hasCustomPermissions}>
                Reset to role defaults
              </button>
              <div className="flex gap-3">
                <button type="button" className="btn-secondary" onClick={() => setPermissionsOpen(false)} disabled={permissionsSaving}>Cancel</button>
                <button type="button" className="btn-primary" onClick={savePermissions} disabled={permissionsSaving}>
                  {permissionsSaving && <Spinner size="sm" className="mr-2" />}
                  Save permissions
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Deactivate confirm */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setDeactivateTarget(null); }}
        onConfirm={handleDeactivate}
        loading={deactivating}
        title="Deactivate staff member"
        message={`Are you sure you want to deactivate ${deactivateTarget?.firstName} ${deactivateTarget?.lastName}? They will no longer be able to log in.`}
      />
    </div>
  );
}
