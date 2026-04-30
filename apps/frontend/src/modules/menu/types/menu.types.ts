export interface MenuCategory {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  totalProductos: number;
}

export interface MenuProduct {
  id: number;
  categoryId: number;
  nombre: string;
  descripcion: string;
  precio: number;
  tiempoPreparacion: number;
  imagen: string | null;
  activo: boolean;
  disponible: boolean;
}

export interface MenuCategoryFormValues {
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export interface MenuProductFormValues {
  categoryId: number;
  nombre: string;
  descripcion: string;
  precio: number;
  tiempoPreparacion: number;
  imagen: string | null;
  disponible: boolean;
}

export type CategoryStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
export type ProductStatusFilter = 'ALL' | 'AVAILABLE' | 'UNAVAILABLE';
export type ProductCategoryFilter = 'ALL' | number;
export type MenuTab = 'categories' | 'products';

export interface BackendProductPayload {
  nombre?: string;
  descripcion?: string;
  id_categoria?: number;
  precio?: number;
  tiempo_preparacion?: number;
  imagen_url?: string | null;
  activo?: boolean;
  disponible?: boolean;
}