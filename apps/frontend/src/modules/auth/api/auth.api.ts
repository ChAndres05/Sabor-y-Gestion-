import { mapBackendAuthUser } from './auth.mapper';
import { USER_ROLES } from '../../../shared/constants/roles';
import type {
  AuthSession,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  VerifyResetCodePayload,
} from '../types/auth.types';

const API_URL = import.meta.env.VITE_API_URL;

const MOCK_AUTH_USERS: Record<string, AuthSession> = {
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

function getMockSession(payload: LoginPayload): AuthSession | null {
  const identifier = payload.identifier.trim().toLowerCase();
  const password = payload.password.trim();

  if (password !== '123456') return null;

  const session = MOCK_AUTH_USERS[identifier];
  return session ? cloneMockSession(session) : null;
}


type BackendAuthResponse = {
  message: string;
  accessToken: string;
  user: {
    id: number;
    rol: string;
    activo: boolean;
    nombre: string;
    apellido: string;
    username: string;
    correo: string;
    telefono: string;
    ci: number | null;
  };
};

type BackendErrorResponse = {
  error?: string;
};

function normalizeBackendError(code?: string): string {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 'Nombre de usuario, correo o contraseña incorrectos';
    case 'ACCOUNT_DISABLED':
      return 'Tu cuenta está desactivada';
    case 'MISSING_FIELDS':
      return 'Completa todos los campos obligatorios';
    case 'USER_ALREADY_EXISTS':
      return 'El usuario o correo ya está registrado';
    case 'USER_NOT_FOUND':
      return 'No existe una cuenta con ese correo electrónico';
    case 'INVALID_OR_EXPIRED_CODE':
      return 'El código es incorrecto o ha expirado';
    case 'SERVER_ERROR':
      return 'Ocurrió un error en el servidor';
    default:
      // Si el backend envía un mensaje directamente (como "El código es incorrecto o ha expirado")
      return code || 'Ocurrió un error inesperado';
  }
}

async function parseError(response: Response): Promise<never> {
  let data: BackendErrorResponse | null = null;

  try {
    data = await response.json();
  } catch {
    throw new Error('Ocurrió un error inesperado');
  }

  throw new Error(normalizeBackendError(data?.error));
}

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    const mockSession = getMockSession(payload);

    if (mockSession) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return mockSession;
    }

    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: payload.identifier,
        contrasena: payload.password,
      }),
    });

    if (!response.ok) {
      await parseError(response);
    }

    const data: BackendAuthResponse = await response.json();

    return {
      accessToken: data.accessToken,
      user: mapBackendAuthUser(data.user),
    };
  },

  async register(payload: RegisterPayload): Promise<AuthSession> {
    const response = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_ci: payload.ci,
        nombre: payload.nombre,
        apellido: payload.apellido,
        nombre_usuario: payload.username,
        telefono: payload.telefono,
        correo_electronico: payload.correo,
        contrasena: payload.password,
      }),
    });

    if (!response.ok) {
      await parseError(response);
    }

    const data: BackendAuthResponse = await response.json();

    return {
      accessToken: data.accessToken,
      user: mapBackendAuthUser(data.user),
    };
  },

  async requestPasswordReset(payload: ForgotPasswordPayload) {
    const response = await fetch(`${API_URL}/api/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correo_electronico: payload.email,
      }),
    });

    if (!response.ok) {
      await parseError(response);
    }
    return response.json();
  },

  async verifyResetCode(payload: VerifyResetCodePayload) {
    const response = await fetch(`${API_URL}/api/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correo_electronico: payload.email,
        codigo: payload.code,
      }),
    });

    if (!response.ok) {
      await parseError(response);
    }
    return response.json();
  },

  async resetPassword(payload: ResetPasswordPayload) {
    const response = await fetch(`${API_URL}/api/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correo_electronico: payload.email,
        codigo: payload.code,
        nueva_contrasena: payload.newPassword, // El backend espera 'nueva_contrasena' y el front envía 'newPassword'
      }),
    });

    if (!response.ok) {
      await parseError(response);
    }
    return response.json();
  },
};