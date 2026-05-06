import type {
  TableOrder,
  TableOrderStatus,
  TableOrderCustomer,
  AddOrderItemPayload,
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
  searchOrderCustomerByCiMock,
} from '../mocks/table-orders.mock';
import { listClientOrdersMock } from '../mocks/client-flow.mock';
import { emitRestaurantStateChanged } from '../utils/events';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type BackendTableRecord = {
  id_mesa?: number | string;
  id?: number | string;
};

type BackendOrderRecord = Record<string, unknown>;

type BackendCustomerRecord = {
  id_usuario?: number | null;
  id?: number | null;
  nombre?: string | null;
  apellido?: string | null;
  telefono?: string | null;
  celular?: string | null;
  usuario_ci?: number | string | null;
  ci?: number | string | null;
  documento?: number | string | null;
};

const SIMULATED_STATUSES_STORAGE_KEY = 'gestionysabor_simulated_statuses';

function readSimulatedStatuses(): Record<number, TableOrderStatus> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const value = window.localStorage.getItem(SIMULATED_STATUSES_STORAGE_KEY);

    return value ? (JSON.parse(value) as Record<number, TableOrderStatus>) : {};
  } catch {
    return {};
  }
}

function writeSimulatedStatus(orderId: number, status: TableOrderStatus) {
  if (typeof window === 'undefined' || orderId <= 0) {
    return;
  }

  const statuses = readSimulatedStatuses();

  statuses[orderId] = status;

  window.localStorage.setItem(
    SIMULATED_STATUSES_STORAGE_KEY,
    JSON.stringify(statuses)
  );
}

async function tryJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, init);

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function mergeOrdersByIdOrSource(
  backend: TableOrder[],
  mock: TableOrder[]
): TableOrder[] {
  const mergedMap = new Map<number, TableOrder>();

  backend.forEach((order) => mergedMap.set(order.id, order));

  mock.forEach((order) => mergedMap.set(order.id, order));

  return Array.from(mergedMap.values());
}

