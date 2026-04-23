import type { UserRole } from '../../../shared/constants/roles';

export interface AuthUser {
  id: number;
  username: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  ci?: number;
  activo: boolean;
  rol: UserRole;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  nombre: string;
  apellido: string;
  username: string;
  correo: string;
  telefono: string;
  password: string;
  confirmPassword: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}