import type {
  ClientOrder,
  ClientPreparedOrderRequest,
  ClientReservation,
  ClientReservationRequest,
} from '../types/client-flow.types';
import type { TableStatus } from '../../modules/tables/types/table.types';
import {
  mapBackendReservation,
  mapBackendOrder,
  type BackendReservation,
  type BackendOrder,
} from '../mappers/client-flow.mapper';
import { ordersApi } from './orders.api';
import {
  cancelClientReservationMock,
  createClientReservationMock,
  listClientOrdersMock,
  listClientReservationsMock,
  listAllReservationsMock,
  createPreparedReservationOrderMock,
  cancelActiveReservationsByTableMock,
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

async function updateTableStatusBackend(tableId: number, status: TableStatus): Promise<boolean> {
  try {
    // Intentamos con el endpoint de admin primero, si no con el general
    let res = await fetch(`${API_URL}/api/admin/mesas/${tableId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: status }),
    });

    if (!res.ok) {
      res = await fetch(`${API_URL}/api/mesas/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: status }),
      });
    }

    return res.ok;
  } catch (error) {
    console.error('Error updating table status:', error);
    return false;
  }
}

export const clientFlowApi = {
  async listReservations(userId: number): Promise<ClientReservation[]> {
    // data === null  → backend falló, usar mock
    // data === []    → backend OK pero sin reservas, NO mezclar con mock
    const data = await tryJson<BackendReservation[]>(`${API_URL}/api/reservas/cliente/${userId}`);

    if (data !== null) {
      return data
        .map(mapBackendReservation)
        .filter(r => r.userId === userId)
        .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
    }

    // Fallback: backend no disponible
    return (await listClientReservationsMock(userId))
      .filter(r => r.userId === userId)
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  },

  async listAllReservations(): Promise<ClientReservation[]> {
    // data === null  → backend falló, usar mock
    // data === []    → backend OK pero vacío, NO mezclar con mock
    const data = await tryJson<BackendReservation[]>(`${API_URL}/api/reservas`);

    if (data !== null) {
      return data
        .map(mapBackendReservation)
        .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
    }

    // Fallback: backend no disponible
    return (await listAllReservationsMock())
      .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  },

  async createReservation(payload: ClientReservationRequest): Promise<ClientReservation> {
    const body = JSON.stringify({
      // id_usuario_cliente: only set when there's a real client (not staff)
      ...(payload.clientUserId ? { id_usuario_cliente: payload.clientUserId } : {}),
      id_mesa: payload.table.id,
      // id_usuario_registro: the staff member or client who registered the reservation
      id_usuario_registro: payload.registrarUserId ?? payload.userId,
      fecha_hora_reserva: `${payload.date}T${payload.time}:00`,
      cantidad_personas: payload.people,
      observaciones: payload.observations,
    });

    let response: Response;
    try {
      response = await fetch(`${API_URL}/api/reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    } catch (networkError) {
      // Backend totalmente inaccesible → usar mock como fallback
      console.warn('[createReservation] Backend no disponible, usando mock:', networkError);
      const mockRes = await createClientReservationMock(payload);
      const { updateTableStatusMock } = await import('../mocks/tables.mock');
      await updateTableStatusMock(payload.table.id, 'RESERVADA');
      return mockRes;
    }

    if (!response.ok) {
      // Backend respondió con error → leer mensaje y lanzar error real
      let errorMsg = `Error ${response.status} al crear la reserva`;
      try {
        const errorBody = await response.json() as { error?: string };
        if (errorBody.error) errorMsg = errorBody.error;
      } catch { /* ignorar si no hay JSON */ }
      console.error('[createReservation] Error del backend:', errorMsg);
      throw new Error(errorMsg);
    }

    const data = await response.json() as BackendReservation;
    console.log('[createReservation] Reserva creada en BD:', data);
    return mapBackendReservation(data);
  },

  async cancelReservation(userId: number, reservationId: number, tableId?: number): Promise<ClientReservation> {
    const data = await tryJson<BackendReservation>(`${API_URL}/api/reservas/${reservationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'CANCELADA' }),
    });

    if (data) {
      const reservation = mapBackendReservation(data);
      const tid = tableId || reservation.tableId;
      if (tid) {
        // Solo poner la mesa en LIBRE si no hay otros pedidos activos en esa mesa
        const activeOrders = await ordersApi.getOpenOrdersByTable(tid);
        if (activeOrders.length === 0) {
          await updateTableStatusBackend(tid, 'LIBRE');
        }
      }
      return reservation;
    }
    
    const mockRes = await cancelClientReservationMock(userId, reservationId);
    
    // En mock también liberamos la mesa si corresponde
    const tid = tableId || mockRes.tableId;
    if (tid) {
      const activeOrders = await ordersApi.getOpenOrdersByTable(tid);
      if (activeOrders.length === 0) {
        const { updateTableStatusMock } = await import('../mocks/tables.mock');
        await updateTableStatusMock(tid, 'LIBRE');
      }
    }
    
    return mockRes;
  },

  async cancelActiveReservationsByTable(tableId: number): Promise<void> {
    try {
      // Si el backend no tiene este endpoint, fallará con 404, pero no queremos que bloquee la limpieza del mock
      await fetch(`${API_URL}/api/reservas/mesa/${tableId}/cancelar`, { method: 'POST' });
    } catch (error) {
      console.warn('Backend reservation cancel failed (expected if mock flow):', error);
    }
    
    // Siempre intentamos limpiar el mock para asegurar sincronización
    await cancelActiveReservationsByTableMock(tableId);
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
