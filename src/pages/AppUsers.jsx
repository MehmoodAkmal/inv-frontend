import { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

import {
  getStaff,
  createStaff,
  updateStaff,
  deactivateStaff,
} from '../services/staffService';
import { getBranches } from '../services/branchService';

import {
  DashboardLayout,
  StatCard,
  DataTable,
  Badge,
  Modal,
  ConfirmDialog,
  Spinner,
  Input,
  EmptyState,
} from '../components/ui';

const fmtNumber = (n) => Number(n ?? 0).toLocaleString();

const formatDateTime = (dateStr) => {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Never';
  return (
    d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) +
    ' · ' +
    d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
};

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
];

const getAvatarColor = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const EMPTY_STAFF_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'cashier',
  branchId: '',
};

const EMPTY_STAFF_EDIT_FORM = {
  id: '',
  firstName: '',
  lastName: '',
  branchId: '',
  isActive: true,
};

export default function AppUsers() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superAdmin';

  // Data
  const [staffList, setStaffList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({ ...EMPTY_STAFF_FORM });
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...EMPTY_STAFF_EDIT_FORM });
  const [updating, setUpdating] = useState(false);

  // Deactivate Confirm
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const [togglingIds, setTogglingIds] = useState(new Set());

  const fetchStaffData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStaff();
      if (res.data?.success) {
        setStaffList(res.data.data || []);
      }
    } catch (err) {
      console.error('getStaff error:', err);
      toast.error('Failed to load portal staff accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBranchesData = useCallback(async () => {
    try {
      const res = await getBranches();
      if (res.data?.success) {
        setBranches(res.data.data || []);
      }
    } catch (err) {
      console.error('getBranches error:', err);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchStaffData();
      fetchBranchesData();
    }
  }, [isAdmin, fetchStaffData, fetchBranchesData]);

  // Non-admins redirected to dashboard
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Metrics
  const metrics = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter((s) => s.isActive).length;
    const inactive = total - active;
    const managers = staffList.filter((s) => s.role === 'manager').length;
    const cashiers = staffList.filter((s) => s.role === 'cashier').length;
    return { total, active, inactive, managers, cashiers };
  }, [staffList]);

  // Filtering
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const fullName = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
      const email = (s.email || '').toLowerCase();
      const q = searchQuery.trim().toLowerCase();

      if (q && !fullName.includes(q) && !email.includes(q)) return false;

      if (branchFilter) {
        const sBranchId = typeof s.branchId === 'object' ? s.branchId?._id : s.branchId;
        if (sBranchId !== branchFilter) return false;
      }

      if (roleFilter && s.role !== roleFilter) return false;

      if (statusFilter === 'active' && !s.isActive) return false;
      if (statusFilter === 'inactive' && s.isActive) return false;

      return true;
    });
  }, [staffList, searchQuery, branchFilter, roleFilter, statusFilter]);

  // Create Staff
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.firstName.trim() || !staffForm.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!staffForm.email.trim()) {
      toast.error('Valid email is required');
      return;
    }
    if (!staffForm.password || staffForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!staffForm.branchId) {
      toast.error('Branch assignment is required');
      return;
    }
    if (!['cashier', 'manager'].includes(staffForm.role)) {
      toast.error('Only manager and cashier accounts can be created');
      return;
    }

    setSaving(true);
    try {
      const res = await createStaff(staffForm);
      if (res.data?.success) {
        toast.success(`Created portal account for ${staffForm.firstName}`);
        setAddOpen(false);
        setStaffForm({ ...EMPTY_STAFF_FORM });
        fetchStaffData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create staff account');
    } finally {
      setSaving(false);
    }
  };

  // Open Edit
  const handleOpenEdit = (s) => {
    const sBranchId = typeof s.branchId === 'object' ? s.branchId?._id : s.branchId;
    setEditForm({
      id: s._id,
      firstName: s.firstName || '',
      lastName: s.lastName || '',
      branchId: sBranchId || '',
      isActive: s.isActive ?? true,
    });
    setEditOpen(true);
  };

  // Update Staff
  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!editForm.branchId) {
      toast.error('Branch assignment is required');
      return;
    }

    setUpdating(true);
    try {
      const res = await updateStaff(editForm.id, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        branchId: editForm.branchId,
        isActive: editForm.isActive,
      });
      if (res.data?.success) {
        toast.success('Staff account updated successfully');
        setEditOpen(false);
        fetchStaffData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update staff user');
    } finally {
      setUpdating(false);
    }
  };

  // Quick Toggle Active
  const handleToggleStatus = async (s) => {
    const newStatus = !s.isActive;
    setTogglingIds((prev) => new Set(prev).add(s._id));
    try {
      const res = await updateStaff(s._id, { isActive: newStatus });
      if (res.data?.success) {
        toast.success(newStatus ? 'Account activated' : 'Account deactivated');
        setStaffList((prev) =>
          prev.map((item) => (item._id === s._id ? { ...item, isActive: newStatus } : item))
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(s._id);
        return next;
      });
    }
  };

  // Confirm Deactivate
  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      const res = await deactivateStaff(deactivateTarget._id);
      if (res.data?.success) {
        toast.success('Account deactivated');
        setDeactivateOpen(false);
        setDeactivateTarget(null);
        fetchStaffData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate account');
    } finally {
      setDeactivating(false);
    }
  };

  // Table Columns
  const columns = [
    {
      header: 'Staff Member',
      accessor: 'name',
      render: (_, s) => {
        const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unnamed';
        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarColor(
                s.email || fullName
              )}`}
            >
              {getInitials(fullName)}
            </div>
            <div>
              <p className="font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
                {fullName}
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono mt-0.5">
                {s.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Portal Role',
      accessor: 'role',
      render: (role) => (
        <Badge
          variant={
            role === 'manager'
              ? 'purple'
              : role === 'cashier'
              ? 'brand'
              : role === 'admin'
              ? 'warning'
              : 'neutral'
          }
        >
          {role === 'manager'
            ? 'Branch Manager'
            : role === 'cashier'
            ? 'Cashier Operator'
            : role}
        </Badge>
      ),
    },
    {
      header: 'Branch Assignment',
      accessor: 'branchId',
      render: (b) => {
        const bName = typeof b === 'object' ? b?.name : null;
        return (
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            {bName || 'Unassigned'}
          </span>
        );
      },
    },
    {
      header: 'Last Login',
      accessor: 'lastLogin',
      render: (val) => (
        <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
          {formatDateTime(val)}
        </span>
      ),
    },
    {
      header: 'Account Status',
      accessor: 'isActive',
      render: (isActive, s) => {
        const isToggling = togglingIds.has(s._id);
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isToggling}
              onClick={() => handleToggleStatus(s)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isActive ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isActive ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {isActive ? 'Active' : 'Disabled'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      accessor: '_id',
      align: 'right',
      render: (_, s) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleOpenEdit(s)}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Edit user details"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {s.isActive && (
            <button
              type="button"
              onClick={() => {
                setDeactivateTarget(s);
                setDeactivateOpen(true);
              }}
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Deactivate account"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-accent flex items-center justify-center shadow-xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
                App Portal Users
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50 uppercase tracking-wide">
                Admin Only
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
              Create and manage branch managers and cashier login accounts who sign in to operate your business.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setStaffForm({
                ...EMPTY_STAFF_FORM,
                branchId: branches[0]?._id || '',
              });
              setAddOpen(true);
            }}
            className="btn-primary flex items-center gap-2 shadow-sm px-4 py-2 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Staff User</span>
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Portal Accounts"
            value={fmtNumber(metrics.total)}
            subtitle={`${metrics.active} active • ${metrics.inactive} disabled`}
            icon={
              <svg className="w-5 h-5 text-brand-800 dark:text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />

          <StatCard
            title="Branch Managers"
            value={fmtNumber(metrics.managers)}
            subtitle="Branch lead login access"
            icon={
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            }
          />

          <StatCard
            title="POS Cashiers"
            value={fmtNumber(metrics.cashiers)}
            subtitle="Point of sale operators"
            icon={
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />

          <StatCard
            title="Active Logins"
            value={`${Math.round(metrics.total ? (metrics.active / metrics.total) * 100 : 0)}%`}
            subtitle="Operational readiness"
            icon={
              <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex-1 w-full">
            <Input
              type="text"
              placeholder="Search by staff name or email address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-40">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
            >
              <option value="">All Roles</option>
              <option value="manager">Manager</option>
              <option value="cashier">Cashier</option>
            </select>
          </div>

          <div className="w-full sm:w-36">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Disabled Only</option>
            </select>
          </div>

          {(searchQuery || branchFilter || roleFilter || statusFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setBranchFilter('');
                setRoleFilter('');
                setStatusFilter('');
              }}
              className="px-2.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>

        {/* Staff Table or Empty State */}
        {!loading && staffList.length === 0 ? (
          <EmptyState
            title="No staff accounts yet"
            message="Add managers or cashiers so your staff can log in and manage branch sales."
            actionLabel="+ Add Staff User"
            onAction={() => {
              setStaffForm({
                ...EMPTY_STAFF_FORM,
                branchId: branches[0]?._id || '',
              });
              setAddOpen(true);
            }}
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredStaff}
            loading={loading}
            emptyMessage="No app users found"
            emptySubMessage="No portal accounts match the active filter criteria."
          />
        )}

        {/* Modal: Add Staff */}
        <Modal
          isOpen={addOpen}
          onClose={() => !saving && setAddOpen(false)}
          title="Add New Portal Staff User"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleCreateStaff} className="space-y-4 mt-2">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Create portal credentials for branch managers or cashier operators. (Admins and SuperAdmins cannot be created from this form).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="First Name"
                required
                type="text"
                placeholder="e.g. John"
                value={staffForm.firstName}
                onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
              />

              <Input
                label="Last Name"
                required
                type="text"
                placeholder="e.g. Doe"
                value={staffForm.lastName}
                onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
              />
            </div>

            <Input
              label="Email Address"
              required
              type="email"
              placeholder="staff@example.com"
              value={staffForm.email}
              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
            />

            <Input
              label="Initial Password"
              required
              type="password"
              minLength={6}
              placeholder="At least 6 characters"
              value={staffForm.password}
              onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
              helperText="Password must be at least 6 characters."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Portal Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                >
                  <option value="cashier">Cashier (Point of Sale)</option>
                  <option value="manager">Manager (Branch Lead)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Assigned Branch <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={staffForm.branchId}
                  onChange={(e) => setStaffForm({ ...staffForm, branchId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                disabled={saving}
                onClick={() => setAddOpen(false)}
                className="btn-ghost text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary text-xs px-5 py-2 flex items-center gap-2"
              >
                {saving && <Spinner size="xs" />}
                <span>Create User</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Edit Staff */}
        <Modal
          isOpen={editOpen}
          onClose={() => !updating && setEditOpen(false)}
          title="Edit Portal Staff User"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleUpdateStaff} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="First Name"
                required
                type="text"
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
              />

              <Input
                label="Last Name"
                required
                type="text"
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Assigned Branch <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={editForm.branchId}
                onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              >
                <option value="">Select Branch</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="rounded border-neutral-300 text-brand-700 focus:ring-brand-500 h-4 w-4"
                />
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Account is Active
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                disabled={updating}
                onClick={() => setEditOpen(false)}
                className="btn-ghost text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="btn-primary text-xs px-5 py-2 flex items-center gap-2"
              >
                {updating && <Spinner size="xs" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* Confirm Deactivate */}
        <ConfirmDialog
          isOpen={deactivateOpen}
          onClose={() => !deactivating && setDeactivateOpen(false)}
          onConfirm={handleConfirmDeactivate}
          loading={deactivating}
          title="Deactivate Portal Account"
          message={`Are you sure you want to deactivate ${
            deactivateTarget
              ? `${deactivateTarget.firstName} ${deactivateTarget.lastName}`
              : 'this account'
          }? They will immediately lose login access.`}
          confirmLabel="Deactivate Account"
          confirmVariant="danger"
        />
      </div>
    </DashboardLayout>
  );
}
