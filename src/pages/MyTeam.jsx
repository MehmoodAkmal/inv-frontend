import { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../utils/currency';

import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
} from '../services/employeeService';
import { getBranches } from '../services/branchService';

import {
  DashboardLayout,
  StatCard,
  DataTable,
  Modal,
  ConfirmDialog,
  Spinner,
  Input,
  EmptyState,
} from '../components/ui';

const fmtNumber = (n) => Number(n ?? 0).toLocaleString();

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

const EMPTY_EMPLOYEE_FORM = {
  name: '',
  designation: '',
  branchId: '',
  monthlySalary: '',
  phone: '',
};

const EMPTY_EMPLOYEE_EDIT_FORM = {
  id: '',
  name: '',
  designation: '',
  branchId: '',
  monthlySalary: '',
  phone: '',
  isActive: true,
};

export default function MyTeam() {
  const { user } = useAuth();
  const { currencySymbol, fmtCurr } = useCurrency();
  const isAdmin = user?.role === 'admin' || user?.role === 'superAdmin';

  // Data
  const [employeeList, setEmployeeList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({ ...EMPTY_EMPLOYEE_FORM });
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...EMPTY_EMPLOYEE_EDIT_FORM });
  const [updating, setUpdating] = useState(false);

  // Deactivate Confirm
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const [togglingIds, setTogglingIds] = useState(new Set());

  const fetchEmployeesData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEmployees();
      if (res.data?.success) {
        setEmployeeList(res.data.data || []);
      }
    } catch (err) {
      console.error('getEmployees error:', err);
      toast.error('Failed to load team directory');
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
      fetchEmployeesData();
      fetchBranchesData();
    }
  }, [isAdmin, fetchEmployeesData, fetchBranchesData]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Metrics
  const metrics = useMemo(() => {
    const total = employeeList.length;
    const active = employeeList.filter((e) => e.isActive).length;
    const totalPayroll = employeeList
      .filter((e) => e.isActive)
      .reduce((sum, e) => sum + (Number(e.monthlySalary) || 0), 0);
    const staffedBranches = new Set(
      employeeList
        .map((e) => (typeof e.branchId === 'object' ? e.branchId?._id : e.branchId))
        .filter(Boolean)
    ).size;

    return { total, active, totalPayroll, staffedBranches };
  }, [employeeList]);

  // Filtering
  const filteredEmployees = useMemo(() => {
    return employeeList.filter((e) => {
      const name = (e.name || '').toLowerCase();
      const phone = (e.phone || '').toLowerCase();
      const desig = (e.designation || '').toLowerCase();
      const q = searchQuery.trim().toLowerCase();

      if (q && !name.includes(q) && !phone.includes(q) && !desig.includes(q)) return false;

      if (branchFilter) {
        const eBranchId = typeof e.branchId === 'object' ? e.branchId?._id : e.branchId;
        if (eBranchId !== branchFilter) return false;
      }

      if (statusFilter === 'active' && !e.isActive) return false;
      if (statusFilter === 'inactive' && e.isActive) return false;

      return true;
    });
  }, [employeeList, searchQuery, branchFilter, statusFilter]);

  // Create Employee
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!employeeForm.name.trim()) {
      toast.error('Employee name is required');
      return;
    }
    if (!employeeForm.branchId) {
      toast.error('Branch assignment is required');
      return;
    }
    if (employeeForm.monthlySalary === '' || Number(employeeForm.monthlySalary) < 0) {
      toast.error('Please enter a valid monthly salary');
      return;
    }

    setSaving(true);
    try {
      const res = await createEmployee({
        ...employeeForm,
        name: employeeForm.name.trim(),
        monthlySalary: Number(employeeForm.monthlySalary),
      });
      if (res.data?.success) {
        toast.success(`Registered ${employeeForm.name} to team`);
        setAddOpen(false);
        setEmployeeForm({ ...EMPTY_EMPLOYEE_FORM });
        fetchEmployeesData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add team member');
    } finally {
      setSaving(false);
    }
  };

  // Open Edit
  const handleOpenEdit = (emp) => {
    const eBranchId = typeof emp.branchId === 'object' ? emp.branchId?._id : emp.branchId;
    setEditForm({
      id: emp._id,
      name: emp.name || '',
      designation: emp.designation || '',
      branchId: eBranchId || '',
      monthlySalary: emp.monthlySalary ?? '',
      phone: emp.phone || '',
      isActive: emp.isActive ?? true,
    });
    setEditOpen(true);
  };

  // Update Employee
  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast.error('Employee name is required');
      return;
    }
    if (!editForm.branchId) {
      toast.error('Branch assignment is required');
      return;
    }

    setUpdating(true);
    try {
      const res = await updateEmployee(editForm.id, {
        name: editForm.name.trim(),
        designation: editForm.designation.trim(),
        branchId: editForm.branchId,
        monthlySalary: Number(editForm.monthlySalary) || 0,
        phone: editForm.phone.trim(),
        isActive: editForm.isActive,
      });
      if (res.data?.success) {
        toast.success('Team member details updated');
        setEditOpen(false);
        fetchEmployeesData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update employee');
    } finally {
      setUpdating(false);
    }
  };

  // Quick Toggle Active
  const handleToggleStatus = async (emp) => {
    const newStatus = !emp.isActive;
    setTogglingIds((prev) => new Set(prev).add(emp._id));
    try {
      const res = await updateEmployee(emp._id, { isActive: newStatus });
      if (res.data?.success) {
        toast.success(newStatus ? 'Employee marked active' : 'Employee marked inactive');
        setEmployeeList((prev) =>
          prev.map((item) => (item._id === emp._id ? { ...item, isActive: newStatus } : item))
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(emp._id);
        return next;
      });
    }
  };

  // Confirm Deactivate
  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      const res = await deactivateEmployee(deactivateTarget._id);
      if (res.data?.success) {
        toast.success('Employee record archived');
        setDeactivateOpen(false);
        setDeactivateTarget(null);
        fetchEmployeesData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to archive employee');
    } finally {
      setDeactivating(false);
    }
  };

  // Table Columns
  const columns = [
    {
      header: 'Employee Name',
      accessor: 'name',
      render: (name, emp) => (
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarColor(
              name
            )}`}
          >
            {getInitials(name)}
          </div>
          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
              {name}
            </p>
            {emp.phone && (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono mt-0.5">
                📞 {emp.phone}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Designation / Role',
      accessor: 'designation',
      render: (desig) => (
        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
          {desig || 'Staff Member'}
        </span>
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
      header: 'Monthly Salary',
      accessor: 'monthlySalary',
      render: (val) => (
        <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
          {fmtCurr(val)}
        </span>
      ),
    },
    {
      header: 'Employment Status',
      accessor: 'isActive',
      render: (isActive, emp) => {
        const isToggling = togglingIds.has(emp._id);
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isToggling}
              onClick={() => handleToggleStatus(emp)}
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
              {isActive ? 'On-Roll' : 'Inactive'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      accessor: '_id',
      align: 'right',
      render: (_, emp) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleOpenEdit(emp)}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Edit details"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {emp.isActive && (
            <button
              type="button"
              onClick={() => {
                setDeactivateTarget(emp);
                setDeactivateOpen(true);
              }}
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Archive employee"
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
                My Team Directory
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50 uppercase tracking-wide">
                Admin Only
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
              Track on-roll salaried employees, assign them to branches, and manage monthly payroll commitments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEmployeeForm({
                ...EMPTY_EMPLOYEE_FORM,
                branchId: branches[0]?._id || '',
              });
              setAddOpen(true);
            }}
            className="btn-primary flex items-center gap-2 shadow-sm px-4 py-2 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Employee</span>
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Team Members"
            value={fmtNumber(metrics.total)}
            subtitle={`${metrics.active} active on-roll`}
            icon={
              <svg className="w-5 h-5 text-brand-800 dark:text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />

          <StatCard
            title="Monthly Payroll"
            value={fmtCurr(metrics.totalPayroll)}
            subtitle="Current wage liability"
            icon={
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <StatCard
            title="Active Workforce"
            value={`${Math.round(metrics.total ? (metrics.active / metrics.total) * 100 : 0)}%`}
            subtitle="Staff retention rate"
            icon={
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <StatCard
            title="Branches Staffed"
            value={fmtNumber(metrics.staffedBranches)}
            subtitle="Locations with assigned team"
            icon={
              <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex-1 w-full">
            <Input
              type="text"
              placeholder="Search by employee name, phone, or designation..."
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

          <div className="w-full sm:w-36">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {(searchQuery || branchFilter || statusFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setBranchFilter('');
                setStatusFilter('');
              }}
              className="px-2.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>

        {/* Employee Table or Empty State */}
        {!loading && employeeList.length === 0 ? (
          <EmptyState
            title="No team members added yet"
            message="Add salaried staff to manage branch operations and track your payroll obligations."
            actionLabel="+ Add Employee"
            onAction={() => {
              setEmployeeForm({
                ...EMPTY_EMPLOYEE_FORM,
                branchId: branches[0]?._id || '',
              });
              setAddOpen(true);
            }}
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredEmployees}
            loading={loading}
            emptyMessage="No employees found"
            emptySubMessage="No team members match the active filter criteria."
          />
        )}

        {/* Modal: Add Employee */}
        <Modal
          isOpen={addOpen}
          onClose={() => !saving && setAddOpen(false)}
          title="Add New Salaried Employee"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCreateEmployee} className="space-y-4 mt-2">
            <Input
              label="Full Name"
              required
              type="text"
              placeholder="e.g. Alex Morgan"
              value={employeeForm.name}
              onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Designation"
                type="text"
                placeholder="e.g. Sales Associate"
                value={employeeForm.designation}
                onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
              />

              <Input
                label="Phone Number"
                type="tel"
                placeholder="e.g. +1 555-0100"
                value={employeeForm.phone}
                onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Assigned Branch <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={employeeForm.branchId}
                onChange={(e) => setEmployeeForm({ ...employeeForm, branchId: e.target.value })}
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

            <Input
              label={`Monthly Salary (${currencySymbol})`}
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={employeeForm.monthlySalary}
              onChange={(e) => setEmployeeForm({ ...employeeForm, monthlySalary: e.target.value })}
            />

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
                <span>Register Employee</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Edit Employee */}
        <Modal
          isOpen={editOpen}
          onClose={() => !updating && setEditOpen(false)}
          title="Edit Employee Details"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleUpdateEmployee} className="space-y-4 mt-2">
            <Input
              label="Full Name"
              required
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Designation"
                type="text"
                value={editForm.designation}
                onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
              />

              <Input
                label="Phone Number"
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
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

            <Input
              label={`Monthly Salary (${currencySymbol})`}
              required
              type="number"
              min="0"
              step="0.01"
              value={editForm.monthlySalary}
              onChange={(e) => setEditForm({ ...editForm, monthlySalary: e.target.value })}
            />

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="rounded border-neutral-300 text-brand-700 focus:ring-brand-500 h-4 w-4"
                />
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Currently Employed (On-Roll)
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
          title="Archive Employee Record"
          message={`Are you sure you want to deactivate ${
            deactivateTarget?.name || 'this employee'
          }? Their salary will no longer count towards monthly payroll liability.`}
          confirmLabel="Archive Employee"
          confirmVariant="danger"
        />
      </div>
    </DashboardLayout>
  );
}
