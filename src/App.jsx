import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useEffect, useState } from "react";

import PrivateRoute    from "./components/layout/PrivateRoute";
import RoleRoute       from "./components/layout/RoleRoute";
import DashboardLayout from "./components/layout/DashboardLayout";

import Login      from "./pages/Login";
import Signup     from "./pages/Signup";
import Dashboard  from "./pages/Dashboard";
import Branches   from "./pages/Branches";
import Staff      from "./pages/Staff";
import Categories from "./pages/Categories";
import Items      from "./pages/Items";
import Stock      from "./pages/Stock";
import Sales      from "./pages/Sales";
import Customers  from "./pages/Customers";
import Payments   from "./pages/Payments";
import Employees  from "./pages/Employees";
import Salary     from "./pages/Salary";
import Expenses   from "./pages/Expenses";
import Reports    from "./pages/Reports";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminOrganizations from "./pages/SuperAdminOrganizations";
import SuperAdminUsers from "./pages/SuperAdminUsers";
import Permissions from "./pages/Permissions";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);
  const toggle = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };
  return (
    <button onClick={toggle} className="theme-toggle" aria-label="Toggle theme">
      {isDark ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

function AppContent() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-brand-50 dark:bg-dark-900 transition-colors duration-200">
      <Routes>
        <Route path="/login"  element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route element={<PrivateRoute />}>
          <Route element={<DashboardLayout />}>
            {/* superAdmin sees a dedicated platform overview */}
            <Route element={<RoleRoute allowedRoles={["superAdmin"]} />}>
              <Route path="/superadmin" element={<SuperAdminDashboard />} />
              <Route path="/superadmin/organizations" element={<SuperAdminOrganizations />} />
              <Route path="/superadmin/users" element={<SuperAdminUsers />} />
            </Route>
            <Route path="/dashboard" element={<Dashboard />} />

            <Route element={<RoleRoute allowedRoles={["admin","manager","cashier","superAdmin"]} permission={["branches", "view"]} />}>
              <Route path="/branches" element={<Branches />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={["admin"]} />}>
              <Route path="/staff"     element={<Staff />} />
              <Route path="/permissions" element={<Permissions />} />
              <Route path="/employees" element={<Employees />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={["admin","manager","cashier"]} />}>
              <Route element={<RoleRoute allowedRoles={["admin","manager","cashier"]} permission={["categories", "view"]} />}>
                <Route path="/categories" element={<Categories />} />
              </Route>
              <Route element={<RoleRoute allowedRoles={["admin","manager","cashier"]} permission={["items", "view"]} />}>
                <Route path="/items"      element={<Items />} />
              </Route>
              <Route element={<RoleRoute allowedRoles={["admin","manager"]} permission={["expenses", "view"]} />}>
                <Route path="/expenses"   element={<Expenses />} />
              </Route>
              <Route element={<RoleRoute allowedRoles={["admin","manager"]} permission={["salary", "view"]} />}>
                <Route path="/salary"     element={<Salary />} />
              </Route>
              <Route element={<RoleRoute allowedRoles={["admin","manager","cashier"]} permission={["reports", "dashboard"]} />}>
                <Route path="/reports"    element={<Reports />} />
              </Route>
            </Route>

            <Route element={<RoleRoute allowedRoles={["admin","manager","cashier"]} />}>
              <Route path="/stock"     element={<Stock />} />
              <Route path="/sales"     element={<Sales />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/payments"  element={<Payments />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{
            duration: 4000,
            style: { fontSize: "14px" },
            success: { iconTheme: { primary: "#2563eb", secondary: "#fff" } },
          }} />
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
