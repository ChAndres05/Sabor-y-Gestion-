import type { 
  TableOrder, 
  TableOrderStatus, 
  TableOrderCustomer,
  AddOrderItemPayload
} from '../../modules/tables/types/table-order.types';
import type { ClientOrder } from '../types/client-flow.types';
import { mapBackendOrder } from '../mappers/client-flow.mapper';
import { mapBackendOrderToWaiterFrontend } from '../mappers/order.mapper';
import type { KitchenOrder } from '../types/kitchen.types';
import { 
  getOpenOrdersByTableMock,
  listWaiterOrdersMock,
  saveOrderCustomerMock,
  createExtraOrderMock,
  addOrderItemToTableMock,
  removeOrderItemFromTableMock,
  updateOrderStatusForTableMock,
  updateOrderItemInTableMock
} from '../mocks/table-orders.mock';
import { listClientOrdersMock } from '../mocks/client-flow.mock';
import { emitRestaurantStateChanged } from '../utils/events';

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

function mergeOrdersByIdOrSource(backend: TableOrder[], mock: TableOrder[]): TableOrder[] {
  const mergedMap = new Map<number, TableOrder>();
  
  // Agregamos primero backend
  backend.forEach(o => mergedMap.set(o.id, o));
  
  // Sobrescribimos con mock si coincide ID, o agregamos nuevos
  // Preferimos mock para operación local reciente según requerimiento
  mock.forEach(o => mergedMap.set(o.id, o));
  
  return Array.from(mergedMap.values());
}

