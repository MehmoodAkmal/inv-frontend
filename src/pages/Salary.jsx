import CustomSelect from '../components/ui/CustomSelect';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { recordSalaryPayment, getSalaryPayments } from '../services/salaryService';
import { getEmployees } from '../services/employeeService';
import { getBranches } from '../services/branchService';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';

const fmt = (n) => Number(n ?? 0).toLocaleString();
const fmtd = (d) => (d ? new Date(d).toLocaleDateString() : '—');

// Current month as YYYY-MM default
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const STATUS_STYLES = {
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-amber-100 text-amber-800',
  pending: 'bg-red-100 text-red-800',
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {status}
    </span>
  );
}

function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-600">
      <span>
        Page {page} of {totalPages} · {total} total
      </span>
      <div className="flex gap-2">
        <button
          className="btn-secondary py-1 px-3 text-xs"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          className="btn-secondary py-1 px-3 text-xs"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Defined outside main component for stable React identity
function RecordPaymentForm({ employees, userRole, allowedBranchId, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState({
    employeeId: '',
    month: currentMonth(),
    amount: '',
    status: 'paid',
    note: '',
  });

  const change = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const selectedEmp = employees.find((e) => e._id === form.employeeId);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, amount: Number(form.amount) });
  };

  // Filter employees by branch for manager
  const availableEmployees =
    userRole === 'manager'
      ? employees.filter(
          (e) => e.branchId === allowedBranchId || e.branchId?._id === allowedBranchId
        )
      : employees;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">
          Employee <span className="text-red-500">*</span>
        </label>
        <CustomSelect
          name="employeeId"
          required
          value={form.employeeId}
          onChange={change}
          className="input-field"
        >
          <option value="">Select employee</option>
          {availableEmployees
            .filter((e) => e.isActive)
            .map((e) => (
              <option key={e._id} value={e._id}>
                {e.name}
                {e.designation ? ` — ${e.designation}` : ''}
              </option>
            ))}
        </CustomSelect>
        {selectedEmp && (
          <p className="text-xs text-gray-400 mt-1">
            Monthly salary: <strong>{fmt(selectedEmp.monthlySalary)}</strong>
          </p>
        )}
      </div>

      <div>
        <label className="label">
          Month <span className="text-red-500">*</span>
        </label>
        <input
          name="month"
          type="month"
          required
          value={form.month}
          onChange={change}
          className="input-field"
        />
        <p className="text-xs text-gray-400 mt-1">
          If a payment already exists for this month, the amount will be added to it.
        </p>
      </div>

      <div>
        <label className="label">
          Amount paid <span className="text-red-500">*</span>
        </label>
        <input
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={form.amount}
          onChange={change}
          className="input-field"
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="label">Status</label>
        <CustomSelect name="status" value={form.status} onChange={change} className="input-field">
          <option value="paid">Paid (full)</option>
          <option value="partial">Partial</option>
          <option value="pending">Pending</option>
        </CustomSelect>
      </div>

      <div>
        <label className="label">Note</label>
        <input
          name="note"
          type="text"
          value={form.note}
          onChange={change}
          className="input-field"
          placeholder="Optional note"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Spinner size="sm" className="mr-2" />}
          Record payment
        </button>
      </div>
    </form>
  );
}

export default function Salary() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [filterBranch, setFilterBranch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');

  const [payOpen, setPayOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [brRes, empRes] = await Promise.all([
          isAdmin ? getBranches() : Promise.resolve({ data: { data: [] } }),
          getEmployees(),
        ]);
        setBranches(brRes.data.data);
        setEmployees(empRes.data.data);
      } catch {
        /* silently continue */
      }
    };
    load();
  }, [isAdmin]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (isAdmin && filterBranch) params.branchId = filterBranch;
      if (filterMonth) params.month = filterMonth;
      if (filterEmployee) params.employeeId = filterEmployee;
      const { data } = await getSalaryPayments(params);
      setPayments(data.data);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load salary payments');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, filterBranch, filterMonth, filterEmployee, page]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleRecord = async (payload) => {
    setSaving(true);
    try {
      const res = await recordSalaryPayment(payload);
      const isNew = res.status === 201;
      toast.success(isNew ? 'Salary payment recorded' : 'Salary payment updated');
      setPayOpen(false);
      setPage(1);
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salary Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track monthly salary payments for each employee
          </p>
        </div>
        <button className="btn-primary" onClick={() => setPayOpen(true)}>
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Record payment
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        {isAdmin && (
          <div>
            <label className="label text-xs">Branch</label>
            <CustomSelect
              value={filterBranch}
              onChange={(e) => {
                setFilterBranch(e.target.value);
                setPage(1);
              }}
              className="input-field w-auto text-sm py-2"
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </CustomSelect>
          </div>
        )}
        <div>
          <label className="label text-xs">Month</label>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value);
              setPage(1);
            }}
            className="input-field text-sm py-2"
          />
        </div>
        <div>
          <label className="label text-xs">Employee</label>
          <CustomSelect
            value={filterEmployee}
            onChange={(e) => {
              setFilterEmployee(e.target.value);
              setPage(1);
            }}
            className="input-field w-auto text-sm py-2"
          >
            <option value="">All employees</option>
            {employees.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name}
              </option>
            ))}
          </CustomSelect>
        </div>
        {(filterBranch || filterMonth || filterEmployee) && (
          <button
            className="btn-secondary text-sm py-2"
            onClick={() => {
              setFilterBranch('');
              setFilterMonth('');
              setFilterEmployee('');
              setPage(1);
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-primary-600" />
          </div>
        ) : payments.length === 0 ? (
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
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-sm">No salary payments found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      'Employee',
                      'Designation',
                      'Month',
                      'Amount Paid',
                      'Monthly Salary',
                      'Paid On',
                      'Status',
                      'Note',
                      'By',
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
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {p.employeeId?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {p.employeeId?.designation || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-mono">{p.month}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {fmt(p.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {fmt(p.employeeId?.monthlySalary)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {fmtd(p.paidOn)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 max-w-[120px] truncate">
                        {p.note || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {p.createdBy ? `${p.createdBy.firstName} ${p.createdBy.lastName}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      <Modal isOpen={payOpen} onClose={() => setPayOpen(false)} title="Record salary payment">
        <RecordPaymentForm
          employees={employees}
          userRole={user?.role}
          allowedBranchId={user?.branchId}
          onSubmit={handleRecord}
          onCancel={() => setPayOpen(false)}
          saving={saving}
        />
      </Modal>
    </div>
  );
}
