import type {
  ClientOrder,
  ClientOrderItem,
  ClientPreparedOrderRequest,
  ClientReservation,
  ClientReservationRequest,
} from '../types/client-flow.types';

const RESERVATIONS_STORAGE_KEY = 'gestionysabor_client_mock_reservations';
const ORDERS_STORAGE_KEY = 'gestionysabor_client_mock_orders';

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

const defaultOrderItems: ClientOrderItem[] = [
  {
    id: 1,
    name: 'Pique macho especial',
    quantity: 2,
    notes: 'Sin locoto para una porcion',
    unitPrice: 45,
    subtotal: 90,
  },
  {
    id: 2,
    name: 'Jugo natural',
    quantity: 2,
    notes: 'Con poco azucar',
    unitPrice: 18,
    subtotal: 36,
  },
];

function buildDefaultReservations(userId: number): ClientReservation[] {
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

function buildDefaultOrders(userId: number): ClientOrder[] {
  return [
    {
      id: 7001 + userId,
      orderNumber: `P-${7001 + userId}`,
      userId,
      tableNumber: 5,
      source: 'MESA_MESERO',
      status: 'EN_PREPARACION',
      items: defaultOrderItems,
      subtotal: 126,
      total: 126,
      estimatedMinutes: 25,
      notes: 'Pedido tomado por mesero. Solo aparece porque esta asociado al cliente registrado.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 6001 + userId,
      orderNumber: `H-${6001 + userId}`,
      userId,
      tableNumber: 3,
      source: 'MESA_MESERO',
      status: 'PAGADO',
      items: [
        {
          id: 3,
          name: 'Parrilla de res',
          quantity: 1,
          unitPrice: 55,
          subtotal: 55,
        },
      ],
      subtotal: 55,
      total: 55,
      estimatedMinutes: 30,
      notes: 'Pedido de historial mock finalizado.',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ];
}

function readReservations(userId: number) {
  const stored = readStorage<ClientReservation[]>(RESERVATIONS_STORAGE_KEY, []);
  const hasUserReservations = stored.some((reservation) => reservation.userId === userId);

  if (hasUserReservations) return stored;

  const seeded = [...stored, ...buildDefaultReservations(userId)];
  writeStorage(RESERVATIONS_STORAGE_KEY, seeded);
  return seeded;
}

function readOrders(userId: number) {
  const stored = readStorage<ClientOrder[]>(ORDERS_STORAGE_KEY, []);
  const hasUserOrders = stored.some((order) => order.userId === userId);

  if (hasUserOrders) return stored;

  const seeded = [...stored, ...buildDefaultOrders(userId)];
  writeStorage(ORDERS_STORAGE_KEY, seeded);
  return seeded;
}

function normalizeReservation(payload: ClientReservationRequest, id: number): ClientReservation {
  return {
    id,
    userId: payload.userId,
    tableId: payload.table.id,
    tableNumber: payload.table.numero,
    zoneName: payload.zone?.nombre ?? 'Sin zona',
    people: payload.people,
    date: payload.date,
    time: payload.time,
    status: 'CONFIRMADA',
    observations: payload.observations?.trim() || 'Reserva creada desde flujo visual del cliente.',
    createdAt: new Date().toISOString(),
  };
}

export async function listClientReservationsMock(userId: number): Promise<ClientReservation[]> {
  await delay();
  return readReservations(userId)
    .filter((reservation) => reservation.userId === userId)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

export async function createClientReservationMock(
  payload: ClientReservationRequest
): Promise<ClientReservation> {
  await delay();

  if (payload.people <= 0) {
    throw new Error('La cantidad de personas debe ser mayor a 0');
  }

  if (payload.people > payload.table.capacidad) {
    throw new Error('La mesa no cubre la capacidad solicitada');
  }

  const current = readReservations(payload.userId);
  const newReservation = normalizeReservation(payload, getNextId(current, 1000));
  const next = [...current, newReservation];
  writeStorage(RESERVATIONS_STORAGE_KEY, next);
  return newReservation;
}

export async function cancelClientReservationMock(
  userId: number,
  reservationId: number
): Promise<ClientReservation> {
  await delay();

  const current = readReservations(userId);
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

  return updated;
}

export async function listClientOrdersMock(userId: number): Promise<ClientOrder[]> {
  await delay();
  return readOrders(userId)
    .filter((order) => order.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createPreparedReservationOrderMock(
  payload: ClientPreparedOrderRequest
): Promise<ClientOrder> {
  await delay();

  const reservations = readReservations(payload.userId);
  const reservation = reservations.find(
    (item) => item.id === payload.reservationId && item.userId === payload.userId
  );

  if (!reservation) {
    throw new Error('Reserva no encontrada para asociar pedido');
  }

  const currentOrders = readOrders(payload.userId);
  const subtotal = payload.items.reduce((total, item) => total + item.subtotal, 0);
  const nextId = getNextId(currentOrders, 3000);

  const newOrder: ClientOrder = {
    id: nextId,
    orderNumber: `R-${nextId}`,
    userId: payload.userId,
    tableNumber: reservation.tableNumber,
    reservationId: reservation.id,
    source: 'RESERVA_PREPARADA',
    status: 'REGISTRADO',
    items: payload.items,
    subtotal,
    total: subtotal,
    estimatedMinutes: 30,
    notes:
      payload.notes?.trim() ||
      'Pedido de reserva mock. Cocina podria verlo con hora de reserva y hora sugerida de preparacion.',
    createdAt: new Date().toISOString(),
    reservationTime: `${reservation.date} ${reservation.time}`,
    prepareFrom: '30 minutos antes de la reserva',
  };

  const updatedReservations = reservations.map((item) =>
    item.id === reservation.id ? { ...item, linkedOrderId: newOrder.id } : item
  );

  writeStorage(RESERVATIONS_STORAGE_KEY, updatedReservations);
  writeStorage(ORDERS_STORAGE_KEY, [...currentOrders, newOrder]);

  return newOrder;
}
