import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Restricts access to users whose role is in the `allowedRoles` array.
 * On mismatch, redirects each role to their correct home page so there
 * is no redirect loop (superAdmin → /superadmin, others → /dashboard).
 */
export default function RoleRoute({ allowedRoles = [], permission }) {
  const { user, permissions, permissionsLoading } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  if (permission && !['admin', 'superAdmin'].includes(user.role)) {
    if (permissionsLoading) return null;
    const fallback = user.role === 'cashier' ? '/pos' : '/dashboard';
    if (!permissions?.[permission[0]]?.[permission[1]]) return <Navigate to={fallback} replace />;
  }

  if (allowedRoles.length === 0 || allowedRoles.includes(user.role)) return <Outlet />;

  const home = user.role === 'superAdmin' ? '/superadmin' : user.role === 'cashier' ? '/pos' : '/dashboard';
  return <Navigate to={home} replace />;
}
