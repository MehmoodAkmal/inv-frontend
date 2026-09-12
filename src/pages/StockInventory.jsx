import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getStock } from '../services/stockService';
import { getBranches } from '../services/branchService';
import { getCategories } from '../services/categoryService';
import { formatCategoryName } from '../utils/formatters';

import {
  StatCard,
  DataTable,
  DashboardLayout,
  Modal,
  CustomSelect,
} from '../components/ui';

import { PurchaseEntryForm } from './PurchaseEntry';

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n ?? 0).toLocaleString();
const fmtCurrency = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtd = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// ── Status Badges ───────────────────────────────────────────────────────────
function StockStatusBadge({ status, quantity, reorderLevel }) {
  if (status === 'critical') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50"
        title={`Quantity (${quantity}) is critically below reorder level (${reorderLevel})`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
        Critical
      </span>
    );
  }

  if (status === 'low') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50"
        title={`Quantity (${quantity}) is at or below reorder level (${reorderLevel})`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        Low
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50"
      title={`Quantity (${quantity}) is safely above reorder level (${reorderLevel})`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
      Healthy
    </span>
  );
}

export default function StockInventory() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isCashier = user?.role === 'cashier';
  const isLockedBranch = isManager || isCashier;
  const userBranchId = user?.branchId;

  // Master Data
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'critical' | 'low' | 'healthy'
  const [searchQuery, setSearchQuery] = useState('');

  // Purchase Entry Modal State
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState(null); // { itemId, branchId }

  // ── 1. Fetch Branches & Categories ────────────────────────────────────────
  useEffect(() => {
    getBranches()
      .then((res) => {
        if (res.data?.success) setBranches(res.data.data || []);
      })
      .catch(() => {});

    getCategories()
      .then((res) => {
        if (res.data?.success) setCategories(res.data.data || []);
      })
      .catch(() => {});
  }, []);

  // Locked branch name for Manager & Cashier
  const userBranchName = useMemo(() => {
    if (!userBranchId) return 'Assigned Branch';
    const b = branches.find((item) => item._id === userBranchId);
    return b?.name || 'Assigned Branch';
  }, [userBranchId, branches]);

  // ── 2. Fetch Stock Inventory ──────────────────────────────────────────────
  const fetchStockData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (isAdmin) {
        if (selectedBranch) params.branchId = selectedBranch;
      } else if (userBranchId) {
        params.branchId = userBranchId;
      }

      const res = await getStock(params);
      if (res.data?.success) {
        setStockList(res.data.data || []);
      }
    } catch (err) {
      console.error('getStock error:', err);
      toast.error('Failed to fetch stock inventory');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedBranch, userBranchId]);

  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  // ── 3. Process & Categorize Stock Rows ─────────────────────────────────────
  const processedStock = useMemo(() => {
    return stockList.map((s) => {
      const item = s.itemId || {};
      const reorderLevel = item.reorderLevel ?? 0;
      const quantity = s.quantity ?? 0;
      const costPrice = item.costPrice ?? 0;
      const totalValue = quantity * costPrice;

      // Status classification
      let status = 'healthy';
      if (quantity <= 0 || (reorderLevel > 0 && quantity <= reorderLevel * 0.5)) {
        status = 'critical';
      } else if (quantity <= reorderLevel) {
        status = 'low';
      }

      // Branch name resolution
      let branchName = '—';
      if (s.branchId?.name) {
        branchName = s.branchId.name;
      } else {
        const bid = s.branchId?._id ?? s.branchId;
        const b = branches.find((x) => x._id === bid);
        if (b) branchName = b.name;
      }

      // Category name resolution
      let categoryName = '—';
      if (item.categoryId?.name) {
        categoryName = formatCategoryName(item.categoryId.name);
      } else if (item.categoryId) {
        const cid = item.categoryId?._id ?? item.categoryId;
        const c = categories.find((cat) => cat._id === cid);
        if (c) categoryName = formatCategoryName(c.name);
      }

      return {
        _id: s._id,
        stockId: s._id,
        itemId: item._id,
        itemName: item.name || 'Unnamed Item',
        sku: item.sku || '',
        unit: item.unit || 'piece',
        categoryName,
        categoryId: item.categoryId?._id ?? item.categoryId,
        branchId: s.branchId?._id ?? s.branchId,
        branchName,
        quantity,
        reorderLevel,
        costPrice,
        totalValue,
        status,
        isLowOrCritical: status === 'critical' || status === 'low',
        updatedAt: s.updatedAt || s.createdAt,
      };
    });
  }, [stockList, branches, categories]);

  // ── 4. StatCards Calculations ─────────────────────────────────────────────
  const statMetrics = useMemo(() => {
    const totalSKUs = processedStock.length;
    let totalStockValue = 0;
    let criticalCount = 0;
    let lowCount = 0;
    let healthyCount = 0;

    processedStock.forEach((s) => {
      totalStockValue += s.totalValue;
      if (s.status === 'critical') criticalCount++;
      else if (s.status === 'low') lowCount++;
      else healthyCount++;
    });

    return {
      totalSKUs,
      totalStockValue,
      criticalCount,
      lowCount,
      healthyCount,
    };
  }, [processedStock]);

  // ── 5. Filtered Table Rows ────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let rows = processedStock;

    // Filter by category
    if (selectedCategory) {
      rows = rows.filter((r) => String(r.categoryId) === String(selectedCategory));
    }

    // Filter by stock status
    if (statusFilter !== 'all') {
      rows = rows.filter((r) => r.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.itemName.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.categoryName.toLowerCase().includes(q) ||
          r.branchName.toLowerCase().includes(q)
      );
    }

    return rows;
  }, [processedStock, selectedCategory, statusFilter, searchQuery]);

  // ── 6. Open Purchase Entry Modal Handlers ─────────────────────────────────
  const handleOpenAddStock = (itemRow = null) => {
    if (itemRow) {
      setPurchaseTarget({
        itemId: itemRow.itemId,
        branchId: itemRow.branchId,
      });
    } else {
      setPurchaseTarget({
        itemId: '',
        branchId: isAdmin ? selectedBranch : userBranchId,
      });
    }
    setPurchaseModalOpen(true);
  };

  // ── 7. DataTable Columns ──────────────────────────────────────────────────
  const columns = [
    {
      key: 'itemName',
      label: 'Item Name',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
            row.status === 'critical'
              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              : row.status === 'low'
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              : 'bg-brand-50 dark:bg-brand-900/40 text-brand-800 dark:text-brand-accent border border-brand-200/50 dark:border-brand-700/40'
          }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-bold text-neutral-900 dark:text-white block">
              {val}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              {row.sku ? (
                <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.2 rounded">
                  {row.sku}
                </span>
              ) : null}
              <span className="text-[10px] text-neutral-400 font-sans">
                Unit: {row.unit}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'categoryName',
      label: 'Category',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
          {formatCategoryName(val)}
        </span>
      ),
    },
    {
      key: 'branchName',
      label: 'Branch',
      render: (val) => (
        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
          {val}
        </span>
      ),
    },
    {
      key: 'quantity',
      label: 'Current Quantity',
      type: 'number',
      align: 'right',
      sortable: true,
      render: (val, row) => (
        <div className="text-right">
          <span
            className={`font-mono text-sm font-bold ${
              row.status === 'critical'
                ? 'text-rose-600 dark:text-rose-400'
                : row.status === 'low'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-neutral-900 dark:text-neutral-100'
            }`}
          >
            {fmt(val)}
          </span>
          <span className="text-[10px] text-neutral-400 ml-1">{row.unit}</span>
        </div>
      ),
    },
    {
      key: 'reorderLevel',
      label: 'Reorder Level',
      type: 'number',
      align: 'right',
      sortable: true,
      render: (val, row) => (
        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
          {fmt(val)} {row.unit}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (val, row) => (
        <StockStatusBadge
          status={val}
          quantity={row.quantity}
          reorderLevel={row.reorderLevel}
        />
      ),
    },
    {
      key: 'updatedAt',
      label: 'Last Movement Date',
      sortable: true,
      render: (val) => (
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 font-mono">
          {fmtd(val)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => handleOpenAddStock(row)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand-50 hover:bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:hover:bg-brand-900/80 dark:text-brand-accent border border-brand-200/80 dark:border-brand-700/60 transition-colors"
            title="Add stock for this item"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Stock</span>
          </button>
        </div>
      ),
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
                Stock & Inventory
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-brand-50 text-brand-800 dark:bg-brand-900/60 dark:text-brand-accent border border-brand-200/60 dark:border-brand-700/50">
                Warehousing
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Monitor real-time branch inventory levels, calculate valuation, identify reorder thresholds, and record purchase shipments.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/purchase-entry"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors border border-neutral-200 dark:border-neutral-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Full Purchase Ledger</span>
            </Link>

            <button
              type="button"
              onClick={() => handleOpenAddStock(null)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent border border-brand-700 hover:bg-brand-950 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Add Stock</span>
            </button>
          </div>
        </div>

        {/* ── Summary StatCards ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total SKUs"
            value={fmt(statMetrics.totalSKUs)}
            accentColor="brand"
            icon={
              <svg className="w-5 h-5 text-brand-700 dark:text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
              </svg>
            }
            secondaryStats={[
              {
                label: 'Branch Scope',
                value: isLockedBranch ? userBranchName : selectedBranch ? 'Filtered Branch' : 'All Branches',
              },
            ]}
          />

          <StatCard
            label="Total Stock Value"
            value={`$${fmtCurrency(statMetrics.totalStockValue)}`}
            accentColor="brand"
            icon={
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            secondaryStats={[
              {
                label: 'Valuation Basis',
                value: 'Quantity × Cost Price',
              },
            ]}
          />

          <StatCard
            label="Critical Low-Stock Count"
            value={statMetrics.criticalCount}
            accentColor={statMetrics.criticalCount > 0 ? 'danger' : 'neutral'}
            icon={
              <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            secondaryStats={[
              {
                label: 'Below 50% Threshold',
                value: statMetrics.criticalCount,
              },
              {
                label: 'Near Low Threshold',
                value: statMetrics.lowCount,
              },
            ]}
          />

          <StatCard
            label="Healthy Stock Count"
            value={statMetrics.healthyCount}
            accentColor="success"
            icon={
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            secondaryStats={[
              {
                label: 'Availability Ratio',
                value: statMetrics.totalSKUs > 0 ? `${((statMetrics.healthyCount / statMetrics.totalSKUs) * 100).toFixed(1)}%` : '0%',
              },
            ]}
          />
        </div>

        {/* ── Filters Bar ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-4 shadow-card">
          <div className="flex flex-wrap items-end gap-3 justify-between">
            <div className="flex flex-wrap items-end gap-3 flex-1">
              {/* Branch Selector: All Branches for Admin, Locked for Manager/Cashier */}
              <div className="w-48">
                <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Branch
                </label>
                {isAdmin ? (
                  <CustomSelect
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="text-xs py-1.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-md"
                  >
                    <option value="">All Branches</option>
                    {branches
                      .filter((b) => b.isActive)
                      .map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.name}
                        </option>
                      ))}
                  </CustomSelect>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-300">
                    <svg className="w-3.5 h-3.5 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="truncate max-w-[140px] font-medium" title={userBranchName}>
                      {userBranchName}
                    </span>
                  </div>
                )}
              </div>

              {/* Category Filter */}
              <div className="w-44">
                <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Category
                </label>
                <CustomSelect
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs py-1.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-md"
                >
                  <option value="">All Categories</option>
                  {categories
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <option key={c._id} value={c._id} className="capitalize">
                        {formatCategoryName(c.name)}
                      </option>
                    ))}
                </CustomSelect>
              </div>

              {/* Status Filter */}
              <div className="w-40">
                <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Stock Status
                </label>
                <CustomSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs py-1.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-md"
                >
                  <option value="all">All Statuses</option>
                  <option value="critical">Critical Low Stock</option>
                  <option value="low">Low Stock</option>
                  <option value="healthy">Healthy Stock</option>
                </CustomSelect>
              </div>

              {/* Search by Name or SKU */}
              <div className="w-48">
                <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Search Item / SKU
                </label>
                <input
                  type="text"
                  placeholder="Item name, SKU, branch…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-md bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-accent placeholder-neutral-400"
                />
              </div>

              {/* Reset Filters */}
              {(selectedBranch || selectedCategory || statusFilter !== 'all' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBranch('');
                    setSelectedCategory('');
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="text-xs text-neutral-400 font-mono self-center">
              {filteredRows.length} {filteredRows.length === 1 ? 'item' : 'items'}
            </div>
          </div>
        </div>

        {/* ── Inventory DataTable ─────────────────────────────────────── */}
        {/* Note: Rows for low/critical stock get a red left-border accent (border-l-4 border-danger-500) */}
        <DataTable
          columns={columns}
          data={filteredRows}
          loading={loading}
          rowClassName={(row) =>
            row.isLowOrCritical
              ? 'border-l-4 border-danger-500 bg-rose-50/20 dark:bg-rose-950/10'
              : ''
          }
          emptyMessage="No stock inventory found"
          emptySubMessage="Click '+ Add Stock' above to record incoming inventory shipments."
        />

        {/* ── Purchase Entry Modal ────────────────────────────────────── */}
        <Modal
          isOpen={purchaseModalOpen}
          onClose={() => setPurchaseModalOpen(false)}
          title="Purchase Entry — Inflow Ingestion"
        >
          <PurchaseEntryForm
            isModal={true}
            preselectedItemId={purchaseTarget?.itemId}
            preselectedBranchId={purchaseTarget?.branchId}
            onCancel={() => setPurchaseModalOpen(false)}
            onSuccess={() => {
              setPurchaseModalOpen(false);
              fetchStockData();
            }}
          />
        </Modal>
      </div>
    </DashboardLayout>
  );
}
