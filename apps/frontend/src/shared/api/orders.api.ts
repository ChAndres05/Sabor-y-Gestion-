import type { KitchenOrder } from '../types/kitchen.types';

const API_URL = import.meta.env.VITE_API_URL;

export type TableOrderStatus = 'REGISTRADO' | 'EN_PREPARACION' | 'LISTO';

interface BackendProducto {
  nombre?: string | null;
}

interface BackendPresentacionProducto {
  producto?: BackendProducto | null;
}

interface BackendDetallePedido {
  id_detalle_pedido: number;
  cantidad: number;
  observaciones?: string | null;
  presentacion_producto?: BackendPresentacionProducto | null;
}

interface BackendPedido {
  id_pedido: number;
  estado: string;
  id_mesa?: number | null;
  detalles_pedido?: BackendDetallePedido[] | null;
}

const mapBackendStatusToKitchenStatus = (
  status: string
): KitchenOrder['status'] => {
  if (status === 'REGISTRADO') {
    return 'pending';
  }

  if (status === 'EN_PREPARACION') {
    return 'preparing';
  }

  return 'ready';
};

const mapBackendOrderToKitchenOrder = (
  order: BackendPedido
): KitchenOrder => {
  return {
    id: order.id_pedido,
    orderNumber: order.id_pedido,
    status: mapBackendStatusToKitchenStatus(order.estado),
    tableNumber: order.id_mesa ?? 0,
    source: 'mesa',
    items: (order.detalles_pedido ?? []).map((detalle) => ({
      id: detalle.id_detalle_pedido,
      name:
        detalle.presentacion_producto?.producto?.nombre ??
        'Producto',
      quantity: detalle.cantidad,
      notes: detalle.observaciones ?? '',
    })),
  };
};

export const ordersApi = {
  listKitchenOrders: async (): Promise<KitchenOrder[]> => {
    try {
      const response = await fetch(`${API_URL}/api/cocina/pedidos`);

      if (!response.ok) {
        throw new Error('Error fetching orders');
      }

      const backendData: BackendPedido[] = await response.json();

      return backendData.map(mapBackendOrderToKitchenOrder);
    } catch (error) {
      console.error(
        'Error fallback using empty array for listKitchenOrders',
        error
      );

      return [];
    }
  },

  updateOrderStatus: async (
    orderId: number,
    status: TableOrderStatus,
    tableNumber: number
  ) => {
    void tableNumber;

    const response = await fetch(`${API_URL}/api/pedidos/${orderId}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: status }),
    });

    if (!response.ok) {
      throw new Error('Error updating order status');
    }

    return response.json();
  },
};
