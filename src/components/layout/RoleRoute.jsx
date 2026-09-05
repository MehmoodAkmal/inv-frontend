import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Restricts access to users whose role is in the `allowedRoles` array.
 * On mismatch, redirects each role to their correct home page so there
 * is no redirect loop (superAdmin → /superadmin, others → /dashboard).
 */
export default function RoleRoute({ allowedRoles = [] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles.includes(user.role)) return <Outlet />;

  // Send each role to their correct home — avoids loops
  const home = user.role === "superAdmin" ? "/superadmin" : "/dashboard";
  return <Navigate to={home} replace />;
}
