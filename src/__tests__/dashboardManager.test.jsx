import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import Sidebar from '../components/ui/Sidebar';
import TopBar from '../components/ui/TopBar';

// Mock AuthContext
let mockUser = {
  id: 'u1',
  firstName: 'Alice',
  lastName: 'Manager',
  email: 'alice@example.com',
  role: 'manager',
  organizationId: 'org1',
  branchId: { _id: 'b1', name: 'Downtown Branch' },
};

let mockPermissions = {
  sales: { view: true },
  stock: { view: true },
  expenses: { view: true },
  salary: { view: true },
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    permissions: mockPermissions,
    permissionsLoading: false,
    logout: vi.fn(),
  }),
}));

// Mock Branch Service
vi.mock('../services/branchService', () => ({
  getBranches: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        data: [
          { _id: 'b1', name: 'Downtown Branch', address: '123 Main St', isActive: true },
          { _id: 'b2', name: 'Westside Branch', address: '456 West Ave', isActive: true },
        ],
      },
    })
  ),
  getBranchById: vi.fn((id) =>
    Promise.resolve({
      data: {
        success: true,
        data: { _id: id, name: id === 'b1' ? 'Downtown Branch' : 'Westside Branch' },
      },
    })
  ),
}));

// Mock Report Service
vi.mock('../services/reportService', () => ({
  getDashboardSummary: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        data: {
          today: { totalAmount: 1250, cashSales: 1000, creditSales: 250, saleCount: 8 },
          yesterday: { totalAmount: 1100 },
          thisMonth: { totalAmount: 32000, saleCount: 140 },
          outstandingCreditTotal: 4500,
          lowStockItemCount: 3,
        },
      },
    })
  ),
}));

// Mock Sale Service
vi.mock('../services/saleService', () => ({
  getSales: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        data: [
          {
            _id: 'sale001',
            invoiceNumber: 'INV-1001',
            createdAt: '2026-09-12T10:00:00Z',
            branchId: 'b1',
            branchName: 'Downtown Branch',
            customerId: { name: 'Acme Corp' },
            items: [{ itemId: 'it1', quantity: 2 }],
            paymentType: 'cash',
            totalAmount: 450,
          },
        ],
      },
    })
  ),
}));

// Mock Item Service
vi.mock('../services/itemService', () => ({
  getItems: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        data: [{ _id: 'it1', name: 'Item 1' }, { _id: 'it2', name: 'Item 2' }],
      },
    })
  ),
}));

// Mock Expense Service
vi.mock('../services/expenseService', () => ({
  getExpenses: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        data: [{ _id: 'exp1', amount: 350 }],
      },
    })
  ),
}));

// Mock Salary Service
vi.mock('../services/salaryService', () => ({
  getSalaryPayments: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        data: [{ _id: 'sal1', status: 'paid' }],
      },
    })
  ),
}));

