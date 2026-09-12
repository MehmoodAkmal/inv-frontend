import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  getItems,
  createItem,
  updateItem,
  deactivateItem,
} from '../services/itemService';
import { getCategories, createCategory } from '../services/categoryService';
import { formatCategoryName } from '../utils/formatters';

import {
  StatCard,
  DataTable,
  DashboardLayout,
  Modal,
  ConfirmDialog,
  CustomSelect,
  Spinner,
} from '../components/ui';

// ── Helpers ─────────────────────────────────────────────────────────────────
const UNITS = ['piece', 'kg', 'bag', 'litre', 'box'];

const fmt = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const calcMargin = (cost, sell) => {
  const c = Number(cost) || 0;
  const s = Number(sell) || 0;
  if (c > 0) {
    const m = ((s - c) / c) * 100;
    return {
      value: `${m >= 0 ? '+' : ''}${m.toFixed(1)}%`,
      raw: m,
    };
  }
  if (s > 0) {
    return { value: '+100.0%', raw: 100 };
  }
  return { value: '0.0%', raw: 0 };
};

const EMPTY_ITEM_FORM = {
  name: '',
  categoryId: '',
  sku: '',
  unit: 'piece',
  costPrice: '',
  sellingPrice: '',
  reorderLevel: '0',
};

