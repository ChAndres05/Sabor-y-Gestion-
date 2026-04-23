import type { UserRole } from '../../../shared/constants/roles';

export interface AuthUser {
  id: number;
  rol: UserRole;
  activo: boolean;
  nombre: string;
  apellido: string;
  username: string;
  correo: string;
  telefono: string;
  ci: number | null;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  ci: string;
  nombre: string;
  apellido: string;
  username: string;
  telefono: string;
  correo: string;
  password: string;
  confirmPassword: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}