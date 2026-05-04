export type TableOrderStatus =
  | 'REGISTRADO'
  | 'EN_PREPARACION'
  | 'LISTO'
  | 'EN_CAMINO'
  | 'ENTREGADO'
  | 'PAGADO'
  | 'CANCELADO';

export interface TableOrderCustomer {
  nombre: string;
  telefono: string;
  ci: string;
  idUsuario?: number | null;
}

export interface OrderProductIngredient {
  id: number;
  nombre: string;
  incluidoPorDefecto: boolean;
}

export interface TableOrderItemIngredient {
  nombre: string;
  incluido: boolean;
}

export interface TableOrderItem {
  id: number;
  productoId: number;
  nombreProducto: string;
  categoriaId: number;
  categoriaNombre: string;
  cantidad: number;
  observacion: string;
  ingredientes: TableOrderItemIngredient[];
  precioUnitario: number;
  tiempoPreparacion: number;
  subtotal: number;
}

export interface TableOrder {
  id: number;
  tableId: number;
  tipoPedido: 'MESA';
  estado: TableOrderStatus;
  waiterName: string;
  customer: TableOrderCustomer;
  items: TableOrderItem[];
  subtotal: number;
  impuesto: number;
  descuento: number;
  total: number;
  tiempoEstimadoMinutos: number;
  observaciones: string;
  fechaCreacion: string;
  fechaEntrega?: string;
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
  ingredientes: OrderProductIngredient[];
}

export interface AddOrderItemPayload {
  categoriaId: number;
  productoId: number;
  cantidad: number;
  observacion: string;
  ingredientes: TableOrderItemIngredient[];
}

export type UpdateOrderItemPayload = AddOrderItemPayload;
