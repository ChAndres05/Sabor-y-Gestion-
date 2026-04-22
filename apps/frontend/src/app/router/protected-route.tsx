import { Navigate, Outlet } from 'react-router-dom';

import type { UserProfile } from '../../modules/profile/types/profile.types';
import type { RoleKey } from '../../shared/constants/roles';
import { APP_ROUTES } from '../../shared/constants/routes';
import { canAccessProtectedView, isUserActive } from '../../shared/utils/permissions';

interface ProtectedRouteProps {
  user?: UserProfile | null;
  isAuthenticated?: boolean;
  allowedRoles?: RoleKey[];
  redirectTo?: string;
  children?: React.ReactNode;
}

export const ProtectedRoute = ({
  user = null,
  isAuthenticated = false,
  allowedRoles = [],
  redirectTo = APP_ROUTES.LOGIN,
  children,
}: ProtectedRouteProps) => {
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (!isUserActive(user)) {
    return <Navigate to={APP_ROUTES.UNAUTHORIZED} replace />;
  }

  if (!canAccessProtectedView(user, allowedRoles)) {
    return <Navigate to={APP_ROUTES.UNAUTHORIZED} replace />;
  }

  if (children) {
    return <>{children}</>;
  }

  return <Outlet />;
};

export default ProtectedRoute;