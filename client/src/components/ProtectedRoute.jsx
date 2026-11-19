import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../lib/access';
import { canAccessRoute } from '../lib/routeAccess';
import PageLoader from './common/PageLoader';

const ProtectedRoute = ({
  allowedRoles = [],
  allowedPermissions = [],
  requireAllPermissions = false,
  checkAssignedRoute = true,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Verifying your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (checkAssignedRoute && !canAccessRoute(user, location.pathname)) {
    return <Navigate to="/unauthorized" replace state={{ from: location, reason: 'route-access' }} />;
  }
  if (!canAccess(user, {
    roles: allowedRoles,
    permissions: allowedPermissions,
    requireAllPermissions,
  })) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
