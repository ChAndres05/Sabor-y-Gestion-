export type TableOrderStatus =
  | 'REGISTRADO'
  | 'PENDIENTE'
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
  correo?: string | null;
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
  imagen?: string | null;
}

export interface TableOrder {
  id: number;
  tableId: number;
  tableNumber?: number;
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
  presentacionId?: number;
  categoryId: number;
  nombre: string;
  descripcion: string;
  precio: number;
  tiempoPreparacion: number;
  disponible: boolean;
  ingredientes: OrderProductIngredient[];
  imagen?: string | null;
}

export interface AddOrderItemPayload {
  categoriaId: number;
  categoriaNombre?: string;
  productoId: number;
  presentacionId?: number;
  productoNombre?: string;
  cantidad: number;
  observacion: string;
  ingredientes: TableOrderItemIngredient[];
  precioUnitario?: number;
  tiempoPreparacion?: number;
  imagen?: string | null;
}

export type UpdateOrderItemPayload = AddOrderItemPayload;
