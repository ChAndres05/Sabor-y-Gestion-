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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function safeFetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, init);
    const contentType = response.headers.get("content-type");
    // Si el servidor responde con un error o no es JSON (ej. devuelve un HTML 404), abortamos
    if (!response.ok || !contentType || !contentType.includes("application/json")) {
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Error en fetch a ${url}:`, error);
    return null;
  }
}

async function updateTableStatusBackend(tableId: number, status: TableStatus): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/mesas/${tableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: status }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const clientFlowApi = {
  async listReservations(userId: number): Promise<ClientReservation[]> {
    const data = await safeFetchJson<BackendReservation[]>(`${API_URL}/api/reservas/usuario/${userId}`);
    if (!data || !Array.isArray(data)) return [];
    
    return data
      .map(mapBackendReservation)
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  },

  async listAllReservations(): Promise<ClientReservation[]> {
    // IMPORTANTE: Si esta ruta /api/admin/reservas no existe en el back, devolverá []
    const data = await safeFetchJson<BackendReservation[]>(`${API_URL}/api/admin/reservas`);
    if (!data || !Array.isArray(data)) return [];
    
    return data
      .map(mapBackendReservation)
      .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  },

  async createReservation(payload: ClientReservationRequest): Promise<ClientReservation> {
    const res = await fetch(`${API_URL}/api/reservas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario: payload.userId,
        id_mesa: payload.table.id,
        fecha: payload.date,
        hora_inicio: payload.time,
        cantidad_personas: payload.people,
        observaciones: payload.observations,
      }),
    });

    if (!res.ok) throw new Error('Error al crear la reserva en el servidor');
    
    const data = await res.json() as BackendReservation;
    await updateTableStatusBackend(payload.table.id, 'RESERVADA');
    return mapBackendReservation(data);
  },

  async cancelReservation(userId: number, reservationId: number, tableId?: number): Promise<void> {
    const res = await fetch(`${API_URL}/api/reservas/${reservationId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, tableId })
    });

    if (!res.ok) throw new Error('No se pudo cancelar la reserva.');
    
    if (tableId) {
      const activeOrders = await ordersApi.getOpenOrdersByTable(tableId);
      if (activeOrders.length === 0) {
        await updateTableStatusBackend(tableId, 'LIBRE');
      }
    }
  },

  async listOrders(userId: number): Promise<ClientOrder[]> {
    const data = await safeFetchJson<BackendOrder[]>(`${API_URL}/api/clientes/pedidos/historial/${userId}`);
    if (!data || !Array.isArray(data)) return [];
    return data.map((order) => mapBackendOrder(order, userId));
  },

  async createPreparedReservationOrder(payload: ClientPreparedOrderRequest): Promise<void> {
    const res = await fetch(`${API_URL}/api/pedidos/reserva`, {
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

    if (!res.ok) throw new Error('Error al enviar el pedido a cocina.');
  },
};