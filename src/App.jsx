import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";

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

// Redirect to correct home based on role
function SmartRedirect() {
  const { user } = useAuth();
  if (user?.role === "superAdmin") return <Navigate to="/superadmin" replace />;
  return <Navigate to="/dashboard" replace />;
}

// /dashboard: redirect superAdmin to their platform view; let everyone else through
function DashboardRoute() {
  const { user } = useAuth();
  if (user?.role === "superAdmin") return <Navigate to="/superadmin" replace />;
  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          duration: 4000,
          style: { fontSize: "14px" },
          success: { iconTheme: { primary: "#2563eb", secondary: "#fff" } },
        }} />

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
              {/* superAdmin is redirected away; all other authenticated roles see the Dashboard */}
              <Route path="/dashboard" element={<DashboardRoute />} />

              <Route element={<RoleRoute allowedRoles={["admin","superAdmin"]} />}>
                <Route path="/branches" element={<Branches />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={["admin"]} />}>
                <Route path="/staff"     element={<Staff />} />
                <Route path="/employees" element={<Employees />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={["admin","manager"]} />}>
                <Route path="/categories" element={<Categories />} />
                <Route path="/items"      element={<Items />} />
                <Route path="/expenses"   element={<Expenses />} />
                <Route path="/salary"     element={<Salary />} />
                <Route path="/reports"    element={<Reports />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={["admin","manager","cashier"]} />}>
                <Route path="/stock"     element={<Stock />} />
                <Route path="/sales"     element={<Sales />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/payments"  element={<Payments />} />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<SmartRedirect />} />
          <Route path="*" element={<SmartRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
