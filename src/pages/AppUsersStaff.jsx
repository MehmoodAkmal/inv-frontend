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
  Badge,
  Modal,
  ConfirmDialog,
  Spinner,
} from '../components/ui';

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmtNumber = (n) => Number(n ?? 0).toLocaleString();
const fmtCurrency = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDateTime = (dateStr) => {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Never';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
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
  role: 'cashier', // Strictly manager or cashier
  branchId: '',
};

const EMPTY_STAFF_EDIT_FORM = {
  id: '',
  firstName: '',
  lastName: '',
  branchId: '',
  isActive: true,
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

export default function AppUsersStaff() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superAdmin';

  // Active Tab
  const [activeTab, setActiveTab] = useState('appUsers'); // 'appUsers' | 'employees'

  // Data
  const [staffList, setStaffList] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [branches, setBranches] = useState([]);

  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'active' | 'inactive'

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  // Modals: Staff Add / Edit
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({ ...EMPTY_STAFF_FORM });
  const [savingStaff, setSavingStaff] = useState(false);

  const [editStaffOpen, setEditStaffOpen] = useState(false);
  const [editStaffForm, setEditStaffForm] = useState({ ...EMPTY_STAFF_EDIT_FORM });
  const [updatingStaff, setUpdatingStaff] = useState(false);

  // Modals: Employee Add / Edit
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({ ...EMPTY_EMPLOYEE_FORM });
  const [savingEmployee, setSavingEmployee] = useState(false);

  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false);
  const [editEmployeeForm, setEditEmployeeForm] = useState({ ...EMPTY_EMPLOYEE_EDIT_FORM });
  const [updatingEmployee, setUpdatingEmployee] = useState(false);

  // Deactivate Confirm Dialog
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null); // { type: 'staff' | 'employee', item: any }
  const [deactivating, setDeactivating] = useState(false);

  // Toggling status in-flight IDs
  const [togglingIds, setTogglingIds] = useState(new Set());

  // ── Fetch Staff Data ───────────────────────────────────────────────────────
  const fetchStaffData = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const res = await getStaff();
      if (res.data?.success) {
        setStaffList(res.data.data || []);
      }
    } catch (err) {
      console.error('getStaff error:', err);
      toast.error('Failed to load portal staff accounts');
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  // ── Fetch Employee Data ────────────────────────────────────────────────────
  const fetchEmployeeData = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      // Fetch including inactive to allow management of all on-roll staff
      const res = await getEmployees({ includeInactive: 'true' });
      if (res.data?.success) {
        setEmployeeList(res.data.data || []);
      }
    } catch (err) {
      console.error('getEmployees error:', err);
      toast.error('Failed to load salaried employees');
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  // ── Fetch Branches ────────────────────────────────────────────────────────
  const fetchBranchesData = useCallback(async () => {
    try {
      const res = await getBranches({ includeInactive: false });
      if (res.data?.success) {
        setBranches(res.data.data || []);
      }
    } catch (err) {
      console.error('getBranches error:', err);
      toast.error('Failed to load branches');
    }
  }, []);

  useEffect(() => {
    fetchStaffData();
    fetchEmployeeData();
    fetchBranchesData();
  }, [fetchStaffData, fetchEmployeeData, fetchBranchesData]);

  // Set default branch in forms when branches are loaded
  useEffect(() => {
    if (branches.length > 0) {
      setStaffForm((prev) => (prev.branchId ? prev : { ...prev, branchId: branches[0]._id }));
      setEmployeeForm((prev) => (prev.branchId ? prev : { ...prev, branchId: branches[0]._id }));
    }
  }, [branches]);

  // ── Overall Metric Calculations ───────────────────────────────────────────
  const metrics = useMemo(() => {
    const activeStaff = staffList.filter((s) => s.isActive);
    const inactiveStaff = staffList.filter((s) => !s.isActive);
    const managers = staffList.filter((s) => s.role === 'manager');
    const cashiers = staffList.filter((s) => s.role === 'cashier');

    const activeEmployees = employeeList.filter((e) => e.isActive);
    const inactiveEmployees = employeeList.filter((e) => !e.isActive);
    const totalPayroll = activeEmployees.reduce(
      (sum, e) => sum + (Number(e.monthlySalary) || 0),
      0
    );

    return {
      totalStaff: staffList.length,
      activeStaffCount: activeStaff.length,
      inactiveStaffCount: inactiveStaff.length,
      managerCount: managers.length,
      cashierCount: cashiers.length,
      totalEmployees: employeeList.length,
      activeEmployeeCount: activeEmployees.length,
      inactiveEmployeeCount: inactiveEmployees.length,
      totalMonthlyPayroll: totalPayroll,
    };
  }, [staffList, employeeList]);

  // ── Filtered Staff List ───────────────────────────────────────────────────
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
        const email = (s.email || '').toLowerCase();
        const branchName = (s.branchId?.name || '').toLowerCase();
        if (!fullName.includes(q) && !email.includes(q) && !branchName.includes(q)) {
          return false;
        }
      }
      // Branch filter
      if (branchFilter) {
        const sBid = String(s.branchId?._id ?? s.branchId ?? '');
        if (sBid !== branchFilter) return false;
      }
      // Role filter
      if (roleFilter && s.role !== roleFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === 'active' && !s.isActive) return false;
      if (statusFilter === 'inactive' && s.isActive) return false;

      return true;
    });
  }, [staffList, searchQuery, branchFilter, roleFilter, statusFilter]);

  // ── Filtered Employees List ───────────────────────────────────────────────
  const filteredEmployees = useMemo(() => {
    return employeeList.filter((e) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (e.name || '').toLowerCase();
        const desig = (e.designation || '').toLowerCase();
        const phone = (e.phone || '').toLowerCase();
        const branchName = (e.branchId?.name || '').toLowerCase();
        if (!name.includes(q) && !desig.includes(q) && !phone.includes(q) && !branchName.includes(q)) {
          return false;
        }
      }
      // Branch filter
      if (branchFilter) {
        const eBid = String(e.branchId?._id ?? e.branchId ?? '');
        if (eBid !== branchFilter) return false;
      }
      // Status filter
      if (statusFilter === 'active' && !e.isActive) return false;
      if (statusFilter === 'inactive' && e.isActive) return false;

      return true;
    });
  }, [employeeList, searchQuery, branchFilter, statusFilter]);

  // ── Staff Handlers ────────────────────────────────────────────────────────
  const handleOpenAddStaff = () => {
    setStaffForm({
      ...EMPTY_STAFF_FORM,
      branchId: branches.length > 0 ? branches[0]._id : '',
    });
    setShowPassword(false);
    setAddStaffOpen(true);
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.firstName.trim() || !staffForm.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!staffForm.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!staffForm.password || staffForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!['manager', 'cashier'].includes(staffForm.role)) {
      toast.error('Role must be Manager or Cashier');
      return;
    }
    if (!staffForm.branchId) {
      toast.error('Please assign a branch');
      return;
    }

    setSavingStaff(true);
    try {
      const res = await createStaff({
        firstName: staffForm.firstName.trim(),
        lastName: staffForm.lastName.trim(),
        email: staffForm.email.trim().toLowerCase(),
        password: staffForm.password,
        role: staffForm.role,
        branchId: staffForm.branchId,
      });

      if (res.data?.success) {
        toast.success(`App user account created for ${staffForm.firstName}`);
        setAddStaffOpen(false);
        fetchStaffData();
      }
    } catch (err) {
      console.error('createStaff error:', err);
      toast.error(err.response?.data?.message || 'Failed to create staff account');
    } finally {
      setSavingStaff(false);
    }
  };

  const handleOpenEditStaff = (staff) => {
    setEditStaffForm({
      id: staff._id,
      firstName: staff.firstName || '',
      lastName: staff.lastName || '',
      branchId: staff.branchId?._id ?? staff.branchId ?? '',
      isActive: staff.isActive ?? true,
    });
    setEditStaffOpen(true);
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!editStaffForm.firstName.trim() || !editStaffForm.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!editStaffForm.branchId) {
      toast.error('Please select a branch');
      return;
    }

    setUpdatingStaff(true);
    try {
      const res = await updateStaff(editStaffForm.id, {
        firstName: editStaffForm.firstName.trim(),
        lastName: editStaffForm.lastName.trim(),
        branchId: editStaffForm.branchId,
        isActive: editStaffForm.isActive,
      });

      if (res.data?.success) {
        toast.success('App user updated successfully');
        setEditStaffOpen(false);
        fetchStaffData();
      }
    } catch (err) {
      console.error('updateStaff error:', err);
      toast.error(err.response?.data?.message || 'Failed to update staff user');
    } finally {
      setUpdatingStaff(false);
    }
  };

  const handleReactivateStaff = async (staff) => {
    try {
      const res = await updateStaff(staff._id, { isActive: true });
      if (res.data?.success) {
        toast.success(`Account for ${staff.firstName} ${staff.lastName} reactivated`);
        fetchStaffData();
      }
    } catch (err) {
      console.error('reactivate staff error:', err);
      toast.error(err.response?.data?.message || 'Failed to reactivate account');
    }
  };

  // ── Employee Handlers ─────────────────────────────────────────────────────
  const handleOpenAddEmployee = () => {
    setEmployeeForm({
      ...EMPTY_EMPLOYEE_FORM,
      branchId: branches.length > 0 ? branches[0]._id : '',
    });
    setAddEmployeeOpen(true);
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!employeeForm.name.trim()) {
      toast.error('Employee name is required');
      return;
    }
    if (!employeeForm.branchId) {
      toast.error('Please assign a branch');
      return;
    }
    if (employeeForm.monthlySalary === '' || Number(employeeForm.monthlySalary) < 0) {
      toast.error('Valid monthly salary is required');
      return;
    }

    setSavingEmployee(true);
    try {
      const res = await createEmployee({
        name: employeeForm.name.trim(),
        designation: employeeForm.designation.trim() || undefined,
        branchId: employeeForm.branchId,
        monthlySalary: Number(employeeForm.monthlySalary),
        phone: employeeForm.phone.trim() || undefined,
      });

      if (res.data?.success) {
        toast.success(`Employee ${employeeForm.name} registered`);
        setAddEmployeeOpen(false);
        fetchEmployeeData();
      }
    } catch (err) {
      console.error('createEmployee error:', err);
      toast.error(err.response?.data?.message || 'Failed to create employee');
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleOpenEditEmployee = (emp) => {
    setEditEmployeeForm({
      id: emp._id,
      name: emp.name || '',
      designation: emp.designation || '',
      branchId: emp.branchId?._id ?? emp.branchId ?? '',
      monthlySalary: emp.monthlySalary ?? '',
      phone: emp.phone || '',
      isActive: emp.isActive ?? true,
    });
    setEditEmployeeOpen(true);
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!editEmployeeForm.name.trim()) {
      toast.error('Employee name is required');
      return;
    }
    if (editEmployeeForm.monthlySalary === '' || Number(editEmployeeForm.monthlySalary) < 0) {
      toast.error('Valid monthly salary is required');
      return;
    }

    setUpdatingEmployee(true);
    try {
      const res = await updateEmployee(editEmployeeForm.id, {
        name: editEmployeeForm.name.trim(),
        designation: editEmployeeForm.designation.trim() || null,
        monthlySalary: Number(editEmployeeForm.monthlySalary),
        phone: editEmployeeForm.phone.trim() || null,
        isActive: editEmployeeForm.isActive,
      });

      if (res.data?.success) {
        toast.success('Employee updated successfully');
        setEditEmployeeOpen(false);
        fetchEmployeeData();
      }
    } catch (err) {
      console.error('updateEmployee error:', err);
      toast.error(err.response?.data?.message || 'Failed to update employee');
    } finally {
      setUpdatingEmployee(false);
    }
  };

  const handleToggleEmployeeActive = async (emp) => {
    const nextState = !emp.isActive;
    const empId = emp._id;

    // Optimistic state update
    setTogglingIds((prev) => new Set(prev).add(empId));
    setEmployeeList((prev) =>
      prev.map((item) => (item._id === empId ? { ...item, isActive: nextState } : item))
    );

    try {
      let res;
      if (nextState) {
        res = await updateEmployee(empId, { isActive: true });
      } else {
        // Soft-delete
        res = await deactivateEmployee(empId);
      }

      if (res.data?.success) {
        toast.success(
          `${emp.name} is now marked as ${nextState ? 'Active' : 'Inactive'}`
        );
      }
    } catch (err) {
      console.error('toggle employee active error:', err);
      // Revert optimistic update
      setEmployeeList((prev) =>
        prev.map((item) => (item._id === empId ? { ...item, isActive: !nextState } : item))
      );
      toast.error(err.response?.data?.message || 'Failed to update employee status');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(empId);
        return next;
      });
    }
  };

  // ── Deactivate Modal Trigger ──────────────────────────────────────────────
  const handleTriggerDeactivate = (type, item) => {
    setDeactivateTarget({ type, item });
    setDeactivateOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    const { type, item } = deactivateTarget;

    setDeactivating(true);
    try {
      if (type === 'staff') {
        const res = await deactivateStaff(item._id);
        if (res.data?.success) {
          toast.success(`Account for ${item.firstName} ${item.lastName} deactivated`);
          setDeactivateOpen(false);
          setDeactivateTarget(null);
          fetchStaffData();
        }
      } else if (type === 'employee') {
        const res = await deactivateEmployee(item._id);
        if (res.data?.success) {
          toast.success(`Employee ${item.name} deactivated`);
          setDeactivateOpen(false);
          setDeactivateTarget(null);
          fetchEmployeeData();
        }
      }
    } catch (err) {
      console.error('deactivate error:', err);
      toast.error(err.response?.data?.message || 'Failed to deactivate');
    } finally {
      setDeactivating(false);
    }
  };

  // ── Enforce Admin Route Guard ─────────────────────────────────────────────
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── Table Column Definitions: App Users ───────────────────────────────────
  const staffColumns = [
    {
      key: 'name',
      label: 'Staff Member',
      sortable: true,
      render: (_, row) => {
        const fullName = `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Unnamed';
        const initials = getInitials(fullName);
        const avatarColor = getAvatarColor(fullName);

        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 shadow-sm ${avatarColor}`}
            >
              {initials}
            </div>
            <div>
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                {fullName}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                {row.role} Account
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'email',
      label: 'Email / Username',
      sortable: true,
      render: (email) => (
        <div className="flex items-center gap-1.5 font-mono text-xs text-neutral-700 dark:text-neutral-300">
          <svg className="w-3.5 h-3.5 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="truncate max-w-[220px]">{email || '—'}</span>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'System Role',
      sortable: true,
      render: (role) => {
        if (role === 'manager') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 shadow-xs">
              <svg className="w-3 h-3 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Branch Manager
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800 shadow-xs">
            <svg className="w-3 h-3 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Cashier Staff
          </span>
        );
      },
    },
    {
      key: 'branchId',
      label: 'Assigned Branch',
      render: (_, row) => {
        const branchName = row.branchId?.name;
        if (!branchName) {
          return <span className="text-xs text-neutral-400 italic">Unassigned</span>;
        }
        return (
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-800 dark:text-neutral-200">
            <svg className="w-3.5 h-3.5 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>{branchName}</span>
          </div>
        );
      },
    },
    {
      key: 'isActive',
      label: 'Status',
      align: 'center',
      render: (isActive) => (
        <Badge variant={isActive ? 'success' : 'neutral'} dot>
          {isActive ? 'Active Login' : 'Deactivated'}
        </Badge>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Last Activity',
      render: (_, row) => (
        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
          {formatDateTime(row.updatedAt || row.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleOpenEditStaff(row)}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-brand-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Edit Staff Member"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {row.isActive ? (
            <button
              onClick={() => handleTriggerDeactivate('staff', row)}
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Deactivate Staff Account"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => handleReactivateStaff(row)}
              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
              title="Reactivate Account"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      ),
    },
  ];

  // ── Table Column Definitions: Employees ───────────────────────────────────
  const employeeColumns = [
    {
      key: 'name',
      label: 'Employee Name',
      sortable: true,
      render: (_, row) => {
        const initials = getInitials(row.name);
        const avatarColor = getAvatarColor(row.name);

        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 shadow-sm ${avatarColor}`}
            >
              {initials}
            </div>
            <div>
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                {row.name}
              </div>
              {row.phone ? (
                <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                  <svg className="w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{row.phone}</span>
                </div>
              ) : (
                <div className="text-xs text-neutral-400 italic">No phone logged</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'designation',
      label: 'Designation / Role',
      sortable: true,
      render: (desig) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700">
          {desig || 'General Staff'}
        </span>
      ),
    },
    {
      key: 'branchId',
      label: 'Branch Location',
      render: (_, row) => {
        const branchName = row.branchId?.name;
        if (!branchName) {
          return <span className="text-xs text-neutral-400 italic">Unassigned</span>;
        }
        return (
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-800 dark:text-neutral-200">
            <svg className="w-3.5 h-3.5 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>{branchName}</span>
          </div>
        );
      },
    },
    {
      key: 'monthlySalary',
      label: 'Monthly Salary',
      type: 'currency',
      sortable: true,
      render: (val) => (
        <div className="text-right">
          <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
            ${fmtCurrency(val)}
          </span>
          <span className="block text-[11px] text-neutral-400 font-normal">per month</span>
        </div>
      ),
    },
    {
      key: 'isActive',
      label: 'Active Toggle',
      align: 'center',
      render: (isActive, row) => {
        const isToggling = togglingIds.has(row._id);

        return (
          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              disabled={isToggling}
              onClick={() => handleToggleEmployeeActive(row)}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 ${
                isActive
                  ? 'bg-emerald-500 dark:bg-emerald-600'
                  : 'bg-neutral-300 dark:bg-neutral-700'
              } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
            >
              <span className="sr-only">Toggle active status</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 w-14 text-left">
              {isToggling ? (
                <Spinner size="xs" />
              ) : isActive ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
              ) : (
                <span className="text-neutral-400">Inactive</span>
              )}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleOpenEditEmployee(row)}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-brand-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Edit Employee"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {row.isActive ? (
            <button
              onClick={() => handleTriggerDeactivate('employee', row)}
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Deactivate Employee"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => handleToggleEmployeeActive(row)}
              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
              title="Reactivate Employee"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
        {/* ── Page Header ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-accent flex items-center justify-center shadow-xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
                Staff & User Management
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50 uppercase tracking-wide">
                Admin Only
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
              Manage system portal accounts (branch managers and cashiers with secure login) alongside on-roll salaried employees.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTab === 'appUsers' ? (
              <button
                type="button"
                onClick={handleOpenAddStaff}
                className="btn-primary flex items-center gap-2 shadow-sm px-4 py-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Staff User</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenAddEmployee}
                className="btn-primary flex items-center gap-2 shadow-sm px-4 py-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Employee</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Summary StatCards ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="App Portal Users"
            value={fmtNumber(metrics.totalStaff)}
            subtitle={`${metrics.activeStaffCount} active • ${metrics.inactiveStaffCount} inactive`}
            icon={
              <svg className="w-5 h-5 text-brand-800 dark:text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />

          <StatCard
            title="Managers & Cashiers"
            value={`${metrics.managerCount} / ${metrics.cashierCount}`}
            subtitle="Portal credentials assigned"
            icon={
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            }
          />

          <StatCard
            title="Salaried Employees"
            value={fmtNumber(metrics.activeEmployeeCount)}
            subtitle={`${metrics.totalEmployees} total on payroll roll`}
            icon={
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />

          <StatCard
            title="Monthly Payroll Liability"
            value={`$${fmtCurrency(metrics.totalMonthlyPayroll)}`}
            subtitle="Active salaried workforce"
            icon={
              <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* ── Tabs Navigation ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('appUsers')}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'appUsers'
                  ? 'border-brand-800 text-brand-800 dark:border-brand-accent dark:text-brand-accent'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>App Users (Login Access)</span>
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-accent">
                {staffList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('employees')}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'employees'
                  ? 'border-brand-800 text-brand-800 dark:border-brand-accent dark:text-brand-accent'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Employees (Salaried)</span>
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                {employeeList.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {activeTab === 'appUsers'
              ? 'Managers & Cashiers who sign in to operate branches'
              : 'On-roll salaried staff without web portal login credentials'}
          </div>
        </div>

        {/* ── Filters Bar ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <svg className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'appUsers'
                  ? 'Search staff by name, email, or branch...'
                  : 'Search employees by name, designation, or phone...'
              }
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
            />
          </div>

          {/* Branch Filter */}
          <div className="w-full sm:w-48 shrink-0">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full py-1.5 px-3 text-xs bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter (App Users only) */}
          {activeTab === 'appUsers' && (
            <div className="w-full sm:w-36 shrink-0">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full py-1.5 px-3 text-xs bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
              >
                <option value="">All Roles</option>
                <option value="manager">Manager</option>
                <option value="cashier">Cashier</option>
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="w-full sm:w-36 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-3 text-xs bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-accent"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(searchQuery || branchFilter || roleFilter || statusFilter) && (
            <button
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

        {/* ── Tab Content: App Users ───────────────────────────────────── */}
        {activeTab === 'appUsers' && (
          <div className="space-y-4">
            <DataTable
              columns={staffColumns}
              data={filteredStaff}
              loading={loadingStaff}
              emptyMessage="No app users found"
              emptySubMessage={
                searchQuery || branchFilter || roleFilter || statusFilter
                  ? 'No portal accounts match the active filter criteria.'
                  : 'Get started by creating your first manager or cashier portal account.'
              }
            />
          </div>
        )}

        {/* ── Tab Content: Employees ──────────────────────────────────── */}
        {activeTab === 'employees' && (
          <div className="space-y-4">
            <DataTable
              columns={employeeColumns}
              data={filteredEmployees}
              loading={loadingEmployees}
              emptyMessage="No salaried employees found"
              emptySubMessage={
                searchQuery || branchFilter || statusFilter
                  ? 'No employees match the active filter criteria.'
                  : 'Register your first salaried staff member to begin tracking payroll liabilities.'
              }
            />
          </div>
        )}

        {/* ── Modal: Add Staff ────────────────────────────────────────── */}
        <Modal
          isOpen={addStaffOpen}
          onClose={() => !savingStaff && setAddStaffOpen(false)}
          title="Add New Portal Staff User"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleCreateStaff} className="space-y-4 mt-2">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Create portal credentials for branch managers or cashier operators. (Admins and SuperAdmins cannot be created from this form).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John"
                  value={staffForm.firstName}
                  onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Doe"
                  value={staffForm.lastName}
                  onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="staff@example.com"
                value={staffForm.email}
                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Initial Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="w-full px-3 py-2 pr-10 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                Password must be at least 6 characters.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Portal Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                >
                  {/* NEVER EXPOSE admin or superAdmin! */}
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
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                >
                  <option value="" disabled>Select a branch</option>
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
                onClick={() => setAddStaffOpen(false)}
                disabled={savingStaff}
                className="btn-secondary px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingStaff}
                className="btn-primary px-5 py-2 flex items-center gap-2"
              >
                {savingStaff ? <Spinner size="sm" /> : null}
                <span>{savingStaff ? 'Creating...' : 'Create Account'}</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* ── Modal: Edit Staff ───────────────────────────────────────── */}
        <Modal
          isOpen={editStaffOpen}
          onClose={() => !updatingStaff && setEditStaffOpen(false)}
          title="Edit Staff Member Details"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleUpdateStaff} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editStaffForm.firstName}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, firstName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editStaffForm.lastName}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, lastName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Assigned Branch <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={editStaffForm.branchId}
                onChange={(e) => setEditStaffForm({ ...editStaffForm, branchId: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
              >
                <option value="" disabled>Select a branch</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="editStaffActive"
                checked={editStaffForm.isActive}
                onChange={(e) => setEditStaffForm({ ...editStaffForm, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-brand-800 focus:ring-brand-accent"
              />
              <label htmlFor="editStaffActive" className="text-xs font-medium text-neutral-700 dark:text-neutral-300 select-none">
                Account is Active (can sign in to portal)
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setEditStaffOpen(false)}
                disabled={updatingStaff}
                className="btn-secondary px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingStaff}
                className="btn-primary px-5 py-2 flex items-center gap-2"
              >
                {updatingStaff ? <Spinner size="sm" /> : null}
                <span>{updatingStaff ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* ── Modal: Add Employee ─────────────────────────────────────── */}
        <Modal
          isOpen={addEmployeeOpen}
          onClose={() => !savingEmployee && setAddEmployeeOpen(false)}
          title="Add New Salaried Employee"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleCreateEmployee} className="space-y-4 mt-2">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Register an on-roll team member (monthly salaried payroll recipient, without system login).
            </p>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Alex Morgan"
                value={employeeForm.name}
                onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Designation / Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales Staff, Driver, Helper"
                  value={employeeForm.designation}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +1 555-0199"
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Branch <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={employeeForm.branchId}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, branchId: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                >
                  <option value="" disabled>Select branch</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Monthly Salary ($) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400 font-mono">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={employeeForm.monthlySalary}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, monthlySalary: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 text-sm font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setAddEmployeeOpen(false)}
                disabled={savingEmployee}
                className="btn-secondary px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEmployee}
                className="btn-primary px-5 py-2 flex items-center gap-2"
              >
                {savingEmployee ? <Spinner size="sm" /> : null}
                <span>{savingEmployee ? 'Saving...' : 'Register Employee'}</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* ── Modal: Edit Employee ────────────────────────────────────── */}
        <Modal
          isOpen={editEmployeeOpen}
          onClose={() => !updatingEmployee && setEditEmployeeOpen(false)}
          title="Edit Employee Details"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleUpdateEmployee} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editEmployeeForm.name}
                onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Designation / Role
                </label>
                <input
                  type="text"
                  value={editEmployeeForm.designation}
                  onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, designation: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={editEmployeeForm.phone}
                  onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Branch
                </label>
                <select
                  value={editEmployeeForm.branchId}
                  onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, branchId: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                >
                  <option value="" disabled>Select branch</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Monthly Salary ($) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400 font-mono">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={editEmployeeForm.monthlySalary}
                    onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, monthlySalary: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 text-sm font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="editEmployeeActive"
                checked={editEmployeeForm.isActive}
                onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-brand-800 focus:ring-brand-accent"
              />
              <label htmlFor="editEmployeeActive" className="text-xs font-medium text-neutral-700 dark:text-neutral-300 select-none">
                Employee is Active (currently employed on payroll)
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setEditEmployeeOpen(false)}
                disabled={updatingEmployee}
                className="btn-secondary px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingEmployee}
                className="btn-primary px-5 py-2 flex items-center gap-2"
              >
                {updatingEmployee ? <Spinner size="sm" /> : null}
                <span>{updatingEmployee ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* ── ConfirmDialog: Deactivate ───────────────────────────────── */}
        <ConfirmDialog
          isOpen={deactivateOpen}
          onClose={() => !deactivating && setDeactivateOpen(false)}
          onConfirm={handleConfirmDeactivate}
          loading={deactivating}
          title={
            deactivateTarget?.type === 'staff'
              ? 'Deactivate Staff User Account?'
              : 'Deactivate Salaried Employee?'
          }
          message={
            deactivateTarget?.type === 'staff'
              ? `Are you sure you want to deactivate ${deactivateTarget?.item?.firstName} ${deactivateTarget?.item?.lastName}'s account? They will immediately lose login access to the portal.`
              : `Are you sure you want to deactivate employee ${deactivateTarget?.item?.name}? They will be marked inactive in payroll rosters.`
          }
        />
      </div>
    </DashboardLayout>
  );
}
