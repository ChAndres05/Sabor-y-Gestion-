import type { UserRole } from '../../../shared/constants/roles';

export interface AuthUser {
  id: number;
  username: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  ci: number | null;
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
  ci: string;
  password: string;
  confirmPassword: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface VerifyResetCodePayload {
  email: string;
  code: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}