export const ordersApi = {
  /**
   * Lista pedidos activos para mesero/admin
   */
  async listActiveOrders(): Promise<TableOrder[]> {
    const tables = await tryJson<BackendTableRecord[]>(`${API_URL}/api/mesas`);

    const validIds = new Set(
      Array.isArray(tables)
        ? tables.map((table) => Number(table.id_mesa ?? table.id))
        : []
    );

    const backendData = await tryJson<BackendOrderRecord[]>(
      `${API_URL}/api/pedidos/activos`
    );

    const simulatedStatuses = readSimulatedStatuses();

    const backendOrders = Array.isArray(backendData)
      ? backendData.map((order) =>
          mapBackendOrderToWaiterFrontend(order, simulatedStatuses)
        )
      : [];

    const mockOrders = await listWaiterOrdersMock();

    const allOrders = mergeOrdersByIdOrSource(backendOrders, mockOrders);

    return allOrders.filter(
      (order: TableOrder) =>
        order.estado !== 'PAGADO' &&
        order.estado !== 'CANCELADO' &&
        (validIds.size === 0 || validIds.has(order.tableId))
    );
  },

  /**
   * Busca un cliente por CI en backend o mock
   */
  async searchCustomerByCi(ci: string): Promise<TableOrderCustomer | null> {
    if (!ci || ci === '0') {
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/api/clientes/ci/${ci}`);

      if (response.ok) {
        const data = (await response.json()) as BackendCustomerRecord | null;

        if (data) {
          const nombreCompleto = data.nombre
            ? `${data.nombre} ${data.apellido || ''}`.trim()
            : 'Cliente registrado';

          return {
            idUsuario: data.id_usuario ?? data.id ?? null,
            nombre: nombreCompleto,
            telefono: data.telefono || data.celular || '00000000',
            ci: String(data.usuario_ci ?? data.ci ?? data.documento ?? ci),
          };
        }
      }
    } catch (error) {
      console.error('Error searching customer by CI in backend:', error);
    }

    return searchOrderCustomerByCiMock(ci);
  },

  /**
   * Lista pedidos asociados a un cliente específico
   */
  async listOrdersByClient(userId: number): Promise<ClientOrder[]> {
    const data = await tryJson<BackendOrderRecord[]>(
      `${API_URL}/api/pedidos/cliente/${userId}`
    );

    if (Array.isArray(data)) {
      return data.map((order) => mapBackendOrder(order, userId));
    }

    return listClientOrdersMock(userId);
  },

  /**
   * Obtiene los pedidos abiertos de una mesa
   */
  async getOpenOrdersByTable(tableId: number): Promise<TableOrder[]> {
    const tables = await tryJson<BackendTableRecord[]>(`${API_URL}/api/mesas`);

    const tableExists = Array.isArray(tables)
      ? tables.some((table) => Number(table.id_mesa ?? table.id) === Number(tableId))
      : true;

    if (!tableExists) {
      return [];
    }

    const backendData = await tryJson<BackendOrderRecord | BackendOrderRecord[]>(
      `${API_URL}/api/pedidos/mesa/${tableId}`
    );

    const simulatedStatuses = readSimulatedStatuses();

    const backendOrders: TableOrder[] = backendData
      ? (Array.isArray(backendData) ? backendData : [backendData]).map((order) =>
          mapBackendOrderToWaiterFrontend(order, simulatedStatuses)
        )
      : [];

    const mockOrders = await getOpenOrdersByTableMock(tableId);

    const combined = mergeOrdersByIdOrSource(backendOrders, mockOrders);

    return combined.filter(
      (order) => order.estado !== 'PAGADO' && order.estado !== 'CANCELADO'
    );
  },

  /**
   * Obtiene el primer pedido editable o el último activo de una mesa
   */
  async getActiveOrder(tableId: number): Promise<TableOrder | null> {
    const orders = await this.getOpenOrdersByTable(tableId);

    if (orders.length === 0) {
      return null;
    }

    return orders.find((order) => order.estado === 'REGISTRADO') || orders[0];
  },

  /**
   * Crea o actualiza los datos del cliente de un pedido en mesa
   */
  async saveOrderCustomer(
    tableId: number,
    customer: TableOrderCustomer,
    waiterUserId: number
  ): Promise<TableOrder> {
    const body = {
      id_mesa: tableId,
      id_usuario_mesero: waiterUserId,
      id_usuario_cliente: customer.idUsuario ?? null,
      observaciones: 'Pedido creado desde flujo de mesa',
    };

    const data = await tryJson<BackendOrderRecord>(`${API_URL}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (data) {
      emitRestaurantStateChanged();

      const fullOrder = await this.getActiveOrder(tableId);

      if (fullOrder) {
        return fullOrder;
      }
    }

    const mockOrder = await saveOrderCustomerMock(
      tableId,
      customer,
      waiterUserId
    );

    emitRestaurantStateChanged();

    return mockOrder;
  },

  /**
   * Añade un ítem al pedido de una mesa
   */
  async addOrderItem(
    tableId: number,
    payload: AddOrderItemPayload
  ): Promise<TableOrder> {
    const openOrder = await this.getActiveOrder(tableId);

    if (openOrder) {
      const response = await fetch(
        `${API_URL}/api/pedidos/${openOrder.id}/detalles`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_presentacion_producto: payload.productoId,
            cantidad: payload.cantidad,
            observaciones: payload.observacion,
            ingredientes: payload.ingredientes.map((ingrediente) => ({
              nombre: ingrediente.nombre,
              incluido: ingrediente.incluido,
            })),
          }),
        }
      );

      if (response.ok) {
        emitRestaurantStateChanged();

        const updated = await this.getActiveOrder(tableId);

        if (updated) {
          return updated;
        }
      }
    }

    return addOrderItemToTableMock(tableId, payload);
  },

  /**
   * Actualiza un ítem existente en el pedido
   */
  async updateOrderItem(
    tableId: number,
    itemId: number,
    payload: AddOrderItemPayload
  ): Promise<TableOrder> {
    const openOrder = await this.getActiveOrder(tableId);

    if (openOrder) {
      const response = await fetch(
        `${API_URL}/api/pedidos/${openOrder.id}/detalles/${itemId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cantidad: payload.cantidad,
            observaciones: payload.observacion,
            ingredientes: payload.ingredientes.map((ingrediente) => ({
              nombre: ingrediente.nombre,
              incluido: ingrediente.incluido,
            })),
          }),
        }
      );

      if (response.ok) {
        emitRestaurantStateChanged();

        const updated = await this.getActiveOrder(tableId);

        if (updated) {
          return updated;
        }
      }
    }

    return updateOrderItemInTableMock(tableId, itemId, payload);
  },

  /**
   * Elimina un ítem del pedido
   */
  async removeOrderItem(
    orderId: number,
    detailId: number,
    tableId: number
  ): Promise<void> {
    const response = await fetch(
      `${API_URL}/api/pedidos/${orderId}/detalles/${detailId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      await removeOrderItemFromTableMock(tableId, detailId);
    }
  },

  /**
   * Actualiza el estado de un pedido
   */
  async updateOrderStatus(
    orderId: number,
    status: TableOrderStatus,
    tableId: number
  ): Promise<void> {
    if (orderId > 0) {
      try {
        await fetch(`${API_URL}/api/pedidos/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: status }),
        });
      } catch (error) {
        console.error('Error updating order status in backend:', error);
      }

      writeSimulatedStatus(orderId, status);
    }

    await updateOrderStatusForTableMock(tableId, status);

    emitRestaurantStateChanged();
  },

  /**
   * Crea una nueva comanda para una mesa
   */
  async createExtraOrder(
    tableId: number,
    customer: TableOrderCustomer,
    waiterUserId: number
  ): Promise<TableOrder> {
    return createExtraOrderMock(tableId, customer, waiterUserId);
  },

  /**
   * Métodos para Cocina
   */
  async listKitchenOrders(): Promise<KitchenOrder[]> {
    const orders = await this.listActiveOrders();

    return orders
      .filter((order) =>
        ['REGISTRADO', 'EN_PREPARACION', 'LISTO'].includes(order.estado)
      )
      .map((order) => {
        const status: KitchenOrder['status'] =
          order.estado === 'REGISTRADO'
            ? 'pending'
            : order.estado === 'EN_PREPARACION'
              ? 'preparing'
              : 'ready';

        const source: KitchenOrder['source'] = order.customer?.nombre
          ?.toLowerCase()
          .includes('reserva')
          ? 'reserva'
          : 'mesa';

        return {
          id: order.id,
          orderNumber: order.id,
          items: order.items.map((item) => ({
            name: item.nombreProducto,
            quantity: item.cantidad,
            checked: order.estado !== 'REGISTRADO',
          })),
          status,
          isToggled: order.estado !== 'REGISTRADO',
          source,
          tableNumber: order.tableNumber || 0,
          customerName: order.customer?.nombre || 'Cliente Genérico',
        };
      });
  },
};
