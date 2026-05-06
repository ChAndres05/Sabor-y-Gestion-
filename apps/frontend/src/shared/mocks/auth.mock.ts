import { USER_ROLES } from '../constants/roles';
import type { AuthSession, LoginPayload } from '../../modules/auth/types/auth.types';

export const MOCK_AUTH_USERS: Record<string, AuthSession> = {
  admin: {
    accessToken: 'mock-admin-token',
    user: {
      id: 1,
      username: 'admin',
      nombre: 'Andrea',
      apellido: 'Administrador',
      correo: 'admin@demo.com',
      telefono: '70000001',
      ci: 1111111,
      activo: true,
      rol: USER_ROLES.ADMIN,
    },
  },
  'admin@demo.com': {
    accessToken: 'mock-admin-token',
    user: {
      id: 1,
      username: 'admin',
      nombre: 'Andrea',
      apellido: 'Administrador',
      correo: 'admin@demo.com',
      telefono: '70000001',
      ci: 1111111,
      activo: true,
      rol: USER_ROLES.ADMIN,
    },
  },
  mesero: {
    accessToken: 'mock-mesero-token',
    user: {
      id: 2,
      username: 'mesero',
      nombre: 'María',
      apellido: 'López',
      correo: 'mesero@demo.com',
      telefono: '70000002',
      ci: 2222222,
      activo: true,
      rol: USER_ROLES.MESERO,
    },
  },
  'mesero@demo.com': {
    accessToken: 'mock-mesero-token',
    user: {
      id: 2,
      username: 'mesero',
      nombre: 'María',
      apellido: 'López',
      correo: 'mesero@demo.com',
      telefono: '70000002',
      ci: 2222222,
      activo: true,
      rol: USER_ROLES.MESERO,
    },
  },
};

function cloneMockSession(session: AuthSession): AuthSession {
  return {
    accessToken: session.accessToken,
    user: { ...session.user },
  };
}

export async function getMockAuthSession(payload: LoginPayload): Promise<AuthSession | null> {
  const identifier = payload.identifier.trim().toLowerCase();
  const password = payload.password.trim();

  if (password !== '123456') return null;

  const session = MOCK_AUTH_USERS[identifier];
  if (!session) return null;

  await new Promise((resolve) => setTimeout(resolve, 250));
  return cloneMockSession(session);
}
