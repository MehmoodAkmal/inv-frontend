import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import MinimalLayout, { CASHIER_NAV_ITEMS } from '../components/layout/MinimalLayout';
import CashierPOS from '../pages/CashierPOS';
import CashierSalesHistory from '../pages/CashierSalesHistory';
import CashierStockLookup from '../pages/CashierStockLookup';
import Login from '../pages/Login';
import * as saleService from '../services/saleService';

// Mock AuthContext
let mockUser = {
  id: 'u_cashier_1',
  firstName: 'Sam',
  lastName: 'Cashier',
  role: 'cashier',
  branchId: { _id: 'b1', name: 'Downtown Branch' },
};
const mockLogout = vi.fn();
const mockLogin = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    login: mockLogin,
    logout: mockLogout,
    permissions: {},
    permissionsLoading: false,
  }),
}));

// Mock Items Service
const mockItems = [
  {
    _id: 'item1',
    name: 'Organic Espresso Beans 1kg',
    sku: 'COF-ESP-001',
    unit: 'bag',
    sellingPrice: 18.5,
    costPrice: 10,
    reorderLevel: 5,
    categoryId: { _id: 'cat1', name: 'Beverages' },
  },
  {
    _id: 'item2',
    name: 'Almond Milk 1L',
    sku: 'MLK-ALM-002',
    unit: 'carton',
    sellingPrice: 4.25,
    costPrice: 2.5,
    reorderLevel: 10,
    categoryId: { _id: 'cat1', name: 'Beverages' },
  },
];

vi.mock('../services/itemService', () => ({
  getItems: vi.fn(() => Promise.resolve({
    data: { success: true, data: mockItems },
  })),
}));

// Mock Stock Service
const mockStock = [
  {
    _id: 'stk1',
    itemId: mockItems[0],
    quantity: 40,
    branchId: { _id: 'b1', name: 'Downtown Branch' },
  },
  {
    _id: 'stk2',
    itemId: mockItems[1],
    quantity: 8, // low stock (reorderLevel is 10)
    branchId: { _id: 'b1', name: 'Downtown Branch' },
  },
];

vi.mock('../services/stockService', () => ({
  getStock: vi.fn(() => Promise.resolve({
    data: { success: true, data: mockStock },
  })),
}));

// Mock Categories Service
vi.mock('../services/categoryService', () => ({
  getCategories: vi.fn(() => Promise.resolve({
    data: {
      success: true,
      data: [{ _id: 'cat1', name: 'Beverages' }],
    },
  })),
}));

// Mock Customer Service
const mockCustomers = [
  {
    _id: 'cust1',
    name: 'Alice Johnson',
    phone: '+1 555-0199',
    currentBalance: 50.0,
  },
];

vi.mock('../services/customerService', () => ({
  getCustomers: vi.fn(() => Promise.resolve({
    data: { success: true, data: mockCustomers },
  })),
  createCustomer: vi.fn((data) => Promise.resolve({
    data: {
      success: true,
      data: { _id: 'cust2', ...data, currentBalance: 0 },
    },
  })),
}));

// Mock Sales Service
const mockSales = [
  {
    _id: 'sale_101',
    createdAt: new Date().toISOString(),
    paymentType: 'cash',
    totalAmount: 18.5,
    subtotal: 18.5,
    discount: 0,
    amountPaid: 18.5,
    customerId: null,
    items: [
      {
        itemId: 'item1',
        itemName: 'Organic Espresso Beans 1kg',
        quantity: 1,
        sellingPrice: 18.5,
        lineTotal: 18.5,
      },
    ],
  },
];

vi.mock('../services/saleService', () => ({
  getSales: vi.fn(() => Promise.resolve({
    data: { success: true, data: mockSales },
  })),
  getSaleById: vi.fn((id) => Promise.resolve({
    data: {
      success: true,
      data: mockSales.find((s) => s._id === id) || mockSales[0],
    },
  })),
  createSale: vi.fn((payload) => Promise.resolve({
    data: {
      success: true,
      data: {
        _id: 'sale_new_999',
        ...payload,
        totalAmount: payload.amountPaid,
        createdAt: new Date().toISOString(),
      },
    },
  })),
}));

