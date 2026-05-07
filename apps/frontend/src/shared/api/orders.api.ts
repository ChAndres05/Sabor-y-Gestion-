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
  updateOrderItemInTableMock,
  searchOrderCustomerByCiMock
} from '../mocks/table-orders.mock';
import { listClientOrdersMock } from '../mocks/client-flow.mock';
import { emitRestaurantStateChanged } from '../utils/events';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type BackendTableRecord = { id_mesa?: number | string; id?: number | string };
type BackendOrderRecord = Record<string, unknown>;

const SIMULATED_STATUSES_STORAGE_KEY = 'gestionysabor_simulated_statuses';

function readSimulatedStatuses(): Record<number, TableOrderStatus> {
  if (typeof window === 'undefined') return {};
  try {
    const value = window.localStorage.getItem(SIMULATED_STATUSES_STORAGE_KEY);
    return value ? (JSON.parse(value) as Record<number, TableOrderStatus>) : {};
  } catch {
    return {};
  }
}

function writeSimulatedStatus(orderId: number, status: TableOrderStatus) {
  if (typeof window === 'undefined' || orderId <= 0) return;
  const statuses = readSimulatedStatuses();
  statuses[orderId] = status;
  window.localStorage.setItem(SIMULATED_STATUSES_STORAGE_KEY, JSON.stringify(statuses));
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
    const tables = await tryJson<BackendTableRecord[]>(`${API_URL}/api/mesas`);
    const validIds = new Set(
      Array.isArray(tables) 
        ? tables.map((t) => Number(t.id_mesa ?? t.id)) 
        : []
    );

    // Intentamos obtener pedidos de backend
    const backendData = await tryJson<BackendOrderRecord[]>(`${API_URL}/api/pedidos/activos`);
    const simulatedStatuses = readSimulatedStatuses();
    const backendOrders = Array.isArray(backendData)
      ? backendData.map(o => mapBackendOrderToWaiterFrontend(o, simulatedStatuses))
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
   * Busca un cliente por CI en backend o mock
   */
  async searchCustomerByCi(ci: string): Promise<TableOrderCustomer | null> {
    if (!ci || ci === '0') return null;

    try {
      const response = await fetch(`${API_URL}/api/clientes/ci/${ci}`);
      if (response.ok) {
        const data = await response.json();
        if (data) {
          // El backend puede devolver diferentes formatos según el endpoint
          return {
            idUsuario: data.id_usuario ?? data.id ?? null,
            nombre: data.nombre ? `${data.nombre} ${data.apellido || ''}`.trim() : 'Cliente registrado',
            telefono: data.telefono || data.celular || '00000000',
            ci: String(data.usuario_ci ?? data.ci ?? data.documento ?? ci),
          };
        }
      }
    } catch (error) {
      console.error('Error searching customer by CI in backend:', error);
    }

    // Fallback al mock
    return searchOrderCustomerByCiMock(ci);
  },

  /**
   * Lista pedidos asociados a un cliente específico
   */
  async listOrdersByClient(userId: number): Promise<ClientOrder[]> {
    const data = await tryJson<BackendOrderRecord[]>(`${API_URL}/api/pedidos/cliente/${userId}`);
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
    const tables = await tryJson<BackendTableRecord[]>(`${API_URL}/api/mesas`);
    const tableExists = Array.isArray(tables)
      ? tables.some((t) => Number(t.id_mesa ?? t.id) === Number(tableId))
      : true; // Si no podemos validar, no bloqueamos

    if (!tableExists) return [];

    // Pedidos de backend
    const backendData = await tryJson<BackendOrderRecord | BackendOrderRecord[]>(`${API_URL}/api/pedidos/mesa/${tableId}`);
    const simulatedStatuses = readSimulatedStatuses();
    const backendOrders: TableOrder[] = backendData 
      ? (Array.isArray(backendData) ? backendData : [backendData]).map(o => mapBackendOrderToWaiterFrontend(o, simulatedStatuses))
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

    const data = await tryJson<BackendOrderRecord>(`${API_URL}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (data) {
      emitRestaurantStateChanged();
      // Re-consultar para obtener el objeto completo con relaciones si es necesario
      const fullOrder = await this.getActiveOrder(tableId);
      if (fullOrder) return fullOrder;
    }

    const mockOrder = await saveOrderCustomerMock(tableId, customer, waiterUserId);
    emitRestaurantStateChanged();
    return mockOrder;
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
    let backendUpdated = false;

    if (orderId > 0) {
      try {
        const res = await fetch(`${API_URL}/api/pedidos/${orderId}/estado`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: status })
        });
        backendUpdated = res.ok;
      } catch {
        backendUpdated = false;
      }

      // Overlay local para que las pantallas operativas no dependan de que el endpoint esté completo.
      writeSimulatedStatus(orderId, status);
    }

    await updateOrderStatusForTableMock(tableId, status);

    if (!backendUpdated) {
      // El flujo mock es temporal mientras backend completa pedidos/cocina.
      // No lanzamos error porque el cambio debe seguir reflejándose entre roles.
    }

    emitRestaurantStateChanged();
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
        tableNumber: o.tableNumber || 0,
        customerName: o.customer?.nombre || 'Cliente Genérico'
      }));
  }
};
