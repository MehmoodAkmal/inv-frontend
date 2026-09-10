import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

import { useAuth } from '../context/AuthContext';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../services/expenseService';
import { getBranches } from '../services/branchService';

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
const fmt = (n) =>
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

const today = () => new Date().toISOString().slice(0, 10);

const CATEGORIES = ['rent', 'utilities', 'transport', 'maintenance', 'supplies', 'misc'];

const CATEGORY_META = {
  rent: {
    label: 'Rent',
    color: '#3b82f6',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50',
  },
  utilities: {
    label: 'Utilities',
    color: '#eab308',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
  },
  transport: {
    label: 'Transport',
    color: '#8b5cf6',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50',
  },
  maintenance: {
    label: 'Maintenance',
    color: '#f97316',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/50',
  },
  supplies: {
    label: 'Supplies',
    color: '#10b981',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
  },
  misc: {
    label: 'Miscellaneous',
    color: '#64748b',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/60',
  },
};

function CategoryBadge({ category }) {
  const meta = CATEGORY_META[category] || {
    label: category || 'Other',
    badgeClass: 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${meta.badgeClass}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0"
        style={{ backgroundColor: meta.color || '#94a3b8' }}
        aria-hidden="true"
      />
      {meta.label}
    </span>
  );
}

// ── Chart Custom Tooltip ────────────────────────────────────────────────────
function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  const data = item.payload;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-2.5 shadow-xl text-xs space-y-1">
      <div className="flex items-center gap-2 font-semibold text-neutral-800 dark:text-neutral-200">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: data.color || item.fill }}
        />
        <span>{data.name || data.category}</span>
      </div>
      <div className="text-neutral-600 dark:text-neutral-400 flex items-center justify-between gap-4">
        <span>Total:</span>
        <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
          ${fmt(data.amount || data.value)}
        </span>
      </div>
      {data.percentage !== undefined && (
        <div className="text-neutral-500 dark:text-neutral-400 flex items-center justify-between gap-4 text-[11px]">
          <span>Share:</span>
          <span>{data.percentage}%</span>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  branchId: '',
  category: 'misc',
  amount: '',
  description: '',
  date: today(),
};

export default function Expenses() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  // State
  const [expenses, setExpenses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Month-over-month stat calculations
  const [thisMonthTotal, setThisMonthTotal] = useState(0);
  const [lastMonthTotal, setLastMonthTotal] = useState(0);
  const [loadingMoM, setLoadingMoM] = useState(true);

  // Header Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Chart View Toggle ('bar' | 'donut')
  const [chartView, setChartView] = useState('bar');

  // Add Expense Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [creating, setCreating] = useState(false);

  // Edit Expense Modal
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [editing, setEditing] = useState(false);

  // Delete Confirm Dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch branches for admin & lookup
  useEffect(() => {
    getBranches()
      .then((res) => {
        if (res.data?.success) {
          setBranches(res.data.data || []);
        }
      })
      .catch(() => {});
  }, []);

  // Manager's locked branch name
  const userBranchName = useMemo(() => {
    const branchId = user?.branchId;
    if (!branchId) return 'Assigned Branch';
    const b = branches.find((item) => item._id === branchId);
    return b?.name || 'Assigned Branch';
  }, [user, branches]);

  // Fetch Month-over-Month expenses
  const fetchMoMData = useCallback(async () => {
    setLoadingMoM(true);
    try {
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth();

      const startThis = new Date(curYear, curMonth, 1).toISOString().slice(0, 10);
      const endThis = new Date(curYear, curMonth + 1, 0).toISOString().slice(0, 10);

      const startLast = new Date(curYear, curMonth - 1, 1).toISOString().slice(0, 10);
      const endLast = new Date(curYear, curMonth, 0).toISOString().slice(0, 10);

      const baseParams = {};
      if (isAdmin && filterBranch) {
        baseParams.branchId = filterBranch;
      }

      const [thisRes, lastRes] = await Promise.allSettled([
        getExpenses({ ...baseParams, startDate: startThis, endDate: endThis, limit: 200 }),
        getExpenses({ ...baseParams, startDate: startLast, endDate: endLast, limit: 200 }),
      ]);

      if (thisRes.status === 'fulfilled' && thisRes.value?.data?.success) {
        const thisList = thisRes.value.data.data || [];
        setThisMonthTotal(thisList.reduce((sum, e) => sum + (e.amount || 0), 0));
      }

      if (lastRes.status === 'fulfilled' && lastRes.value?.data?.success) {
        const lastList = lastRes.value.data.data || [];
        setLastMonthTotal(lastList.reduce((sum, e) => sum + (e.amount || 0), 0));
      }
    } catch {
      // Non-fatal if MoM calculation fails
    } finally {
      setLoadingMoM(false);
    }
  }, [isAdmin, filterBranch]);

  // Fetch main expenses list
  const fetchExpensesList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (isAdmin && filterBranch) params.branchId = filterBranch;
      if (filterCategory) params.category = filterCategory;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const res = await getExpenses(params);
      if (res.data?.success) {
        setExpenses(res.data.data || []);
      }
    } catch (err) {
      console.error('fetchExpenses error:', err);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, filterBranch, filterCategory, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchExpensesList();
  }, [fetchExpensesList]);

  useEffect(() => {
    fetchMoMData();
  }, [fetchMoMData]);

  // Derived StatCard Calculations
  const momChange = useMemo(() => {
    if (lastMonthTotal > 0) {
      const diff = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
      return {
        value: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`,
        direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
        raw: diff,
      };
    }
    if (thisMonthTotal > 0) {
      return { value: '+100%', direction: 'up', raw: 100 };
    }
    return { value: '0.0%', direction: 'neutral', raw: 0 };
  }, [thisMonthTotal, lastMonthTotal]);

  // Category aggregations for chart and Top Category card
  const categoryBreakdown = useMemo(() => {
    const map = {};
    CATEGORIES.forEach((c) => {
      map[c] = 0;
    });

    expenses.forEach((e) => {
      const cat = e.category || 'misc';
      map[cat] = (map[cat] || 0) + (e.amount || 0);
    });

    const total = Object.values(map).reduce((s, v) => s + v, 0);

    const items = Object.entries(map).map(([cat, amt]) => {
      const meta = CATEGORY_META[cat] || {};
      const pct = total > 0 ? ((amt / total) * 100).toFixed(1) : '0.0';
      return {
        category: cat,
        name: meta.label || cat,
        amount: Math.round(amt * 100) / 100,
        value: Math.round(amt * 100) / 100,
        percentage: pct,
        color: meta.color || '#64748b',
      };
    });

    // Sort highest amount first
    items.sort((a, b) => b.amount - a.amount);
    return { items, total };
  }, [expenses]);

  const topCategory = useMemo(() => {
    const sorted = [...categoryBreakdown.items].filter((i) => i.amount > 0);
    if (!sorted.length) return null;
    return sorted[0];
  }, [categoryBreakdown.items]);

  // ── Create Handlers ───────────────────────────────────────────────────────
  const openCreateModal = () => {
    setCreateForm({
      branchId: isAdmin ? '' : (user?.branchId ?? ''),
      category: 'misc',
      amount: '',
      description: '',
      date: today(),
    });
    setCreateOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const amountNum = Number(createForm.amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid expense amount');
      return;
    }

    let branchId = createForm.branchId;
    if (isManager || !isAdmin) {
      branchId = user?.branchId;
    }

    if (!branchId) {
      toast.error('Branch selection is required');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        branchId,
        category: createForm.category,
        amount: amountNum,
        description: createForm.description.trim() || null,
        date: createForm.date,
      };

      const res = await createExpense(payload);
      if (res.data?.success) {
        toast.success('Expense recorded successfully');
        setCreateOpen(false);
        setCreateForm({ ...EMPTY_FORM });
        fetchExpensesList();
        fetchMoMData();
      } else {
        toast.error(res.data?.message || 'Failed to record expense');
      }
    } catch (err) {
      console.error('createExpense error:', err);
      toast.error(err.response?.data?.message || 'Failed to record expense');
    } finally {
      setCreating(false);
    }
  };

  // ── Edit Handlers ─────────────────────────────────────────────────────────
  const openEditModal = (exp, e) => {
    e?.stopPropagation();
    setEditTarget(exp);
    setEditForm({
      branchId: exp.branchId?._id ?? exp.branchId ?? '',
      category: exp.category || 'misc',
      amount: String(exp.amount || ''),
      description: exp.description || '',
      date: exp.date ? new Date(exp.date).toISOString().slice(0, 10) : today(),
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;

    const amountNum = Number(editForm.amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid expense amount');
      return;
    }

    setEditing(true);
    try {
      const payload = {
        category: editForm.category,
        amount: amountNum,
        description: editForm.description.trim() || null,
        date: editForm.date,
      };

      const res = await updateExpense(editTarget._id, payload);
      if (res.data?.success) {
        toast.success('Expense updated successfully');
        setEditOpen(false);
        setEditTarget(null);
        fetchExpensesList();
        fetchMoMData();
      } else {
        toast.error(res.data?.message || 'Failed to update expense');
      }
    } catch (err) {
      console.error('updateExpense error:', err);
      toast.error(err.response?.data?.message || 'Failed to update expense');
    } finally {
      setEditing(false);
    }
  };

  // ── Delete Handlers ───────────────────────────────────────────────────────
  const openDeleteDialog = (exp, e) => {
    e?.stopPropagation();
    setDeleteTarget(exp);
    setConfirmOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteExpense(deleteTarget._id);
      if (res.data?.success) {
        toast.success('Expense deleted');
        setConfirmOpen(false);
        setDeleteTarget(null);
        fetchExpensesList();
        fetchMoMData();
      } else {
        toast.error(res.data?.message || 'Failed to delete expense');
      }
    } catch (err) {
      console.error('deleteExpense error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete expense');
    } finally {
      setDeleting(false);
    }
  };

  // Check if current user has rights to edit an expense
  const canEditExpense = (exp) => {
    if (isAdmin) return true;
    if (isManager) {
      const createdById = exp.createdBy?._id ?? exp.createdBy;
      return String(createdById) === String(user?.id);
    }
    return false;
  };

  // DataTable Columns
  const columns = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (val) => (
        <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
          {fmtd(val)}
        </span>
      ),
    },
    {
      key: 'branchId',
      label: 'Branch',
      render: (val, row) => {
        let name = '—';
        if (row.branchId?.name) {
          name = row.branchId.name;
        } else if (val) {
          const bid = val?._id ?? val;
          const match = branches.find((b) => b._id === bid);
          if (match) name = match.name;
        }
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            {name}
          </span>
        );
      },
    },
    {
      key: 'category',
      label: 'Category',
      align: 'center',
      render: (val) => <CategoryBadge category={val} />,
    },
    {
      key: 'description',
      label: 'Description',
      render: (val) => (
        <span
          className="text-xs text-neutral-600 dark:text-neutral-300 max-w-[220px] truncate block"
          title={val || ''}
        >
          {val || <span className="text-neutral-400 dark:text-neutral-600 italic">—</span>}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      type: 'currency',
      align: 'right',
      sortable: true,
      render: (val) => (
        <span className="font-mono text-sm font-bold text-neutral-900 dark:text-neutral-100">
          ${fmt(val)}
        </span>
      ),
    },
    {
      key: 'createdBy',
      label: 'Recorded By',
      render: (val) => {
        if (!val) return <span className="text-xs text-neutral-400">—</span>;
        const name = typeof val === 'object' ? `${val.firstName || ''} ${val.lastName || ''}`.trim() : 'Staff';
        return <span className="text-xs text-neutral-600 dark:text-neutral-300">{name || 'Staff'}</span>;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (_, row) => {
        const canEdit = canEditExpense(row);

        return (
          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {/* Edit Icon Button: Enabled for admin, or for manager who created it */}
            {canEdit ? (
              <button
                type="button"
                onClick={(e) => openEditModal(row, e)}
                className="p-1.5 rounded-md text-neutral-500 hover:text-brand-800 dark:hover:text-brand-accent hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Edit expense"
                aria-label="Edit expense"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            ) : null}

            {/* Delete Icon Button: Admin only! Hidden completely for manager per role rules */}
            {isAdmin && (
              <button
                type="button"
                onClick={(e) => openDeleteDialog(row, e)}
                className="p-1.5 rounded-md text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Delete expense"
                aria-label="Delete expense"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
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
                Operating Expenses
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-brand-50 text-brand-800 dark:bg-brand-900/60 dark:text-brand-accent border border-brand-200/60 dark:border-brand-700/50">
                Expenditure
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Record branch operating costs, categorize recurring overheads, and monitor expenditure trends.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent border border-brand-700 hover:bg-brand-950 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Add Expense</span>
            </button>
          </div>
        </div>

        {/* ── Summary StatCards ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Expenses This Month"
            value={`$${fmt(thisMonthTotal)}`}
            accentColor="warning"
            icon={
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            }
            secondaryStats={[
              {
                label: 'Period',
                value: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              },
              {
                label: 'Branch Scope',
                value: isAdmin && !filterBranch ? 'All Branches' : userBranchName,
              },
            ]}
          />

          <StatCard
            label="Top Category"
            value={
              topCategory ? `${topCategory.name}` : 'None'
            }
            accentColor="brand"
            icon={
              <svg className="w-5 h-5 text-brand-700 dark:text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
            secondaryStats={[
              {
                label: 'Top Category Amount',
                value: topCategory ? `$${fmt(topCategory.amount)}` : '$0.00',
              },
              {
                label: 'Share of Total',
                value: topCategory ? `${topCategory.percentage}%` : '0%',
              },
            ]}
          />

          <StatCard
            label="Month-Over-Month Change"
            value={loadingMoM ? '…' : momChange.value}
            trend={
              loadingMoM
                ? undefined
                : {
                    value: momChange.value,
                    direction: momChange.direction,
                  }
            }
            accentColor={momChange.raw > 0 ? 'danger' : momChange.raw < 0 ? 'success' : 'neutral'}
            icon={
              <svg className="w-5 h-5 text-neutral-600 dark:text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
            secondaryStats={[
              {
                label: 'Last Month',
                value: `$${fmt(lastMonthTotal)}`,
              },
              {
                label: 'Current Month',
                value: `$${fmt(thisMonthTotal)}`,
              },
            ]}
          />
        </div>

        {/* ── Filter Bar ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-4 shadow-card">
          <div className="flex flex-wrap items-end gap-3 justify-between">
            <div className="flex flex-wrap items-end gap-3 flex-1">
              {/* Date Range: From */}
              <div className="w-36">
                <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-md bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-accent"
                />
              </div>

              {/* Date Range: To */}
              <div className="w-36">
                <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-md bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-accent"
                />
              </div>

              {/* Branch Filter (Selectable for admin, locked for manager) */}
              <div className="w-48">
                <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Branch
                </label>
                {isAdmin ? (
                  <CustomSelect
                    value={filterBranch}
                    onChange={(e) => setFilterBranch(e.target.value)}
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

              {/* Category Filter Dropdown */}
              <div className="w-44">
                <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Category
                </label>
                <CustomSelect
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="text-xs py-1.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-md"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_META[c]?.label || c}
                    </option>
                  ))}
                </CustomSelect>
              </div>

              {/* Reset Filters */}
              {(filterStartDate || filterEndDate || filterBranch || filterCategory) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setFilterBranch('');
                    setFilterCategory('');
                  }}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Results Count */}
            <div className="text-xs text-neutral-400 font-mono self-center">
              {expenses.length} {expenses.length === 1 ? 'record' : 'records'}
            </div>
          </div>
        </div>

        {/* ── Category Breakdown Chart ────────────────────────────────── */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-5 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Expense Breakdown by Category
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Proportion and total outlay per overhead category for selected filters.
              </p>
            </div>

            {/* Toggle Bar vs Donut */}
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-md text-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartView('bar')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  chartView === 'bar'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                Horizontal Bar
              </button>
              <button
                type="button"
                onClick={() => setChartView('donut')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  chartView === 'donut'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                Donut Chart
              </button>
            </div>
          </div>

          {loading ? (
            <div className="h-60 flex items-center justify-center">
              <Spinner size="lg" className="text-brand-800 dark:text-brand-accent" />
            </div>
          ) : categoryBreakdown.total === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600">
              <svg className="w-10 h-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
              <p className="text-xs">No expense data available to plot</p>
            </div>
          ) : chartView === 'bar' ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryBreakdown.items}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#888888' }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#888888' }}
                    width={90}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {categoryBreakdown.items.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 h-64">
              <div className="h-56 w-56 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown.items.filter((i) => i.amount > 0)}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {categoryBreakdown.items.map((entry, idx) => (
                        <Cell key={`pie-cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Total in Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase font-bold text-neutral-400">Total</span>
                  <span className="font-mono text-sm font-bold text-neutral-900 dark:text-white">
                    ${fmt(categoryBreakdown.total)}
                  </span>
                </div>
              </div>

              {/* Legend Badges List */}
              <div className="grid grid-cols-2 gap-2 text-xs max-w-sm w-full">
                {categoryBreakdown.items.map((item) => (
                  <div key={item.category} className="flex items-center justify-between p-2 rounded-md bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-neutral-700 dark:text-neutral-300 font-medium truncate">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 ml-2">
                      ${fmt(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Expenses DataTable ──────────────────────────────────────── */}
        <DataTable
          columns={columns}
          data={expenses}
          loading={loading}
          emptyMessage="No operating expenses recorded"
          emptySubMessage="Click '+ Add Expense' above to log a new expenditure entry."
        />

        {/* ── Add Expense Modal ───────────────────────────────────────── */}
        <Modal
          isOpen={createOpen}
          onClose={() => !creating && setCreateOpen(false)}
          title="Record Operating Expense"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {/* Branch Field: Selectable for Admin, Locked for Manager */}
            {isAdmin ? (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Branch <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  required
                  value={createForm.branchId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, branchId: e.target.value }))}
                  className="w-full text-xs py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
                >
                  <option value="">Select Branch</option>
                  {branches
                    .filter((b) => b.isActive)
                    .map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                </CustomSelect>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Branch
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-300">
                  <svg className="w-3.5 h-3.5 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="font-medium">{userBranchName}</span>
                </div>
              </div>
            )}

            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Expense Category <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                required
                value={createForm.category}
                onChange={(e) => setCreateForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full text-xs py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_META[c]?.label || c}
                  </option>
                ))}
              </CustomSelect>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Amount ($) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={createForm.amount}
                onChange={(e) => setCreateForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm font-mono rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Date Incurred <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                max={today()}
                value={createForm.date}
                onChange={(e) => setCreateForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Description / Memo <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                maxLength={500}
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="e.g. Electric bill for warehouse, office stationery"
                className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
                className="px-4 py-2 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !createForm.amount || Number(createForm.amount) <= 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent border border-brand-700 hover:bg-brand-950 transition-colors shadow-sm disabled:opacity-50"
              >
                {creating && <Spinner size="sm" />}
                <span>Record Expense</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* ── Edit Expense Modal ────────────────────────────────────────── */}
        <Modal
          isOpen={editOpen}
          onClose={() => !editing && setEditOpen(false)}
          title="Edit Operating Expense"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Expense Category <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                required
                value={editForm.category}
                onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full text-xs py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_META[c]?.label || c}
                  </option>
                ))}
              </CustomSelect>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Amount ($) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={editForm.amount}
                onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                className="w-full px-3 py-2 text-sm font-mono rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Date Incurred <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                max={today()}
                value={editForm.date}
                onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Description / Memo <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                maxLength={500}
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                disabled={editing}
                className="px-4 py-2 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editing || !editForm.amount || Number(editForm.amount) <= 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent border border-brand-700 hover:bg-brand-950 transition-colors shadow-sm disabled:opacity-50"
              >
                {editing && <Spinner size="sm" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* ── Delete Confirmation Dialog ────────────────────────────────── */}
        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => !deleting && setConfirmOpen(false)}
          onConfirm={handleDeleteSubmit}
          loading={deleting}
          title="Delete Expense"
          message={`Are you sure you want to permanently delete this ${deleteTarget?.category || ''} expense of $${fmt(deleteTarget?.amount)}? This action cannot be undone.`}
        />
      </div>
    </DashboardLayout>
  );
}
