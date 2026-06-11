import type { Insumo, MockProductoReceta, MovimientoStock, CategoriaInsumo } from '../mocks/inventario';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const inventarioApi = {
  async getInsumos(): Promise<Insumo[]> {
    const res = await fetch(`${API_URL}/api/insumos?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al obtener los insumos');
    }
    return res.json() as Promise<Insumo[]>;
  },

  async getCategoriasInsumos(): Promise<CategoriaInsumo[]> {
    const res = await fetch(`${API_URL}/api/insumos/categorias?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al obtener las categorías de insumos');
    }
    return res.json() as Promise<CategoriaInsumo[]>;
  },

  async crearCategoriaInsumo(nombre: string, descripcion?: string): Promise<CategoriaInsumo> {
    const res = await fetch(`${API_URL}/api/insumos/categorias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, descripcion })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || errData.error || 'Error al crear la categoría de insumos');
    }
    return res.json() as Promise<CategoriaInsumo>;
  },

  async crearInsumo(data: {
    nombre: string;
    categoria: string;
    unidad_medida: string;
    stock_inicial: string;
    stock_minimo: string;
  }): Promise<Insumo> {
    const res = await fetch(`${API_URL}/api/insumos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al crear el insumo');
    }
    return res.json() as Promise<Insumo>;
  },

  async getMovimientos(): Promise<MovimientoStock[]> {
    const res = await fetch(`${API_URL}/api/movimientos-stock?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al obtener movimientos de stock');
    }
    return res.json() as Promise<MovimientoStock[]>;
  },

  async getProductosRecetas(): Promise<MockProductoReceta[]> {
    const res = await fetch(`${API_URL}/api/recetas?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al obtener recetas');
    }
    return res.json() as Promise<MockProductoReceta[]>;
  },

  async guardarReceta(idProducto: string, ingredientes: Array<{ id_insumo: string; cantidad: number }>): Promise<void> {
    const res = await fetch(`${API_URL}/api/recetas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_producto: idProducto, ingredientes })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al guardar la receta');
    }
  }
};