describe('Manager Role Dashboard & Navigation', () => {
  beforeEach(() => {
    mockUser = {
      id: 'u1',
      firstName: 'Alice',
      lastName: 'Manager',
      email: 'alice@example.com',
      role: 'manager',
      organizationId: 'org1',
      branchId: { _id: 'b1', name: 'Downtown Branch' },
    };
  });

  describe('TopBar for Manager', () => {
    it('renders a static, non-clickable branch name label displaying assigned branch', async () => {
      render(
        <MemoryRouter>
          <TopBar />
        </MemoryRouter>
      );

      const label = screen.getByTestId('manager-branch-label');
      expect(label).toBeInTheDocument();
      expect(label).toHaveTextContent('Downtown Branch');
      expect(label).not.toHaveAttribute('role', 'button');
      expect(label.tagName.toLowerCase()).toBe('div');
    });

    it('renders branch selector or default when user is admin', async () => {
      mockUser = {
        id: 'u2',
        firstName: 'Bob',
        lastName: 'Admin',
        email: 'bob@example.com',
        role: 'admin',
        organizationId: 'org1',
      };

      render(
        <MemoryRouter>
          <TopBar />
        </MemoryRouter>
      );

      expect(screen.queryByTestId('manager-branch-label')).not.toBeInTheDocument();
    });
  });

  describe('Sidebar Navigation Array for Manager', () => {
    it('completely hides "Branch Comparison", "Branches", and "App Users & Staff" nav items for manager', () => {
      mockUser = {
        id: 'u1',
        firstName: 'Alice',
        lastName: 'Manager',
        email: 'alice@example.com',
        role: 'manager',
        organizationId: 'org1',
        branchId: { _id: 'b1', name: 'Downtown Branch' },
      };

      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      expect(screen.queryByText('Branch Comparison')).not.toBeInTheDocument();
      expect(screen.queryByText('Branches')).not.toBeInTheDocument();
      expect(screen.queryByText('App Users & Staff')).not.toBeInTheDocument();

      // Manager-allowed items should be visible
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Sales Register')).toBeInTheDocument();
      expect(screen.getByText('Stock & Inventory')).toBeInTheDocument();
      expect(screen.getByText('Expenses')).toBeInTheDocument();
      expect(screen.getByText('Salary/Payroll')).toBeInTheDocument();
    });

    it('renders "Branch Comparison", "Branches", and "App Users & Staff" for admin', () => {
      mockUser = {
        id: 'u2',
        firstName: 'Bob',
        lastName: 'Admin',
        email: 'bob@example.com',
        role: 'admin',
        organizationId: 'org1',
      };

      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      );

      expect(screen.getByText('Branch Comparison')).toBeInTheDocument();
      expect(screen.getByText('Branches')).toBeInTheDocument();
      expect(screen.getByText('App Users & Staff')).toBeInTheDocument();
    });
  });

  describe('Dashboard Page Role-Conditional Rendering', () => {
    it('omits the "Branch" column from Recent Sales Transactions table for manager', async () => {
      mockUser = {
        id: 'u1',
        firstName: 'Alice',
        lastName: 'Manager',
        email: 'alice@example.com',
        role: 'manager',
        organizationId: 'org1',
        branchId: { _id: 'b1', name: 'Downtown Branch' },
      };

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      // Wait for table data to render
      await waitFor(() => {
        expect(screen.getByText('INV-1001')).toBeInTheDocument();
      });

      // Headers check
      expect(screen.getByText('Invoice #')).toBeInTheDocument();
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
      expect(screen.getByText('Customer')).toBeInTheDocument();
      expect(screen.getByText('Payment Mode')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();

      // "Branch" column header must NOT be present in table
      const tableHeaders = screen.getAllByRole('columnheader');
      const headerLabels = tableHeaders.map((th) => th.textContent?.trim());
      expect(headerLabels).not.toContain('Branch');

      // Assigned branch tile is shown without link to /branches
      expect(screen.getByText('Assigned Branch')).toBeInTheDocument();
      const branchLinks = screen.queryAllByRole('link', { name: /branches/i });
      expect(branchLinks).toHaveLength(0);
    });

    it('includes the "Branch" column in Recent Sales Transactions table for admin', async () => {
      mockUser = {
        id: 'u2',
        firstName: 'Bob',
        lastName: 'Admin',
        email: 'bob@example.com',
        role: 'admin',
        organizationId: 'org1',
      };

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('INV-1001')).toBeInTheDocument();
      });

      const tableHeaders = screen.getAllByRole('columnheader');
      const headerLabels = tableHeaders.map((th) => th.textContent?.trim());
      expect(headerLabels).toContain('Branch');

      // Admin has the link(s) to /branches (Sidebar and/or Dashboard tile)
      const branchLinks = screen.getAllByRole('link', { name: /branches/i });
      expect(branchLinks.length).toBeGreaterThanOrEqual(1);
      branchLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', '/branches');
      });
    });
  });
});
