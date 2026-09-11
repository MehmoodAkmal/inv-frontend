import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getEmployees } from '../services/employeeService';
import Branches from '../pages/Branches';
import AppUsersStaff from '../pages/AppUsersStaff';

// Mock AuthContext
let mockUser = { role: 'admin', organizationId: 'org1' };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    permissions: {},
    permissionsLoading: false,
  }),
}));

// Mock Branch Service
vi.mock('../services/branchService', () => ({
  getBranches: vi.fn(() => Promise.resolve({
    data: {
      success: true,
      data: [
        { _id: 'b1', name: 'Downtown Branch', address: '123 Main St', isActive: true },
        { _id: 'b2', name: 'Westside Branch', address: '456 West Ave', isActive: false },
      ],
    },
  })),
  createBranch: vi.fn(() => Promise.resolve({ data: { success: true } })),
  updateBranch: vi.fn(() => Promise.resolve({ data: { success: true } })),
  deactivateBranch: vi.fn(() => Promise.resolve({ data: { success: true } })),
}));

// Mock Staff Service
vi.mock('../services/staffService', () => ({
  getStaff: vi.fn(() => Promise.resolve({
    data: {
      success: true,
      data: [
        {
          _id: 's1',
          firstName: 'John',
          lastName: 'Manager',
          email: 'john@example.com',
          role: 'manager',
          isActive: true,
          branchId: { _id: 'b1', name: 'Downtown Branch' },
          updatedAt: new Date().toISOString(),
        },
        {
          _id: 's2',
          firstName: 'Jane',
          lastName: 'Cashier',
          email: 'jane@example.com',
          role: 'cashier',
          isActive: true,
          branchId: { _id: 'b1', name: 'Downtown Branch' },
          updatedAt: new Date().toISOString(),
        },
      ],
    },
  })),
  createStaff: vi.fn(() => Promise.resolve({ data: { success: true } })),
  updateStaff: vi.fn(() => Promise.resolve({ data: { success: true } })),
  deactivateStaff: vi.fn(() => Promise.resolve({ data: { success: true } })),
}));

// Mock Employee Service
vi.mock('../services/employeeService', () => ({
  getEmployees: vi.fn(() => Promise.resolve({
    data: {
      success: true,
      data: [
        {
          _id: 'e1',
          name: 'Bob Worker',
          designation: 'Store Associate',
          branchId: { _id: 'b1', name: 'Downtown Branch' },
          monthlySalary: 3000,
          phone: '+1 555-0100',
          isActive: true,
        },
      ],
    },
  })),
  createEmployee: vi.fn(() => Promise.resolve({ data: { success: true } })),
  updateEmployee: vi.fn(() => Promise.resolve({ data: { success: true } })),
  deactivateEmployee: vi.fn(() => Promise.resolve({ data: { success: true } })),
}));

// Mock Sale Service
vi.mock('../services/saleService', () => ({
  getSales: vi.fn().mockResolvedValue({
    data: {
      success: true,
      data: [
        { _id: 'sale1', branchId: 'b1', totalAmount: 250 },
      ],
    },
  }),
}));

// Mock TopBar, Sidebar, ThemeContext
vi.mock('../components/ui/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>,
  DEFAULT_NAV_GROUPS: [],
}));
vi.mock('../components/ui/TopBar', () => ({
  default: () => <div data-testid="topbar">TopBar</div>,
}));

describe('Branches Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { role: 'admin', organizationId: 'org1' };
  });

  it('redirects non-admin users', () => {
    mockUser = { role: 'cashier', organizationId: 'org1' };
    const { container } = render(
      <MemoryRouter initialEntries={['/branches']}>
        <Branches />
      </MemoryRouter>
    );
    expect(container.innerHTML).not.toContain('Active Retail Branches');
  });

  it('renders card grid and "+ Add Branch" button for admin', async () => {
    render(
      <MemoryRouter initialEntries={['/branches']}>
        <Branches />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Downtown Branch')).toBeDefined();
    });

    expect(screen.getByText('Active Retail Branches')).toBeDefined();
    expect(screen.getByText('+ Add New Branch')).toBeDefined();
    expect(screen.getByText('123 Main St')).toBeDefined();
  });

  it('opens Add Branch modal with Name and Address fields', async () => {
    render(
      <MemoryRouter initialEntries={['/branches']}>
        <Branches />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('+ Add New Branch')).toBeDefined();
    });

    fireEvent.click(screen.getByText('+ Add New Branch'));

    await waitFor(() => {
      expect(screen.getByText('Add New Branch Location')).toBeDefined();
      expect(screen.getByPlaceholderText(/Downtown Flagship/i)).toBeDefined();
      expect(screen.getByPlaceholderText(/104 Market St/i)).toBeDefined();
    });
  });
});

describe('AppUsersStaff Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { role: 'admin', organizationId: 'org1' };
  });

  it('redirects non-admin users', () => {
    mockUser = { role: 'manager', organizationId: 'org1' };
    const { container } = render(
      <MemoryRouter initialEntries={['/staff']}>
        <AppUsersStaff />
      </MemoryRouter>
    );
    expect(container.innerHTML).not.toContain('Staff & User Management');
  });

  it('renders tabs and app users table for admin', async () => {
    render(
      <MemoryRouter initialEntries={['/staff']}>
        <AppUsersStaff />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Staff & User Management')).toBeDefined();
    });

    expect(screen.getByText('App Users (Login Access)')).toBeDefined();
    expect(screen.getByText('Employees (Salaried)')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('John Manager')).toBeDefined();
      expect(screen.getByText('Jane Cashier')).toBeDefined();
    });
  });

  it('Add Staff modal restricts roles strictly to cashier and manager', async () => {
    render(
      <MemoryRouter initialEntries={['/staff']}>
        <AppUsersStaff />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Add Staff User')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Add Staff User'));

    await waitFor(() => {
      expect(screen.getByText('Add New Portal Staff User')).toBeDefined();
    });

    // Check role options: must have cashier and manager, NEVER admin or superAdmin
    const cashierOption = screen.getByText('Cashier (Point of Sale)');
    const managerOption = screen.getByText('Manager (Branch Lead)');
    expect(cashierOption).toBeDefined();
    expect(managerOption).toBeDefined();

    expect(screen.queryByText(/Super Admin/i)).toBeNull();
    expect(screen.queryByText(/Administrator/i)).toBeNull();
  });

  it('switches to Employees tab and renders employee data with active toggle and Add Employee modal', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/staff']}>
        <AppUsersStaff />
      </MemoryRouter>
    );

    const testRes = await getEmployees();
    expect(testRes?.data?.data?.[0]?.name).toBe('Bob Worker');

    await waitFor(() => {
      expect(getEmployees).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Employees (Salaried)')).toBeDefined();
    });

    // Switch to Employees tab
    fireEvent.click(screen.getByText('Employees (Salaried)'));

    await waitFor(() => {
      expect(screen.getByText('Bob Worker')).toBeDefined();
      expect(screen.getByText('Store Associate')).toBeDefined();
      expect(screen.getAllByText('$3,000.00').length).toBeGreaterThanOrEqual(1);
    });

    // Verify Add Employee button & modal
    expect(screen.getByText('Add Employee')).toBeDefined();
    fireEvent.click(screen.getByText('Add Employee'));

    await waitFor(() => {
      expect(screen.getByText('Add New Salaried Employee')).toBeDefined();
      expect(screen.getByPlaceholderText('e.g. Alex Morgan')).toBeDefined();
      expect(screen.getByPlaceholderText('0.00')).toBeDefined();
    });
  });
});
