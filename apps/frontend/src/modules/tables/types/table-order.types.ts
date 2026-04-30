export type TableOrderStatus =
  | 'ABIERTO'
  | 'EN_PREPARACION'
  | 'LISTO'
  | 'ENTREGADO'
  | 'CUENTA_SOLICITADA'
  | 'PAGADO'
  | 'CANCELADO';

export interface TableOrderCustomer {
  nombre: string;
  telefono: string;
  ci: string;
}

export interface TableOrderItem {
  id: number;
  productoId: number;
  nombreProducto: string;
  categoriaId: number;
  categoriaNombre: string;
  cantidad: number;
  observacion: string;
  precioUnitario: number;
  tiempoPreparacion: number;
  subtotal: number;
}

export interface TableOrder {
  id: number;
  tableId: number;
  estado: TableOrderStatus;
  customer: TableOrderCustomer;
  items: TableOrderItem[];
  total: number;
  fechaCreacion: string;
}

export interface OrderCatalogCategory {
  id: number;
  nombre: string;
}

export interface OrderCatalogProduct {
  id: number;
  categoryId: number;
  nombre: string;
  descripcion: string;
  precio: number;
  tiempoPreparacion: number;
  disponible: boolean;
}

export interface AddOrderItemPayload {
  categoriaId: number;
  productoId: number;
  cantidad: number;
  observacion: string;
}