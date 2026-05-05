import type { TableOrder, TableOrderStatus } from '../../tables/types/table-order.types';
import type {
  ClientOrder,
  ClientPreparedOrderRequest,
  ClientReservation,
  ClientReservationRequest,
  ClientReservationStatus,
} from '../types/client-flow.types';
import {
  cancelClientReservationMock,
  createClientReservationMock,
  createPreparedReservationOrderMock,
  listClientOrdersMock,
  listClientReservationsMock,
} from '../mocks/client-flow.mock';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface BackendReservation {
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

interface BackendOrderItem {
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

interface BackendOrder {
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

function mapBackendReservation(reservation: BackendReservation): ClientReservation {
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

function mapBackendOrder(orderParam: TableOrder | BackendOrder, userId: number): ClientOrder {
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

async function tryJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const clientFlowApi = {
  async listReservations(userId: number) {
    const data = await tryJson<BackendReservation[]>(`${API_URL}/api/reservas/cliente/${userId}`);

    if (Array.isArray(data)) {
      return data.map(mapBackendReservation);
    }

    return listClientReservationsMock(userId);
  },

  async createReservation(payload: ClientReservationRequest) {
    const data = await tryJson<BackendReservation>(`${API_URL}/api/reservas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario_cliente: payload.userId,
        id_mesa: payload.table.id,
        id_usuario_registro: payload.userId,
        fecha_hora_reserva: `${payload.date}T${payload.time}:00`,
        cantidad_personas: payload.people,
        observaciones: payload.observations,
      }),
    });

    if (data) return mapBackendReservation(data);
    return createClientReservationMock(payload);
  },

  async cancelReservation(userId: number, reservationId: number) {
    const data = await tryJson<BackendReservation>(`${API_URL}/api/reservas/${reservationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'CANCELADA' }),
    });

    if (data) return mapBackendReservation(data);
    return cancelClientReservationMock(userId, reservationId);
  },

  async listOrders(userId: number) {
    const data = await tryJson<BackendOrder[]>(`${API_URL}/api/pedidos/cliente/${userId}`);

    if (Array.isArray(data)) {
      return data.map((order) => mapBackendOrder(order, userId));
    }

    return listClientOrdersMock(userId);
  },

  async createPreparedReservationOrder(payload: ClientPreparedOrderRequest) {
    const data = await tryJson<BackendOrder>(`${API_URL}/api/pedidos/reserva`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario_cliente: payload.userId,
        id_reserva: payload.reservationId,
        observaciones: payload.notes,
        detalles: payload.items.map((item) => ({
          nombre: item.name,
          cantidad: item.quantity,
          precio_unitario: item.unitPrice,
          subtotal: item.subtotal,
          observaciones: item.notes,
        })),
      }),
    });

    if (data) return mapBackendOrder(data, payload.userId);
    return createPreparedReservationOrderMock(payload);
  },
};
