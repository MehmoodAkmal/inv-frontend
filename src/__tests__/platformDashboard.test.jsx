import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';

import PlatformDashboard from '../pages/superadmin/PlatformDashboard';
import Sidebar, { SUPERADMIN_NAV_GROUPS } from '../components/ui/Sidebar';
import TopBar from '../components/ui/TopBar';
import SuperAdminLayout from '../components/layout/SuperAdminLayout';
import RoleRoute from '../components/layout/RoleRoute';

// Mock Recharts ResponsiveContainer to render children directly in jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="recharts-responsive-container" style={{ width: 500, height: 300 }}>
        {children}
      </div>
    ),
  };
});

// Mock AuthContext
let mockUser = {
  id: 'sa1',
  firstName: 'Super',
  lastName: 'Admin',
  email: 'superadmin@platform.com',
  role: 'superAdmin',
};

let mockPermissions = {};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    permissions: mockPermissions,
    permissionsLoading: false,
    logout: vi.fn(),
  }),
}));

// Mock Organization Service
const mockPlatformStats = {
  totalOrganizations: 42,
  activeOrganizations: 38,
  suspendedOrganizations: 4,
  newOrganizationsThisMonth: 9,
  totalUsers: 320,
  totalBranches: 85,
};

const mockOrganizationsList = [
  {
    _id: 'org_1001',
    name: 'Apex Retailers',
    subscriptionPlan: 'pro',
    isActive: true,
    branchCount: 5,
    userCount: 22,
    createdAt: '2026-01-15T08:30:00.000Z',
    maxBranches: 10,
  },
  {
    _id: 'org_1002',
    name: 'Beacon Superstore',
    subscriptionPlan: 'basic',
    isActive: false,
    branchCount: 2,
    userCount: 8,
    createdAt: '2026-02-10T12:00:00.000Z',
    maxBranches: 3,
  },
];

const mockSignupTrendData = [
  { date: '2026-08-15', count: 2 },
  { date: '2026-08-16', count: 4 },
  { date: '2026-08-17', count: 1 },
];

const mockActiveOrgsData = [
  { organizationName: 'Apex Retailers', saleCount: 1450, totalRevenue: 98000 }, // Has unexpected totalRevenue to verify sanitization
  { organizationName: 'Cascade Supplies', saleCount: 890, totalProfit: 45000 },
];

vi.mock('../services/organizationService', () => ({
  getPlatformStats: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        data: mockPlatformStats,
      },
    })
  ),
  getAdminOrganizations: vi.fn((params) =>
    Promise.resolve({
      data: {
        success: true,
        data: mockOrganizationsList,
        pagination: { total: 2, totalPages: 1, page: 1, limit: 15 },
      },
    })
  ),
  getOrganizationDetail: vi.fn((id) =>
    Promise.resolve({
      data: {
        success: true,
        data: {
          ...mockOrganizationsList[0],
          _id: id,
        },
      },
    })
  ),
  toggleOrganizationStatus: vi.fn((id) =>
    Promise.resolve({
      data: {
        success: true,
        data: { _id: id, isActive: false },
      },
    })
  ),
  updateOrganizationPlan: vi.fn((id, data) =>
    Promise.resolve({
      data: {
        success: true,
        data: { _id: id, ...data },
      },
    })
  ),
  getSignupTrend: vi.fn((params) =>
    Promise.resolve({
      data: {
        success: true,
        data: mockSignupTrendData,
      },
    })
  ),
  getMostActiveOrgs: vi.fn((params) =>
    Promise.resolve({
      data: {
        success: true,
        data: mockActiveOrgsData,
      },
    })
  ),
}));

import {
  getPlatformStats,
  getAdminOrganizations,
  toggleOrganizationStatus,
  getSignupTrend,
  getMostActiveOrgs,
} from '../services/organizationService';

