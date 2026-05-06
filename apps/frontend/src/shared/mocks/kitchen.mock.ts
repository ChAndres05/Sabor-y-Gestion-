import type { KitchenOrder } from '../types/kitchen.types';

const KITCHEN_STORAGE_KEY = 'gestionysabor_kitchen_orders';

const initialOrders: KitchenOrder[] = [];

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readStorage(): KitchenOrder[] {
  if (!hasLocalStorage()) return initialOrders;
  try {
    const value = window.localStorage.getItem(KITCHEN_STORAGE_KEY);
    return value ? JSON.parse(value) : initialOrders;
  } catch {
    return initialOrders;
  }
}

function writeStorage(orders: KitchenOrder[]) {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(KITCHEN_STORAGE_KEY, JSON.stringify(orders));
}

const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listKitchenOrdersMock(): Promise<KitchenOrder[]> {
  await delay();
  return readStorage();
}

export async function toggleKitchenOrderMock(id: number): Promise<KitchenOrder[]> {
  await delay();
  const orders = readStorage();
  const next = orders.map((order) =>
    order.id === id ? { ...order, isToggled: !order.isToggled } : order
  );
  writeStorage(next);
  return next;
}

export async function toggleKitchenOrderItemMock(orderId: number, itemIndex: number): Promise<KitchenOrder[]> {
  await delay();
  const orders = readStorage();
  const next = orders.map((order) => {
    if (order.id !== orderId) return order;
    if (order.status === 'ready') return order;

    const updatedItems = order.items.map((item, idx) =>
      idx === itemIndex ? { ...item, checked: !item.checked } : item
    );

    const hasCheckedItem = updatedItems.some((item) => item.checked);
    let newStatus = order.status;

    if (hasCheckedItem && order.status === 'pending') {
      newStatus = 'preparing';
    } else if (!hasCheckedItem && order.status === 'preparing') {
      newStatus = 'pending';
    }

    return {
      ...order,
      items: updatedItems,
      status: newStatus,
    };
  });
  writeStorage(next);
  return next;
}

export async function updateKitchenOrderStatusMock(id: number, status: 'ready'): Promise<KitchenOrder[]> {
  await delay();
  const orders = readStorage();
  const next = orders.map((order) =>
    order.id === id ? { ...order, status } : order
  );
  writeStorage(next);
  return next;
}
