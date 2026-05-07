import type {
  TableOrder,
  TableOrderStatus,
  TableOrderCustomer,
  AddOrderItemPayload,
} from '../../modules/tables/types/table-order.types';
import type { ClientOrder } from '../types/client-flow.types';
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

type BackendCustomerSearchRecord = {
  id_usuario?: number | string | null;
  id?: number | string | null;
  nombre?: string | null;
  apellido?: string | null;
  telefono?: string | null;
  celular?: string | null;
  usuario_ci?: string | number | null;
  ci?: string | number | null;
  documento?: string | number | null;
};

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

  backend.forEach((order) => mergedMap.set(order.id, order));
  mock.forEach((order) => mergedMap.set(order.id, order));

  return Array.from(mergedMap.values());
}

function getTargetOrder(orders: TableOrder[], orderId?: number): TableOrder | null {
  if (typeof orderId === 'number') {
    const selectedOrder = orders.find((order) => order.id === orderId);
    if (selectedOrder) return selectedOrder;
  }
  return orders.find((order) => order.estado === 'REGISTRADO') ?? orders[0] ?? null;
}

function mapCustomerSearchRecord(
  data: BackendCustomerSearchRecord,
  searchedCi: string
): TableOrderCustomer {
  const firstName = typeof data.nombre === 'string' ? data.nombre : '';
  const lastName = typeof data.apellido === 'string' ? data.apellido : '';
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    idUsuario:
      data.id_usuario === null || typeof data.id_usuario === 'undefined'
        ? data.id === null || typeof data.id === 'undefined'
          ? null
          : Number(data.id)
        : Number(data.id_usuario),
    nombre: fullName || 'Cliente registrado',
    telefono:
      (typeof data.telefono === 'string' && data.telefono) ||
      (typeof data.celular === 'string' && data.celular) ||
      '00000000',
    ci: String(data.usuario_ci ?? data.ci ?? data.documento ?? searchedCi),
  };
}

