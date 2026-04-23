import { ROUTES } from '../constants/routes';
import { USER_ROLES, type UserRole } from '../constants/roles';

export function redirectByRole(role: UserRole) {
  switch (role) {
    case USER_ROLES.ADMIN:
      return ROUTES.ADMIN_MENU;
    case USER_ROLES.MESERO:
      return ROUTES.MESERO_HOME;
    case USER_ROLES.COCINERO:
      return ROUTES.COCINA_HOME;
    case USER_ROLES.CAJERO:
      return ROUTES.CAJERO_HOME;
    case USER_ROLES.CLIENTE:
      return ROUTES.CLIENTE_HOME;
    default:
      return ROUTES.LOGIN;
  }
}