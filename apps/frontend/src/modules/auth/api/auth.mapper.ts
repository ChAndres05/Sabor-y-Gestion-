import { BACKEND_TO_UI_ROLE } from '../../../shared/constants/roles';
import type { AuthUser } from '../types/auth.types';

interface BackendAuthUser {
  id: number;
  rol: string;
  activo: boolean;
  nombre: string;
  apellido: string;
  username: string;
  correo: string;
  telefono: string;
  ci: number | null;
}

export function mapBackendAuthUser(user: BackendAuthUser): AuthUser {
  return {
    id: user.id,
    rol: BACKEND_TO_UI_ROLE[user.rol] ?? BACKEND_TO_UI_ROLE.CLIENTE,
    activo: user.activo,
    nombre: user.nombre,
    apellido: user.apellido,
    username: user.username,
    correo: user.correo,
    telefono: user.telefono,
    ci: user.ci,
  };
}