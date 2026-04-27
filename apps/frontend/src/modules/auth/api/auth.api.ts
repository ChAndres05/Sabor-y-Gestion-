import { mapBackendAuthUser } from './auth.mapper';
import type {
  AuthSession,
  LoginPayload,
  RegisterPayload,
} from '../types/auth.types';

const API_URL = import.meta.env.VITE_API_URL;

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
    case 'SERVER_ERROR':
      return 'Ocurrió un error en el servidor';
    default:
      return 'Ocurrió un error inesperado';
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
};