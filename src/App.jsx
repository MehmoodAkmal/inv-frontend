import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth, AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import PrivateRoute from './components/layout/PrivateRoute';
import RoleRoute from './components/layout/RoleRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';
import ErrorBoundary from './components/ui/ErrorBoundary';

import Login from './pages/Login';
import Signup from './pages/Signup';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Branches = lazy(() => import('./pages/Branches'));
const Staff = lazy(() => import('./pages/Staff'));
const AppUsersStaff = lazy(() => import('./pages/AppUsersStaff'));
const Categories = lazy(() => import('./pages/Categories'));
const Items = lazy(() => import('./pages/Items'));
const ItemsCatalog = lazy(() => import('./pages/ItemsCatalog'));
const Stock = lazy(() => import('./pages/Stock'));
const StockInventory = lazy(() => import('./pages/StockInventory'));
const PurchaseEntry = lazy(() => import('./pages/PurchaseEntry'));
const Sales = lazy(() => import('./pages/Sales'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerLedgers = lazy(() => import('./pages/CustomerLedgers'));
const CustomerStatement = lazy(() => import('./pages/CustomerStatement'));
const Payments = lazy(() => import('./pages/Payments'));
const Employees = lazy(() => import('./pages/Employees'));
const Salary = lazy(() => import('./pages/Salary'));
const SalaryPayroll = lazy(() => import('./pages/SalaryPayroll'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Reports = lazy(() => import('./pages/Reports'));
const PlatformDashboard = lazy(() => import('./pages/superadmin/PlatformDashboard'));
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/PlatformDashboard'));
const SuperAdminUsers = lazy(() => import('./pages/SuperAdminUsers'));
const Permissions = lazy(() => import('./pages/Permissions'));
const BranchComparison = lazy(() => import('./pages/BranchComparison'));
const ProfitLoss = lazy(() => import('./pages/ProfitLoss'));
const CashierPOS = lazy(() => import('./pages/CashierPOS'));
const CashierSalesHistory = lazy(() => import('./pages/CashierSalesHistory'));
const CashierStockLookup = lazy(() => import('./pages/CashierStockLookup'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'superAdmin') return <Navigate to="/superadmin" replace />;
  if (user.role === 'cashier') return <Navigate to="/pos" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AppContent() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-brand-50 dark:bg-dark-900 transition-colors duration-200">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<PrivateRoute />}>
            {/* Cashier Station / MinimalLayout Routes (Counter Ergonomics) */}
            <Route element={<RoleRoute allowedRoles={['cashier', 'admin', 'manager']} />}>
              <Route path="/pos" element={<CashierPOS />} />
              <Route path="/cashier-pos" element={<CashierPOS />} />
              <Route path="/pos/sales" element={<CashierSalesHistory />} />
              <Route path="/pos/history" element={<CashierSalesHistory />} />
              <Route path="/pos/stock" element={<CashierStockLookup />} />
              <Route path="/pos/lookup" element={<CashierStockLookup />} />
            </Route>

            {/* SuperAdmin Platform Management Section */}
            <Route element={<RoleRoute allowedRoles={['superAdmin']} />}>
              <Route path="/superadmin" element={<PlatformDashboard view="overview" />} />
              <Route path="/superadmin/dashboard" element={<PlatformDashboard view="overview" />} />
              <Route path="/superadmin/organizations" element={<PlatformDashboard view="organizations" />} />
              <Route path="/superadmin/signup-trends" element={<PlatformDashboard view="trends" />} />
              <Route path="/superadmin/activity" element={<PlatformDashboard view="activity" />} />
              <Route element={<SuperAdminLayout />}>
                <Route path="/superadmin/users" element={<SuperAdminUsers />} />
              </Route>
              <Route path="/superadmin/*" element={<Navigate to="/superadmin" replace />} />
            </Route>

            {/* General Dashboard Layout for Admin / Manager */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />

              <Route element={<RoleRoute allowedRoles={['admin']} />}>
                <Route path="/branches" element={<Branches />} />
                <Route path="/staff" element={<AppUsersStaff />} />
                <Route path="/app-users-staff" element={<AppUsersStaff />} />
                <Route path="/permissions" element={<Permissions />} />
                <Route path="/employees" element={<AppUsersStaff />} />
                <Route path="/branch-comparison" element={<BranchComparison />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={['admin', 'manager']} />}>
                <Route path="/profit-loss" element={<ProfitLoss />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={['admin', 'manager', 'cashier']} />}>
                <Route
                  element={
                    <RoleRoute
                      allowedRoles={['admin', 'manager', 'cashier']}
                      permission={['categories', 'view']}
                    />
                  }
                >
                  <Route path="/categories" element={<Categories />} />
                </Route>
                <Route
                  element={
                    <RoleRoute
                      allowedRoles={['admin', 'manager', 'cashier']}
                      permission={['items', 'view']}
                    />
                  }
                >
                  <Route path="/items" element={<ItemsCatalog />} />
                  <Route path="/items-catalog" element={<ItemsCatalog />} />
                </Route>
                <Route
                  element={
                    <RoleRoute
                      allowedRoles={['admin', 'manager']}
                      permission={['expenses', 'view']}
                    />
                  }
                >
                  <Route path="/expenses" element={<Expenses />} />
                </Route>
                <Route
                  element={
                    <RoleRoute
                      allowedRoles={['admin', 'manager']}
                      permission={['salary', 'view']}
                    />
                  }
                >
                  <Route path="/salary" element={<SalaryPayroll />} />
                  <Route path="/salary-payroll" element={<SalaryPayroll />} />
                </Route>
                <Route
                  element={
                    <RoleRoute
                      allowedRoles={['admin', 'manager', 'cashier']}
                      permission={['reports', 'dashboard']}
                    />
                  }
                >
                  <Route path="/reports" element={<Reports />} />
                </Route>
              </Route>

              <Route element={<RoleRoute allowedRoles={['admin', 'manager', 'cashier']} />}>
                <Route path="/stock" element={<StockInventory />} />
                <Route path="/stock-inventory" element={<StockInventory />} />
                <Route path="/purchase-entry" element={<PurchaseEntry />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customer-ledgers" element={<CustomerLedgers />} />
                <Route path="/customers/:id/ledger" element={<CustomerStatement />} />
                <Route path="/payments" element={<Payments />} />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: { fontSize: '14px' },
                success: { iconTheme: { primary: '#2563eb', secondary: '#fff' } },
              }}
            />
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-brand-50 dark:bg-dark-900">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" />
                </div>
              }
            >
              <AppContent />
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
