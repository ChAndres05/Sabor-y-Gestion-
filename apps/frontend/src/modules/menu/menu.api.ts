import type {
  MenuCategory,
  MenuCategoryFormValues,
  BackendProductPayload,
} from './types/menu.types';
import type { BackendProduct } from '../../shared/mappers/menu.mapper';

/**
 * Configuramos la URL para que use la variable de entorno.
 * En Vite se lee con import.meta.env.VITE_API_URL.
 */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const CATEGORIAS_API_URL = `${BASE_URL}/api/categorias`;
const PRODUCTOS_API_URL = `${BASE_URL}/api/productos`;
const MENU_API_URL = `${BASE_URL}/api/menu`;

type NumericValue = number | string | null | undefined;

type ApiCategory = Omit<MenuCategory, 'id'> & {
  id?: NumericValue;
  id_categoria?: NumericValue;
  productos?: BackendProduct[];
};

type ApiPresentation = NonNullable<BackendProduct['presentaciones']>[number];

function numberValue(value: NumericValue, fallback = 0): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCategory(category: ApiCategory): MenuCategory {
  return {
    ...category,
    id: numberValue(category.id_categoria ?? category.id),
  };
}

function getDefaultPresentation(product: BackendProduct): ApiPresentation | null {
  const presentations = product.presentaciones ?? [];

  if (presentations.length === 0) return null;

  return (
    presentations.find((presentation) => presentation.es_predeterminada) ??
    presentations.find(
      (presentation) =>
        presentation.activo !== false && presentation.disponible !== false
    ) ??
    presentations[0]
  );
}

function normalizeProductFromMenu(
  product: BackendProduct,
  category: ApiCategory
): BackendProduct {
  const defaultPresentation = getDefaultPresentation(product);
  const categoryId = numberValue(category.id_categoria ?? category.id);

  return {
    ...product,
    id_producto: numberValue(product.id_producto ?? product.id),
    id_categoria: numberValue(product.id_categoria ?? product.categoryId ?? categoryId),
    categoria: {
      id_categoria: categoryId,
      nombre: category.nombre,
    },
    precio: product.precio ?? defaultPresentation?.precio ?? 0,
    tiempo_preparacion:
      product.tiempo_preparacion ??
      product.tiempoPreparacion ??
      defaultPresentation?.tiempo_preparacion_minutos ??
      0,
    disponible: product.disponible ?? product.activo ?? true,
    activo: product.activo ?? true,
    presentaciones: product.presentaciones ?? [],
  };
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

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

    if (!res.ok) {
      throw new Error('Error al cargar categorías de la base de datos');
    }

    const data = await readJson<ApiCategory[]>(res);

    return data.map(normalizeCategory);
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
    if (!id) throw new Error('ID de categoría no proporcionado');

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
    if (!id) throw new Error('ID de categoría no proporcionado');

    const res = await fetch(`${CATEGORIAS_API_URL}/${id}`, {
      method: 'DELETE',
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error al eliminar la categoría');
    }

    return data;
  },

  // ==========================================
  //          SECCIÓN DE PRODUCTOS
  // ==========================================

  /**
   * 5. OBTENER PRODUCTOS (GET)
   * Para pedidos usa /api/menu porque trae productos con presentaciones.
   */
  async getProductos(): Promise<BackendProduct[]> {
    const menuRes = await fetch(MENU_API_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (menuRes.ok) {
      const menu = await readJson<ApiCategory[]>(menuRes);

      return menu.flatMap((category) =>
        (category.productos ?? []).map((product) =>
          normalizeProductFromMenu(product, category)
        )
      );
    }

    const productosRes = await fetch(PRODUCTOS_API_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!productosRes.ok) {
      throw new Error('Error al cargar los productos de la base de datos');
    }

    return readJson<BackendProduct[]>(productosRes);
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
    if (!id) throw new Error('ID de producto no proporcionado');

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
    if (!id) throw new Error('ID de producto no proporcionado');

    const res = await fetch(`${PRODUCTOS_API_URL}/${id}`, {
      method: 'DELETE',
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error al eliminar el producto');
    }

    return data;
  },
};