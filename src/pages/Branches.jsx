import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  getBranches,
  createBranch,
  updateBranch,
  deactivateBranch,
} from "../services/branchService";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Spinner from "../components/ui/Spinner";

const EMPTY_FORM = { name: "", address: "" };

export default function Branches() {
  const { user } = useAuth();
  const { search: qs } = useLocation();
  const urlOrgId = new URLSearchParams(qs).get("organizationId");
  const isSuperAdmin = user?.role === "superAdmin";
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Deactivate confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetBranch, setTargetBranch] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const params = { includeInactive };
      if (isSuperAdmin && urlOrgId) params.organizationId = urlOrgId;
      const { data } = await getBranches(params);
      setBranches(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load branches");
    } finally {
      setLoading(false);
    }
  }, [includeInactive, isSuperAdmin, urlOrgId]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // ── Modal helpers ──────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (branch) => {
    setEditing(branch);
    setForm({ name: branch.name, address: branch.address ?? "" });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateBranch(editing._id, form);
        toast.success("Branch updated");
      } else {
        await createBranch(form);
        toast.success("Branch created");
      }
      closeModal();
      fetchBranches();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Deactivate helpers ─────────────────────────────────────
  const openConfirm = (branch) => {
    setTargetBranch(branch);
    setConfirmOpen(true);
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await deactivateBranch(targetBranch._id);
      toast.success("Branch deactivated");
      setConfirmOpen(false);
      setTargetBranch(null);
      fetchBranches();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate");
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your organization&apos;s locations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Show inactive
          </label>
          <button className="btn-primary" onClick={openCreate}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add branch
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-primary-600" />
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
            <p className="text-sm">No branches found. Add your first one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Name", "Address", "Status", "Created", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {branches.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">{b.name}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{b.address || "—"}</td>
                    <td className="px-5 py-4">
                      <span className={b.isActive ? "badge-active" : "badge-inactive"}>
                        {b.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-secondary py-1 px-3 text-xs"
                          onClick={() => openEdit(b)}
                        >
                          Edit
                        </button>
                        {b.isActive && (
                          <button
                            className="btn-danger py-1 px-3 text-xs"
                            onClick={() => openConfirm(b)}
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

      {/* Create / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit branch" : "Add branch"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="b-name" className="label">Branch name <span className="text-red-500">*</span></label>
            <input
              id="b-name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              className="input-field"
              placeholder="Main Street Store"
            />
          </div>
          <div>
            <label htmlFor="b-address" className="label">Address</label>
            <input
              id="b-address"
              name="address"
              type="text"
              value={form.address}
              onChange={handleChange}
              className="input-field"
              placeholder="123 Main St, City"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <Spinner size="sm" className="mr-2" />}
              {editing ? "Save changes" : "Create branch"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate confirm */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setTargetBranch(null); }}
        onConfirm={handleDeactivate}
        loading={deactivating}
        title="Deactivate branch"
        message={`Are you sure you want to deactivate "${targetBranch?.name}"? This will hide it from active views.`}
      />
    </div>
  );
}
