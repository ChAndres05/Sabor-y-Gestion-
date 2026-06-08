import type { UserRole } from '../../../shared/constants/roles';

export interface UserListItem {
  id: number;
  backendId: string;
  nombre: string;
  apellido: string;
  documento: string;
  rol: UserRole;
  correo: string;
  estado: boolean;
}