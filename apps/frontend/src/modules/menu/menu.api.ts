import type { MenuCategory, MenuCategoryFormValues } from "./types/menu.types";

/**
 * En un monorepo con Turbo, el frontend suele correr en el puerto 3000
 * y el backend en el 3001. Ajustamos la URL para apuntar al servidor real.
 */
const API_URL = 'http://localhost:3000/api/categorias';

export const menuApi = {
  /**
   * 1. OBTENER CATEGORÍAS (GET)
   * Permite buscar por nombre y filtrar por estado (activas/inactivas).
   */
  async getCategories(nombre = '', estado = 'todas'): Promise<MenuCategory[]> {
    const params = new URLSearchParams();
    
    if (nombre) params.append('nombre', nombre);
    
    if (estado && estado !== 'todas') {
      params.append('activo', estado === 'activas' ? 'true' : 'false');
    }

    const res = await fetch(`${API_URL}?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) throw new Error('Error al cargar categorías de la base de datos');
    
    const data = await res.json();
    // Mapeamos el id_categoria del backend al id que espera el frontend
    return data.map((cat: Omit<MenuCategory, 'id'> & { id_categoria: number }) => ({
      ...cat,
      id: cat.id_categoria
    }));
  },

  /**
   * 2. CREAR CATEGORÍA (POST)
   * Guarda Nombre, Descripción y Estado inicial.
   */
  async createCategory(data: MenuCategoryFormValues) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Error al crear la categoría');
    }
    return res.json();
  },

  /**
   * 3. ACTUALIZAR CATEGORÍA (PATCH)
   * Se usa para editar los 3 campos o para activar/desactivar desde los 3 puntos.
   */
  async updateCategory(id: number, data: Partial<MenuCategory>) {
    if (!id) throw new Error("ID de categoría no proporcionado");

    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al actualizar categoría');
    }
    return res.json();
  },

  /**
   * 4. ELIMINAR CATEGORÍA (DELETE)
   * El backend rechazará la petición si la categoría tiene productos asociados.
   */
  async deleteCategory(id: number) {
    if (!id) throw new Error("ID de categoría no proporcionado");

    const res = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    });

    const data = await res.json();
    
    if (!res.ok) {
      // Capturamos el mensaje de error de Prisma (ej. "tiene productos asociados")
      throw new Error(data.error || 'Error al eliminar la categoría');
    }
    return data;
  }
};