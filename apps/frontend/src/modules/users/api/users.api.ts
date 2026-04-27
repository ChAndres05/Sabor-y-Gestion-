import { UI_TO_BACKEND_ROLE } from '../../../shared/constants/roles';
import type { UserRole } from '../../../shared/constants/roles';
import { mapBackendSearchUser } from './users.mapper';
import type { UserListItem } from '../types/users.types';

const API_URL = import.meta.env.VITE_API_URL;

interface SearchUsersParams {
  q?: string;
  rol?: UserRole | 'ALL';
}

interface BackendErrorResponse {
  error?: string;
}

function normalizeUsersError(code?: string): string {
  switch (code) {
    case 'Rol no encontrado':
      return 'El rol seleccionado no existe';
    case 'Error interno':
      return 'Ocurrió un error interno del servidor';
    default:
      return code || 'Ocurrió un error inesperado';
  }
}

async function parseUsersError(response: Response): Promise<never> {
  let data: BackendErrorResponse | null = null;

  try {
    data = await response.json();
  } catch {
    throw new Error('Ocurrió un error inesperado');
  }

  throw new Error(normalizeUsersError(data?.error));
}

export const usersApi = {
  async search(params: SearchUsersParams = {}): Promise<UserListItem[]> {
    const searchParams = new URLSearchParams();

    if (params.q?.trim()) {
      searchParams.set('q', params.q.trim());
    }

    if (params.rol && params.rol !== 'ALL') {
      searchParams.set('rol', UI_TO_BACKEND_ROLE[params.rol]);
    }

    const query = searchParams.toString();
    const url = query
      ? `${API_URL}/api/busqueda?${query}`
      : `${API_URL}/api/busqueda`;

    const response = await fetch(url);

    if (!response.ok) {
      await parseUsersError(response);
    }

    const data = await response.json();
    return data.map(mapBackendSearchUser);
  },

  async updateUser(params: {
    id: number;
    role: UserRole;
    estado?: boolean;
  }) {
    const body: Record<string, unknown> = {
      id_usuario: params.id,
      nombreRol: UI_TO_BACKEND_ROLE[params.role],
    };

    if (params.estado !== undefined) {
      body.estado = params.estado;
    }

    const response = await fetch(`${API_URL}/api/admin/usuarios`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await parseUsersError(response);
    }

    return response.json();
  },
};