describe('MinimalLayout (Cashier Variant)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: 'u_cashier_1',
      firstName: 'Sam',
      lastName: 'Cashier',
      role: 'cashier',
      branchId: { _id: 'b1', name: 'Downtown Branch' },
    };
  });

  it('renders strictly the 3 cashier navigation items', () => {
    render(
      <MemoryRouter initialEntries={['/pos']}>
        <MinimalLayout>
          <div>Terminal Outlet</div>
        </MinimalLayout>
      </MemoryRouter>
    );

    // Verify 3 nav items
    expect(screen.getAllByText('New Sale').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sales History').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Stock Lookup').length).toBeGreaterThanOrEqual(1);

    // Verify branch badge & cashier profile
    expect(screen.getByText('Downtown Branch')).toBeDefined();
    expect(screen.getByText(/Sam/i)).toBeDefined();

    // Strict requirement: NO administrative navigation items anywhere in this layout
    expect(screen.queryByText(/Branches/i)).toBeNull();
    expect(screen.queryByText(/Staff/i)).toBeNull();
    expect(screen.queryByText(/Reports/i)).toBeNull();
    expect(screen.queryByText(/Expenses/i)).toBeNull();
    expect(screen.queryByText(/Payroll/i)).toBeNull();
    expect(screen.queryByText(/Permissions/i)).toBeNull();
  });
});

describe('Cashier Login Redirection', () => {
  it('redirects cashier users to /pos upon login', async () => {
    mockLogin.mockResolvedValueOnce({
      user: {
        id: 'u_cashier_1',
        firstName: 'Sam',
        role: 'cashier',
      },
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/pos" element={<div data-testid="pos-screen">Cashier POS Screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'cashier@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Secret123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByTestId('pos-screen')).toBeDefined();
    });
  });
});

