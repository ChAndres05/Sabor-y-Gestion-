import type {
  ClientOrder,
  ClientOrderItem,
  ClientPreparedOrderRequest,
  ClientReservation,
  ClientReservationRequest,
} from '../types/client-flow.types';
import type { TableOrder } from '../../modules/tables/types/table-order.types';
import { emitRestaurantStateChanged } from '../utils/events';

const RESERVATIONS_STORAGE_KEY = 'gestionysabor_client_mock_reservations';
const ORDERS_STORAGE_KEY = 'gestionysabor_unified_orders_mock';

const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

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

function getNextId(items: Array<{ id: number }>, fallback: number) {
  return Math.max(fallback, ...items.map((item) => item.id)) + 1;
}

function getTomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function getYesterdayDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function buildDefaultReservations(userId: number): ClientReservation[] {
  return [
    {
      id: 9001 + userId,
      userId,
      tableId: 5,
      tableNumber: 5,
      zoneName: 'Terraza',
      people: 4,
      date: getTomorrowDate(),
      time: '20:00',
      status: 'CONFIRMADA',
      observations: 'Reserva mock preparada para conectar con backend de reservas.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 8001 + userId,
      userId,
      tableId: 2,
      tableNumber: 2,
      zoneName: 'Interior',
      people: 2,
      date: getYesterdayDate(),
      time: '19:30',
      status: 'COMPLETADA',
      observations: 'Historial mock de reserva completada.',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ];
}

function readReservations() {
  return readStorage<ClientReservation[]>(RESERVATIONS_STORAGE_KEY, []);
}


function mapTableToClientOrder(order: TableOrder): ClientOrder {
  return {
    id: order.id,
    orderNumber: `P-${order.id}`,
    userId: order.customer?.idUsuario || 0,
    tableNumber: order.tableNumber ?? order.tableId,
    source: 'MESA_MESERO',
    status: order.estado,
    items: (order.items || []).map((item) => ({
      id: item.id,
      name: item.nombreProducto,
      quantity: item.cantidad,
      notes: item.observacion,
      unitPrice: item.precioUnitario,
      subtotal: item.subtotal,
    })),
    subtotal: order.subtotal,
    total: order.total,
    estimatedMinutes: order.tiempoEstimadoMinutos,
    notes: order.observaciones,
    createdAt: order.fechaCreacion,
  };
}

export async function listClientReservationsMock(userId: number): Promise<ClientReservation[]> {
  await delay();
  return readReservations()
    .filter((reservation) => reservation.userId === userId)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

export async function listAllReservationsMock(): Promise<ClientReservation[]> {
  await delay();
  const stored = readStorage<ClientReservation[]>(RESERVATIONS_STORAGE_KEY, []);
  return stored.sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
}

export async function createClientReservationMock(
  payload: ClientReservationRequest
): Promise<ClientReservation> {
  await delay();

  if (payload.people <= 0) {
    throw new Error('La cantidad de personas debe ser mayor a 0');
  }

  const current = readReservations();
  
  // Validar conflicto de reserva (misma mesa, fecha y hora aproximada)
  const hasConflict = current.some(r => 
    r.tableId === payload.table.id && 
    r.date === payload.date && 
    r.time === payload.time &&
    r.status === 'CONFIRMADA'
  );

  if (hasConflict) {
    throw new Error('Esta mesa ya tiene una reserva confirmada para la fecha y hora seleccionadas.');
  }

  const newReservation: ClientReservation = {
    id: getNextId(current, 1000),
    userId: payload.userId,
    tableId: payload.table.id,
    tableNumber: payload.table.numero,
    zoneName: payload.zone?.nombre ?? 'Sin zona',
    people: payload.people,
    date: payload.date,
    time: payload.time,
    status: 'CONFIRMADA',
    observations: payload.observations?.trim() || 'Reserva creada desde el flujo del cliente.',
    createdAt: new Date().toISOString(),
  };
  const next = [...current, newReservation];
  writeStorage(RESERVATIONS_STORAGE_KEY, next);
  emitRestaurantStateChanged();
  return newReservation;
}

export async function cancelClientReservationMock(
  userId: number,
  reservationId: number
): Promise<ClientReservation> {
  await delay();

  const current = readReservations();
  const found = current.find(
    (reservation) => reservation.id === reservationId && reservation.userId === userId
  );

  if (!found) {
    throw new Error('Reserva no encontrada');
  }

  const updated: ClientReservation = {
    ...found,
    status: 'CANCELADA',
  };

  writeStorage(
    RESERVATIONS_STORAGE_KEY,
    current.map((reservation) => (reservation.id === reservationId ? updated : reservation))
  );

  emitRestaurantStateChanged();
  return updated;
}

export async function cancelActiveReservationsByTableMock(tableId: number): Promise<void> {
  await delay();
  const stored = readStorage<ClientReservation[]>(RESERVATIONS_STORAGE_KEY, []);
  const updated = stored.map(r => 
    (r.tableId === tableId && r.status === 'CONFIRMADA') 
      ? { ...r, status: 'CANCELADA' as const } 
      : r
  );
  writeStorage(RESERVATIONS_STORAGE_KEY, updated);
  emitRestaurantStateChanged();
}

export async function listClientOrdersMock(userId: number): Promise<ClientOrder[]> {
  await delay();
  const allTableOrders = readStorage<TableOrder[]>(ORDERS_STORAGE_KEY, []);
  
  return allTableOrders
    .filter((order) => order.customer?.idUsuario === userId)
    .map(mapTableToClientOrder)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createPreparedReservationOrderMock(
  payload: ClientPreparedOrderRequest
): Promise<ClientOrder> {
  await delay();

  const reservations = readReservations();
  const reservation = reservations.find(
    (item) => item.id === payload.reservationId && item.userId === payload.userId
  );

  if (!reservation) {
    throw new Error('Reserva no encontrada para asociar pedido');
  }

  const allTableOrders = readStorage<TableOrder[]>(ORDERS_STORAGE_KEY, []);
  const subtotal = payload.items.reduce((total: number, item: ClientOrderItem) => total + item.subtotal, 0);
  const nextId = getNextId(allTableOrders, 3000);

  // IMPORTANTE: Guardamos como TableOrder, no como ClientOrder
  const newOrder: TableOrder = {
    id: nextId,
    tableId: reservation.tableId,
    tableNumber: reservation.tableNumber,
    tipoPedido: 'MESA',
    estado: 'REGISTRADO',
    waiterName: 'Autoservicio',
    customer: {
      idUsuario: payload.userId,
      nombre: 'Cliente Reserva',
      telefono: '00000000',
      ci: '0'
    },
    items: payload.items.map((item, idx) => ({
      id: idx + 1,
      productoId: 0,
      nombreProducto: item.name,
      categoriaId: 0,
      categoriaNombre: 'General',
      cantidad: item.quantity,
      observacion: item.notes || '',
      ingredientes: [],
      precioUnitario: item.unitPrice,
      tiempoPreparacion: 15,
      subtotal: item.subtotal
    })),
    subtotal,
    impuesto: 0,
    descuento: 0,
    total: subtotal,
    tiempoEstimadoMinutos: 30,
    observaciones: payload.notes || 'Pedido de reserva.',
    fechaCreacion: new Date().toISOString(),
  };

  const updatedReservations = reservations.map((item) =>
    item.id === reservation.id ? { ...item, linkedOrderId: newOrder.id } : item
  );

  writeStorage(RESERVATIONS_STORAGE_KEY, updatedReservations);
  writeStorage(ORDERS_STORAGE_KEY, [...allTableOrders, newOrder]);
  emitRestaurantStateChanged();

  return mapTableToClientOrder(newOrder);
}
