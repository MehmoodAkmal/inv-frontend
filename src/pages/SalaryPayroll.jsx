import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { recordSalaryPayment, getSalaryPayments } from '../services/salaryService';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
} from '../services/employeeService';
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

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthName = (m) => {
  if (!m || !/^\d{4}-\d{2}$/.test(m)) return m || '—';
  const [year, month] = m.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// ── Status Badges ───────────────────────────────────────────────────────────
function PaymentStatusBadge({ status }) {
  const s = String(status || 'pending').toLowerCase();
  if (s === 'paid') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        Paid
      </span>
    );
  }
  if (s === 'partial') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        Partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
      Pending
    </span>
  );
}

function ActiveBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700">
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
      Inactive
    </span>
  );
}

const EMPTY_PAYMENT_FORM = {
  employeeId: '',
  month: currentMonth(),
  amount: '',
  status: 'paid',
  note: '',
};

const EMPTY_EMPLOYEE_FORM = {
  branchId: '',
  name: '',
  phone: '',
  designation: '',
  monthlySalary: '',
};

export default function SalaryPayroll() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  // Active view tab: 'payroll' | 'employees'
  const [activeTab, setActiveTab] = useState('payroll');

  // Common State
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters (Header)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [selectedBranch, setSelectedBranch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'partial' | 'pending'
  const [searchEmployee, setSearchEmployee] = useState('');

  // Record Payment Modal
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordForm, setRecordForm] = useState({ ...EMPTY_PAYMENT_FORM });
  const [recording, setRecording] = useState(false);

  // Employee Add/Edit Modal (Admin Only)
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [empModalMode, setEmpModalMode] = useState('create'); // 'create' | 'edit'
  const [empTarget, setEmpTarget] = useState(null);
  const [empForm, setEmpForm] = useState({ ...EMPTY_EMPLOYEE_FORM });
  const [savingEmp, setSavingEmp] = useState(false);

  // Employee Deactivate Dialog
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  // ── 1. Fetch Branches ─────────────────────────────────────────────────────
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
  const managerBranchId = user?.branchId;
  const userBranchName = useMemo(() => {
    if (!managerBranchId) return 'Assigned Branch';
    const b = branches.find((item) => item._id === managerBranchId);
    return b?.name || 'Assigned Branch';
  }, [managerBranchId, branches]);

  // ── 2. Fetch Employees (including inactive for admin management) ───────────
  const fetchEmployeesData = useCallback(async () => {
    try {
      const params = { includeInactive: 'true' };
      if (isAdmin && selectedBranch) {
        params.branchId = selectedBranch;
      }
      const res = await getEmployees(params);
      if (res.data?.success) {
        setEmployees(res.data.data || []);
      }
    } catch (err) {
      console.error('getEmployees error:', err);
    }
  }, [isAdmin, selectedBranch]);

  // ── 3. Fetch Salary Payments for selected month ───────────────────────────
  const fetchPaymentsData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        month: selectedMonth,
        limit: 200,
      };
      if (isAdmin && selectedBranch) {
        params.branchId = selectedBranch;
      }
      const res = await getSalaryPayments(params);
      if (res.data?.success) {
        setPayments(res.data.data || []);
      }
    } catch (err) {
      console.error('getSalaryPayments error:', err);
      toast.error('Failed to load salary payments');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedBranch, selectedMonth]);

  // Trigger loads on filter change
  useEffect(() => {
    fetchEmployeesData();
  }, [fetchEmployeesData]);

  useEffect(() => {
    fetchPaymentsData();
  }, [fetchPaymentsData]);

  // ── 4. Compute Merged Payroll Table Rows ───────────────────────────────────
  // Each active employee is linked to any existing payment record for the selected month.
  const payrollRows = useMemo(() => {
    // Filter active employees based on manager / admin branch scope
    const branchScopeId = isManager ? managerBranchId : selectedBranch;
    const scopedEmployees = employees.filter((emp) => {
      if (!emp.isActive) return false;
      if (branchScopeId) {
        const bId = emp.branchId?._id ?? emp.branchId;
        if (String(bId) !== String(branchScopeId)) return false;
      }
      return true;
    });

    // Map by employee ID for fast lookup
    const paymentMap = new Map();
    payments.forEach((p) => {
      const empId = p.employeeId?._id ?? p.employeeId;
      if (empId) {
        paymentMap.set(String(empId), p);
      }
    });

    // Generate merged rows
    let rows = scopedEmployees.map((emp) => {
      const p = paymentMap.get(String(emp._id));
      const monthlySalary = emp.monthlySalary || 0;
      const amountPaid = p ? p.amount || 0 : 0;
      let status = p ? p.status : 'pending';

      // Fallback status calculation if not explicitly set
      if (!p) {
        status = 'pending';
      } else if (amountPaid >= monthlySalary && monthlySalary > 0) {
        status = 'paid';
      } else if (amountPaid > 0) {
        status = 'partial';
      }

      // Branch name resolution
      let branchName = '—';
      if (emp.branchId?.name) {
        branchName = emp.branchId.name;
      } else {
        const bId = emp.branchId?._id ?? emp.branchId;
        const b = branches.find((item) => item._id === bId);
        if (b) branchName = b.name;
      }

      return {
        employeeId: emp._id,
        employeeName: emp.name,
        designation: emp.designation || 'Staff',
        phone: emp.phone,
        branchId: emp.branchId?._id ?? emp.branchId,
        branchName,
        monthlySalary,
        amountPaid,
        balanceRemaining: Math.max(0, monthlySalary - amountPaid),
        status,
        paymentRecord: p || null,
      };
    });

    // Apply status filter
    if (statusFilter !== 'all') {
      rows = rows.filter((r) => r.status === statusFilter);
    }

    // Apply text search
    if (searchEmployee.trim()) {
      const q = searchEmployee.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          r.designation.toLowerCase().includes(q) ||
          r.branchName.toLowerCase().includes(q)
      );
    }

    // Sort by status (pending first, then partial, then paid) and name
    const statusOrder = { pending: 0, partial: 1, paid: 2 };
    rows.sort((a, b) => {
      const diff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      if (diff !== 0) return diff;
      return a.employeeName.localeCompare(b.employeeName);
    });

    return rows;
  }, [employees, payments, isManager, managerBranchId, selectedBranch, branches, statusFilter, searchEmployee]);

  // ── 5. Derived StatCards Calculations ─────────────────────────────────────
  const statMetrics = useMemo(() => {
    // Branch scope for active employees
    const branchScopeId = isManager ? managerBranchId : selectedBranch;
    const scopedActiveEmps = employees.filter((emp) => {
      if (!emp.isActive) return false;
      if (branchScopeId) {
        const bId = emp.branchId?._id ?? emp.branchId;
        if (String(bId) !== String(branchScopeId)) return false;
      }
      return true;
    });

    const paymentMap = new Map();
    payments.forEach((p) => {
      const empId = p.employeeId?._id ?? p.employeeId;
      if (empId) paymentMap.set(String(empId), p);
    });

    let totalPayrollPaid = 0;
    let totalAgreedBudget = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let partialCount = 0;

    scopedActiveEmps.forEach((emp) => {
      const monthly = emp.monthlySalary || 0;
      totalAgreedBudget += monthly;

      const p = paymentMap.get(String(emp._id));
      if (!p || p.amount === 0) {
        pendingCount++;
      } else if (p.amount >= monthly && monthly > 0) {
        paidCount++;
        totalPayrollPaid += p.amount;
      } else {
        partialCount++;
        totalPayrollPaid += p.amount;
      }
    });

    const coveragePct =
      totalAgreedBudget > 0
        ? Math.min(100, (totalPayrollPaid / totalAgreedBudget) * 100).toFixed(1)
        : '0.0';

    return {
      totalPayrollPaid,
      totalAgreedBudget,
      coveragePct,
      totalEmployees: scopedActiveEmps.length,
      paidCount,
      pendingCount,
      partialCount,
    };
  }, [employees, payments, isManager, managerBranchId, selectedBranch]);

  // ── 6. Record Payment Modal Handlers ──────────────────────────────────────
  const openRecordModal = (preselectedEmp = null) => {
    if (preselectedEmp) {
      const monthly = preselectedEmp.monthlySalary || 0;
      const alreadyPaid = preselectedEmp.amountPaid || 0;
      const remaining = Math.max(0, monthly - alreadyPaid);
      const suggestedAmount = remaining > 0 ? remaining : monthly;

      setRecordForm({
        employeeId: preselectedEmp.employeeId,
        month: selectedMonth,
        amount: suggestedAmount > 0 ? String(suggestedAmount) : '',
        status: remaining > 0 ? 'paid' : (preselectedEmp.status || 'paid'),
        note: '',
      });
    } else {
      setRecordForm({
        ...EMPTY_PAYMENT_FORM,
        month: selectedMonth,
      });
    }
    setRecordOpen(true);
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    const amountNum = Number(recordForm.amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    if (!recordForm.employeeId) {
      toast.error('Please select an employee');
      return;
    }

    setRecording(true);
    try {
      const payload = {
        employeeId: recordForm.employeeId,
        month: recordForm.month,
        amount: amountNum,
        status: recordForm.status,
        note: recordForm.note?.trim() || null,
      };

      const res = await recordSalaryPayment(payload);
      if (res.data?.success) {
        toast.success(res.data.message || 'Salary payment recorded successfully');
        setRecordOpen(false);
        setRecordForm({ ...EMPTY_PAYMENT_FORM });
        fetchPaymentsData();
      } else {
        toast.error(res.data?.message || 'Failed to record payment');
      }
    } catch (err) {
      console.error('recordSalaryPayment error:', err);
      toast.error(err.response?.data?.message || 'Failed to record salary payment');
    } finally {
      setRecording(false);
    }
  };

  // ── 7. Employee Management (Admin Only) Handlers ───────────────────────────
  const openAddEmployeeModal = () => {
    setEmpModalMode('create');
    setEmpTarget(null);
    setEmpForm({
      branchId: branches[0]?._id || '',
      name: '',
      phone: '',
      designation: '',
      monthlySalary: '',
    });
    setEmpModalOpen(true);
  };

  const openEditEmployeeModal = (emp) => {
    setEmpModalMode('edit');
    setEmpTarget(emp);
    setEmpForm({
      branchId: emp.branchId?._id ?? emp.branchId ?? '',
      name: emp.name || '',
      phone: emp.phone || '',
      designation: emp.designation || '',
      monthlySalary: String(emp.monthlySalary ?? ''),
    });
    setEmpModalOpen(true);
  };

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    const salaryNum = Number(empForm.monthlySalary);
    if (salaryNum < 0 || isNaN(salaryNum)) {
      toast.error('Please enter a valid monthly salary');
      return;
    }
    if (!empForm.name.trim()) {
      toast.error('Employee name is required');
      return;
    }

    setSavingEmp(true);
    try {
      if (empModalMode === 'create') {
        if (!empForm.branchId) {
          toast.error('Branch selection is required');
          return;
        }
        const payload = {
          branchId: empForm.branchId,
          name: empForm.name.trim(),
          phone: empForm.phone.trim() || null,
          designation: empForm.designation.trim() || null,
          monthlySalary: salaryNum,
        };
        const res = await createEmployee(payload);
        if (res.data?.success) {
          toast.success('Employee created successfully');
          setEmpModalOpen(false);
          fetchEmployeesData();
        }
      } else if (empModalMode === 'edit' && empTarget) {
        const payload = {
          name: empForm.name.trim(),
          phone: empForm.phone.trim() || null,
          designation: empForm.designation.trim() || null,
          monthlySalary: salaryNum,
        };
        const res = await updateEmployee(empTarget._id, payload);
        if (res.data?.success) {
          toast.success('Employee updated successfully');
          setEmpModalOpen(false);
          fetchEmployeesData();
        }
      }
    } catch (err) {
      console.error('employee submit error:', err);
      toast.error(err.response?.data?.message || 'Failed to save employee profile');
    } finally {
      setSavingEmp(false);
    }
  };

  const handleToggleActive = async (emp) => {
    try {
      const newActive = !emp.isActive;
      if (!newActive) {
        // Soft deactivate
        const res = await deactivateEmployee(emp._id);
        if (res.data?.success) {
          toast.success(`${emp.name} deactivated`);
          fetchEmployeesData();
        }
      } else {
        // Reactivate
        const res = await updateEmployee(emp._id, { isActive: true });
        if (res.data?.success) {
          toast.success(`${emp.name} reactivated`);
          fetchEmployeesData();
        }
      }
    } catch (err) {
      console.error('handleToggleActive error:', err);
      toast.error(err.response?.data?.message || 'Failed to update employee status');
    }
  };

  // ── 8. DataTable Definitions ──────────────────────────────────────────────
  // Tab 1: Payroll Columns
  const payrollColumns = [
    {
      key: 'employeeName',
      label: 'Employee',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-800 dark:text-brand-accent flex items-center justify-center font-bold text-xs shrink-0 border border-brand-200/50 dark:border-brand-700/50">
            {val.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-neutral-900 dark:text-white block truncate">
              {val}
            </span>
            {row.phone && (
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block truncate">
                {row.phone}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'designation',
      label: 'Designation',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
          {val}
        </span>
      ),
    },
    {
      key: 'branchName',
      label: 'Branch',
      render: (val) => (
        <span className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
          {val}
        </span>
      ),
    },
    {
      key: 'monthlySalary',
      label: 'Monthly Salary',
      type: 'currency',
      align: 'right',
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          ${fmt(val)}
        </span>
      ),
    },
    {
      key: 'amountPaid',
      label: 'Amount Paid This Month',
      type: 'currency',
      align: 'right',
      render: (val, row) => {
        const isPaid = row.status === 'paid';
        const isPartial = row.status === 'partial';
        return (
          <div className="text-right">
            <span
              className={`font-mono text-xs font-bold ${
                isPaid
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : isPartial
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-neutral-400 dark:text-neutral-500'
              }`}
            >
              ${fmt(val)}
            </span>
            {isPartial && (
              <span className="text-[10px] block text-neutral-400 font-mono">
                Due: ${fmt(row.balanceRemaining)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (val) => <PaymentStatusBadge status={val} />,
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => openRecordModal(row)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand-50 hover:bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:hover:bg-brand-900/80 dark:text-brand-accent border border-brand-200/80 dark:border-brand-700/60 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{row.amountPaid > 0 ? 'Adjust Payment' : 'Record Payment'}</span>
          </button>
        </div>
      ),
    },
  ];

  // Tab 2: Employees Directory Columns
  const employeeColumns = [
    {
      key: 'name',
      label: 'Employee Name',
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center font-bold text-xs shrink-0 border border-neutral-200 dark:border-neutral-700">
            {val.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="text-xs font-semibold text-neutral-900 dark:text-white block">
              {val}
            </span>
            {row.phone && (
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">
                {row.phone}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'designation',
      label: 'Designation',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
          {val || '—'}
        </span>
      ),
    },
    {
      key: 'branchId',
      label: 'Branch',
      render: (val, row) => {
        let name = '—';
        if (row.branchId?.name) name = row.branchId.name;
        else {
          const bid = val?._id ?? val;
          const b = branches.find((item) => item._id === bid);
          if (b) name = b.name;
        }
        return <span className="text-xs text-neutral-700 dark:text-neutral-300">{name}</span>;
      },
    },
    {
      key: 'monthlySalary',
      label: 'Monthly Salary',
      type: 'currency',
      align: 'right',
      render: (val) => (
        <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
          ${fmt(val)}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      align: 'center',
      render: (val) => <ActiveBadge active={val} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => {
        if (!isAdmin) return <span className="text-xs text-neutral-400 italic">Admin only</span>;
        return (
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => openEditEmployeeModal(row)}
              className="p-1.5 rounded-md text-neutral-500 hover:text-brand-800 dark:hover:text-brand-accent hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Edit employee"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleToggleActive(row)}
              className={`p-1.5 rounded-md transition-colors ${
                row.isActive
                  ? 'text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  : 'text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
              title={row.isActive ? 'Deactivate employee' : 'Reactivate employee'}
            >
              {row.isActive ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
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
                Salary & Payroll
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-brand-50 text-brand-800 dark:bg-brand-900/60 dark:text-brand-accent border border-brand-200/60 dark:border-brand-700/50">
                Staff Remuneration
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Process monthly employee wages, track paid/pending statuses, and oversee branch staffing records.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5">
            {isAdmin && activeTab === 'employees' && (
              <button
                type="button"
                onClick={openAddEmployeeModal}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent border border-brand-700 hover:bg-brand-950 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>+ Add Employee</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => openRecordModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent border border-brand-700 hover:bg-brand-950 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Record Payment</span>
            </button>
          </div>
        </div>

        {/* ── Tab Switcher ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('payroll')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'payroll'
                ? 'border-brand-800 text-brand-900 dark:border-brand-accent dark:text-brand-accent'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>Payroll Register</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              {payrollRows.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'employees'
                ? 'border-brand-800 text-brand-900 dark:border-brand-accent dark:text-brand-accent'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Employees Management</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              {employees.length}
            </span>
          </button>
        </div>

        {/* ── Tab 1: Payroll Register ─────────────────────────────────── */}
        {activeTab === 'payroll' && (
          <div className="space-y-6">
            {/* ── Summary StatCards ─────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Total Payroll This Month"
                value={`$${fmt(statMetrics.totalPayrollPaid)}`}
                accentColor="brand"
                icon={
                  <svg className="w-5 h-5 text-brand-700 dark:text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                secondaryStats={[
                  {
                    label: 'Agreed Base Total',
                    value: `$${fmt(statMetrics.totalAgreedBudget)}`,
                  },
                  {
                    label: 'Fulfillment',
                    value: `${statMetrics.coveragePct}%`,
                  },
                ]}
              />

              <StatCard
                label="Employees Paid"
                value={`${statMetrics.paidCount} of ${statMetrics.totalEmployees}`}
                accentColor="success"
                icon={
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                secondaryStats={[
                  {
                    label: 'Fully Paid',
                    value: statMetrics.paidCount,
                  },
                  {
                    label: 'Partial Payments',
                    value: statMetrics.partialCount,
                  },
                ]}
              />

              <StatCard
                label="Employees Pending"
                value={statMetrics.pendingCount}
                accentColor={statMetrics.pendingCount > 0 ? 'danger' : 'neutral'}
                icon={
                  <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                secondaryStats={[
                  {
                    label: 'Target Month',
                    value: formatMonthName(selectedMonth),
                  },
                  {
                    label: 'Pending Payout',
                    value: `$${fmt(Math.max(0, statMetrics.totalAgreedBudget - statMetrics.totalPayrollPaid))}`,
                  },
                ]}
              />
            </div>

            {/* ── Filters Bar ───────────────────────────────────────── */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-4 shadow-card">
              <div className="flex flex-wrap items-end gap-3 justify-between">
                <div className="flex flex-wrap items-end gap-3 flex-1">
                  {/* Month Selector */}
                  <div className="w-44">
                    <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                      Payroll Month
                    </label>
                    <input
                      type="month"
                      required
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
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

                  {/* Payment Status Filter */}
                  <div className="w-40">
                    <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                      Status Filter
                    </label>
                    <CustomSelect
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="text-xs py-1.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-md"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                    </CustomSelect>
                  </div>

                  {/* Search by Name */}
                  <div className="w-48">
                    <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                      Search Employee
                    </label>
                    <input
                      type="text"
                      placeholder="Name, role, or branch…"
                      value={searchEmployee}
                      onChange={(e) => setSearchEmployee(e.target.value)}
                      className="w-full text-xs py-1.5 px-2.5 rounded-md bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-accent placeholder-neutral-400"
                    />
                  </div>

                  {/* Reset Filters */}
                  {(selectedBranch || statusFilter !== 'all' || searchEmployee) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBranch('');
                        setStatusFilter('all');
                        setSearchEmployee('');
                      }}
                      className="px-3 py-1.5 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="text-xs text-neutral-400 font-mono self-center">
                  {payrollRows.length} {payrollRows.length === 1 ? 'employee' : 'employees'}
                </div>
              </div>
            </div>

            {/* ── DataTable ─────────────────────────────────────────── */}
            <DataTable
              columns={payrollColumns}
              data={payrollRows}
              loading={loading}
              emptyMessage="No active employees found for this period"
              emptySubMessage="Switch to the 'Employees Management' tab to add or activate staff members."
            />
          </div>
        )}

        {/* ── Tab 2: Employees Management ─────────────────────────────── */}
        {activeTab === 'employees' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card shadow-card">
              <div>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Staff Directory & Contracted Wages
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Maintain employee profiles, assigned branch locations, agreed base monthly salaries, and active states.
                </p>
              </div>

              {!isAdmin && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700">
                  Branch managers can view branch staff and record payroll. Profile creation & edits require administrator privileges.
                </div>
              )}
            </div>

            <DataTable
              columns={employeeColumns}
              data={employees}
              loading={loading}
              emptyMessage="No employee records found"
              emptySubMessage="Click '+ Add Employee' to set up your organization's first staff member."
            />
          </div>
        )}

        {/* ── Record Payment Modal ────────────────────────────────────── */}
        <Modal
          isOpen={recordOpen}
          onClose={() => !recording && setRecordOpen(false)}
          title="Record Salary Payment"
        >
          <form onSubmit={handleRecordSubmit} className="space-y-4">
            {/* Employee Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Employee <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                required
                value={recordForm.employeeId}
                onChange={(e) => {
                  const empId = e.target.value;
                  const emp = employees.find((x) => x._id === empId);
                  setRecordForm((p) => ({
                    ...p,
                    employeeId: empId,
                    amount: emp ? String(emp.monthlySalary || '') : p.amount,
                  }));
                }}
                className="w-full text-xs py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
              >
                <option value="">Select Employee</option>
                {employees
                  .filter((e) => {
                    if (!e.isActive) return false;
                    if (isManager && managerBranchId) {
                      const bid = e.branchId?._id ?? e.branchId;
                      return String(bid) === String(managerBranchId);
                    }
                    return true;
                  })
                  .map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.name} {e.designation ? `— ${e.designation}` : ''} (${fmt(e.monthlySalary)})
                    </option>
                  ))}
              </CustomSelect>
            </div>

            {/* Month */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Payroll Month <span className="text-rose-500">*</span>
              </label>
              <input
                type="month"
                required
                value={recordForm.month}
                onChange={(e) => setRecordForm((p) => ({ ...p, month: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                If an earlier partial payment exists for this month, new amounts will be added to it.
              </p>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Amount Paid ($) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={recordForm.amount}
                onChange={(e) => setRecordForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm font-mono rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            {/* Status Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Payment Status <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                required
                value={recordForm.status}
                onChange={(e) => setRecordForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full text-xs py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
              >
                <option value="paid">Paid (Full Wage)</option>
                <option value="partial">Partial Payment</option>
                <option value="pending">Pending</option>
              </CustomSelect>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Note / Memo <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                maxLength={300}
                value={recordForm.note}
                onChange={(e) => setRecordForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="e.g. Regular monthly salary, bonus, overtime inclusion"
                className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setRecordOpen(false)}
                disabled={recording}
                className="px-4 py-2 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={recording || !recordForm.employeeId || !recordForm.amount || Number(recordForm.amount) <= 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent border border-brand-700 hover:bg-brand-950 transition-colors shadow-sm disabled:opacity-50"
              >
                {recording && <Spinner size="sm" />}
                <span>Record Payment</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* ── Employee Create / Edit Modal (Admin Only) ───────────────── */}
        <Modal
          isOpen={empModalOpen}
          onClose={() => !savingEmp && setEmpModalOpen(false)}
          title={empModalMode === 'create' ? 'Add New Employee' : 'Edit Employee Profile'}
        >
          <form onSubmit={handleEmployeeSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={empForm.name}
                onChange={(e) => setEmpForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            {/* Branch (Only editable in create mode) */}
            {empModalMode === 'create' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Branch <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  required
                  value={empForm.branchId}
                  onChange={(e) => setEmpForm((p) => ({ ...p, branchId: e.target.value }))}
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
            )}

            {/* Designation */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Designation / Job Role
              </label>
              <input
                type="text"
                maxLength={100}
                value={empForm.designation}
                onChange={(e) => setEmpForm((p) => ({ ...p, designation: e.target.value }))}
                placeholder="e.g. Sales Associate, Inventory Clerk, Helper"
                className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            {/* Monthly Salary */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Agreed Monthly Salary ($) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={empForm.monthlySalary}
                onChange={(e) => setEmpForm((p) => ({ ...p, monthlySalary: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm font-mono rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Phone Number <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                type="tel"
                maxLength={20}
                value={empForm.phone}
                onChange={(e) => setEmpForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+1 555 019 2834"
                className="w-full px-3 py-2 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setEmpModalOpen(false)}
                disabled={savingEmp}
                className="px-4 py-2 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEmp || !empForm.name.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-brand-900 dark:bg-brand-800 text-brand-accent border border-brand-700 hover:bg-brand-950 transition-colors shadow-sm disabled:opacity-50"
              >
                {savingEmp && <Spinner size="sm" />}
                <span>{empModalMode === 'create' ? 'Create Employee' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* ── Deactivate Employee Confirmation ────────────────────────── */}
        <ConfirmDialog
          isOpen={deactivateOpen}
          onClose={() => !deactivating && setDeactivateOpen(false)}
          onConfirm={async () => {
            if (!deactivateTarget) return;
            setDeactivating(true);
            try {
              await handleToggleActive(deactivateTarget);
              setDeactivateOpen(false);
              setDeactivateTarget(null);
            } finally {
              setDeactivating(false);
            }
          }}
          loading={deactivating}
          title={deactivateTarget?.isActive ? 'Deactivate Employee' : 'Reactivate Employee'}
          message={`Are you sure you want to ${deactivateTarget?.isActive ? 'deactivate' : 'reactivate'} ${deactivateTarget?.name}?`}
        />
      </div>
    </DashboardLayout>
  );
}
