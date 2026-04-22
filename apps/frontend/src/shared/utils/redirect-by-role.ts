import type { UserProfile } from '../../modules/profile/types/profile.types';
import { APP_ROUTES } from '../constants/routes';
import { getUserRoleKey, isUserActive } from './permissions';

export const getDefaultRouteByRole = (
  user?: UserProfile | null,
): string => {
  if (!user || !isUserActive(user)) {
    return APP_ROUTES.LOGIN;
  }

  const roleKey = getUserRoleKey(user);

  switch (roleKey) {
    case 'ADMIN':
      return APP_ROUTES.ADMIN_HOME;
    case 'MESERO':
      return APP_ROUTES.TABLES;
    case 'CAJA':
      return APP_ROUTES.CAJA_HOME;
    case 'COCINA':
      return APP_ROUTES.KITCHEN_MONITOR;
    case 'CLIENTE':
      return APP_ROUTES.CLIENTE_HOME;
    case 'DELIVERY':
      return APP_ROUTES.DELIVERY_HOME;
    default:
      return APP_ROUTES.UNAUTHORIZED;
  }
};