import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccountSettings from '../pages/AccountSettings';

let mockUser = {
  id: 'u1',
  firstName: 'Test',
  lastName: 'Admin',
  email: 'admin@test.com',
  role: 'admin',
  organizationId: 'org1',
  branchId: 'b1',
};

const mockUpdateUser = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    updateUser: mockUpdateUser,
    permissions: { sales: { create: true } },
  }),
}));

vi.mock('../services/accountService', () => ({
  getAccountProfile: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        data: {
          user: {
            id: 'u1',
            firstName: 'Test',
            lastName: 'Admin',
            email: 'admin@test.com',
            phone: '03001234567',
            role: 'admin',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          branch: {
            id: 'b1',
            name: 'Downtown Main Branch',
            address: '123 Main St',
          },
          organization: {
            id: 'org1',
            name: 'Apex Superstore',
            currency: { code: 'PKR', symbol: 'Rs.' },
            subscriptionPlan: 'pro',
            maxBranches: 5,
          },
          employee: null,
        },
      },
    })
  ),
  updateAccountProfile: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        user: {
          id: 'u1',
          firstName: 'Updated',
          lastName: 'Name',
          email: 'admin@test.com',
        },
      },
    })
  ),
  changePassword: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        message: 'Password changed successfully',
      },
    })
  ),
  updateOrganizationSettings: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        organization: {
          id: 'org1',
          name: 'Apex Retail Group',
          currency: { code: 'USD', symbol: '$' },
        },
      },
    })
  ),
}));

describe('AccountSettings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: 'u1',
      firstName: 'Test',
      lastName: 'Admin',
      email: 'admin@test.com',
      role: 'admin',
      organizationId: 'org1',
    };
  });

  it('renders personal profile form with loaded data for admin', async () => {
    render(
      <MemoryRouter>
        <AccountSettings />
      </MemoryRouter>
    );

    expect(screen.getByText('Account Settings')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Admin')).toBeInTheDocument();
      expect(screen.getByDisplayValue('admin@test.com')).toBeInTheDocument();
    });

    // Admin should see Organization & Business tab
    expect(screen.getByText('Organization & Business')).toBeInTheDocument();
    expect(screen.getByText('Security & Password')).toBeInTheDocument();
  });

  it('switches to Security & Password tab and shows password fields', async () => {
    render(
      <MemoryRouter>
        <AccountSettings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Security & Password')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Security & Password'));

    expect(screen.getByPlaceholderText('Enter your current password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Minimum 6 characters')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Repeat new password')).toBeInTheDocument();
  });

  it('switches to Organization & Business tab for admin and displays currency presets', async () => {
    render(
      <MemoryRouter>
        <AccountSettings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Organization & Business')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Organization & Business'));

    expect(screen.getByDisplayValue('Apex Superstore')).toBeInTheDocument();
    expect(screen.getByText('Default Currency Preset')).toBeInTheDocument();
    expect(screen.getByText(/Pakistani Rupee/i)).toBeInTheDocument();
  });

  it('renders Work & Employment tab for cashier and shows Back to POS button', async () => {
    mockUser = {
      id: 'c1',
      firstName: 'Jane',
      lastName: 'Cashier',
      email: 'cashier@test.com',
      role: 'cashier',
      branchId: 'b1',
    };

    render(
      <MemoryRouter>
        <AccountSettings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Back to POS Register')).toBeInTheDocument();
      expect(screen.getByText('Work & Employment')).toBeInTheDocument();
    });

    // Cashier should NOT see Organization & Business tab
    expect(screen.queryByText('Organization & Business')).not.toBeInTheDocument();
  });
});
