import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import PrivateRoute from './components/layout/PrivateRoute';
import RoleRoute from './components/layout/RoleRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import ErrorBoundary from './components/ui/ErrorBoundary';

import Login from './pages/Login';
import Signup from './pages/Signup';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Branches = lazy(() => import('./pages/Branches'));
const Staff = lazy(() => import('./pages/Staff'));
const Categories = lazy(() => import('./pages/Categories'));
const Items = lazy(() => import('./pages/Items'));
const Stock = lazy(() => import('./pages/Stock'));
const Sales = lazy(() => import('./pages/Sales'));
const Customers = lazy(() => import('./pages/Customers'));
const Payments = lazy(() => import('./pages/Payments'));
const Employees = lazy(() => import('./pages/Employees'));
const Salary = lazy(() => import('./pages/Salary'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Reports = lazy(() => import('./pages/Reports'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const SuperAdminOrganizations = lazy(() => import('./pages/SuperAdminOrganizations'));
const SuperAdminUsers = lazy(() => import('./pages/SuperAdminUsers'));
const Permissions = lazy(() => import('./pages/Permissions'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

function AppContent() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-brand-50 dark:bg-dark-900 transition-colors duration-200">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              <Route element={<RoleRoute allowedRoles={['superAdmin']} />}>
                <Route path="/superadmin" element={<SuperAdminDashboard />} />
                <Route path="/superadmin/organizations" element={<SuperAdminOrganizations />} />
                <Route path="/superadmin/users" element={<SuperAdminUsers />} />
              </Route>
              <Route path="/dashboard" element={<Dashboard />} />

              <Route
                element={
                  <RoleRoute
                    allowedRoles={['admin', 'manager', 'cashier', 'superAdmin']}
                    permission={['branches', 'view']}
                  />
                }
              >
                <Route path="/branches" element={<Branches />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={['admin']} />}>
                <Route path="/staff" element={<Staff />} />
                <Route path="/permissions" element={<Permissions />} />
                <Route path="/employees" element={<Employees />} />
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
                  <Route path="/items" element={<Items />} />
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
                  <Route path="/salary" element={<Salary />} />
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
                <Route path="/stock" element={<Stock />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/payments" element={<Payments />} />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
