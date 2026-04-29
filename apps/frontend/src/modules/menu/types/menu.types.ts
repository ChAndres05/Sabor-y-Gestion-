export interface MenuCategory {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  totalProductos: number;
}

export interface MenuCategoryFormValues {
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export type CategoryStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
export type MenuTab = 'categories' | 'products';