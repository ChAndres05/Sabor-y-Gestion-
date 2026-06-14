import type { ClientOrder } from '../types/client-flow.types';
import type { TableOrderStatus } from '../../modules/tables/types/table-order.types';
import { emitRestaurantStateChanged } from '../utils/events';

const DELIVERY_ORDERS_KEY = 'gestionysabor_frontend_orders';

export const orderFlow: Array<{ key: TableOrderStatus; label: string }> = [
  { key: 'REGISTRADO', label: 'Recibido' },
  { key: 'EN_PREPARACION', label: 'En preparación' },
  { key: 'LISTO', label: 'Listo' },
  { key: 'ENTREGADO', label: 'Entregado' },
  { key: 'PAGADO', label: 'Finalizado' },
];

export const deliveryFlow: Array<{ key: TableOrderStatus; label: string }> = [
  { key: 'REGISTRADO', label: 'Recibido' },
  { key: 'EN_PREPARACION', label: 'Preparando' },
  { key: 'LISTO', label: 'Listo' },
  { key: 'EN_CAMINO', label: 'En camino' },
  { key: 'ENTREGADO', label: 'Entregado' },
];

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readStorage<T>(key: string, fallback: T): T {
  if (!hasLocalStorage()) return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export async function listAllDeliveryOrdersMock(): Promise<ClientOrder[]> {
  return readStorage<ClientOrder[]>(DELIVERY_ORDERS_KEY, []);
}

export async function listClientDeliveryOrdersMock(userId: number): Promise<ClientOrder[]> {
  const allOrders = await listAllDeliveryOrdersMock();
  return allOrders.filter((order) => order.userId === userId);
}

export interface CreateDeliveryOrderPayload {
  userId: number;
  customerName: string;
  orderType: 'delivery' | 'mesa';
  tableNumber: string;
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
  paymentMethod?: string;
  paymentReference?: string;
}

export async function createDeliveryOrderMock(payload: CreateDeliveryOrderPayload): Promise<ClientOrder> {
  const existingOrders = await listAllDeliveryOrdersMock();

  const newOrderId = Date.now();
  const newOrderNumber = payload.orderType === 'delivery'
    ? `DEL-${Math.floor(1000 + Math.random() * 9000)}`
    : `PED-${Math.floor(1000 + Math.random() * 9000)}`;

  const newOrder: ClientOrder = {
    id: newOrderId,
    orderNumber: newOrderNumber,
    userId: payload.userId,
    customerName: payload.customerName,
    tableNumber: payload.orderType === 'mesa' ? Number(payload.tableNumber) : null,
    source: payload.orderType === 'delivery' ? 'DELIVERY' : 'MESA_MESERO',
    status: 'REGISTRADO',
    items: payload.items.map((item, index) => ({
      id: index + 1,
      presentacionId: item.presentacionId,
      name: item.nombre,
      quantity: item.cantidad,
      notes: item.observacion,
      ingredients: item.ingredientes.map((ing) => ({
        name: ing.nombre,
        included: ing.incluido,
      })),
      unitPrice: item.precioUnitario,
      subtotal: item.precioUnitario * item.cantidad,
    })),
    subtotal: payload.subtotal,
    total: payload.total,
    estimatedMinutes: 20 + payload.items.length * 5,
    notes: payload.observations,
    createdAt: new Date().toISOString(),
    deliveryAddress: payload.orderType === 'delivery' ? payload.address : undefined,
    deliveryPhone: payload.orderType === 'delivery' ? payload.phone : undefined,
    deliveryFee: payload.orderType === 'delivery' ? payload.deliveryFee : undefined,
    paymentMethod: payload.paymentMethod,
    paymentReference: payload.paymentReference,
  };

  writeStorage(DELIVERY_ORDERS_KEY, [newOrder, ...existingOrders]);
  emitRestaurantStateChanged();

  return newOrder;
}

export async function updateDeliveryOrderStatusMock(orderId: number, nextStatus: TableOrderStatus): Promise<void> {
  const existingOrders = await listAllDeliveryOrdersMock();
  const updated = existingOrders.map((order) =>
    order.id === orderId ? { ...order, status: nextStatus } : order
  );
  writeStorage(DELIVERY_ORDERS_KEY, updated);
  emitRestaurantStateChanged();
}
