import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  getCategories,
  createCategory,
  updateCategory,
  deactivateCategory,
} from '../services/categoryService';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = { name: '' };

export default function Categories() {
  const { user, permissions } = useAuth();
  const can = (action) =>
    ['admin', 'superAdmin'].includes(user?.role) || Boolean(permissions?.categories?.[action]);
  const canCreate = can('create');
  const canEdit = can('edit');
  const canDeactivate = can('deactivate');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Deactivate confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getCategories({ includeInactive });
      setCategories(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ── Modal helpers ──────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing._id, form);
        toast.success('Category updated');
      } else {
        await createCategory(form);
        toast.success('Category created');
      }
      closeModal();
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Deactivate helpers ─────────────────────────────────────
  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await deactivateCategory(target._id);
      toast.success('Category deactivated');
      setConfirmOpen(false);
      setTarget(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">Group your inventory items into categories</p>
        </div>
        <div className="flex items-center gap-3">
          {(canEdit || canDeactivate) && (
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Show inactive
            </label>
          )}
          {canCreate && (
            <button className="btn-primary" onClick={openCreate}>
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add category
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-primary-600" />
          </div>
        ) : categories.length === 0 ? (
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
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <p className="text-sm">No categories found. Add your first one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    'Name',
                    'Status',
                    'Created',
                    ...(canEdit || canDeactivate ? ['Actions'] : []),
                  ].map((h) => (
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
                {categories.map((cat) => (
                  <tr key={cat._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">{cat.name}</td>
                    <td className="px-5 py-4">
                      <span className={cat.isActive ? 'badge-active' : 'badge-inactive'}>
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {new Date(cat.createdAt).toLocaleDateString()}
                    </td>
                    {(canEdit || canDeactivate) && (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <button
                              className="btn-secondary py-1 px-3 text-xs"
                              onClick={() => openEdit(cat)}
                            >
                              Edit
                            </button>
                          )}
                          {canDeactivate && cat.isActive && (
                            <button
                              className="btn-danger py-1 px-3 text-xs"
                              onClick={() => {
                                setTarget(cat);
                                setConfirmOpen(true);
                              }}
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    )}
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
        title={editing ? 'Edit category' : 'Add category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cat-name" className="label">
              Category name <span className="text-red-500">*</span>
            </label>
            <input
              id="cat-name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ name: e.target.value })}
              className="input-field"
              placeholder="e.g. Seeds, Fertilizer"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <Spinner size="sm" className="mr-2" />}
              {editing ? 'Save changes' : 'Create category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate confirm */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setTarget(null);
        }}
        onConfirm={handleDeactivate}
        loading={deactivating}
        title="Deactivate category"
        message={`Are you sure you want to deactivate "${target?.name}"? Items in this category will not be affected, but new items cannot be added to it.`}
      />
    </div>
  );
}
