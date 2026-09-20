import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';

let mockUser = null;

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

describe('LandingPage Component and SEO', () => {
  beforeEach(() => {
    mockUser = null;
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  it('renders single primary SEO target h1 with exact wording', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const h1Elements = screen.getAllByRole('heading', { level: 1 });
    expect(h1Elements).toHaveLength(1);
    expect(h1Elements[0]).toHaveTextContent(
      'Cloud Inventory Management Software and Modern Point of Sale System'
    );
  });

  it('renders guest navigation CTAs when unauthenticated', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const signInLinks = screen.getAllByRole('link', { name: /^Sign In$/i });
    expect(signInLinks.length).toBeGreaterThan(0);
    expect(signInLinks[0]).toHaveAttribute('href', '/login');

    const trialLinks = screen.getAllByRole('link', { name: /Start Free/i });
    expect(trialLinks.length).toBeGreaterThan(0);
    trialLinks.forEach((l) => {
      expect(l).toHaveAttribute('href', '/signup');
    });
  });

  it('renders Go to Dashboard button when user is logged in as admin', () => {
    mockUser = { id: 'u1', role: 'admin' };
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const dashboardLinks = screen.getAllByRole('link', { name: /Go to Dashboard/i });
    expect(dashboardLinks.length).toBeGreaterThan(0);
    dashboardLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/dashboard');
    });
  });

  it('links cashier user to /pos and superAdmin to /superadmin', () => {
    mockUser = { id: 'u2', role: 'cashier' };
    const { unmount } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const cashierLinks = screen.getAllByRole('link', { name: /Go to Dashboard/i });
    expect(cashierLinks[0]).toHaveAttribute('href', '/pos');
    unmount();

    mockUser = { id: 'u3', role: 'superAdmin' };
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    const superAdminLinks = screen.getAllByRole('link', { name: /Go to Dashboard/i });
    expect(superAdminLinks[0]).toHaveAttribute('href', '/superadmin');
  });

  it('switches feature deep dive tabs', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    // Click Multi Branch Network Control tab
    const multiBranchTab = screen.getByRole('button', { name: /Multi Branch Network Control/i });
    fireEvent.click(multiBranchTab);

    expect(
      screen.getByText(/Scale from one store to fifty effortlessly/i)
    ).toBeInTheDocument();

    // Click Customer Credit Ledgers tab
    const ledgerTab = screen.getByRole('button', { name: /^Customer Credit Ledgers$/i });
    fireEvent.click(ledgerTab);

    expect(
      screen.getByText(/Replace messy paper registers with a modern digital khata/i)
    ).toBeInTheDocument();
  });

  it('toggles pricing billing cycle and recalculates discount', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    // Initial monthly pricing for Growth tier is $29
    expect(screen.getByText('$29')).toBeInTheDocument();

    // Toggle to Annual billing
    const annualBtn = screen.getByRole('button', { name: /Annual Billing/i });
    fireEvent.click(annualBtn);

    // Annual billing for Growth tier is $24
    expect(screen.getByText('$24')).toBeInTheDocument();
  });

  it('updates ROI calculator estimates when sliders change', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    // Find the branch slider
    const branchSlider = screen.getByLabelText(/Number of Active Store Branches/i);
    fireEvent.change(branchSlider, { target: { value: '5' } });

    // Branch count display updates
    expect(screen.getByText('5 Stores')).toBeInTheDocument();
  });

  it('expands and collapses FAQ accordion items', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const questionBtn = screen.getByRole('button', {
      name: /How does the customer credit ledger work/i,
    });
    fireEvent.click(questionBtn);

    expect(
      screen.getByText(/When an authorized customer purchases on credit/i)
    ).toBeInTheDocument();
  });

  it('calls theme toggle when dark mode button is clicked', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const themeToggleBtn = screen.getByRole('button', { name: /^Toggle theme$/i });
    expect(themeToggleBtn).toBeInTheDocument();
    fireEvent.click(themeToggleBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('strictly contains zero hyphens or underscores in headings, copy, and keywords', () => {
    const { container } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    // Check all visible text nodes in the rendered container
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const violations = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
      const text = currentNode.nodeValue.trim();
      // Skip empty text nodes, SVG contents or currency symbols
      if (text.length > 0 && !['Rs.', '$', '€', '£'].includes(text)) {
        if (text.includes('-') || text.includes('_')) {
          violations.push(text);
        }
      }
      currentNode = walker.nextNode();
    }

    expect(violations).toEqual([]);
  });
});
