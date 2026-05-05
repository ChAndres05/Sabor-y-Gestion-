import type { TableOrder } from '../../tables/types/table-order.types';
import type {
  ClientOrder,
  ClientPreparedOrderRequest,
  ClientReservation,
  ClientReservationRequest,
} from '../types/client-flow.types';
import {
  cancelClientReservationMock,
  createClientReservationMock,
  createPreparedReservationOrderMock,
  listClientOrdersMock,
  listClientReservationsMock,
} from '../mocks/client-flow.mock';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function mapBackendReservation(reservation: any): ClientReservation {
  return {
    id: reservation.id_reserva ?? reservation.id,
    userId: reservation.id_usuario_cliente ?? reservation.userId,
    tableId: reservation.id_mesa ?? reservation.tableId,
    tableNumber: reservation.mesa?.numero ?? reservation.tableNumber ?? reservation.id_mesa,
    zoneName: reservation.mesa?.zona?.nombre ?? reservation.zoneName ?? 'Sin zona',
    people: reservation.cantidad_personas ?? reservation.people ?? 1,
    date: String(reservation.fecha_hora_reserva ?? reservation.date).slice(0, 10),
    time:
      reservation.time ??
      String(reservation.fecha_hora_reserva ?? '00:00').slice(11, 16) ??
      '00:00',
    status: reservation.estado ?? 'CONFIRMADA',
    observations: reservation.observaciones ?? reservation.observations ?? '',
    linkedOrderId: reservation.id_pedido ?? reservation.linkedOrderId,
    createdAt: reservation.fecha_registro ?? reservation.createdAt ?? new Date().toISOString(),
  };
}

function mapBackendOrder(order: TableOrder | any, userId: number): ClientOrder {
  const items = (order.items ?? order.detalles_pedido ?? []).map((item: any, index: number) => {
    const unitPrice = Number(item.precioUnitario ?? item.precio_unitario ?? 0);
    const quantity = Number(item.cantidad ?? 1);
    return {
      id: item.id ?? item.id_detalle_pedido ?? index + 1,
      name: item.nombreProducto ?? item.producto?.nombre ?? item.name ?? 'Producto',
      quantity,
      notes: item.observacion ?? item.observaciones ?? item.notes ?? '',
      unitPrice,
      subtotal: Number(item.subtotal ?? unitPrice * quantity),
    };
  });

  return {
    id: order.id ?? order.id_pedido,
    orderNumber: String(order.orderNumber ?? order.id_pedido ?? order.id),
    userId: order.customer?.idUsuario ?? order.id_usuario_cliente ?? userId,
    tableNumber: order.tableId ?? order.id_mesa ?? order.tableNumber ?? null,
    source: order.reservationId || order.id_reserva ? 'RESERVA_PREPARADA' : 'MESA_MESERO',
    reservationId: order.reservationId ?? order.id_reserva,
    status: order.estado ?? order.status ?? 'REGISTRADO',
    items,
    subtotal: Number(order.subtotal ?? 0),
    total: Number(order.total ?? order.subtotal ?? 0),
    estimatedMinutes: Number(order.tiempoEstimadoMinutos ?? order.tiempo_estimado_minutos ?? 0),
    notes: order.observaciones ?? order.notes ?? '',
    createdAt: order.fechaCreacion ?? order.fecha_hora_pedido ?? order.createdAt ?? new Date().toISOString(),
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
    const data = await tryJson<any[]>(`${API_URL}/api/reservas/cliente/${userId}`);

    if (Array.isArray(data)) {
      return data.map(mapBackendReservation);
    }

    return listClientReservationsMock(userId);
  },

  async createReservation(payload: ClientReservationRequest) {
    const data = await tryJson<any>(`${API_URL}/api/reservas`, {
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
    const data = await tryJson<any>(`${API_URL}/api/reservas/${reservationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'CANCELADA' }),
    });

    if (data) return mapBackendReservation(data);
    return cancelClientReservationMock(userId, reservationId);
  },

  async listOrders(userId: number) {
    const data = await tryJson<any[]>(`${API_URL}/api/pedidos/cliente/${userId}`);

    if (Array.isArray(data)) {
      return data.map((order) => mapBackendOrder(order, userId));
    }

    return listClientOrdersMock(userId);
  },

  async createPreparedReservationOrder(payload: ClientPreparedOrderRequest) {
    const data = await tryJson<any>(`${API_URL}/api/pedidos/reserva`, {
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
