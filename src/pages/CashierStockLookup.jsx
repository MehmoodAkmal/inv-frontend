import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { getStock } from '../services/stockService';
import MinimalLayout from '../components/layout/MinimalLayout';
import { StatCard, DataTable } from '../components/ui';
import { formatCategoryName } from '../utils/formatters';

const fmt = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function CashierStockLookup() {
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'in_stock' | 'low_stock' | 'out_of_stock'
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      // Scoped automatically to cashier's branch by backend
      const res = await getStock();
      if (res.data?.success) {
        setStockList(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load stock inventory:', err);
      toast.error('Failed to load branch stock');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  // Extract unique categories from items
  const categories = useMemo(() => {
    const map = new Map();
    stockList.forEach((s) => {
      const cat = s.itemId?.categoryId;
      if (cat && typeof cat === 'object' && cat._id) {
        map.set(cat._id, cat.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [stockList]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    stockList.forEach((s) => {
      const qty = s.quantity ?? 0;
      const reorder = s.itemId?.reorderLevel ?? 5;
      if (qty <= 0) outOfStock++;
      else if (qty <= reorder) lowStock++;
      else inStock++;
    });

    return {
      totalSKUs: stockList.length,
      inStock,
      lowStock,
      outOfStock,
    };
  }, [stockList]);

  // Filtered stock items
  const filteredStock = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return stockList.filter((s) => {
      const item = s.itemId;
      if (!item) return false;

      // Category filter
      if (selectedCategory !== 'ALL') {
        const catId = typeof item.categoryId === 'object' ? item.categoryId?._id : item.categoryId;
        if (catId !== selectedCategory) return false;
      }

      // Status filter
      const qty = s.quantity ?? 0;
      const reorder = item.reorderLevel ?? 5;
      if (statusFilter === 'in_stock' && (qty <= reorder || qty <= 0)) return false;
      if (statusFilter === 'low_stock' && (qty <= 0 || qty > reorder)) return false;
      if (statusFilter === 'out_of_stock' && qty > 0) return false;

      // Search (Name or SKU)
      if (q) {
        const name = (item.name || '').toLowerCase();
        const sku = (item.sku || '').toLowerCase();
        const catName = (item.categoryId?.name || '').toLowerCase();
        if (!name.includes(q) && !sku.includes(q) && !catName.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [stockList, searchQuery, selectedCategory, statusFilter]);

  // Table Columns
  const columns = [
    {
      key: 'name',
      label: 'Product & SKU',
      sortable: true,
      render: (_, row) => {
        const item = row.itemId;
        return (
          <div>
            <div className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
              {item?.name || 'Unnamed Product'}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {item?.sku && (
                <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  SKU: {item.sku}
                </span>
              )}
              {item?.unit && (
                <span className="text-[11px] text-neutral-400">({item.unit})</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'category',
      label: 'Category',
      render: (_, row) => {
        const catName = formatCategoryName(row.itemId?.categoryId?.name || 'General');
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold capitalize bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
            {catName}
          </span>
        );
      },
    },
    {
      key: 'sellingPrice',
      label: 'Selling Price',
      type: 'currency',
      sortable: true,
      render: (_, row) => (
        <span className="font-mono text-sm font-extrabold text-neutral-900 dark:text-neutral-50">
          ${fmt(row.itemId?.sellingPrice)}
        </span>
      ),
    },
    {
      key: 'quantity',
      label: 'Stock On Hand',
      type: 'number',
      sortable: true,
      render: (val, row) => {
        const qty = Number(val ?? 0);
        const reorder = row.itemId?.reorderLevel ?? 5;
        const isOut = qty <= 0;
        const isLow = !isOut && qty <= reorder;

        return (
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-sm font-black ${
                isOut
                  ? 'text-rose-600 dark:text-rose-400'
                  : isLow
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {qty} {row.itemId?.unit || 'units'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (_, row) => {
        const qty = Number(row.quantity ?? 0);
        const reorder = row.itemId?.reorderLevel ?? 5;

        if (qty <= 0) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Out of Stock
            </span>
          );
        }
        if (qty <= reorder) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Low Stock (≤{reorder})
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            In Stock
          </span>
        );
      },
    },
  ];

  return (
    <MinimalLayout>
      <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-w-[1600px] mx-auto w-full">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight flex items-center gap-2">
              <span className="p-2 rounded-xl bg-brand-50 dark:bg-brand-900/50 text-brand-800 dark:text-brand-accent">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </span>
              <span>Branch Stock Lookup</span>
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Real-time inventory quantities and prices at your active branch counter.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchStock}
            className="btn-secondary self-start sm:self-auto text-xs py-2 px-3 flex items-center gap-1.5 shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh Stock</span>
          </button>
        </div>

        {/* ── Summary StatCards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total SKUs"
            value={metrics.totalSKUs}
            subtitle="Cataloged in branch"
            icon={
              <svg className="w-5 h-5 text-brand-800 dark:text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />
          <StatCard
            title="In Stock"
            value={metrics.inStock}
            subtitle="Adequate shelf inventory"
            icon={
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Low Stock"
            value={metrics.lowStock}
            subtitle="At or below reorder level"
            icon={
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <StatCard
            title="Out of Stock"
            value={metrics.outOfStock}
            subtitle="Zero quantity available"
            icon={
              <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* ── Search & Filters Bar ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          {/* Large Search Bar */}
          <div className="relative flex-1 w-full">
            <svg className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product name, SKU code, or category..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent"
              autoFocus
            />
          </div>

          {/* Status filter dropdown */}
          <div className="w-full sm:w-44 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
            >
              <option value="">All Stock Levels</option>
              <option value="in_stock">In Stock Only</option>
              <option value="low_stock">Low Stock Alerts</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-brand-800 text-brand-accent dark:bg-brand-accent dark:text-brand-900 shadow-xs'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800'
              }`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                  selectedCategory === c.id
                    ? 'bg-brand-800 text-brand-accent dark:bg-brand-accent dark:text-brand-900 shadow-xs'
                    : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800'
                }`}
              >
                {formatCategoryName(c.name)}
              </button>
            ))}
          </div>
        )}

        {/* ── DataTable ──────────────────────────────────────────────────────── */}
        <DataTable
          columns={columns}
          data={filteredStock}
          loading={loading}
          emptyMessage="No stock items found"
          emptySubMessage={
            searchQuery || statusFilter || selectedCategory !== 'ALL'
              ? 'No products matched your active filters.'
              : 'No inventory documents have been created for this branch yet.'
          }
        />
      </div>
    </MinimalLayout>
  );
}
