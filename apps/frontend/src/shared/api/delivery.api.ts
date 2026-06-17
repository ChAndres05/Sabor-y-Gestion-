import type { ClientOrder } from '../types/client-flow.types';
import type { TableOrderStatus } from '../../modules/tables/types/table-order.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface RestaurantConfig {
  restaurantLat: number;
  restaurantLng: number;
}

export interface CreateDeliveryPayload {
  userId?: number;
  customerName: string;
  phone: string;
  address: string;
  observations: string;
  items: Array<{
    productoId: number;
    presentacionId?: number;
    nombre: string;
    precioUnitario: number;
    cantidad: number;
    observacion: string;
    ingredientes: Array<{ nombre: string; incluido: boolean }>;
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryLat: number;
  deliveryLng: number;
  paymentMethod: string;
}

export const deliveryApi = {
  /**
   * Obtiene la ubicación configurada del restaurante.
   */
  async getRestaurantConfig(): Promise<RestaurantConfig> {
    const response = await fetch(`${API_URL}/api/admin/config`);
    if (!response.ok) {
      throw new Error('No se pudo obtener la configuración del restaurante');
    }
    return response.json();
  },

  /**
   * Actualiza la ubicación del restaurante.
   */
  async saveRestaurantConfig(restaurantLat: number, restaurantLng: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/admin/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantLat, restaurantLng }),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'No se pudo guardar la ubicación del restaurante');
    }
  },

  /**
   * Crea un pedido de delivery en el backend y BD.
   */
  async createDeliveryOrder(payload: CreateDeliveryPayload): Promise<ClientOrder> {
    const response = await fetch(`${API_URL}/api/pedidos/delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al crear el pedido de delivery');
    }
    return response.json();
  },

  /**
   * Lista todos los pedidos de delivery activos para Cajero/Administración/Repartidor.
   */
  async listAllDeliveryOrders(): Promise<ClientOrder[]> {
    const response = await fetch(`${API_URL}/api/pedidos/delivery?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error('No se pudieron listar los pedidos de delivery');
    }
    return response.json();
  },

  /**
   * Actualiza el estado de un pedido de delivery en el backend.
   */
  async updateDeliveryStatus(
    orderId: number,
    status: TableOrderStatus,
    userId?: number
  ): Promise<void> {
    const response = await fetch(`${API_URL}/api/pedidos/delivery/${orderId}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: status, id_usuario: userId }),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'No se pudo actualizar el estado del pedido');
    }
  },

  /**
   * Emite la ubicación del repartidor en tiempo real por WebSockets.
   */
  async sendRepartidorLocation(orderId: number, lat: number, lng: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/pedidos/delivery/${orderId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    });
    if (!response.ok) {
      throw new Error('No se pudo enviar la ubicación del repartidor');
    }
  },
};