describe('SuperAdmin Platform Section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: 'sa1',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@platform.com',
      role: 'superAdmin',
    };
    mockPermissions = {};
  });

  describe('Sidebar Navigation Isolation', () => {
    it('renders strictly superAdmin navigation items and no business items', () => {
      render(
        <MemoryRouter initialEntries={['/superadmin']}>
          <Sidebar />
        </MemoryRouter>
      );

      // Verify superAdmin items exist
      expect(screen.getByText('Platform Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Organizations')).toBeInTheDocument();
      expect(screen.getByText('Signup Trends')).toBeInTheDocument();
      expect(screen.getByText('Activity')).toBeInTheDocument();

      // Verify ZERO business items exist anywhere in superAdmin navigation
      expect(screen.queryByText('Sales Register')).not.toBeInTheDocument();
      expect(screen.queryByText('Stock & Inventory')).not.toBeInTheDocument();
      expect(screen.queryByText('Purchase Entry')).not.toBeInTheDocument();
      expect(screen.queryByText('Customer Ledgers')).not.toBeInTheDocument();
      expect(screen.queryByText('Expenses')).not.toBeInTheDocument();
      expect(screen.queryByText('Salary/Payroll')).not.toBeInTheDocument();
      expect(screen.queryByText('Branches')).not.toBeInTheDocument();
      expect(screen.queryByText('Profit & Loss')).not.toBeInTheDocument();
      expect(screen.queryByText('Items Catalog')).not.toBeInTheDocument();
      expect(screen.queryByText('Categories')).not.toBeInTheDocument();
      expect(screen.queryByText('Branch Comparison')).not.toBeInTheDocument();
    });

    it('SUPERADMIN_NAV_GROUPS contains only the 4 required platform links', () => {
      const items = SUPERADMIN_NAV_GROUPS.flatMap((g) => g.items);
      const labels = items.map((i) => i.label);
      expect(labels).toEqual([
        'Platform Dashboard',
        'Organizations',
        'Signup Trends',
        'Activity',
      ]);
    });
  });

  describe('TopBar for superAdmin', () => {
    it('replaces branch selector with organization search input and hides generic quick search', () => {
      render(
        <MemoryRouter>
          <TopBar />
        </MemoryRouter>
      );

      // Organization search input must be present
      const searchInput = screen.getByTestId('org-search-topbar');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('placeholder', 'Search organizations...');

      // No branch selector or branch labels
      expect(screen.queryByTestId('manager-branch-label')).not.toBeInTheDocument();
      expect(screen.queryByText(/Branch:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Main Branch/i)).not.toBeInTheDocument();

      // Generic quick search should be suppressed
      expect(screen.queryByPlaceholderText(/Quick search\.\.\. \(Press ⌘K\)/i)).not.toBeInTheDocument();
    });
  });

  describe('PlatformDashboard Component', () => {
    it('renders all 5 StatCards from GET /admin/stats', async () => {
      render(
        <MemoryRouter initialEntries={['/superadmin']}>
          <PlatformDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(getPlatformStats).toHaveBeenCalled();
      });

      // Verify the 5 StatCards are rendered with correct values
      expect(screen.getByText('Total Organizations')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();

      expect(screen.getByText('Active Organizations')).toBeInTheDocument();
      expect(screen.getAllByText('38').length).toBeGreaterThanOrEqual(1);

      expect(screen.getByText('New Signups This Month')).toBeInTheDocument();
      expect(screen.getByText('9')).toBeInTheDocument();

      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('320')).toBeInTheDocument();

      expect(screen.getByText('Total Branches')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    it('renders Organizations DataTable with correct columns and data', async () => {
      render(
        <MemoryRouter initialEntries={['/superadmin']}>
          <PlatformDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(getAdminOrganizations).toHaveBeenCalled();
      });

      // Organizations names
      expect(screen.getByText('Apex Retailers')).toBeInTheDocument();
      expect(screen.getByText('Beacon Superstore')).toBeInTheDocument();

      // Plan Badges
      expect(screen.getByText('PRO')).toBeInTheDocument();
      expect(screen.getByText('BASIC')).toBeInTheDocument();

      // Status Badges
      expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Suspended').length).toBeGreaterThanOrEqual(1);

      // View Details buttons
      const viewDetailsButtons = screen.getAllByText('View Details');
      expect(viewDetailsButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('calls toggleOrganizationStatus when clicking status switch', async () => {
      render(
        <MemoryRouter initialEntries={['/superadmin']}>
          <PlatformDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Apex Retailers')).toBeInTheDocument();
      });

      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThanOrEqual(2);

      // Toggle first org
      fireEvent.click(switches[0]);

      await waitFor(() => {
        expect(toggleOrganizationStatus).toHaveBeenCalledWith('org_1001');
      });
    });

    it('renders Signup Trend chart with 30/90 days toggle and triggers fetch on toggle', async () => {
      render(
        <MemoryRouter initialEntries={['/superadmin']}>
          <PlatformDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(getSignupTrend).toHaveBeenCalledWith({ days: 30 });
      });

      expect(screen.getByText('Tenant Signup Velocity')).toBeInTheDocument();
      const btn30 = screen.getByRole('button', { name: '30 Days' });
      const btn90 = screen.getByRole('button', { name: '90 Days' });
      expect(btn30).toBeInTheDocument();
      expect(btn90).toBeInTheDocument();

      // Click 90 Days toggle
      fireEvent.click(btn90);

      await waitFor(() => {
        expect(getSignupTrend).toHaveBeenCalledWith({ days: 90 });
      });
    });

    it('renders Most Active Organizations bar chart with saleCount and mandatory privacy caption', async () => {
      render(
        <MemoryRouter initialEntries={['/superadmin']}>
          <PlatformDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(getMostActiveOrgs).toHaveBeenCalled();
      });

      expect(screen.getByText('Most Active Organizations')).toBeInTheDocument();

      // Check mandatory privacy caption
      const privacyCaption = screen.getByText(
        'Financial data is private to each organization and not shown here.'
      );
      expect(privacyCaption).toBeInTheDocument();

      // STRICT PRIVACY CHECK: Verify no monetary figures ($98,000, 98000, $45,000) are rendered
      expect(screen.queryByText(/98000/)).not.toBeInTheDocument();
      expect(screen.queryByText(/\$98,000/)).not.toBeInTheDocument();
      expect(screen.queryByText(/45000/)).not.toBeInTheDocument();
      expect(screen.queryByText(/\$45,000/)).not.toBeInTheDocument();
      expect(screen.queryByText(/\$0/)).not.toBeInTheDocument();
    });

    it('updates search query from TopBar and filters organizations', async () => {
      render(
        <MemoryRouter initialEntries={['/superadmin']}>
          <PlatformDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(getAdminOrganizations).toHaveBeenCalled();
      });

      const searchInput = screen.getByTestId('org-search-topbar');
      fireEvent.change(searchInput, { target: { value: 'Apex' } });

      await waitFor(() => {
        expect(getAdminOrganizations).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'Apex' })
        );
      });
    });
  });

  describe('Route-Level Protection', () => {
    it('redirects admin role away from /superadmin to /dashboard', () => {
      mockUser = { id: 'a1', role: 'admin' };

      render(
        <MemoryRouter initialEntries={['/superadmin']}>
          <Routes>
            <Route element={<RoleRoute allowedRoles={['superAdmin']} />}>
              <Route path="/superadmin" element={<PlatformDashboard />} />
            </Route>
            <Route path="/dashboard" element={<div data-testid="admin-dashboard-view">Admin Dashboard</div>} />
            <Route path="/pos" element={<div data-testid="pos-view">POS View</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('admin-dashboard-view')).toBeInTheDocument();
      expect(screen.queryByText('Platform Dashboard')).not.toBeInTheDocument();
    });

    it('redirects manager role away from /superadmin to /dashboard', () => {
      mockUser = { id: 'm1', role: 'manager' };

      render(
        <MemoryRouter initialEntries={['/superadmin']}>
          <Routes>
            <Route element={<RoleRoute allowedRoles={['superAdmin']} />}>
              <Route path="/superadmin" element={<PlatformDashboard />} />
            </Route>
            <Route path="/dashboard" element={<div data-testid="manager-dashboard-view">Manager Dashboard</div>} />
            <Route path="/pos" element={<div data-testid="pos-view">POS View</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('manager-dashboard-view')).toBeInTheDocument();
      expect(screen.queryByText('Platform Dashboard')).not.toBeInTheDocument();
    });

    it('redirects cashier role away from /superadmin to /pos', () => {
      mockUser = { id: 'c1', role: 'cashier' };

      render(
        <MemoryRouter initialEntries={['/superadmin/organizations']}>
          <Routes>
            <Route element={<RoleRoute allowedRoles={['superAdmin']} />}>
              <Route path="/superadmin/organizations" element={<PlatformDashboard />} />
            </Route>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
            <Route path="/pos" element={<div data-testid="cashier-pos-view">Cashier POS</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('cashier-pos-view')).toBeInTheDocument();
      expect(screen.queryByText('Organizations Directory')).not.toBeInTheDocument();
    });

    it('redirects unauthenticated user to /login', () => {
      mockUser = null;

      render(
        <MemoryRouter initialEntries={['/superadmin']}>
          <Routes>
            <Route element={<RoleRoute allowedRoles={['superAdmin']} />}>
              <Route path="/superadmin" element={<PlatformDashboard />} />
            </Route>
            <Route path="/login" element={<div data-testid="login-view">Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('login-view')).toBeInTheDocument();
    });
  });

  describe('Distinct SuperAdmin Sidebar Views', () => {
    it('renders Organizations view with dedicated title and table, omitting telemetry charts', async () => {
      render(
        <MemoryRouter initialEntries={['/superadmin/organizations']}>
          <PlatformDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(getAdminOrganizations).toHaveBeenCalled();
      });

      // Dedicated title
      expect(screen.getAllByText('Organizations Directory').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Apex Retailers')).toBeInTheDocument();

      // Telemetry charts should NOT be rendered in this view
      expect(screen.queryByText('Tenant Signup Velocity')).not.toBeInTheDocument();
    });

    it('renders Signup Trends view with dedicated title and chart, omitting organizations table', async () => {
      render(
        <MemoryRouter initialEntries={['/superadmin/signup-trends']}>
          <PlatformDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(getSignupTrend).toHaveBeenCalled();
      });

      // Dedicated title and charts
      expect(screen.getByText('Signup Trends & Onboarding Velocity')).toBeInTheDocument();
      expect(screen.getByText('Tenant Signup Velocity')).toBeInTheDocument();
      expect(screen.getByText('Daily Onboarding Telemetry')).toBeInTheDocument();

      // Organizations directory table should NOT be rendered in this view
      expect(screen.queryByText('Organizations Directory')).not.toBeInTheDocument();
      expect(screen.queryByText('Beacon Superstore')).not.toBeInTheDocument();
    });

    it('renders Activity view with dedicated title, bar chart, and privacy caption, omitting organizations table', async () => {
      render(
        <MemoryRouter initialEntries={['/superadmin/activity']}>
          <PlatformDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(getMostActiveOrgs).toHaveBeenCalled();
      });

      // Dedicated title, chart, and privacy note
      expect(screen.getByText('Platform Activity & Tenant Usage')).toBeInTheDocument();
      expect(screen.getByText('Most Active Organizations')).toBeInTheDocument();
      expect(screen.getByText('Top Active Tenants Leaderboard')).toBeInTheDocument();
      expect(
        screen.getByText('Financial data is private to each organization and not shown here.')
      ).toBeInTheDocument();

      // Signup trends chart should NOT be rendered in this view
      expect(screen.queryByText('Tenant Signup Velocity')).not.toBeInTheDocument();
      // Organizations directory table should NOT be rendered in this view
      expect(screen.queryByText('Organizations Directory')).not.toBeInTheDocument();
      expect(screen.queryByText('Beacon Superstore')).not.toBeInTheDocument();
    });
  });
});
