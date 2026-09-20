import { useState, useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const dashboardLink = user?.role === 'superAdmin'
    ? '/superadmin'
    : user?.role === 'cashier'
      ? '/pos'
      : '/dashboard';

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Feature Showcase Active Tab
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);

  // Pricing Interval Toggle: 'monthly' | 'annual'
  const [billingCycle, setBillingCycle] = useState('monthly');

  // ROI Calculator States
  const [monthlyRevenue, setMonthlyRevenue] = useState(25000);
  const [branchCount, setBranchCount] = useState(2);
  const [inventoryValue, setInventoryValue] = useState(40000);

  // Unique IDs for accessibility and form controls
  const revenueInputId = useId();
  const branchInputId = useId();
  const inventoryInputId = useId();

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Calculated ROI values
  const hoursSaved = Math.round(branchCount * 18);
  const shrinkagePrevented = Math.round(inventoryValue * 0.035);
  const profitBoost = Math.round(monthlyRevenue * 0.045 + shrinkagePrevented);

  // Features Data (strictly zero hyphens and zero underscores in content)
  const features = [
    {
      title: 'Point of Sale Counter',
      subtitle: 'Fast barcode scanning and thermal receipt printing for smooth checkout counters.',
      tag: 'Point of Sale System',
      description:
        'Equip your cashiers with an ultra fast checkout screen. Scan barcodes in milliseconds, calculate change due instantly, and process cash, card, or customer credit sales without delay.',
      bullets: [
        'Instant barcode and SKU lookup with zero lag',
        'Support for 58mm and 80mm ESC POS thermal receipt printers',
        'Split payment support across cash, card, and customer credit',
        'Minimalist distraction free cashier station for fast customer lines',
      ],
      mockupData: {
        badge: 'Counter Register Active',
        items: [
          { name: 'Organic Whole Milk 1L', qty: 2, price: '$7.00' },
          { name: 'Fresh Wheat Bread 500g', qty: 1, price: '$3.50' },
          { name: 'Premium Coffee Beans 250g', qty: 1, price: '$12.00' },
        ],
        subtotal: '$22.50',
        tax: '$1.80',
        total: '$24.30',
        paid: '$30.00',
        change: '$5.70',
      },
    },
    {
      title: 'Real Time Stock and FIFO Batches',
      subtitle: 'Precise batch tracking with cost price history and reorder alerts.',
      tag: 'Inventory Management Software',
      description:
        'Never run out of bestsellers or sell expired items. Track stock quantities automatically using first in first out batch allocations, preserving exact historical profit margins.',
      bullets: [
        'Automated first in first out stock batch allocations',
        'Low stock alerts with custom reorder level thresholds',
        'Purchase entry receiving with supplier invoice tracking',
        'Multi unit support including kilograms, pieces, boxes, and litres',
      ],
      mockupData: {
        badge: 'Stock Batches Synced',
        items: [
          { name: 'Basmati Rice Premium Bag', qty: '142 Bags', price: 'Healthy Stock' },
          { name: 'Cold Pressed Cooking Oil', qty: '18 Bottles', price: 'Low Stock Alert' },
          { name: 'Sparkling Mineral Water', qty: '380 Bottles', price: 'Healthy Stock' },
        ],
        subtotal: 'Total Products: 1,480',
        tax: 'Cost Snapshot: Locked',
        total: 'Inventory Valuation: $84,200',
        paid: 'Reorder Alerts: 3 Items',
        change: 'Status: Optimal',
      },
    },
    {
      title: 'Multi Branch Network Control',
      subtitle: 'Compare store performance and manage branches from a single dashboard.',
      tag: 'Multi Branch Stock Control',
      description:
        'Scale from one store to fifty effortlessly. Compare revenue, expenses, and net profit across branches in real time while maintaining strict staff access boundaries.',
      bullets: [
        'Centralized dashboard comparing sales and profit across all branches',
        'Role based access control restricting staff to their assigned location',
        'Inter branch stock visibility and comparison analytics',
        'Uniform catalog pricing with local branch inventory levels',
      ],
      mockupData: {
        badge: 'Global Store Network',
        items: [
          { name: 'Downtown Flagship Outlet', qty: 'Today: $4,850', price: '+18% Profit' },
          { name: 'Westside Supermarket Branch', qty: 'Today: $3,210', price: '+12% Profit' },
          { name: 'East Airport Express Store', qty: 'Today: $2,940', price: '+15% Profit' },
        ],
        subtotal: 'Total Branches: 3 Active',
        tax: 'Staff Active: 14 Members',
        total: 'Combined Sales: $11,000',
        paid: 'Global Margin: 29.4%',
        change: 'Sync: Instant',
      },
    },
    {
      title: 'Customer Credit Ledgers',
      subtitle: 'Digital customer ledger book tracking money owed to your business.',
      tag: 'Customer Ledger Balance Software',
      description:
        'Replace messy paper registers with a modern digital khata. Maintain running balances for trusted customers, issue credit sales, and log partial payments with full transaction logs.',
      bullets: [
        'Automatic balance due calculations on every credit transaction',
        'Comprehensive customer statements ready for download and sharing',
        'Fast customer creation directly from the checkout counter',
        'Clear visibility into total money owed to your store at any moment',
      ],
      mockupData: {
        badge: 'Ledger Balances Active',
        items: [
          { name: 'Rashid General Store', qty: 'Credit Sale #842', price: 'Owes $420' },
          { name: 'Al Madina Supermarket', qty: 'Payment Received', price: 'Paid $200' },
          { name: 'Bilal Traders Account', qty: 'Statement Issued', price: 'Owes $150' },
        ],
        subtotal: 'Total Customers: 140',
        tax: 'Credit Limits: Enforced',
        total: 'Money Owed to You: $4,850',
        paid: 'Recovered Today: $850',
        change: 'Ledger: Balanced',
      },
    },
    {
      title: 'Store Financials and Profit Tracking',
      subtitle: 'Accurate gross margin calculations and categorized expense monitoring.',
      tag: 'Store Profit and Loss Tracker',
      description:
        'Know your exact bottom line daily. The system subtracts true cost of goods sold and operating expenses from revenue, giving you undeniable financial clarity.',
      bullets: [
        'Real time gross profit and net profit margin visibility',
        'Categorized operating expenses including rent, utilities, and logistics',
        'Interactive financial charts displaying revenue trends and cost ratios',
        'Automated executive PDF summary generation ready for store owners',
      ],
      mockupData: {
        badge: 'Financial Health Positive',
        items: [
          { name: 'Gross Merchandise Value', qty: 'Sales Volume', price: '$48,250' },
          { name: 'Cost of Goods Sold (FIFO)', qty: 'Direct Costs', price: '$31,400' },
          { name: 'Store Operating Expenses', qty: 'Utilities & Rent', price: '$4,100' },
        ],
        subtotal: 'Gross Margin: $16,850',
        tax: 'Expense Ratio: 8.5%',
        total: 'Net Clean Profit: $12,750',
        paid: 'Net Margin: 26.4%',
        change: 'Audit Ready: Yes',
      },
    },
    {
      title: 'Staff Onboarding and Payroll',
      subtitle: 'Automated employee records, monthly compensation, and role permissions.',
      tag: 'Retail Billing System',
      description:
        'Keep your team motivated and secure. Creating a cashier or manager user automatically builds an employee record for simple salary management and strict permission controls.',
      bullets: [
        'Automatic employee profile creation upon staff user registration',
        'Monthly compensation tracking with historical salary disbursement logs',
        'Granular role based permissions across sales, inventory, and reports',
        'Individual staff performance tracking and cashier shift accountability',
      ],
      mockupData: {
        badge: 'Team Access Scoped',
        items: [
          { name: 'Farhan Ali (Store Manager)', qty: 'Downtown Branch', price: 'Full Branch Access' },
          { name: 'Sana Tariq (Lead Cashier)', qty: 'Register Station 1', price: 'POS Counter Only' },
          { name: 'Zeeshan Khan (Stock Clerk)', qty: 'Warehouse Bay 2', price: 'Inventory Only' },
        ],
        subtotal: 'Total Staff: 8 Active',
        tax: 'Security Level: Role Scoped',
        total: 'Monthly Payroll: Processed',
        paid: 'Shift Audits: Verified',
        change: 'Status: Secure',
      },
    },
  ];

  // Pricing Plans (strictly zero hyphens and zero underscores in content)
  const plans = [
    {
      name: 'Free Starter',
      subtitle: 'Ideal for independent single shops and new businesses testing cloud operations.',
      priceMonthly: '$0',
      priceAnnual: '$0',
      period: 'Forever free',
      highlight: false,
      badge: 'Free Forever',
      features: [
        '1 Store Location / Branch',
        'Up to 100 Products Catalog',
        'Point of Sale Counter Billing',
        'Real Time Stock Quantities',
        'Standard Sales History',
        'Thermal Receipt Printing Support',
        'Community Customer Support',
      ],
      ctaText: 'Get Started Free',
      ctaLink: '/signup',
    },
    {
      name: 'Growth Store',
      subtitle: 'Best for expanding retailers, busy supermarkets, and multi staff counters.',
      priceMonthly: '$29',
      priceAnnual: '$24',
      period: 'per month',
      highlight: true,
      badge: 'Most Popular',
      features: [
        'Up to 3 Store Branches',
        'Unlimited Products and Categories',
        'Full Customer Credit Ledger System',
        'FIFO Batch Cost Profit Tracking',
        'Store Expense and Profit Loss Reports',
        'Staff Roles for Managers and Cashiers',
        'Automated Employee Salary Records',
        'Priority Technical Support',
      ],
      ctaText: 'Start 14 Day Free Trial',
      ctaLink: '/signup',
    },
    {
      name: 'Enterprise Multi Branch',
      subtitle: 'Built for supermarket chains, wholesale networks, and multi city franchises.',
      priceMonthly: '$79',
      priceAnnual: '$64',
      period: 'per month',
      highlight: false,
      badge: 'Maximum Scale',
      features: [
        'Unlimited Store Locations',
        'Unlimited Staff and Cashier Accounts',
        'Multi Branch Comparison Analytics',
        'Executive PDF and CSV Data Exports',
        'Custom Currency Symbols and Formats',
        'Super Admin Platform Governance',
        'Dedicated Account Manager',
        'Custom Data Migration Assistance',
      ],
      ctaText: 'Launch Enterprise Trial',
      ctaLink: '/signup',
    },
  ];

  // Industry Solutions
  const industries = [
    {
      title: 'Supermarkets and Grocery',
      desc: 'Rapid barcode checkout, unit measures by weight, and high volume thermal receipt generation.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      title: 'Wholesale and Distributors',
      desc: 'Customer credit ledger tracking, bulk batch allocation, and multi branch stock visibility.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      title: 'Electronics and Mobile Shops',
      desc: 'Unique SKU identification, warranty receipt snapshots, and gross margin tracking per item.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: 'Pharmacies and Healthcare',
      desc: 'FIFO batch expiration tracking, low stock reorder thresholds, and fast patient lookup.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      title: 'Apparel and Boutiques',
      desc: 'Category categorization, seasonal discount management, and modern customer receipt layout.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      title: 'Multi Branch Retail Chains',
      desc: 'Centralized executive reports, inter store performance comparisons, and consolidated oversight.',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ];

  // Testimonials
  const testimonials = [
    {
      quote:
        'Switching our three supermarket branches to this cloud system transformed our daily routine. Counter sales are twice as fast, customer credit is tracked down to the cent, and I can check net profit from my phone anywhere.',
      name: 'Muhammad Usman',
      role: 'Managing Director, Metro Superstore Chain',
      rating: 5,
    },
    {
      quote:
        'The customer ledger feature alone paid for the software in one week. Our regular clients buy on credit, and having instant statement generation and accurate balance tracking eliminated all billing disputes.',
      name: 'Tariq Mehmood',
      role: 'Owner, Al Madina Wholesale Supplies',
      rating: 5,
    },
    {
      quote:
        'The cashier POS mode is clean, modern, and impossible for our staff to make mistakes on. Barcode scanning is instant, thermal receipt printing works out of the box, and low stock warnings prevent stockouts.',
      name: 'Khadija Rehman',
      role: 'Operations Head, Apex Retail Outlets',
      rating: 5,
    },
  ];

  // FAQ Items
  const faqs = [
    {
      q: 'Do I need special hardware to run this point of sale software?',
      a: 'No special proprietary hardware is required. You can run the application on any standard computer, laptop, iPad, or Android tablet using modern web browsers. It integrates smoothly with standard USB or wireless barcode readers and 58mm or 80mm ESC POS thermal receipt printers.',
    },
    {
      q: 'How does the customer credit ledger work?',
      a: 'When an authorized customer purchases on credit, the system automatically logs the transaction, updates the customer running balance, and records the exact items purchased. You can print or download customer ledger statements and log partial payments anytime.',
    },
    {
      q: 'Can I manage multiple store locations with separate staff access?',
      a: 'Yes. The system provides strict multi branch scoping. Branch managers and cashiers only view their assigned store stock and sales, while store owners have global access to view, compare, and analyze performance across all locations.',
    },
    {
      q: 'How are profit margins calculated?',
      a: 'The platform uses first in first out batch tracking to capture the exact purchase cost of every item at the moment of sale. Gross profit is calculated by subtracting true cost from selling price, while net profit incorporates all recorded operational store expenses.',
    },
    {
      q: 'What currency symbols and formats are supported?',
      a: 'The platform supports global currencies including Pakistani Rupee, US Dollar, Euro, British Pound, Saudi Riyal, UAE Dirham, Indian Rupee, and custom currency codes. You can select your currency preset anytime in account settings.',
    },
    {
      q: 'Can I test the platform before committing to a paid plan?',
      a: 'Yes. You can start immediately with the Free Starter plan or begin a 14 day trial of the Growth Store plan with zero credit card required. You can upgrade, downgrade, or cancel anytime.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-emerald-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-white block leading-tight">
                Retail<span className="text-emerald-400">POS</span>
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400/80 block">
                Cloud Inventory Suite
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition-colors">
              Features
            </a>
            <a href="#pointofsale" className="hover:text-emerald-400 transition-colors">
              Point of Sale
            </a>
            <a href="#multibranch" className="hover:text-emerald-400 transition-colors">
              Multi Branch
            </a>
            <a href="#calculator" className="hover:text-emerald-400 transition-colors">
              Profit Calculator
            </a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">
              Pricing Plans
            </a>
            <a href="#reviews" className="hover:text-emerald-400 transition-colors">
              Customer Reviews
            </a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <ThemeToggle />

            {user ? (
              <Link
                to={dashboardLink}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md shadow-emerald-500/20"
              >
                <span>Go to Dashboard</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md shadow-emerald-500/20"
                >
                  <span>Start Free Trial</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 pt-3 pb-6 space-y-3">
            <nav className="flex flex-col space-y-2 text-sm font-semibold text-slate-300">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-emerald-400"
              >
                Features
              </a>
              <a
                href="#pointofsale"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-emerald-400"
              >
                Point of Sale
              </a>
              <a
                href="#multibranch"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-emerald-400"
              >
                Multi Branch
              </a>
              <a
                href="#calculator"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-emerald-400"
              >
                Profit Calculator
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-emerald-400"
              >
                Pricing Plans
              </a>
              <a
                href="#reviews"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-emerald-400"
              >
                Customer Reviews
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-emerald-400"
              >
                FAQ
              </a>
            </nav>

            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              {user ? (
                <Link
                  to={dashboardLink}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center text-xs font-bold text-slate-950 bg-emerald-400 rounded-xl block"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2 text-center text-xs font-semibold text-slate-300 bg-slate-800 rounded-xl"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 text-center text-xs font-bold text-slate-950 bg-emerald-400 rounded-xl"
                  >
                    Start Free Trial
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Hero Section ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-800/80">
        {/* Glow ambient backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[130px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-teal-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill Banner */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Next Generation Retail POS and Multi Branch Stock Control</span>
            </div>

            {/* Target H1 Heading (SEO keywords, zero hyphens, zero underscores) */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight sm:leading-none">
              Cloud Inventory Management Software and Modern Point of Sale System
            </h1>

            {/* Subtitle Description */}
            <p className="mt-6 text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
              Streamline your business operations with real time stock tracking, lightning fast barcode point of sale checkout, customer credit ledgers, and automated store profit analytics.
            </p>

            {/* Hero CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              {user ? (
                <Link
                  to={dashboardLink}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                >
                  <span>Go to Dashboard</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              ) : (
                <Link
                  to="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                >
                  <span>Start Free 14 Day Trial</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              )}

              <a
                href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 rounded-xl transition-all"
              >
                <span>Explore Interactive Preview</span>
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </div>

            <p className="mt-3.5 text-[11px] text-slate-400">
              No credit card required. Free setup in under two minutes. Cancel anytime.
            </p>
          </div>

          {/* Hero Interactive Mockup Preview Card */}
          <div className="mt-14 max-w-5xl mx-auto relative">
            <div className="relative rounded-2xl bg-slate-950 p-2 sm:p-3 border border-slate-800 shadow-2xl shadow-emerald-950/30 ring-1 ring-slate-800/80">
              {/* Terminal Window Top Bar */}
              <div className="h-9 bg-slate-900/90 rounded-t-xl px-3 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] font-mono text-slate-400 ml-2">
                    RetailPOS Live Terminal Demo
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                  Ready for Scanner Input
                </span>
              </div>

              {/* Terminal Mockup Content */}
              <div className="p-4 sm:p-6 bg-slate-950 grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left: Product Catalog Grid */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-white uppercase tracking-wider">
                      Counter Catalog Grid
                    </div>
                    <div className="text-xs text-slate-400 font-mono">Barcode: 890123456789</div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { name: 'Basmati Rice 5kg', price: '$14.50', stock: '84 Units', color: 'border-emerald-500/30' },
                      { name: 'Cooking Oil 1L', price: '$4.20', stock: '32 Units', color: 'border-slate-800' },
                      { name: 'Organic Milk 1L', price: '$3.50', stock: '46 Units', color: 'border-slate-800' },
                      { name: 'Wheat Flour 10kg', price: '$18.00', stock: '12 Units', color: 'border-amber-500/40' },
                      { name: 'Mineral Water 6 Pack', price: '$6.00', stock: '95 Units', color: 'border-slate-800' },
                      { name: 'Roasted Coffee Beans', price: '$12.50', stock: '28 Units', color: 'border-slate-800' },
                    ].map((prod) => (
                      <div
                        key={prod.name}
                        className={`p-3 rounded-xl bg-slate-900/90 border ${prod.color} text-left hover:border-emerald-400/60 transition-all cursor-pointer`}
                      >
                        <div className="text-xs font-bold text-white truncate">{prod.name}</div>
                        <div className="text-xs font-mono text-emerald-400 font-bold mt-1">{prod.price}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{prod.stock}</div>
                      </div>
                    ))}
                  </div>

                  {/* Summary row */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Selected Branch Location:</span>
                    <span className="font-semibold text-white">Downtown Central Supermarket</span>
                    <span className="text-emerald-400 font-mono font-bold">FIFO Batch Tracked</span>
                  </div>
                </div>

                {/* Right: Cart and Total Bill */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                      <span className="text-xs font-bold text-white uppercase">Active Sale Bill</span>
                      <span className="text-[10px] font-mono text-emerald-400">Order #1042</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>Basmati Rice 5kg (x1)</span>
                        <span className="font-mono text-white">$14.50</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Cooking Oil 1L (x2)</span>
                        <span className="font-mono text-white">$8.40</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Organic Milk 1L (x1)</span>
                        <span className="font-mono text-white">$3.50</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-slate-800 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal Amount</span>
                      <span className="font-mono text-white">$26.40</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Store Tax (5%)</span>
                      <span className="font-mono text-white">$1.32</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-slate-800/80">
                      <span>Final Total Amount</span>
                      <span className="font-mono text-emerald-400">$27.72</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate('/signup')}
                      className="w-full py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md shadow-emerald-500/20 mt-2"
                    >
                      Complete and Print Receipt
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Metric Badge 1 */}
            <div className="absolute -top-4 -left-4 sm:-left-6 p-3 rounded-2xl bg-slate-900/95 border border-emerald-500/40 shadow-xl backdrop-blur-md hidden sm:flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div className="text-[11px] font-bold text-white">Instant Thermal Receipt</div>
                <div className="text-[10px] text-slate-400 font-mono">58mm and 80mm ESC POS</div>
              </div>
            </div>

            {/* Floating Metric Badge 2 */}
            <div className="absolute -bottom-4 -right-4 sm:-right-6 p-3 rounded-2xl bg-slate-900/95 border border-emerald-500/40 shadow-xl backdrop-blur-md hidden sm:flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <div className="text-[11px] font-bold text-white">Net Profit Synced</div>
                <div className="text-[10px] text-emerald-400 font-mono font-bold">+28.4% Gross Margin</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof & Live Numbers Strip ──────────────────────────────── */}
      <section className="py-12 bg-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">10,000+</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">Products Tracked in Real Time</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">99.9%</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">Platform Uptime SLA</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">500+</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">Active Retail Stores</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">250,000+</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">Receipts Printed Monthly</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Deep Dive Interactive Feature Showcase ─────────────────────────── */}
      <section id="features" className="py-20 lg:py-28 border-b border-slate-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Comprehensive Platform Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 tracking-tight">
              Engineered for Speed, Reliability, and Retail Profit
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-3">
              Explore how our cloud inventory management software and modern point of sale system transforms every area of your business.
            </p>
          </div>

          {/* Feature Selector Tabs */}
          <div className="flex border-b border-slate-800 overflow-x-auto gap-1 pb-1 justify-start lg:justify-center">
            {features.map((feat, idx) => (
              <button
                key={feat.title}
                type="button"
                onClick={() => setActiveFeatureTab(idx)}
                className={`px-4 py-3 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
                  activeFeatureTab === idx
                    ? 'border-emerald-400 text-emerald-400 bg-slate-800/80 shadow-xs font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {feat.title}
              </button>
            ))}
          </div>

          {/* Active Tab Panel */}
          <div className="mt-8 p-6 sm:p-10 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 font-mono">
                {features[activeFeatureTab].tag}
              </span>

              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {features[activeFeatureTab].title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {features[activeFeatureTab].description}
              </p>

              <div className="space-y-2.5 pt-2">
                {features[activeFeatureTab].bullets.map((b) => (
                  <div key={b} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      ✓
                    </span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md shadow-emerald-500/20"
                >
                  <span>Experience This Feature Free</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Feature Visual Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Snapshot Overview
                </span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800/60">
                  {features[activeFeatureTab].mockupData.badge}
                </span>
              </div>

              <div className="space-y-2.5">
                {features[activeFeatureTab].mockupData.items.map((it) => (
                  <div
                    key={it.name}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white truncate">{it.name}</div>
                      <div className="text-[11px] text-slate-400">{it.qty}</div>
                    </div>
                    <div className="font-mono font-bold text-emerald-400">{it.price}</div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/60 text-slate-300">
                  {features[activeFeatureTab].mockupData.subtotal}
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 text-emerald-400 font-bold font-mono text-right">
                  {features[activeFeatureTab].mockupData.total}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive ROI and Store Profit Calculator ────────────────────── */}
      <section id="calculator" className="py-20 lg:py-28 border-b border-slate-800 bg-slate-950/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Interactive Value Estimation
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 tracking-tight">
              Calculate Your Store Profit and Efficiency Gains
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-3">
              Adjust the sliders below to estimate time saved and inventory loss prevented by adopting our cloud stock control system.
            </p>
          </div>

          <div className="max-w-4xl mx-auto p-6 sm:p-10 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Sliders Column */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-200 mb-2">
                  <label htmlFor={revenueInputId}>Estimated Monthly Revenue</label>
                  <span className="font-mono text-emerald-400 text-sm">
                    ${monthlyRevenue.toLocaleString()}
                  </span>
                </div>
                <input
                  id={revenueInputId}
                  type="range"
                  min={5000}
                  max={200000}
                  step={5000}
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                  className="w-full accent-emerald-400 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>$5,000</span>
                  <span>$200,000</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-200 mb-2">
                  <label htmlFor={branchInputId}>Number of Active Store Branches</label>
                  <span className="font-mono text-emerald-400 text-sm">{branchCount} Stores</span>
                </div>
                <input
                  id={branchInputId}
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={branchCount}
                  onChange={(e) => setBranchCount(Number(e.target.value))}
                  className="w-full accent-emerald-400 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>1 Store</span>
                  <span>20 Stores</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-200 mb-2">
                  <label htmlFor={inventoryInputId}>Average Store Inventory Value</label>
                  <span className="font-mono text-emerald-400 text-sm">
                    ${inventoryValue.toLocaleString()}
                  </span>
                </div>
                <input
                  id={inventoryInputId}
                  type="range"
                  min={10000}
                  max={500000}
                  step={10000}
                  value={inventoryValue}
                  onChange={(e) => setInventoryValue(Number(e.target.value))}
                  className="w-full accent-emerald-400 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>$10,000</span>
                  <span>$500,000</span>
                </div>
              </div>
            </div>

            {/* Results Column */}
            <div className="p-6 rounded-xl bg-slate-950 border border-emerald-500/30 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Projected Monthly Impact
                </span>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold text-white">Hours Saved Per Month</div>
                    <div className="text-[11px] text-slate-400">Checkout and inventory audit speed</div>
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {hoursSaved} Hours
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold text-white">Shrinkage Loss Prevented</div>
                    <div className="text-[11px] text-slate-400">Expiry and miscount prevention</div>
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    ${shrinkagePrevented.toLocaleString()}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold text-white">Estimated Profit Boost</div>
                    <div className="text-[11px] text-emerald-400">Calculated monthly addition</div>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    +${profitBoost.toLocaleString()}
                  </div>
                </div>
              </div>

              <Link
                to="/signup"
                className="w-full py-3 text-center text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md shadow-emerald-500/20"
              >
                Claim This Profit Gain with Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Industry Solutions ─────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Tailored for Every Business Model
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 tracking-tight">
              Purpose Built for Modern Retail and Wholesale
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-3">
              Whether you operate a corner grocery or a nationwide chain of retail stores, the platform adapts to your workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map((ind) => (
              <div
                key={ind.title}
                className="p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-400 group-hover:text-slate-950 transition-colors mb-4">
                  {ind.icon}
                </div>
                <h3 className="text-base font-bold text-white mb-2">{ind.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{ind.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hardware & Thermal Receipt Compatibility ───────────────────────── */}
      <section className="py-20 lg:py-28 border-b border-slate-800 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                Zero Hardware Lock In
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Works with Your Existing Printers, Barcode Scanners, and Devices
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Connect your standard 58mm or 80mm ESC POS thermal receipt printer in seconds. Plug in USB or wireless barcode scanners, open cash drawers automatically, and run the app on Windows, Mac, Linux, iPad, or Android.
              </p>

              <div className="flex flex-wrap gap-2.5 pt-2">
                {[
                  '58mm ESC POS Thermal Printer',
                  '80mm ESC POS Thermal Printer',
                  'USB Barcode Readers',
                  'Wireless Handheld Scanners',
                  'Electronic Cash Drawers',
                  'Desktops Laptops and Tablets',
                ].map((hw) => (
                  <span
                    key={hw}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-200"
                  >
                    ✓ {hw}
                  </span>
                ))}
              </div>
            </div>

            <div className="w-full lg:w-auto p-6 rounded-2xl bg-slate-950 border border-emerald-500/30 text-center space-y-3 shrink-0">
              <div className="text-3xl font-black text-emerald-400 font-mono">Plug and Play</div>
              <div className="text-xs text-slate-400">Zero device drivers required</div>
              <Link
                to="/signup"
                className="inline-block w-full px-6 py-3 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md shadow-emerald-500/20"
              >
                Connect Your Hardware Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Transparent Pricing Plans ──────────────────────────────────────── */}
      <section id="pricing" className="py-20 lg:py-28 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Transparent Honest Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 tracking-tight">
              Affordable Plans Designed for Every Stage of Retail Growth
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-3">
              No hidden fees, no per transaction charges, and no hardware restrictions.
            </p>

            {/* Billing cycle toggle */}
            <div className="mt-7 inline-flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-emerald-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] bg-slate-950 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((p) => {
              const displayPrice = billingCycle === 'annual' ? p.priceAnnual : p.priceMonthly;
              return (
                <div
                  key={p.name}
                  className={`rounded-2xl p-7 sm:p-8 flex flex-col justify-between border relative transition-all ${
                    p.highlight
                      ? 'bg-slate-950 border-emerald-400 shadow-2xl shadow-emerald-950/50 ring-1 ring-emerald-400/50 scale-100 md:scale-105'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-400 text-slate-950 shadow-sm">
                      {p.badge}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="text-lg font-bold text-white">{p.name}</div>
                    <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                      {p.subtitle}
                    </p>

                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-4xl font-black text-white font-mono">{displayPrice}</span>
                      <span className="text-xs text-slate-400 ml-2 font-medium">{p.period}</span>
                    </div>

                    <div className="space-y-2.5 pt-4">
                      {p.features.map((f) => (
                        <div key={f} className="flex items-start gap-2.5 text-xs text-slate-300">
                          <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold mt-0.5">
                            ✓
                          </span>
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8">
                    <Link
                      to={p.ctaLink}
                      className={`w-full block py-3 text-center text-xs font-bold rounded-xl transition-all ${
                        p.highlight
                          ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300 shadow-md shadow-emerald-500/25'
                          : 'bg-slate-800 text-white hover:bg-slate-700'
                      }`}
                    >
                      {p.ctaText}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Customer Reviews & Testimonials ────────────────────────────────── */}
      <section id="reviews" className="py-20 lg:py-28 border-b border-slate-800 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Trusted by Retail Leaders
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 tracking-tight">
              Customer Stories and Real Store Success
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-3">
              Hear how store owners and retail managers transformed their daily counter operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="p-6 sm:p-7 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex gap-1 text-amber-400 text-sm">
                    {[...Array(t.rating)].map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                    "{t.quote}"
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <div className="text-xs font-bold text-white">{t.name}</div>
                  <div className="text-[11px] text-slate-400">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Frequently Asked Questions (Accordion) ─────────────────────────── */}
      <section id="faq" className="py-20 lg:py-28 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Got Questions?
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-3">
              Everything you need to know about getting started, hardware support, and ledgers.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((f, i) => {
              const isOpen = openFaqIndex === i;
              return (
                <div
                  key={f.q}
                  className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? -1 : i)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 text-xs sm:text-sm font-bold text-white hover:text-emerald-400 transition-colors"
                  >
                    <span>{f.q}</span>
                    <span className="text-emerald-400 font-mono text-base shrink-0">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3">
                      {f.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Final Call to Action Hero Banner ───────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-slate-950 to-slate-900 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
            Modernize Your Retail Store Today
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mt-3 tracking-tight">
            Ready to Take Full Control of Your Stock and Sales?
          </h2>
          <p className="text-xs sm:text-base text-slate-400 mt-4 max-w-2xl mx-auto leading-relaxed">
            Join hundreds of thriving retail stores, supermarkets, and wholesale businesses. Start your free trial in under two minutes with zero hardware lock in.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-xl shadow-emerald-500/25"
            >
              <span>Get Started Free Today</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>

          <p className="mt-4 text-[11px] text-slate-400">
            Free forever tier available. Instant access without entering credit card info.
          </p>
        </div>
      </section>

      {/* ── Comprehensive Footer ───────────────────────────────────────────── */}
      <footer className="py-14 bg-slate-950 border-t border-slate-800 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-400 text-slate-950 flex items-center justify-center font-bold">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span className="text-sm font-bold text-white">RetailPOS Cloud</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Complete cloud inventory management software and retail point of sale system for single shops, supermarkets, and multi branch enterprises.
            </p>
          </div>

          <div>
            <div className="font-bold text-white uppercase text-[11px] tracking-wider mb-3">
              Core Capabilities
            </div>
            <ul className="space-y-2">
              <li>
                <a href="#pointofsale" className="hover:text-emerald-400 transition-colors">
                  Point of Sale Register
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-emerald-400 transition-colors">
                  Real Time Inventory Tracking
                </a>
              </li>
              <li>
                <a href="#multibranch" className="hover:text-emerald-400 transition-colors">
                  Multi Branch Comparison
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-emerald-400 transition-colors">
                  Customer Credit Ledgers
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-emerald-400 transition-colors">
                  Store Profit and Loss Analytics
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white uppercase text-[11px] tracking-wider mb-3">
              Navigation
            </div>
            <ul className="space-y-2">
              <li>
                <Link to="/login" className="hover:text-emerald-400 transition-colors">
                  Sign In to Account
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-emerald-400 transition-colors">
                  Create Free Account
                </Link>
              </li>
              <li>
                <a href="#calculator" className="hover:text-emerald-400 transition-colors">
                  Store Profit Calculator
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-emerald-400 transition-colors">
                  Pricing Plans
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-emerald-400 transition-colors">
                  Frequently Asked Questions
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white uppercase text-[11px] tracking-wider mb-3">
              Security and Hardware
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              Compliant with standard 58mm and 80mm ESC POS thermal receipt hardware and USB barcode scanners. Strict organization tenant data isolation.
            </p>
            <div className="text-[11px] text-emerald-400 font-mono font-bold">
              Multi Currency Ready: PKR USD EUR GBP SAR AED INR
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} RetailPOS Cloud. All rights reserved.
          </div>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer">Security Overview</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
