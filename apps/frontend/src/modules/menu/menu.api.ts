import type { MenuCategory, MenuCategoryFormValues, BackendProductPayload } from "./types/menu.types";

/**
 * Configuramos la URL para que use la variable de entorno.
 * En Vite se lee con import.meta.env.VITE_API_URL.
 */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Separamos los endpoints para mantenerlo organizado
const CATEGORIAS_API_URL = `${BASE_URL}/api/categorias`;
const PRODUCTOS_API_URL = `${BASE_URL}/api/productos`;

export const menuApi = {
  // ==========================================
  //          SECCIÓN DE CATEGORÍAS
  // ==========================================

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

    const res = await fetch(`${CATEGORIAS_API_URL}?${params.toString()}`, {
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
    const res = await fetch(CATEGORIAS_API_URL, {
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

    const res = await fetch(`${CATEGORIAS_API_URL}/${id}`, {
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

    const res = await fetch(`${CATEGORIAS_API_URL}/${id}`, {
      method: 'DELETE',
    });

    const data = await res.json();
    
    if (!res.ok) {
      // Capturamos el mensaje de error de Prisma (ej. "tiene productos asociados")
      throw new Error(data.error || 'Error al eliminar la categoría');
    }
    return data;
  },


  // ==========================================
  //          SECCIÓN DE PRODUCTOS
  // ==========================================

  /**
   * 5. OBTENER PRODUCTOS (GET)
   * Trae todos los productos activos con su información de categoría.
   */
  async getProductos() { // Puedes tipar esto como Promise<MenuProduct[]> si tienes la interfaz
    const res = await fetch(PRODUCTOS_API_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!res.ok) throw new Error('Error al cargar los productos de la base de datos');
    
    return res.json();
  },

  /**
   * 6. CREAR PRODUCTO (POST)
   * Guarda el producto conectándolo con una categoría existente en la BD.
   */
  async createProducto(data: BackendProductPayload) {
    const res = await fetch(PRODUCTOS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Error al crear el producto');
    }
    
    return res.json();
  },

  /**
   * 7. ACTUALIZAR / DESACTIVAR PRODUCTO (PATCH)
   * Sirve para editar toda la info o simplemente enviar { activo: false } para desactivar.
   */
  async updateProducto(id: number, data: BackendProductPayload) {
    if (!id) throw new Error("ID de producto no proporcionado");

    const res = await fetch(`${PRODUCTOS_API_URL}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Error al actualizar el producto');
    }
    return res.json();
  },

  /**
   * 8. ELIMINAR PRODUCTO (DELETE)
   */
  async deleteProducto(id: number) {
    if (!id) throw new Error("ID de producto no proporcionado");

    const res = await fetch(`${PRODUCTOS_API_URL}/${id}`, {
      method: 'DELETE',
    });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Error al eliminar el producto');
    }
    return data;
  }
};