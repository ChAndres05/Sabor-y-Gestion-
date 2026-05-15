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

export interface UserSearchResponse {
  id: string;
  nombre: string;
  apellido: string;
  documento: string;
  rol: string;
  correo: string;
  estado: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function safeFetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, init);
    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType || !contentType.includes("application/json")) {
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Error en fetch a ${url}:`, error);
    return null;
  }
}

export const clientFlowApi = {
  async listReservations(userId: number): Promise<ClientReservation[]> {
    const data = await safeFetchJson<BackendReservation[]>(`${API_URL}/api/reservas/cliente/${userId}`);
    if (!data || !Array.isArray(data)) return [];
    
    return data
      .map(mapBackendReservation)
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  },

  async listAllReservations(): Promise<ClientReservation[]> {
    const data = await safeFetchJson<BackendReservation[]>(`${API_URL}/api/reservas`);
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
        id_usuario_cliente: payload.userId,
        id_mesa: payload.table.id,
        id_usuario_registro: payload.registeredById ?? payload.userId,
        fecha_hora_reserva: `${payload.date}T${payload.time}:00Z`,
        cantidad_personas: payload.people,
        observaciones: payload.observations,
      }),
    });

    if (!res.ok) throw new Error('Error al crear la reserva en el servidor');
    
    const data = await res.json() as BackendReservation;
    return mapBackendReservation(data);
  },

  async cancelReservation(_userId: number, reservationId: number): Promise<void> {
    const res = await fetch(`${API_URL}/api/reservas/${reservationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'CANCELADA' })
    });

    if (!res.ok) throw new Error('No se pudo cancelar la reserva.');
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
          id_presentacion_producto: item.presentacionId ?? item.id,
          cantidad: item.quantity,
          precio_unitario: item.unitPrice,
          subtotal: item.subtotal,
          observaciones: item.notes,
        })),
      }),
    });

    if (!res.ok) throw new Error('Error al enviar el pedido a cocina.');
  },

  async findClientByCI(ci: string): Promise<UserSearchResponse | null> {
    const data = await safeFetchJson<UserSearchResponse[]>(`${API_URL}/api/busqueda?q=${ci}`);
    if (!data || !Array.isArray(data)) return null;
    const cliente = data.find(u => u.documento === ci);
    return cliente || null;
  }
};