export const ordersApi = {
  /**
   * Lista pedidos activos para mesero/admin
   */
  async listActiveOrders(): Promise<TableOrder[]> {
    // Obtener mesas válidas para filtrar pedidos huérfanos del mock
    const tables = await tryJson<any[]>(`${API_URL}/api/mesas`);
    const validIds = new Set(
      Array.isArray(tables) 
        ? tables.map((t: any) => Number(t.id_mesa ?? t.id)) 
        : []
    );

    // Intentamos obtener pedidos de backend
    const backendData = await tryJson<any[]>(`${API_URL}/api/pedidos/activos`);
    const backendOrders = Array.isArray(backendData)
      ? backendData.map(o => mapBackendOrderToWaiterFrontend(o))
      : [];

    // Obtenemos pedidos mock
    const mockOrders = await listWaiterOrdersMock();

    // Combinamos ambos
    const allOrders = mergeOrdersByIdOrSource(backendOrders, mockOrders);

    return allOrders.filter((o: TableOrder) => 
      o.estado !== 'PAGADO' && 
      o.estado !== 'CANCELADO' && 
      (validIds.size === 0 || validIds.has(o.tableId))
    );
  },

  /**
   * Lista pedidos asociados a un cliente específico
   */
  async listOrdersByClient(userId: number): Promise<ClientOrder[]> {
    const data = await tryJson<any[]>(`${API_URL}/api/pedidos/cliente/${userId}`);
    if (Array.isArray(data)) {
      return data.map((order) => mapBackendOrder(order, userId));
    }
    return listClientOrdersMock(userId);
  },

  /**
   * Obtiene los pedidos abiertos de una mesa
   */
  async getOpenOrdersByTable(tableId: number): Promise<TableOrder[]> {
    // Validar que la mesa exista (usando la lista general para evitar 405 en endpoint individual)
    const tables = await tryJson<any[]>(`${API_URL}/api/mesas`);
    const tableExists = Array.isArray(tables)
      ? tables.some((t) => Number(t.id_mesa ?? t.id) === Number(tableId))
      : true; // Si no podemos validar, no bloqueamos

    if (!tableExists) return [];

    // Pedidos de backend
    const backendData = await tryJson<any>(`${API_URL}/api/pedidos/mesa/${tableId}`);
    const backendOrders: TableOrder[] = backendData 
      ? (Array.isArray(backendData) ? backendData : [backendData]).map(o => mapBackendOrderToWaiterFrontend(o))
      : [];

    // Pedidos mock
    const mockOrders = await getOpenOrdersByTableMock(tableId);

    // Combinamos
    const combined = mergeOrdersByIdOrSource(backendOrders, mockOrders);

    return combined.filter(o => o.estado !== 'PAGADO' && o.estado !== 'CANCELADO');
  },

  /**
   * Obtiene el primer pedido editable (REGISTRADO) o el último activo de una mesa
   */
  async getActiveOrder(tableId: number): Promise<TableOrder | null> {
    const orders = await this.getOpenOrdersByTable(tableId);
    if (orders.length === 0) return null;
    // Priorizar el que esté en REGISTRADO para edición
    return orders.find(o => o.estado === 'REGISTRADO') || orders[0];
  },

  /**
   * Crea o actualiza los datos del cliente de un pedido en mesa
   */
  async saveOrderCustomer(tableId: number, customer: TableOrderCustomer, waiterUserId: number): Promise<TableOrder> {
    const body = {
      id_mesa: tableId,
      id_usuario_mesero: waiterUserId,
      id_usuario_cliente: customer.idUsuario ?? null,
      observaciones: 'Pedido creado desde flujo de mesa'
    };

    const data = await tryJson<any>(`${API_URL}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (data) {
      // Re-consultar para obtener el objeto completo con relaciones si es necesario
      const fullOrder = await this.getActiveOrder(tableId);
      if (fullOrder) return fullOrder;
    }

    return saveOrderCustomerMock(tableId, customer, waiterUserId);
  },

  /**
   * Añade un ítem al pedido de una mesa
   */
  async addOrderItem(tableId: number, payload: AddOrderItemPayload): Promise<TableOrder> {
    const openOrder = await this.getActiveOrder(tableId);
    
    if (openOrder) {
      const res = await fetch(`${API_URL}/api/pedidos/${openOrder.id}/detalles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_presentacion_producto: payload.productoId,
          cantidad: payload.cantidad,
          observaciones: payload.observacion,
          ingredientes: payload.ingredientes.map(i => ({
            nombre: i.nombre,
            incluido: i.incluido
          }))
        })
      });

      if (res.ok) {
        emitRestaurantStateChanged();
        const updated = await this.getActiveOrder(tableId);
        if (updated) return updated;
      }
    }

    return addOrderItemToTableMock(tableId, payload);
  },

  /**
   * Actualiza un ítem existente en el pedido
   */
  async updateOrderItem(tableId: number, itemId: number, payload: AddOrderItemPayload): Promise<TableOrder> {
    const openOrder = await this.getActiveOrder(tableId);
    
    if (openOrder) {
      const res = await fetch(`${API_URL}/api/pedidos/${openOrder.id}/detalles/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidad: payload.cantidad,
          observaciones: payload.observacion,
          ingredientes: payload.ingredientes.map(i => ({
            nombre: i.nombre,
            incluido: i.incluido
          }))
        })
      });

      if (res.ok) {
        emitRestaurantStateChanged();
        const updated = await this.getActiveOrder(tableId);
        if (updated) return updated;
      }
    }

    return updateOrderItemInTableMock(tableId, itemId, payload);
  },

  /**
   * Elimina un ítem del pedido
   */
  async removeOrderItem(orderId: number, detailId: number, tableId: number): Promise<void> {
    const res = await fetch(`${API_URL}/api/pedidos/${orderId}/detalles/${detailId}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      await removeOrderItemFromTableMock(tableId, detailId);
    }
  },

  /**
   * Actualiza el estado de un pedido
   */
  async updateOrderStatus(orderId: number, status: TableOrderStatus, tableId: number): Promise<void> {
    const res = await fetch(`${API_URL}/api/pedidos/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: status })
    });

    if (res.ok) {
      emitRestaurantStateChanged();
    } else {
      await updateOrderStatusForTableMock(tableId, status);
    }
  },

  /**
   * Crea una nueva comanda (pedido extra) para una mesa
   */
  async createExtraOrder(tableId: number, customer: TableOrderCustomer, waiterUserId: number): Promise<TableOrder> {
    // Si el backend no soporta múltiples pedidos, esto podría fallar o sobreescribir.
    // Por ahora, lo implementamos en el mock para demostración.
    return createExtraOrderMock(tableId, customer, waiterUserId);
  },

  /**
   * Métodos para Cocina
   */
  async listKitchenOrders(): Promise<KitchenOrder[]> {
    const orders = await this.listActiveOrders();
    // Filtrar solo los que cocina debe ver: REGISTRADO y EN_PREPARACION
    return orders
      .filter(o => ['REGISTRADO', 'EN_PREPARACION', 'LISTO'].includes(o.estado))
      .map(o => ({
        id: o.id,
        orderNumber: o.id,
        items: o.items.map(item => ({
          name: item.nombreProducto,
          quantity: item.cantidad,
          checked: o.estado !== 'REGISTRADO'
        })),
        status: o.estado === 'REGISTRADO' ? 'pending' : 
                o.estado === 'EN_PREPARACION' ? 'preparing' : 'ready',
        isToggled: o.estado !== 'REGISTRADO',
        source: o.customer?.nombre?.toLowerCase().includes('reserva') ? 'reserva' : 'mesa',
        tableNumber: o.tableId,
        customerName: o.customer?.nombre || 'Cliente Genérico'
      }));
  }
};
