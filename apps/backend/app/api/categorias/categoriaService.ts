// Si tu backend corre en un puerto diferente, cámbialo aquí. Idealmente, esto vendría de un .env
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'; 
const ENDPOINT = `${API_URL}/api/categorias`;

export const categoriaService = {
  // Obtener todas las categorías
  async getAll(nombre = '', activo?: string) {
    const params = new URLSearchParams();
    if (nombre) params.append('nombre', nombre);
    if (activo && activo !== 'todas') {
      params.append('activo', activo === 'activas' ? 'true' : 'false');
    }
    
    const res = await fetch(`${ENDPOINT}?${params.toString()}`);
    if (!res.ok) throw new Error('Error al obtener categorías');
    return res.json();
  },

  // Crear nueva categoría
  async create(data: { nombre: string; descripcion: string; activo: boolean }) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al crear categoría');
    return res.json();
  },

  // Editar categoría
  async update(id: number, data: { nombre?: string; descripcion?: string; activo?: boolean }) {
    const res = await fetch(`${ENDPOINT}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar categoría');
    return res.json();
  },

  // Eliminar categoría
  async delete(id: number) {
    const res = await fetch(`${ENDPOINT}/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Error al eliminar la categoría');
    return data;
  }
};
