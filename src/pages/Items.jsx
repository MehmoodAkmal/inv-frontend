import CustomSelect from '../components/ui/CustomSelect';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getItems, createItem, updateItem, deactivateItem } from '../services/itemService';
import { getCategories } from '../services/categoryService';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';

const UNITS = ['kg', 'bag', 'piece', 'litre', 'box'];

const EMPTY_CREATE = {
  categoryId: '',
  name: '',
  sku: '',
  unit: 'piece',
  costPrice: '',
  sellingPrice: '',
  reorderLevel: '0',
};

const EMPTY_EDIT = {
  categoryId: '',
  name: '',
  sku: '',
  unit: 'piece',
  costPrice: '',
  sellingPrice: '',
  reorderLevel: '0',
};

// ── Defined OUTSIDE Items so its identity is stable across renders.
// If it were inside, React would treat it as a new component type every
// render and unmount/remount the inputs, killing focus after each keystroke.
function ItemFormFields({ form, onChange, categories }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">
            Category <span className="text-red-500">*</span>
          </label>
          <CustomSelect
            name="categoryId"
            required
            value={form.categoryId}
            onChange={onChange}
            className="input-field"
          >
            <option value="">Select category</option>
            {categories
              .filter((c) => c.isActive)
              .map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
          </CustomSelect>
        </div>
        <div className="col-span-2">
          <label className="label">
            Item name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            value={form.name}
            onChange={onChange}
            className="input-field"
            placeholder="e.g. Wheat Seeds 1kg"
          />
        </div>
        <div>
          <label className="label">SKU</label>
          <input
            name="sku"
            type="text"
            value={form.sku}
            onChange={onChange}
            className="input-field"
            placeholder="e.g. SEED-001"
          />
        </div>
        <div>
          <label className="label">
            Unit <span className="text-red-500">*</span>
          </label>
          <CustomSelect
            name="unit"
            required
            value={form.unit}
            onChange={onChange}
            className="input-field"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </CustomSelect>
        </div>
        <div>
          <label className="label">
            Cost price <span className="text-red-500">*</span>
          </label>
          <input
            name="costPrice"
            type="number"
            min="0"
            step="0.01"
            required
            value={form.costPrice}
            onChange={onChange}
            className="input-field"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="label">
            Selling price <span className="text-red-500">*</span>
          </label>
          <input
            name="sellingPrice"
            type="number"
            min="0"
            step="0.01"
            required
            value={form.sellingPrice}
            onChange={onChange}
            className="input-field"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="label">Reorder level</label>
          <input
            name="reorderLevel"
            type="number"
            min="0"
            step="1"
            value={form.reorderLevel}
            onChange={onChange}
            className="input-field"
            placeholder="0"
          />
        </div>
      </div>
      {Number(form.sellingPrice) > 0 &&
        Number(form.costPrice) > 0 &&
        Number(form.sellingPrice) < Number(form.costPrice) && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Warning: selling price is below cost price. This item will sell at a loss.
          </p>
        )}
    </>
  );
}

export default function Items() {
  const { user, permissions } = useAuth();
  const can = (action) =>
    ['admin', 'superAdmin'].includes(user?.role) || Boolean(permissions?.items?.[action]);
  const canCreate = can('create');
  const canEdit = can('edit');
  const canDeactivate = can('deactivate');
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = { includeInactive };
      if (filterCategory) params.categoryId = filterCategory;

      const [itemsRes, catsRes] = await Promise.all([getItems(params), getCategories()]);
      setItems(itemsRes.data.data);
      setCategories(catsRes.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, includeInactive]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const categoryName = (item) =>
    item.categoryId?.name ?? categories.find((c) => c._id === item.categoryId)?.name ?? '—';

  // ── Create ─────────────────────────────────────────────────
  const handleCreateChange = (e) =>
    setCreateForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        ...createForm,
        costPrice: Number(createForm.costPrice),
        sellingPrice: Number(createForm.sellingPrice),
        reorderLevel: Number(createForm.reorderLevel),
      };
      await createItem(payload);
      toast.success('Item created');
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create item');
    } finally {
      setCreating(false);
    }
  };

  // ── Edit ───────────────────────────────────────────────────
  const openEdit = (item) => {
    setEditTarget(item);
    setEditForm({
      categoryId: item.categoryId?._id ?? item.categoryId ?? '',
      name: item.name,
      sku: item.sku ?? '',
      unit: item.unit,
      costPrice: String(item.costPrice),
      sellingPrice: String(item.sellingPrice),
      reorderLevel: String(item.reorderLevel ?? 0),
    });
    setEditOpen(true);
  };

  const handleEditChange = (e) => setEditForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditing(true);
    try {
      const payload = {
        ...editForm,
        costPrice: Number(editForm.costPrice),
        sellingPrice: Number(editForm.sellingPrice),
        reorderLevel: Number(editForm.reorderLevel),
      };
      await updateItem(editTarget._id, payload);
      toast.success('Item updated');
      setEditOpen(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update item');
    } finally {
      setEditing(false);
    }
  };

  // ── Deactivate ─────────────────────────────────────────────
  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await deactivateItem(deactivateTarget._id);
      toast.success('Item deactivated');
      setConfirmOpen(false);
      setDeactivateTarget(null);
      fetchAll();
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
          <h1 className="text-2xl font-bold text-gray-900">Items</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your inventory products</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <CustomSelect
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-field w-auto text-sm py-2"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </CustomSelect>
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
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add item
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
        ) : items.length === 0 ? (
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
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
              />
            </svg>
            <p className="text-sm">No items found. Add your first one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    'Name',
                    'SKU',
                    'Category',
                    'Unit',
                    'Cost',
                    'Selling',
                    'Reorder',
                    'Status',
                    ...(canEdit || canDeactivate ? ['Actions'] : []),
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.sku || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{categoryName(item)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.unit}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {Number(item.costPrice).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className={item.sellingPrice < item.costPrice ? 'text-amber-600' : ''}>
                        {Number(item.sellingPrice).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.reorderLevel}</td>
                    <td className="px-4 py-3">
                      <span className={item.isActive ? 'badge-active' : 'badge-inactive'}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {(canEdit || canDeactivate) && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <button
                              className="btn-secondary py-1 px-3 text-xs"
                              onClick={() => openEdit(item)}
                            >
                              Edit
                            </button>
                          )}
                          {canDeactivate && item.isActive && (
                            <button
                              className="btn-danger py-1 px-3 text-xs"
                              onClick={() => {
                                setDeactivateTarget(item);
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

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add item">
        <form onSubmit={handleCreate} className="space-y-4">
          <ItemFormFields form={createForm} onChange={handleCreateChange} categories={categories} />
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating && <Spinner size="sm" className="mr-2" />}
              Create item
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit item">
        <form onSubmit={handleEdit} className="space-y-4">
          <ItemFormFields form={editForm} onChange={handleEditChange} categories={categories} />
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditOpen(false)}
              disabled={editing}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={editing}>
              {editing && <Spinner size="sm" className="mr-2" />}
              Save changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate confirm */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setDeactivateTarget(null);
        }}
        onConfirm={handleDeactivate}
        loading={deactivating}
        title="Deactivate item"
        message={`Are you sure you want to deactivate "${deactivateTarget?.name}"?`}
      />
    </div>
  );
}
