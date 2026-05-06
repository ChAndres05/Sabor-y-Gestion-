import type {
  ClientOrder,
  ClientPreparedOrderRequest,
  ClientReservation,
  ClientReservationRequest,
} from '../types/client-flow.types';
import {
  mapBackendReservation,
  mapBackendOrder,
  type BackendReservation,
  type BackendOrder,
} from '../mappers/client-flow.mapper';
import {
  cancelClientReservationMock,
  createClientReservationMock,
  listClientOrdersMock,
  listClientReservationsMock,
  listAllReservationsMock,
  createPreparedReservationOrderMock,
} from '../mocks/client-flow.mock';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
  async listReservations(userId: number): Promise<ClientReservation[]> {
    const data = await tryJson<BackendReservation[]>(`${API_URL}/api/reservas/cliente/${userId}`);

    if (Array.isArray(data)) {
      return data.map(mapBackendReservation);
    }

    return listClientReservationsMock(userId);
  },

  async listAllReservations(): Promise<ClientReservation[]> {
    const data = await tryJson<BackendReservation[]>(`${API_URL}/api/reservas`);

    if (Array.isArray(data)) {
      return data.map(mapBackendReservation);
    }

    return listAllReservationsMock();
  },

  async createReservation(payload: ClientReservationRequest): Promise<ClientReservation> {
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

  async cancelReservation(userId: number, reservationId: number): Promise<ClientReservation> {
    const data = await tryJson<BackendReservation>(`${API_URL}/api/reservas/${reservationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'CANCELADA' }),
    });

    if (data) return mapBackendReservation(data);
    return cancelClientReservationMock(userId, reservationId);
  },

  async listOrders(userId: number): Promise<ClientOrder[]> {
    const data = await tryJson<BackendOrder[]>(`${API_URL}/api/pedidos/cliente/${userId}`);

    if (Array.isArray(data)) {
      return data.map((order) => mapBackendOrder(order, userId));
    }

    return listClientOrdersMock(userId);
  },

  async createPreparedReservationOrder(payload: ClientPreparedOrderRequest): Promise<ClientOrder> {
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
          ingredientes: item.ingredients?.map((ing) => ({
            nombre: ing.name,
            incluido: ing.included,
          })),
        })),
      }),
    });

    if (data) return mapBackendOrder(data, payload.userId);
    return createPreparedReservationOrderMock(payload);
  },
};