export const ordersApi = {
  /**
   * Lista pedidos activos para mesero/admin.
   */
  async listActiveOrders(): Promise<TableOrder[]> {
    const tables = await tryJson<BackendTableRecord[]>(`${API_URL}/api/mesas`);
    const validIds = new Set(
      Array.isArray(tables)
        ? tables.map((table) => Number(table.id_mesa ?? table.id))
        : []
    );

    const backendData = await tryJson<BackendOrderRecord[]>(`${API_URL}/api/pedidos/activos`);
    const simulatedStatuses = readSimulatedStatuses();
    const backendOrders = Array.isArray(backendData)
      ? backendData.map((order) => mapBackendOrderToWaiterFrontend(order, simulatedStatuses))
      : [];

    const mockOrders = await listWaiterOrdersMock();
    const allOrders = mergeOrdersByIdOrSource(backendOrders, mockOrders);

    return allOrders.filter(
      (order) =>
        order.estado !== 'PAGADO' &&
        order.estado !== 'CANCELADO' &&
        (validIds.size === 0 || validIds.has(order.tableId))
    );
  },

  /**
   * Busca un cliente por CI en backend o mock.
   */
  async searchCustomerByCi(ci: string): Promise<TableOrderCustomer | null> {
    if (!ci || ci === '0') return null;

    const data = await tryJson<BackendCustomerSearchRecord>(`${API_URL}/api/clientes/ci/${ci}`);

    if (data) {
      return mapCustomerSearchRecord(data, ci);
    }

    return searchOrderCustomerByCiMock(ci);
  },

  /**
   * Lista pedidos asociados a un cliente específico.
   * Trae todo: Activos e Historial para que el Frontend lo clasifique.
   */
  async listOrdersByClient(userId: number): Promise<ClientOrder[]> {
    const data = await tryJson<BackendOrderRecord[]>(`${API_URL}/api/clientes/pedidos/historial?id_usuario=${userId}`);

    if (Array.isArray(data)) {
      return data.map((order) => {
        const isRawPrisma = !!order.detalles_pedido;
        const mesa = order.mesa as Record<string, unknown> | undefined;
        const tableNum = isRawPrisma ? mesa?.numero : order.numero_mesa;
        const sourceVal = (isRawPrisma && mesa) || order.origen === 'MESA' ? 'MESA_MESERO' : 'RESERVA';

        const rawItems = isRawPrisma ? order.detalles_pedido : order.productos;
        const itemsList = Array.isArray(rawItems) ? rawItems : [];

        const items = itemsList.map((prod: BackendOrderRecord) => {
          const presentacion = prod.presentacion_producto as Record<string, unknown> | undefined;
          const producto = presentacion?.producto as Record<string, unknown> | undefined;

          return {
            id: Number(prod.id_detalle || prod.id_detalle_pedido || 0),
            quantity: Number(prod.cantidad || 0),
            name: String(prod.nombre || producto?.nombre || 'Producto sin nombre'),
            notes: prod.observaciones ? String(prod.observaciones) : undefined,
            subtotal: Number(prod.subtotal || 0)
          };
        });

        const mappedOrder = {
          id: Number(order.id_pedido || 0),
          orderNumber: String(order.numero_pedido || order.id_pedido || '').padStart(4, '0'),
          source: sourceVal,
          tableNumber: tableNum ? String(tableNum) : undefined,
          status: order.estado,
          estimatedMinutes: Number(order.tiempo_estimado_minutos || 0),
          total: Number(order.total || 0),
          createdAt: String(order.fecha_hora_pedido || ''),
          items: items
        };

        return mappedOrder as unknown as ClientOrder;
      });
    }

    return listClientOrdersMock(userId);
  },

  /**
   * Obtiene los pedidos abiertos de una mesa.
   */
  async getOpenOrdersByTable(tableId: number): Promise<TableOrder[]> {
    const tables = await tryJson<BackendTableRecord[]>(`${API_URL}/api/mesas`);
    const tableExists = Array.isArray(tables)
      ? tables.some((table) => Number(table.id_mesa ?? table.id) === Number(tableId))
      : true;

    if (!tableExists) return [];

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
   * Obtiene el primer pedido editable o el primer activo de una mesa.
   */
  async getActiveOrder(tableId: number): Promise<TableOrder | null> {
    const orders = await this.getOpenOrdersByTable(tableId);

    if (orders.length === 0) return null;

    return orders.find((order) => order.estado === 'REGISTRADO') ?? orders[0];
  },

  /**
   * Crea o actualiza los datos del cliente de un pedido en mesa.
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
      if (fullOrder) return fullOrder;
    }

    const mockOrder = await saveOrderCustomerMock(tableId, customer, waiterUserId);

    emitRestaurantStateChanged();
    return mockOrder;
  },

  /**
   * Añade un ítem al pedido seleccionado de una mesa.
   */
  async addOrderItem(
    tableId: number,
    payload: AddOrderItemPayload,
    orderId?: number
  ): Promise<TableOrder> {
    const openOrders = await this.getOpenOrdersByTable(tableId);
    const targetOrder = getTargetOrder(openOrders, orderId);

    if (targetOrder && targetOrder.id > 0) {
      try {
        const response = await fetch(`${API_URL}/api/pedidos/${targetOrder.id}/detalles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_presentacion_producto: payload.productoId,
            cantidad: payload.cantidad,
            observaciones: payload.observacion,
            ingredientes: payload.ingredientes.map((ingredient) => ({
              nombre: ingredient.nombre,
              incluido: ingredient.incluido,
            })),
          }),
        });

        if (response.ok) {
          emitRestaurantStateChanged();

          const updatedOrders = await this.getOpenOrdersByTable(tableId);
          const updatedTargetOrder = getTargetOrder(updatedOrders, targetOrder.id);

          if (updatedTargetOrder) return updatedTargetOrder;
        }
      } catch {
        // Si backend no responde, continuamos con mock local.
      }
    }

    const mockOrder = await addOrderItemToTableMock(
      tableId,
      payload,
      targetOrder?.id ?? orderId
    );

    emitRestaurantStateChanged();
    return mockOrder;
  },

  /**
   * Actualiza un ítem existente en el pedido seleccionado.
   */
  async updateOrderItem(
    tableId: number,
    itemId: number,
    payload: AddOrderItemPayload,
    orderId?: number
  ): Promise<TableOrder> {
    const openOrders = await this.getOpenOrdersByTable(tableId);
    const targetOrder = getTargetOrder(openOrders, orderId);

    if (targetOrder && targetOrder.id > 0) {
      try {
        const response = await fetch(
          `${API_URL}/api/pedidos/${targetOrder.id}/detalles/${itemId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cantidad: payload.cantidad,
              observaciones: payload.observacion,
              ingredientes: payload.ingredientes.map((ingredient) => ({
                nombre: ingredient.nombre,
                incluido: ingredient.incluido,
              })),
            }),
          }
        );

        if (response.ok) {
          emitRestaurantStateChanged();

          const updatedOrders = await this.getOpenOrdersByTable(tableId);
          const updatedTargetOrder = getTargetOrder(updatedOrders, targetOrder.id);

          if (updatedTargetOrder) return updatedTargetOrder;
        }
      } catch {
        // Si backend no responde, continuamos con mock local.
      }
    }

    const mockOrder = await updateOrderItemInTableMock(
      tableId,
      itemId,
      payload,
      targetOrder?.id ?? orderId
    );

    emitRestaurantStateChanged();
    return mockOrder;
  },

  /**
   * Elimina un ítem del pedido.
   */
  async removeOrderItem(orderId: number, detailId: number, tableId: number): Promise<void> {
    if (orderId > 0) {
      try {
        const response = await fetch(`${API_URL}/api/pedidos/${orderId}/detalles/${detailId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          emitRestaurantStateChanged();
          return;
        }
      } catch {
        // Si backend no responde, continuamos con mock local.
      }
    }

    await removeOrderItemFromTableMock(tableId, detailId, orderId);
    emitRestaurantStateChanged();
  },

  /**
   * Actualiza el estado de un pedido.
   */
  async updateOrderStatus(
    orderId: number,
    status: TableOrderStatus,
    tableId: number
  ): Promise<void> {
    let backendUpdated = false;

    if (orderId > 0) {
      try {
        const response = await fetch(`${API_URL}/api/pedidos/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: status }),
        });

        backendUpdated = response.ok;
      } catch {
        backendUpdated = false;
      }

      writeSimulatedStatus(orderId, status);
    }

    await updateOrderStatusForTableMock(tableId, status, orderId);

    if (!backendUpdated) {
      // El flujo mock es temporal mientras backend completa pedidos/cocina.
      // No lanzamos error porque el cambio debe seguir reflejándose entre roles.
    }

    emitRestaurantStateChanged();
  },

  /**
   * Crea un nuevo pedido extra para una mesa.
   */
  async createExtraOrder(
    tableId: number,
    customer: TableOrderCustomer,
    waiterUserId: number
  ): Promise<TableOrder> {
    return createExtraOrderMock(tableId, customer, waiterUserId);
  },

  /**
   * Métodos para Cocina.
   */
  async listKitchenOrders(): Promise<KitchenOrder[]> {
    const orders = await this.listActiveOrders();

    return orders
      .filter((order) => ['REGISTRADO', 'EN_PREPARACION', 'LISTO'].includes(order.estado))
      .map((order) => ({
        id: order.id,
        orderNumber: order.id,
        items: order.items.map((item) => ({
          name: item.nombreProducto,
          quantity: item.cantidad,
          checked: order.estado !== 'REGISTRADO',
        })),
        status:
          order.estado === 'REGISTRADO'
            ? 'pending'
            : order.estado === 'EN_PREPARACION'
              ? 'preparing'
              : 'ready',
        isToggled: order.estado !== 'REGISTRADO',
        source: order.customer?.nombre?.toLowerCase().includes('reserva')
          ? 'reserva'
          : 'mesa',
        tableNumber: order.tableNumber || 0,
        customerName: order.customer?.nombre || 'Cliente Genérico',
      }));
  },
};