export default function ItemsCatalog() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // State
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Views
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | categoryId
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [searchQuery, setSearchQuery] = useState('');

  // Add Item Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ ...EMPTY_ITEM_FORM });
  const [savingItem, setSavingItem] = useState(false);

  // Edit Item Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_ITEM_FORM });
  const [updatingItem, setUpdatingItem] = useState(false);

  // Add Category Modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  // Delete / Deactivate Item Dialog
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  // ── 1. Fetch Categories ───────────────────────────────────────────────────
  const fetchCategoriesData = useCallback(async () => {
    try {
      const res = await getCategories();
      if (res.data?.success) {
        setCategories(res.data.data || []);
      }
    } catch (err) {
      console.error('getCategories error:', err);
    }
  }, []);

  // ── 2. Fetch Items ────────────────────────────────────────────────────────
  const fetchItemsData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { includeInactive: false };
      if (selectedCategory !== 'all') {
        params.categoryId = selectedCategory;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await getItems(params);
      if (res.data?.success) {
        setItems(res.data.data || []);
      }
    } catch (err) {
      console.error('getItems error:', err);
      toast.error('Failed to load items catalog');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchCategoriesData();
  }, [fetchCategoriesData]);

  useEffect(() => {
    fetchItemsData();
  }, [fetchItemsData]);

  // ── 3. Category Count Map ─────────────────────────────────────────────────
  const categoryCounts = useMemo(() => {
    const counts = { all: items.length };
    items.forEach((item) => {
      const cid = item.categoryId?._id ?? item.categoryId;
      if (cid) {
        counts[cid] = (counts[cid] || 0) + 1;
      }
    });
    return counts;
  }, [items]);

  // ── 4. Client Filtered Items ──────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    let list = items;
    if (selectedCategory !== 'all') {
      list = list.filter((i) => {
        const cid = i.categoryId?._id ?? i.categoryId;
        return String(cid) === String(selectedCategory);
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.sku?.toLowerCase().includes(q) ||
          i.categoryId?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, selectedCategory, searchQuery]);

  // ── 5. StatCards Metrics ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const count = filteredItems.length;
    let totalSellingVal = 0;
    let totalCostVal = 0;

    filteredItems.forEach((i) => {
      totalSellingVal += i.sellingPrice || 0;
      totalCostVal += i.costPrice || 0;
    });

    const avgMargin =
      totalCostVal > 0
        ? (((totalSellingVal - totalCostVal) / totalCostVal) * 100).toFixed(1)
        : '0.0';

    return {
      totalItems: count,
      avgMargin: `${avgMargin >= 0 ? '+' : ''}${avgMargin}%`,
      avgMarginRaw: Number(avgMargin),
      totalCategories: categories.length,
    };
  }, [filteredItems, categories]);

  // ── 6. Create Item Handlers ───────────────────────────────────────────────
  const openCreateModal = () => {
    setItemForm({
      name: '',
      categoryId: selectedCategory !== 'all' ? selectedCategory : (categories[0]?._id || ''),
      sku: '',
      unit: 'piece',
      costPrice: '',
      sellingPrice: '',
      reorderLevel: '10',
    });
    setAddModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    if (!itemForm.categoryId) {
      toast.error('Please select a category');
      return;
    }

    const costNum = Number(itemForm.costPrice);
    const sellNum = Number(itemForm.sellingPrice);
    const reorderNum = Number(itemForm.reorderLevel) || 0;

    if (isNaN(costNum) || costNum < 0) {
      toast.error('Please enter a valid cost price');
      return;
    }
    if (isNaN(sellNum) || sellNum < 0) {
      toast.error('Please enter a valid selling price');
      return;
    }

    setSavingItem(true);
    try {
      const payload = {
        name: itemForm.name.trim(),
        categoryId: itemForm.categoryId,
        sku: itemForm.sku.trim() || undefined,
        unit: itemForm.unit,
        costPrice: costNum,
        sellingPrice: sellNum,
        reorderLevel: reorderNum,
      };

      const res = await createItem(payload);
      if (res.data?.success) {
        toast.success(`"${itemForm.name}" created successfully`);
        setAddModalOpen(false);
        setItemForm({ ...EMPTY_ITEM_FORM });
        fetchItemsData();
      } else {
        toast.error(res.data?.message || 'Failed to create item');
      }
    } catch (err) {
      console.error('createItem error:', err);
      toast.error(err.response?.data?.message || 'Failed to create catalog item');
    } finally {
      setSavingItem(false);
    }
  };

  // ── 7. Edit Item Handlers ─────────────────────────────────────────────────
  const openEditModal = (item, e) => {
    e?.stopPropagation();
    setEditTarget(item);
    setEditForm({
      name: item.name || '',
      categoryId: item.categoryId?._id ?? item.categoryId ?? '',
      sku: item.sku || '',
      unit: item.unit || 'piece',
      costPrice: String(item.costPrice ?? ''),
      sellingPrice: String(item.sellingPrice ?? ''),
      reorderLevel: String(item.reorderLevel ?? '0'),
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;

    if (!editForm.name.trim()) {
      toast.error('Item name is required');
      return;
    }

    const costNum = Number(editForm.costPrice);
    const sellNum = Number(editForm.sellingPrice);
    const reorderNum = Number(editForm.reorderLevel) || 0;

    if (isNaN(costNum) || costNum < 0) {
      toast.error('Please enter a valid cost price');
      return;
    }
    if (isNaN(sellNum) || sellNum < 0) {
      toast.error('Please enter a valid selling price');
      return;
    }

    setUpdatingItem(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        categoryId: editForm.categoryId,
        sku: editForm.sku.trim() || undefined,
        unit: editForm.unit,
        costPrice: costNum,
        sellingPrice: sellNum,
        reorderLevel: reorderNum,
      };

      const res = await updateItem(editTarget._id, payload);
      if (res.data?.success) {
        toast.success(`"${editForm.name}" updated successfully`);
        setEditModalOpen(false);
        setEditTarget(null);
        fetchItemsData();
      } else {
        toast.error(res.data?.message || 'Failed to update item');
      }
    } catch (err) {
      console.error('updateItem error:', err);
      toast.error(err.response?.data?.message || 'Failed to update item');
    } finally {
      setUpdatingItem(false);
    }
  };

  // ── 8. Deactivate Item Handlers ───────────────────────────────────────────
  const openDeactivateDialog = (item, e) => {
    e?.stopPropagation();
    setDeactivateTarget(item);
    setDeactivateOpen(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      const res = await deactivateItem(deactivateTarget._id);
      if (res.data?.success) {
        toast.success(`"${deactivateTarget.name}" archived`);
        setDeactivateOpen(false);
        setDeactivateTarget(null);
        fetchItemsData();
      } else {
        toast.error(res.data?.message || 'Failed to archive item');
      }
    } catch (err) {
      console.error('deactivateItem error:', err);
      toast.error(err.response?.data?.message || 'Failed to archive item');
    } finally {
      setDeactivating(false);
    }
  };

  // ── 9. Add Category Handlers ──────────────────────────────────────────────
  const handleCreateCategorySubmit = async (e) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error('Category name is required');
      return;
    }

    setSavingCat(true);
    try {
      const res = await createCategory({ name: catName.trim() });
      if (res.data?.success) {
        toast.success(`Category "${catName.trim()}" added`);
        setCatModalOpen(false);
        setCatName('');
        await fetchCategoriesData();
        // Auto-select the new category
        if (res.data.data?._id) {
          setSelectedCategory(res.data.data._id);
        }
      } else {
        toast.error(res.data?.message || 'Failed to create category');
      }
    } catch (err) {
      console.error('createCategory error:', err);
      toast.error(err.response?.data?.message || 'Failed to add category');
    } finally {
      setSavingCat(false);
    }
  };

  // ── 10. Table Columns ─────────────────────────────────────────────────────
  const columns = [
    {
      key: 'name',
      label: 'Item Name',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-800 dark:text-brand-accent flex items-center justify-center font-bold text-xs shrink-0 border border-brand-200/50 dark:border-brand-700/40">
            {val.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="text-xs font-bold text-neutral-900 dark:text-white block">
              {val}
            </span>
            <span className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500 block">
              {row.sku ? row.sku : 'NO SKU'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'categoryId',
      label: 'Category',
      render: (val) => {
        const catName = formatCategoryName(val?.name || categories.find((c) => c._id === val)?.name || 'General');
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700">
            {catName}
          </span>
        );
      },
    },
    {
      key: 'unit',
      label: 'Unit',
      align: 'center',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-50/60 text-brand-800 dark:bg-brand-900/30 dark:text-brand-accent">
          {val || 'piece'}
        </span>
      ),
    },
    {
      key: 'costPrice',
      label: 'Cost Price',
      type: 'currency',
      align: 'right',
      sortable: true,
      render: (val) => (
        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
          ${fmt(val)}
        </span>
      ),
    },
    {
      key: 'sellingPrice',
      label: 'Selling Price',
      type: 'currency',
      align: 'right',
      sortable: true,
      render: (val) => (
        <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
          ${fmt(val)}
        </span>
      ),
    },
    {
      key: 'margin',
      label: 'Margin %',
      type: 'number',
      align: 'right',
      render: (_, row) => {
        const margin = calcMargin(row.costPrice, row.sellingPrice);
        return (
          <span
            className={`font-mono text-xs font-bold ${
              margin.raw > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : margin.raw < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            {margin.value}
          </span>
        );
      },
    },
    {
      key: 'reorderLevel',
      label: 'Reorder Level',
      type: 'number',
      align: 'right',
      sortable: true,
      render: (val, row) => (
        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
          {fmt(val)} {row.unit}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (_, row) => {
        // Hide edit icon entirely for manager/cashier
        if (!isAdmin) return null;

        return (
          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => openEditModal(row, e)}
              className="p-1.5 rounded-md text-neutral-500 hover:text-brand-800 dark:hover:text-brand-accent hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Edit item"
              aria-label="Edit item"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => openDeactivateDialog(row, e)}
              className="p-1.5 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Archive item"
              aria-label="Archive item"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ── Page Header ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Items Catalog
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-brand-50 text-brand-800 dark:bg-brand-900/60 dark:text-brand-accent border border-brand-200/60 dark:border-brand-700/50">
                Master Directory
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Browse organization product items, organize category hierarchies, monitor unit pricing, and calculate profit margins.
            </p>
          </div>

          {/* Action Buttons: Hidden entirely for manager/cashier */}
          {isAdmin && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setCatModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 shadow-sm transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>+ Add Category</span>
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent border border-brand-700 hover:bg-brand-950 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>+ Add Item</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Summary StatCards ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Products Tracked"
            value={fmt(stats.totalItems)}
            accentColor="brand"
            icon={
              <svg className="w-5 h-5 text-brand-700 dark:text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
              </svg>
            }
            secondaryStats={[
              {
                label: 'Categories',
                value: stats.totalCategories,
              },
              {
                label: 'Active Filter',
                value: selectedCategory === 'all' ? 'All Items' : 'Filtered',
              },
            ]}
          />

          <StatCard
            label="Average Catalog Margin"
            value={stats.avgMargin}
            accentColor={stats.avgMarginRaw > 0 ? 'success' : stats.avgMarginRaw < 0 ? 'danger' : 'neutral'}
            icon={
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
            secondaryStats={[
              {
                label: 'Calculation',
                value: '(Sell - Cost) / Cost',
              },
            ]}
          />

          <StatCard
            label="Category Breakdown"
            value={`${stats.totalCategories} Active`}
            accentColor="neutral"
            icon={
              <svg className="w-5 h-5 text-neutral-600 dark:text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
            secondaryStats={[
              {
                label: 'Inventory Roles',
                value: isAdmin ? 'Admin Full Access' : 'Read-Only Catalog',
              },
            ]}
          />
        </div>

        {/* ── Category Filter Horizontal Pill Tabs ────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
              selectedCategory === 'all'
                ? 'bg-brand-900 dark:bg-brand-800 text-brand-accent border-brand-700 shadow-sm'
                : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <span>All Items</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${
              selectedCategory === 'all'
                ? 'bg-brand-800 text-brand-accent'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
            }`}>
              {items.length}
            </span>
          </button>

          {categories
            .filter((c) => c.isActive)
            .map((cat) => {
              const count = categoryCounts[cat._id] || 0;
              const isSelected = selectedCategory === cat._id;
              return (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => setSelectedCategory(cat._id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-brand-900 dark:bg-brand-800 text-brand-accent border-brand-700 shadow-sm'
                      : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  <span className="capitalize">{formatCategoryName(cat.name)}</span>
                  {count > 0 && (
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${
                      isSelected
                        ? 'bg-brand-800 text-brand-accent'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
        </div>

        {/* ── Search & View Mode Switcher Toolbar ─────────────────────── */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-3 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search items by name, SKU, or category…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-md bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-accent placeholder-neutral-400"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-xs text-neutral-400 font-mono">
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            </span>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-md text-xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
                title="Grid cards view"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
                title="Table data view"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Content View: Grid or Table ─────────────────────────────── */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Spinner size="lg" className="text-brand-800 dark:text-brand-accent" />
            <span className="text-xs text-neutral-400 mt-2">Loading catalog items…</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-12 text-center shadow-card">
            <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-800 dark:text-brand-accent flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">No items found</h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No products matched your search "${searchQuery}".`
                : selectedCategory !== 'all'
                ? 'No items found in this category.'
                : 'Your catalog is currently empty.'}
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent hover:bg-brand-950 transition-colors"
              >
                + Add Item Now
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* ── Grid View (Cards) ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => {
              const margin = calcMargin(item.costPrice, item.sellingPrice);
              const catName =
                item.categoryId?.name ||
                categories.find((c) => c._id === item.categoryId)?.name ||
                'General';

              return (
                <div
                  key={item._id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-4 shadow-card hover:shadow-card-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Card Header: Category & Admin Edit Action */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700">
                        {catName}
                      </span>

                      {/* Edit icon: Admin only! Hidden completely for manager/cashier */}
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => openEditModal(item, e)}
                            className="p-1 rounded text-neutral-400 hover:text-brand-800 dark:hover:text-brand-accent hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            title="Edit item"
                            aria-label="Edit item"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => openDeactivateDialog(item, e)}
                            className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Archive item"
                            aria-label="Archive item"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Item Name & SKU */}
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight mb-1">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 mb-3">
                      {item.sku && (
                        <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                          {item.sku}
                        </span>
                      )}
                      <span className="text-[11px] text-neutral-400 font-sans">
                        Unit: <strong className="text-neutral-600 dark:text-neutral-300 font-medium">{item.unit || 'piece'}</strong>
                      </span>
                    </div>

                    {/* Pricing Grid */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-md bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 text-xs mb-3">
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Cost Price</span>
                        <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                          ${fmt(item.costPrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Selling Price</span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-white">
                          ${fmt(item.sellingPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Margin % & Reorder Level */}
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 block">Profit Margin</span>
                      <span
                        className={`font-mono font-bold ${
                          margin.raw > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : margin.raw < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        {margin.value}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-neutral-400 block">Reorder Level</span>
                      <span className="font-mono font-medium text-neutral-600 dark:text-neutral-400">
                        {item.reorderLevel ?? 0} {item.unit}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Table View ── */
          <DataTable
            columns={columns}
            data={filteredItems}
            loading={loading}
            emptyMessage="No items match your filter criteria"
          />
        )}

        {/* ── Add Item Modal (Admin Only) ─────────────────────────────── */}
        <Modal
          isOpen={addModalOpen}
          onClose={() => !savingItem && setAddModalOpen(false)}
          title="Add New Catalog Item"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Item Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={150}
                value={itemForm.name}
                onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Organic Basmati Rice 5kg"
                className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                required
                value={itemForm.categoryId}
                onChange={(e) => setItemForm((p) => ({ ...p, categoryId: e.target.value }))}
                className="w-full text-xs py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
              >
                <option value="">Select Category</option>
                {categories
                  .filter((c) => c.isActive)
                  .map((c) => (
                    <option key={c._id} value={c._id} className="capitalize">
                      {formatCategoryName(c.name)}
                    </option>
                  ))}
              </CustomSelect>
            </div>

            {/* SKU & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  SKU Code <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={itemForm.sku}
                  onChange={(e) => setItemForm((p) => ({ ...p, sku: e.target.value }))}
                  placeholder="e.g. RICE-001"
                  className="w-full px-3 py-2 text-xs font-mono uppercase rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Unit of Measure <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  required
                  value={itemForm.unit}
                  onChange={(e) => setItemForm((p) => ({ ...p, unit: e.target.value }))}
                  className="w-full text-xs py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </CustomSelect>
              </div>
            </div>

            {/* Cost & Selling Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Cost Price ($) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={itemForm.costPrice}
                  onChange={(e) => setItemForm((p) => ({ ...p, costPrice: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm font-mono rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Selling Price ($) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={itemForm.sellingPrice}
                  onChange={(e) => setItemForm((p) => ({ ...p, sellingPrice: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm font-mono rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
                />
              </div>
            </div>

            {/* Live Margin Calculation Preview */}
            {(itemForm.costPrice || itemForm.sellingPrice) && (
              <div className="p-2.5 rounded-md bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-500 dark:text-neutral-400 font-sans text-[11px]">
                  Projected Margin %
                </span>
                {(() => {
                  const m = calcMargin(itemForm.costPrice, itemForm.sellingPrice);
                  return (
                    <span
                      className={`font-bold ${
                        m.raw > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : m.raw < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-neutral-500'
                      }`}
                    >
                      {m.value}
                    </span>
                  );
                })()}
              </div>
            )}

            {/* Reorder Level */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Reorder Alert Level <span className="text-neutral-400 font-normal">(Units)</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={itemForm.reorderLevel}
                onChange={(e) => setItemForm((p) => ({ ...p, reorderLevel: e.target.value }))}
                placeholder="10"
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                When branch inventory falls to or below this quantity, low stock alerts will be triggered.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                disabled={savingItem}
                className="px-4 py-2 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingItem || !itemForm.name.trim() || !itemForm.categoryId}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent border border-brand-700 hover:bg-brand-950 transition-colors shadow-sm disabled:opacity-50"
              >
                {savingItem && <Spinner size="sm" />}
                <span>Add Item</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* ── Edit Item Modal (Admin Only) ──────────────────────────────── */}
        <Modal
          isOpen={editModalOpen}
          onClose={() => !updatingItem && setEditModalOpen(false)}
          title="Edit Catalog Item"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Item Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={150}
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                required
                value={editForm.categoryId}
                onChange={(e) => setEditForm((p) => ({ ...p, categoryId: e.target.value }))}
                className="w-full text-xs py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
              >
                <option value="">Select Category</option>
                {categories
                  .filter((c) => c.isActive)
                  .map((c) => (
                    <option key={c._id} value={c._id} className="capitalize">
                      {formatCategoryName(c.name)}
                    </option>
                  ))}
              </CustomSelect>
            </div>

            {/* SKU & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  SKU Code
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={editForm.sku}
                  onChange={(e) => setEditForm((p) => ({ ...p, sku: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-mono uppercase rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Unit of Measure <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  required
                  value={editForm.unit}
                  onChange={(e) => setEditForm((p) => ({ ...p, unit: e.target.value }))}
                  className="w-full text-xs py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </CustomSelect>
              </div>
            </div>

            {/* Cost & Selling Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Cost Price ($) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={editForm.costPrice}
                  onChange={(e) => setEditForm((p) => ({ ...p, costPrice: e.target.value }))}
                  className="w-full px-3 py-2 text-sm font-mono rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Selling Price ($) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={editForm.sellingPrice}
                  onChange={(e) => setEditForm((p) => ({ ...p, sellingPrice: e.target.value }))}
                  className="w-full px-3 py-2 text-sm font-mono rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
                />
              </div>
            </div>

            {/* Live Margin Calculation Preview */}
            <div className="p-2.5 rounded-md bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-500 dark:text-neutral-400 font-sans text-[11px]">
                Updated Margin %
              </span>
              {(() => {
                const m = calcMargin(editForm.costPrice, editForm.sellingPrice);
                return (
                  <span
                    className={`font-bold ${
                      m.raw > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : m.raw < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-neutral-500'
                    }`}
                  >
                    {m.value}
                  </span>
                );
              })()}
            </div>

            {/* Reorder Level */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Reorder Alert Level (Units)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={editForm.reorderLevel}
                onChange={(e) => setEditForm((p) => ({ ...p, reorderLevel: e.target.value }))}
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                disabled={updatingItem}
                className="px-4 py-2 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingItem || !editForm.name.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent border border-brand-700 hover:bg-brand-950 transition-colors shadow-sm disabled:opacity-50"
              >
                {updatingItem && <Spinner size="sm" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* ── Add Category Modal (Admin Only) ─────────────────────────── */}
        <Modal
          isOpen={catModalOpen}
          onClose={() => !savingCat && setCatModalOpen(false)}
          title="Create New Category"
        >
          <form onSubmit={handleCreateCategorySubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Category Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={50}
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Pesticides, Irrigation Equipment, Tools"
                className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setCatModalOpen(false)}
                disabled={savingCat}
                className="px-4 py-2 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCat || !catName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent border border-brand-700 hover:bg-brand-950 transition-colors shadow-sm disabled:opacity-50"
              >
                {savingCat && <Spinner size="sm" />}
                <span>Create Category</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* ── Deactivate Item Dialog ──────────────────────────────────── */}
        <ConfirmDialog
          isOpen={deactivateOpen}
          onClose={() => !deactivating && setDeactivateOpen(false)}
          onConfirm={handleDeactivateConfirm}
          loading={deactivating}
          title="Archive Catalog Item"
          message={`Are you sure you want to archive "${deactivateTarget?.name}"? It will no longer appear in new transactions.`}
        />
      </div>
    </DashboardLayout>
  );
}
