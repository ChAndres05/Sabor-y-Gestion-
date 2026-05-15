import type {
  TableOrder,
  TableOrderStatus,
  TableOrderCustomer,
  AddOrderItemPayload,
} from '../../modules/tables/types/table-order.types';
import type { ClientOrder } from '../types/client-flow.types';
import { mapBackendOrderToWaiterFrontend } from '../mappers/order.mapper';
import type { KitchenOrder } from '../types/kitchen.types';
import { listClientOrdersMock } from '../mocks/client-flow.mock';
import { emitRestaurantStateChanged } from '../utils/events';
import { cocinaApi } from '../../modules/cocina/api/cocina.api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringFromRecord(
  record: Record<string, unknown>,
  keys: string[],
  fallback: string
): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return fallback;
}

async function readApiErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const clonedResponse = response.clone();
    const data = (await clonedResponse.json()) as unknown;

    if (isRecord(data)) {
      return stringFromRecord(data, ['message', 'error', 'mensaje'], fallback);
    }
  } catch {
    try {
      const text = await response.text();
      if (text.trim()) return text;
    } catch {
      return fallback;
    }
  }

  return fallback;
}

async function tryJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) return null;

    const text = await response.text();

    if (!text.trim()) return null;

    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function requestJson<T>(
  url: string,
  init: RequestInit,
  fallbackErrorMessage: string
): Promise<T | null> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, fallbackErrorMessage));
  }

  const text = await response.text();

  if (!text.trim()) return null;

  return JSON.parse(text) as T;
}

async function requestOk(
  url: string,
  init: RequestInit,
  fallbackErrorMessage: string
): Promise<void> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, fallbackErrorMessage));
  }
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

function buildOrderBody(
  tableId: number,
  customer: TableOrderCustomer,
  waiterUserId: number,
  observaciones: string
) {
  return {
    id_mesa: tableId,
    id_usuario_mesero: waiterUserId,
    id_usuario_cliente: customer.idUsuario ?? null,
    // Enviamos los datos del cliente invitado para que el backend los registre
    cliente_nombre: !customer.idUsuario ? customer.nombre : undefined,
    cliente_telefono: !customer.idUsuario ? customer.telefono : undefined,
    cliente_ci: !customer.idUsuario ? customer.ci : undefined,
    observaciones,
  };
}

function mapBackendOrders(data: BackendOrderRecord | BackendOrderRecord[] | null): TableOrder[] {
  if (!data) return [];
  return (Array.isArray(data) ? data : [data]).map((order) =>
    mapBackendOrderToWaiterFrontend(order)
  );
}

