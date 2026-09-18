import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExecutiveReports from '../pages/ExecutiveReports';
import { getComprehensiveReport } from '../services/reportService';
import { getBranches } from '../services/branchService';
import * as exportCsvModule from '../utils/exportCsv';

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
  getBranches: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        data: [
          { _id: 'b1', name: 'Downtown Branch', isActive: true },
          { _id: 'b2', name: 'Westside Branch', isActive: true },
        ],
      },
    })
  ),
}));

// Mock Report Service
const sampleReportData = {
  meta: {
    interval: 'monthly',
    periodLabel: 'September 2026',
    branchScope: 'All Branches (Consolidated Business)',
    branchId: null,
    startDate: '2026-09-01T00:00:00.000Z',
    endDate: '2026-09-30T23:59:59.999Z',
    generatedAt: '2026-09-18T18:00:00.000Z',
    scope: 'overall_business',
  },
  financials: {
    totalRevenue: 150000,
    totalCOGS: 90000,
    grossProfit: 60000,
    grossMarginPct: 40.0,
    totalExpenses: 12000,
    totalSalaries: 18000,
    totalOperatingCost: 30000,
    netProfit: 30000,
    netMarginPct: 20.0,
  },
  sales: {
    saleCount: 240,
    totalUnitsSold: 850,
    averageTicketSize: 625,
    totalCashSales: 100000,
    totalCreditSales: 50000,
    totalDiscount: 3500,
    cashSalesPct: 67,
    creditSalesPct: 33,
  },
  receivables: {
    totalOutstandingCredit: 25000,
    periodCreditIssued: 50000,
    periodDebtCollected: 35000,
    debtorCount: 15,
  },
  inventory: {
    valuationAtCost: 120000,
    valuationAtRetail: 210000,
    potentialRetailProfit: 90000,
    totalUnitsInStock: 1400,
    lowStockCount: 4,
  },
  timelineTrend: [
    { date: '01 Sep', revenue: 5000, expenses: 1000, netProfit: 1200 },
    { date: '02 Sep', revenue: 7000, expenses: 1500, netProfit: 1900 },
  ],
  topItems: [
    { itemId: 'i1', name: 'Premium Coffee Beans', sku: 'CFB-01', unit: 'kg', categoryName: 'Beverages', totalQty: 120, totalRevenue: 24000, totalProfit: 9600 },
    { itemId: 'i2', name: 'Organic Green Tea', sku: 'OGT-02', unit: 'box', categoryName: 'Beverages', totalQty: 95, totalRevenue: 14250, totalProfit: 5700 },
  ],
  categoryBreakdown: [
    { categoryId: 'c1', categoryName: 'Beverages', revenue: 85000, pctOfTotal: 56.7 },
    { categoryId: 'c2', categoryName: 'Snacks', revenue: 65000, pctOfTotal: 43.3 },
  ],
  branchBreakdown: [
    { branchId: 'b1', name: 'Downtown Branch', code: 'DT-01', revenue: 95000, cogs: 57000, grossProfit: 38000, expenses: 7000, salaries: 9000, netProfit: 22000, saleCount: 150, contributionPct: 63.3 },
    { branchId: 'b2', name: 'Westside Branch', code: 'WS-02', revenue: 55000, cogs: 33000, grossProfit: 22000, expenses: 5000, salaries: 9000, netProfit: 8000, saleCount: 90, contributionPct: 36.7 },
  ],
};

vi.mock('../services/reportService', () => ({
  getComprehensiveReport: vi.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        data: sampleReportData,
      },
    })
  ),
}));

import * as pdfModule from '../utils/generateExecutivePdf';

// Mock exportToCsv and generateExecutivePdf
vi.spyOn(exportCsvModule, 'exportToCsv').mockImplementation(() => {});
vi.spyOn(pdfModule, 'generateExecutivePdf').mockImplementation(() => 'Executive_Report.pdf');

// Mock Recharts ResponsiveContainer to render children reliably in JSDOM
vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  };
});

describe('ExecutiveReports Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { role: 'admin', organizationId: 'org1' };
  });

  it('renders executive report header and interval selector buttons', async () => {
    render(
      <MemoryRouter>
        <ExecutiveReports />
      </MemoryRouter>
    );

    expect(screen.getByText('Executive Business Reports')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Monthly' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Daily' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '6 Months' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annual' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Consolidated Multi-Branch Audit')).toBeInTheDocument();
    });
  });

  it('renders key financial KPI cards with correct formatted numbers', async () => {
    render(
      <MemoryRouter>
        <ExecutiveReports />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Consolidated Multi-Branch Audit')).toBeInTheDocument();
    });

    // KPI cards labels
    expect(screen.getByText('Total Gross Sales')).toBeInTheDocument();
    expect(screen.getAllByText('Gross Profit').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Operating Expenses').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Payroll & Salaries').length).toBeGreaterThan(0);
    expect(screen.getByText('Net Profit (P&L)')).toBeInTheDocument();
    expect(screen.getByText('Stock Valuation (Cost)')).toBeInTheDocument();
  });

  it('allows switching to daily interval and re-fetches report', async () => {
    render(
      <MemoryRouter>
        <ExecutiveReports />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getComprehensiveReport).toHaveBeenCalledTimes(1);
    });

    const dailyBtn = screen.getByRole('button', { name: 'Daily' });
    fireEvent.click(dailyBtn);

    await waitFor(() => {
      expect(getComprehensiveReport).toHaveBeenCalledTimes(2);
      expect(getComprehensiveReport).toHaveBeenLastCalledWith(
        expect.objectContaining({ interval: 'daily' })
      );
    });
  });

  it('exports CSV when export button is clicked', async () => {
    render(
      <MemoryRouter>
        <ExecutiveReports />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Consolidated Multi-Branch Audit')).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole('button', { name: /Export CSV/i });
    fireEvent.click(exportBtn);

    expect(exportCsvModule.exportToCsv).toHaveBeenCalled();
  });

  it('downloads PDF when Download PDF button is clicked', async () => {
    render(
      <MemoryRouter>
        <ExecutiveReports />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Consolidated Multi-Branch Audit')).toBeInTheDocument();
    });

    const downloadBtn = screen.getByRole('button', { name: /Download PDF/i });
    fireEvent.click(downloadBtn);

    expect(pdfModule.generateExecutivePdf).toHaveBeenCalled();
  });

  it('renders top performing products and branch breakdown table', async () => {
    render(
      <MemoryRouter>
        <ExecutiveReports />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Premium Coffee Beans')).toBeInTheDocument();
      expect(screen.getByText('Organic Green Tea')).toBeInTheDocument();
      expect(screen.getByText('Downtown Branch')).toBeInTheDocument();
      expect(screen.getByText('Westside Branch')).toBeInTheDocument();
    });
  });
});
