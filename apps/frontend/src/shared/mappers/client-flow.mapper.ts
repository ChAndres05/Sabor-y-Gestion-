import type { TableOrder, TableOrderStatus } from '../../modules/tables/types/table-order.types';
import type { 
  ClientOrder, 
  ClientReservation, 
  ClientReservationStatus 
} from '../types/client-flow.types';

export interface BackendReservation {
  id?: number;
  id_reserva?: number;
  userId?: number;
  id_usuario_cliente?: number;
  tableId?: number;
  id_mesa?: number;
  tableNumber?: number | string;
  mesa?: { numero?: string | number; zona?: { nombre?: string } };
  zoneName?: string;
  people?: number;
  cantidad_personas?: number;
  date?: string;
  fecha_hora_reserva?: string;
  time?: string;
  estado?: string;
  status?: string;
  observaciones?: string;
  observations?: string;
  id_pedido?: number;
  linkedOrderId?: number;
  fecha_registro?: string;
  createdAt?: string;
}

export interface BackendOrderItem {
  id?: number;
  id_detalle_pedido?: number;
  precioUnitario?: number;
  precio_unitario?: number;
  cantidad?: number;
  nombreProducto?: string;
  producto?: { nombre?: string };
  name?: string;
  observacion?: string;
  observaciones?: string;
  notes?: string;
  subtotal?: number;
}

export interface BackendOrder {
  id?: number;
  id_pedido?: number;
  orderNumber?: string | number;
  customer?: { idUsuario?: number };
  id_usuario_cliente?: number;
  tableId?: number;
  id_mesa?: number;
  tableNumber?: number | string;
  reservationId?: number;
  id_reserva?: number;
  estado?: string;
  status?: string;
  items?: BackendOrderItem[];
  detalles_pedido?: BackendOrderItem[];
  subtotal?: number;
  total?: number;
  tiempoEstimadoMinutos?: number;
  tiempo_estimado_minutos?: number;
  observaciones?: string;
  notes?: string;
  fechaCreacion?: string;
  fecha_hora_pedido?: string;
  createdAt?: string;
  reservationTime?: string;
  prepareFrom?: string;
}

export function mapBackendReservation(reservation: BackendReservation): ClientReservation {
  return {
    id: Number(reservation.id_reserva ?? reservation.id ?? 0),
    userId: Number(reservation.id_usuario_cliente ?? reservation.userId ?? 0),
    tableId: Number(reservation.id_mesa ?? reservation.tableId ?? 0),
    tableNumber: Number(reservation.mesa?.numero ?? reservation.tableNumber ?? reservation.id_mesa ?? 0),
    zoneName: String(reservation.mesa?.zona?.nombre ?? reservation.zoneName ?? 'Sin zona'),
    people: Number(reservation.cantidad_personas ?? reservation.people ?? 1),
    date: String(reservation.fecha_hora_reserva ?? reservation.date).slice(0, 10),
    time:
      reservation.time ??
      String(reservation.fecha_hora_reserva ?? '00:00').slice(11, 16) ??
      '00:00',
    status: String(reservation.estado ?? 'CONFIRMADA') as ClientReservationStatus,
    observations: String(reservation.observaciones ?? reservation.observations ?? ''),
    linkedOrderId: reservation.id_pedido ?? reservation.linkedOrderId,
    createdAt: String(reservation.fecha_registro ?? reservation.createdAt ?? new Date().toISOString()),
  };
}

export function mapBackendOrder(orderParam: TableOrder | BackendOrder, userId: number): ClientOrder {
  const order = orderParam as BackendOrder & TableOrder;
  const items = (order.items ?? order.detalles_pedido ?? []).map((itemParam: BackendOrderItem, index: number) => {
    const item = itemParam;
    const unitPrice = Number(item.precioUnitario ?? item.precio_unitario ?? 0);
    const quantity = Number(item.cantidad ?? 1);
    return {
      id: Number(item.id ?? item.id_detalle_pedido ?? index + 1),
      name: String(item.nombreProducto ?? item.producto?.nombre ?? item.name ?? 'Producto'),
      quantity,
      notes: String(item.observacion ?? item.observaciones ?? item.notes ?? ''),
      unitPrice,
      subtotal: Number(item.subtotal ?? unitPrice * quantity),
    };
  });

  return {
    id: Number(order.id ?? order.id_pedido ?? 0),
    orderNumber: String(order.orderNumber ?? order.id_pedido ?? order.id ?? ''),
    userId: Number(order.customer?.idUsuario ?? order.id_usuario_cliente ?? userId),
    tableNumber: order.tableId ?? order.id_mesa ?? order.tableNumber ?? null,
    source: order.reservationId || order.id_reserva ? 'RESERVA_PREPARADA' : 'MESA_MESERO',
    reservationId: order.reservationId ?? order.id_reserva,
    status: String(order.estado ?? order.status ?? 'REGISTRADO') as TableOrderStatus,
    items,
    subtotal: Number(order.subtotal ?? 0),
    total: Number(order.total ?? order.subtotal ?? 0),
    estimatedMinutes: Number(order.tiempoEstimadoMinutos ?? order.tiempo_estimado_minutos ?? 0),
    notes: String(order.observaciones ?? order.notes ?? ''),
    createdAt: String(order.fechaCreacion ?? order.fecha_hora_pedido ?? order.createdAt ?? new Date().toISOString()),
    reservationTime: order.reservationTime,
    prepareFrom: order.prepareFrom,
  };
}