export const ordersApi = {
  /**
   * Lista pedidos activos para mesero/admin desde backend.
   */
  async listActiveOrders(): Promise<TableOrder[]> {
    const backendData = await tryJson<BackendOrderRecord[]>(
      `${API_URL}/api/pedidos/activos?t=${Date.now()}`,
      { cache: 'no-store' }
    );
    const backendOrders = mapBackendOrders(backendData);

    return backendOrders.filter(
      (order) =>
        order.estado !== 'PAGADO' &&
        order.estado !== 'CANCELADO'
    );
  },

  /**
   * Busca un cliente por CI en backend.
   */
  async searchCustomerByCi(ci: string): Promise<TableOrderCustomer | null> {
    if (!ci || ci === '0') return null;
    const data = await tryJson<BackendCustomerSearchRecord>(
      `${API_URL}/api/clientes/ci/${ci}`
    );

    if (!data) return null;
    return mapCustomerSearchRecord(data, ci);
  },

  /**
   * Lista pedidos asociados a un cliente específico.
   * Trae activos e historial para que el frontend clasifique.
   */
  async listOrdersByClient(userId: number): Promise<ClientOrder[]> {
    const data = await tryJson<BackendOrderRecord[]>(
      `${API_URL}/api/clientes/pedidos/historial?id_usuario=${userId}`
    );
    if (Array.isArray(data)) {
      return data.map((order) => {
        const mesa = isRecord(order.mesa) ? order.mesa : undefined;
        const tableNum = mesa?.numero ?? order.numero_mesa;
        const sourceVal = mesa || order.origen === 'MESA' ? 'MESA_MESERO' : 'RESERVA';

        const rawItems = Array.isArray(order.detalles_pedido)
          ? order.detalles_pedido
          : Array.isArray(order.productos)
            ? order.productos
            : [];

        const items = rawItems.map((rawProduct) => {
          const prod = isRecord(rawProduct) ? rawProduct : {};
          const presentacion = isRecord(prod.presentacion_producto)
            ? prod.presentacion_producto
            : undefined;
          const producto = isRecord(presentacion?.producto)
            ? presentacion?.producto
            : undefined;

          return {
            id: Number(prod.id_detalle ?? prod.id_detalle_pedido ?? 0),
            quantity: Number(prod.cantidad ?? 0),
            name: String(prod.nombre ?? producto?.nombre ?? 'Producto sin nombre'),
            notes: prod.observaciones ? String(prod.observaciones) : undefined,
            subtotal: Number(prod.subtotal ?? 0),
          };
        });

        return {
          id: Number(order.id_pedido ?? 0),
          orderNumber: String(order.numero_pedido ?? order.id_pedido ?? '').padStart(4, '0'),
          source: sourceVal,
          tableNumber: tableNum ? String(tableNum) : undefined,
          status: order.estado,
          estimatedMinutes: Number(order.tiempo_estimado_minutos ?? 0),
          total: Number(order.total ?? 0),
          createdAt: String(order.fecha_hora_pedido ?? ''),
          items,
        } as unknown as ClientOrder;
      });
    }

    return listClientOrdersMock(userId);
  },

  /**
   * Obtiene los pedidos abiertos de una mesa desde backend.
   */
  async getOpenOrdersByTable(tableId: number): Promise<TableOrder[]> {
    const backendData = await tryJson<BackendOrderRecord | BackendOrderRecord[]>(
      `${API_URL}/api/pedidos/mesa/${tableId}?t=${Date.now()}`,
      { cache: 'no-store' }
    );
    const backendOrders = mapBackendOrders(backendData);

    return backendOrders.filter(
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
    const body = buildOrderBody(
      tableId,
      customer,
      waiterUserId,
      'Pedido creado desde flujo de mesa'
    );
    const data = await requestJson<BackendOrderRecord>(
      `${API_URL}/api/pedidos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      'No se pudo abrir el pedido en backend.'
    );
    emitRestaurantStateChanged();

    const createdOrder = data ? mapBackendOrderToWaiterFrontend(data) : null;
    const fullOrders = await this.getOpenOrdersByTable(tableId);
    const fullOrder = getTargetOrder(fullOrders, createdOrder?.id);
    if (fullOrder) return fullOrder;

    if (createdOrder) return createdOrder;

    throw new Error('El pedido se creó, pero no se pudo recuperar desde backend.');
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

    if (!targetOrder) {
      throw new Error('No hay un pedido activo para esta mesa.');
    }

    if (targetOrder.estado !== 'REGISTRADO') {
      throw new Error('Solo se pueden agregar productos a un pedido registrado.');
    }

    await requestOk(
      `${API_URL}/api/pedidos/${targetOrder.id}/detalles`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_presentacion_producto: payload.presentacionId ?? payload.productoId,
          cantidad: payload.cantidad,
          observaciones: payload.observacion,
          ingredientes: payload.ingredientes.map((ingredient) => ({
            nombre: ingredient.nombre,
            incluido: ingredient.incluido,
          })),
        }),
      },
      'No se pudo agregar el producto al pedido en backend.'
    );
    emitRestaurantStateChanged();

    const updatedOrders = await this.getOpenOrdersByTable(tableId);
    const updatedTargetOrder = getTargetOrder(updatedOrders, targetOrder.id);
    if (!updatedTargetOrder) {
      throw new Error('El producto se agregó, pero no se pudo recuperar el pedido actualizado.');
    }

    return updatedTargetOrder;
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

    if (!targetOrder) {
      throw new Error('No hay un pedido activo para esta mesa.');
    }

    if (targetOrder.estado !== 'REGISTRADO') {
      throw new Error('Solo se pueden editar productos de un pedido registrado.');
    }

    await requestOk(
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
      },
      'No se pudo actualizar el producto del pedido en backend.'
    );
    emitRestaurantStateChanged();

    const updatedOrders = await this.getOpenOrdersByTable(tableId);
    const updatedTargetOrder = getTargetOrder(updatedOrders, targetOrder.id);
    if (!updatedTargetOrder) {
      throw new Error('El producto se actualizó, pero no se pudo recuperar el pedido actualizado.');
    }

    return updatedTargetOrder;
  },

  /**
   * Elimina un ítem del pedido.
   */
  async removeOrderItem(orderId: number, detailId: number, tableId: number): Promise<void> {
    const openOrders = await this.getOpenOrdersByTable(tableId);
    const targetOrder = getTargetOrder(openOrders, orderId);

    if (!targetOrder) {
      throw new Error('No hay un pedido activo para esta mesa.');
    }

    if (targetOrder.estado !== 'REGISTRADO') {
      throw new Error('Solo se pueden eliminar productos de un pedido registrado.');
    }

    await requestOk(
      `${API_URL}/api/pedidos/${targetOrder.id}/detalles/${detailId}`,
      {
        method: 'DELETE',
      },
      'No se pudo eliminar el producto del pedido en backend.'
    );
    emitRestaurantStateChanged();
  },

  /**
   * Actualiza el estado de un pedido en backend.
   * Si el estado es EN_PREPARACION, también registra la asignación en cocina.
   */
  async updateOrderStatus(
    orderId: number,
    status: TableOrderStatus,
    tableId: number,
    userId?: number
  ): Promise<void> {
    const openOrders = await this.getOpenOrdersByTable(tableId);
    const targetOrder = getTargetOrder(openOrders, orderId);

    if (!targetOrder) {
      throw new Error('No hay un pedido activo para esta mesa.');
    }

    // Si se envía a cocina, usar el endpoint especializado que guarda en asignaciones_cocina_pedido
    if (status === 'EN_PREPARACION') {
      await cocinaApi.sendToKitchen(targetOrder.id, userId);
    } else {
      // Para otros estados, usar el endpoint de estado normal
      await requestOk(
        `${API_URL}/api/pedidos/${targetOrder.id}/estado`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: status, id_usuario: userId }),
        },
        'No se pudo actualizar el estado del pedido.'
      );
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
    const openOrders = await this.getOpenOrdersByTable(tableId);
    const hasRegisteredOrder = openOrders.some((order) => order.estado === 'REGISTRADO');

    if (hasRegisteredOrder) {
      throw new Error('Primero envía a cocina el pedido registrado antes de crear un nuevo pedido.');
    }

    const body = buildOrderBody(
      tableId,
      customer,
      waiterUserId,
      'Pedido adicional creado desde flujo de mesa'
    );
    const data = await requestJson<BackendOrderRecord>(
      `${API_URL}/api/pedidos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      'No se pudo crear el nuevo pedido en backend.'
    );
    emitRestaurantStateChanged();

    const createdOrder = data ? mapBackendOrderToWaiterFrontend(data) : null;
    const fullOrders = await this.getOpenOrdersByTable(tableId);
    const fullOrder = getTargetOrder(fullOrders, createdOrder?.id);
    if (fullOrder) return fullOrder;

    if (createdOrder) return createdOrder;

    throw new Error('El nuevo pedido se creó, pero no se pudo recuperar desde backend.');
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
