import type { MenuProduct } from '../../modules/menu/types/menu.types';

export interface BackendProduct {
  id?: number;
  id_producto?: number;
  categoryId?: number;
  id_categoria?: number;
  nombre: string;
  descripcion?: string;
  precio?: string | number;
  tiempo_preparacion?: string | number;
  tiempoPreparacion?: string | number;
  imagen_url?: string;
  imagen?: string;
  activo?: boolean;
  disponible?: boolean;
  presentaciones?: Array<{
    id_presentacion_producto?: number;
    precio?: string | number;
    tiempo_preparacion_minutos?: string | number;
    recetas_presentaciones?: Array<{
      insumo: {
        id_insumo: number;
        nombre: string;
      }
    }>;
  }>;
}

export function mapProductFromBackend(product: BackendProduct): MenuProduct {
  const presentation = product.presentaciones && product.presentaciones.length > 0 
    ? product.presentaciones[0] 
    : null;

  const ingredientes = presentation?.recetas_presentaciones?.map((receta) => ({
    id: receta.insumo.id_insumo,
    nombre: receta.insumo.nombre,
    incluidoPorDefecto: true,
  })) ?? [];

  return {
    id: Number(product.id_producto || product.id || presentation?.id_presentacion_producto || 0),
    categoryId: Number(product.id_categoria || product.categoryId || 0),
    nombre: product.nombre,
    descripcion: product.descripcion || '',
    precio: Number(product.precio || presentation?.precio || 0),
    tiempoPreparacion: Number(
      product.tiempo_preparacion || 
      product.tiempoPreparacion || 
      presentation?.tiempo_preparacion_minutos || 
      0
    ),
    imagen: product.imagen_url || product.imagen || null,
    activo: product.activo ?? true,
    disponible: product.disponible ?? true,
    ingredientes,
  };
}