describe('CashierPOS Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: 'u_cashier_1',
      firstName: 'Sam',
      lastName: 'Cashier',
      role: 'cashier',
      branchId: { _id: 'b1', name: 'Downtown Branch' },
    };
  });

  it('renders search bar, item cards with prices and stock badges', async () => {
    render(
      <MemoryRouter initialEntries={['/pos']}>
        <CashierPOS />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Organic Espresso Beans 1kg')).toBeDefined();
      expect(screen.getByText('Almond Milk 1L')).toBeDefined();
    });

    // Check prices
    expect(screen.getByText('$18.50')).toBeDefined();
    expect(screen.getByText('$4.25')).toBeDefined();

    // Check stock badges
    expect(screen.getByText('40 bag')).toBeDefined();
    expect(screen.getByText('8 carton')).toBeDefined();

    // Empty cart initial state
    expect(screen.getByText('Cart is Empty')).toBeDefined();
    expect(screen.getByText('Complete Sale • $0.00')).toBeDefined();
  });

  it('adds items to cart, updates quantity with steppers, and computes running total', async () => {
    render(
      <MemoryRouter initialEntries={['/pos']}>
        <CashierPOS />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Organic Espresso Beans 1kg')).toBeDefined();
    });

    // Add first item by clicking its card
    fireEvent.click(screen.getByText('Organic Espresso Beans 1kg'));

    await waitFor(() => {
      expect(screen.queryByText('Cart is Empty')).toBeNull();
      // Running total header and button
      expect(screen.getAllByText('$18.50').length).toBeGreaterThanOrEqual(1);
    });

    // Tap "+" stepper in cart
    const plusBtn = screen.getByTitle('Increase quantity');
    fireEvent.click(plusBtn);

    // Quantity should now be 2, subtotal 18.50 * 2 = 37.00
    await waitFor(() => {
      expect(screen.getAllByText('$37.00').length).toBeGreaterThanOrEqual(1);
    });

    // Tap "-" stepper in cart
    const minusBtn = screen.getByTitle('Decrease quantity');
    fireEvent.click(minusBtn);

    // Quantity back to 1
    await waitFor(() => {
      expect(screen.getAllByText('$18.50').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('handles barcode scanner simulation via Enter key on SKU search', async () => {
    render(
      <MemoryRouter initialEntries={['/pos']}>
        <CashierPOS />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Almond Milk 1L')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Scan barcode/i);

    // Simulate scanning SKU: "MLK-ALM-002" + Enter
    fireEvent.change(searchInput, { target: { value: 'MLK-ALM-002' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      // Almond Milk added to cart with price $4.25
      expect(screen.getAllByText('$4.25').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('toggles Cash/Credit and enforces customer selection for credit sales', async () => {
    render(
      <MemoryRouter initialEntries={['/pos']}>
        <CashierPOS />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Organic Espresso Beans 1kg')).toBeDefined();
    });

    // Add item to cart
    fireEvent.click(screen.getByText('Organic Espresso Beans 1kg'));

    await waitFor(() => {
      expect(screen.getByText('Cash Payment')).toBeDefined();
      expect(screen.getByText('Credit Account')).toBeDefined();
    });

    // Switch to Credit
    fireEvent.click(screen.getByText('Credit Account'));

    // Validation warning should now appear: "Please select a customer for credit sales"
    await waitFor(() => {
      expect(screen.getByText(/Please select a customer for credit sales/i)).toBeDefined();
    });

    // Complete Sale button should be disabled
    const completeBtn = screen.getByRole('button', { name: /Complete Sale/i });
    expect(completeBtn).toBeDisabled();

    // Select customer
    const custInput = screen.getByPlaceholderText(/Type customer name/i);
    fireEvent.focus(custInput);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Alice Johnson'));

    // Warning should disappear
    await waitFor(() => {
      expect(screen.queryByText(/Please select a customer for credit sales/i)).toBeNull();
      expect(completeBtn).not.toBeDisabled();
    });
  });

  it('completes sale on button click, triggers createSale, and shows success modal with receipt', async () => {
    const createSaleSpy = vi.spyOn(saleService, 'createSale');

    render(
      <MemoryRouter initialEntries={['/pos']}>
        <CashierPOS />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Organic Espresso Beans 1kg')).toBeDefined();
    });

    // Add item
    fireEvent.click(screen.getByText('Organic Espresso Beans 1kg'));

    await waitFor(() => {
      expect(screen.getAllByText('$18.50').length).toBeGreaterThanOrEqual(1);
    });

    const completeBtn = screen.getByRole('button', { name: /Complete Sale/i });
    expect(completeBtn).not.toBeDisabled();

    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(createSaleSpy).toHaveBeenCalled();
      expect(screen.getByText('Transaction Completed')).toBeDefined();
      expect(screen.getByText('Next Sale (Enter)')).toBeDefined();
    });

    // Click Next Sale button: modal closes and cart resets
    fireEvent.click(screen.getByText('Next Sale (Enter)'));

    await waitFor(() => {
      expect(screen.queryByText('Transaction Completed')).toBeNull();
      expect(screen.getByText('Cart is Empty')).toBeDefined();
    });
  });
});

describe('Cashier Sales History & Stock Lookup Views', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cashier sales history scoped to branch with receipt modal', async () => {
    render(
      <MemoryRouter initialEntries={['/pos/sales']}>
        <CashierSalesHistory />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Branch Sales History')).toBeDefined();
      expect(screen.getByText('Total Shift Sales')).toBeDefined();
    });

    // Check table content
    expect(screen.getByText('Counter Sale')).toBeDefined();
    expect(screen.getByText('View')).toBeDefined();

    // Open receipt modal
    fireEvent.click(screen.getByText('View'));

    await waitFor(() => {
      expect(screen.getByText('Transaction Receipt')).toBeDefined();
      expect(screen.getByText('Print Copy')).toBeDefined();
    });
  });

  it('renders cashier stock lookup with inventory status badges', async () => {
    render(
      <MemoryRouter initialEntries={['/pos/stock']}>
        <CashierStockLookup />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Branch Stock Lookup')).toBeDefined();
      expect(screen.getByText('Total SKUs')).toBeDefined();
      expect(screen.getByText('Organic Espresso Beans 1kg')).toBeDefined();
    });

    // Check stock status badges
    expect(screen.getAllByText('In Stock').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Low Stock/i).length).toBeGreaterThanOrEqual(1);
  });
});
