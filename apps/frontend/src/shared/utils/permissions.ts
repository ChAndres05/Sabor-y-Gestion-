import type { UserProfile } from '../../modules/profile/types/profile.types';
import { resolveRoleKey, type RoleKey } from '../constants/roles';

export const isUserActive = (user?: UserProfile | null): boolean => {
  return Boolean(user?.activo);
};

export const getUserRoleKey = (user?: UserProfile | null): RoleKey | null => {
  if (!user) return null;

  return resolveRoleKey(user.rol?.nombre ?? null);
};

export const hasRequiredRole = (
  user: UserProfile | null | undefined,
  allowedRoles: RoleKey[] = [],
): boolean => {
  if (!user) return false;
  if (!isUserActive(user)) return false;
  if (allowedRoles.length === 0) return true;

  const userRoleKey = getUserRoleKey(user);

  if (!userRoleKey) return false;

  return allowedRoles.includes(userRoleKey);
};

export const canAccessProtectedView = (
  user: UserProfile | null | undefined,
  allowedRoles: RoleKey[] = [],
): boolean => {
  return hasRequiredRole(user, allowedRoles);
};

export const canRenderForRole = (
  user: UserProfile | null | undefined,
  allowedRoles: RoleKey[] = [],
): boolean => {
  return hasRequiredRole(user, allowedRoles);
};

export const isAdmin = (user?: UserProfile | null): boolean => {
  return getUserRoleKey(user) === 'ADMIN';
};

export const isMesero = (user?: UserProfile | null): boolean => {
  return getUserRoleKey(user) === 'MESERO';
};

export const isCaja = (user?: UserProfile | null): boolean => {
  return getUserRoleKey(user) === 'CAJA';
};

export const isCocina = (user?: UserProfile | null): boolean => {
  return getUserRoleKey(user) === 'COCINA';
};

export const isCliente = (user?: UserProfile | null): boolean => {
  return getUserRoleKey(user) === 'CLIENTE';
};

export const isDelivery = (user?: UserProfile | null): boolean => {
  return getUserRoleKey(user) === 'DELIVERY';
};