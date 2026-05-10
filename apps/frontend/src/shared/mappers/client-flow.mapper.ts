import type { TableOrderStatus } from '../../modules/tables/types/table-order.types';
import type { 
  ClientOrder, 
  ClientReservation, 
  ClientReservationStatus 
} from '../types/client-flow.types';

export interface BackendReservation {
  id_reserva?: number;
  id?: number;
  id_usuario_cliente?: number;
  id_mesa?: number;
  mesa?: { 
    numero?: number; 
    zona?: { nombre?: string } 
  };
  cantidad_personas?: number;
  fecha_hora_reserva?: string;
  estado?: string;
  observaciones?: string;
  id_pedido?: number;
  fecha_registro?: string;
}

export interface BackendOrderItem {
  id_detalle_pedido?: number;
  precio_unitario?: number;
  cantidad?: number;
  producto?: { nombre?: string };
  observaciones?: string;
  subtotal?: number;
}

export interface BackendOrder {
  id_pedido?: number;
  id_usuario_cliente?: number;
  id_mesa?: number;
  id_reserva?: number;
  estado?: string;
  detalles_pedido?: BackendOrderItem[];
  subtotal?: number;
  total?: number;
  tiempo_estimado_minutos?: number;
  observaciones?: string;
  fecha_hora_pedido?: string;
}

export function mapBackendReservation(reservation: BackendReservation): ClientReservation {
  const fullDate = reservation.fecha_hora_reserva || new Date().toISOString();
  
  return {
    id: Number(reservation.id_reserva ?? 0),
    userId: Number(reservation.id_usuario_cliente ?? 0),
    tableId: Number(reservation.id_mesa ?? 0),
    tableNumber: Number(reservation.mesa?.numero ?? 0),
    zoneName: String(reservation.mesa?.zona?.nombre ?? 'Sin zona'),
    people: Number(reservation.cantidad_personas ?? 1),
    date: fullDate.split('T')[0],
    time: fullDate.includes('T') ? fullDate.split('T')[1].substring(0, 5) : '00:00',
    status: String(reservation.estado ?? 'CONFIRMADA') as ClientReservationStatus,
    observations: String(reservation.observaciones ?? ''),
    linkedOrderId: reservation.id_pedido,
    createdAt: String(reservation.fecha_registro ?? new Date().toISOString()),
  };
}

export function mapBackendOrder(order: BackendOrder, userId: number): ClientOrder {
  const items = (order.detalles_pedido ?? []).map((item, index) => {
    const unitPrice = Number(item.precio_unitario ?? 0);
    const quantity = Number(item.cantidad ?? 1);
    return {
      id: Number(item.id_detalle_pedido ?? index + 1),
      name: String(item.producto?.nombre ?? 'Producto'),
      quantity,
      notes: String(item.observaciones ?? ''),
      unitPrice,
      subtotal: Number(item.subtotal ?? unitPrice * quantity),
    };
  });

  return {
    id: Number(order.id_pedido ?? 0),
    orderNumber: String(order.id_pedido ?? ''),
    userId: Number(order.id_usuario_cliente ?? userId),
    tableNumber: null, 
    source: order.id_reserva ? 'RESERVA_PREPARADA' : 'MESA_MESERO',
    reservationId: order.id_reserva,
    status: String(order.estado ?? 'REGISTRADO') as TableOrderStatus,
    items,
    subtotal: Number(order.subtotal ?? 0),
    total: Number(order.total ?? order.subtotal ?? 0),
    estimatedMinutes: Number(order.tiempo_estimado_minutos ?? 0),
    notes: String(order.observaciones ?? ''),
    createdAt: String(order.fecha_hora_pedido ?? new Date().toISOString()),
  };
}