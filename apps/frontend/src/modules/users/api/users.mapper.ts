import {
  BACKEND_TO_UI_ROLE,
  USER_ROLES,
} from '../../../shared/constants/roles';
import type { UserListItem } from '../types/users.types';

interface BackendSearchUser {
  id: string;
  nombre: string;
  apellido: string;
  documento: string;
  rol: string;
  correo: string;
  estado: boolean;
}

export function mapBackendSearchUser(user: BackendSearchUser): UserListItem {
  return {
    id: Number(user.id.replace('u-', '')),
    backendId: user.id,
    nombre: user.nombre,
    apellido: user.apellido,
    documento: user.documento,
    rol: BACKEND_TO_UI_ROLE[user.rol] ?? USER_ROLES.CLIENTE,
    correo: user.correo,
    estado: user.estado,
  };
}