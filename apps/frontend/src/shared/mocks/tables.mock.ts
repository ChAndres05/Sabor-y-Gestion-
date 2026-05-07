import type {
  RestaurantTable,
  TableFormValues,
  TableStatus,
  Zone,
  ZoneFormValues,
} from '../../modules/tables/types/table.types';
import { emitRestaurantStateChanged } from '../utils/events';

const ZONES_STORAGE_KEY = 'gestionysabor_waiter_mock_zones';
const TABLES_STORAGE_KEY = 'gestionysabor_waiter_mock_tables';
const TABLE_STATUS_OVERLAY_STORAGE_KEY = 'gestionysabor_waiter_mock_table_status_overlay';

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

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

const defaultZones: Zone[] = [
  { id: 1, nombre: 'Interior', activo: true },
  { id: 2, nombre: 'Terraza', activo: true },
  { id: 3, nombre: 'VIP', activo: true },
  { id: 4, nombre: 'General', activo: true },
];

const defaultTables: RestaurantTable[] = [
  { id: 1, numero: 1, capacidad: 4, zoneId: 1, estado: 'LIBRE', activo: true },
  { id: 2, numero: 2, capacidad: 4, zoneId: 1, estado: 'OCUPADA', activo: true },
  { id: 3, numero: 3, capacidad: 2, zoneId: 1, estado: 'RESERVADA', activo: true },
  {
    id: 4,
    numero: 4,
    capacidad: 6,
    zoneId: 1,
    estado: 'CUENTA_SOLICITADA',
    activo: true,
  },
  { id: 5, numero: 5, capacidad: 4, zoneId: 2, estado: 'LIBRE', activo: true },
  { id: 6, numero: 6, capacidad: 2, zoneId: 2, estado: 'OCUPADA', activo: true },
  { id: 7, numero: 7, capacidad: 8, zoneId: 3, estado: 'LIBRE', activo: true },
  { id: 8, numero: 8, capacidad: 8, zoneId: 3, estado: 'RESERVADA', activo: true },
  { id: 9, numero: 9, capacidad: 6, zoneId: 4, estado: 'LIBRE', activo: true },
  { id: 10, numero: 10, capacidad: 4, zoneId: 4, estado: 'OCUPADA', activo: true },
  {
    id: 11,
    numero: 11,
    capacidad: 2,
    zoneId: 4,
    estado: 'CUENTA_SOLICITADA',
    activo: true,
  },
  { id: 12, numero: 12, capacidad: 6, zoneId: 2, estado: 'LIBRE', activo: true },
];

let zones: Zone[] = readStorage(ZONES_STORAGE_KEY, defaultZones);
let tables: RestaurantTable[] = readStorage(TABLES_STORAGE_KEY, defaultTables);
let nextZoneId = Math.max(...zones.map((zone) => zone.id), 4) + 1;
let nextTableId = Math.max(...tables.map((table) => table.id), 12) + 1;

function persistZones() {
  writeStorage(ZONES_STORAGE_KEY, zones);
}

function persistTables() {
  writeStorage(TABLES_STORAGE_KEY, tables);
}

function readStatusOverlay(): Record<string, TableStatus> {
  return readStorage<Record<string, TableStatus>>(TABLE_STATUS_OVERLAY_STORAGE_KEY, {});
}

function writeStatusOverlay(overlay: Record<string, TableStatus>) {
  writeStorage(TABLE_STATUS_OVERLAY_STORAGE_KEY, overlay);
}

function saveStatusOverlay(tableId: number, status: TableStatus) {
  const overlay = readStatusOverlay();
  // Guardamos el estado manual para que todos los roles usen el mismo override local.
  overlay[String(tableId)] = status;
  writeStatusOverlay(overlay);
}

function cloneTable(table: RestaurantTable): RestaurantTable {
  return { ...table };
}

export function getEffectiveTableStatus(
  table: RestaurantTable,
  activeOrders: Array<{ tableId?: number; id_mesa?: number; estado?: string }>,
  activeReservations: Array<{ tableId?: number; id_mesa?: number; status?: string; estado?: string }>
): TableStatus {
  const overlay = readStatusOverlay();
  const overlayStatus = overlay[String(table.id)];

  if (overlayStatus === 'CUENTA_SOLICITADA' || table.estado === 'CUENTA_SOLICITADA') {
    return 'CUENTA_SOLICITADA';
  }

  if (overlayStatus === 'FUERA_DE_SERVICIO' || table.estado === 'FUERA_DE_SERVICIO') {
    return 'FUERA_DE_SERVICIO';
  }

  const tableOrders = activeOrders.filter((order) => {
    const orderTableId = Number(order.tableId ?? order.id_mesa ?? 0);
    return orderTableId === table.id && order.estado !== 'PAGADO' && order.estado !== 'CANCELADO';
  });

  if (
    tableOrders.some((order) =>
      ['REGISTRADO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO'].includes(String(order.estado))
    )
  ) {
    return 'OCUPADA';
  }

  if (overlayStatus) return overlayStatus;

  const tableReservations = activeReservations.filter((reservation) => {
    const reservationTableId = Number(reservation.tableId ?? reservation.id_mesa ?? 0);
    const reservationStatus = reservation.status ?? reservation.estado;
    return reservationTableId === table.id && reservationStatus === 'CONFIRMADA';
  });

  if (tableReservations.length > 0) {
    return 'RESERVADA';
  }

  return table.estado;
}


export function applyWaiterTableStatusOverlayMock(
  tablesToApply: RestaurantTable[]
): RestaurantTable[] {
  const overlay = readStatusOverlay();

  return tablesToApply.map((table) => ({
    ...table,
    estado: overlay[String(table.id)] ?? table.estado,
  }));
}

export async function listZonesMock(): Promise<Zone[]> {
  await delay();
  return [...zones].sort((a, b) => a.id - b.id).map((zone) => ({ ...zone }));
}

export async function createZoneMock(payload: ZoneFormValues): Promise<Zone> {
  await delay();

  const nombre = payload.nombre.trim();

  if (!nombre) {
    throw new Error('El nombre de la zona es obligatorio');
  }

  const alreadyExists = zones.some(
    (zone) => normalizeText(zone.nombre) === normalizeText(nombre)
  );

  if (alreadyExists) {
    throw new Error('La zona ya existe');
  }

  const newZone: Zone = {
    id: nextZoneId++,
    nombre,
    activo: payload.activo,
  };

  zones = [...zones, newZone];
  persistZones();
  return { ...newZone };
}

export async function listTablesMock(): Promise<RestaurantTable[]> {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/mesas?t=${Date.now()}`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const backendTables = data.map(
          (t: {
            id_mesa?: number | string;
            id?: number | string;
            numero: number | string;
            capacidad?: number | string;
            id_zona?: number | string;
            zoneId?: number | string;
            estado?: string;
            activa?: boolean;
            activo?: boolean;
          }) => ({
            id: Number(t.id_mesa ?? t.id),
            numero: Number(t.numero),
            capacidad: Number(t.capacidad ?? 0),
            zoneId: Number(t.id_zona ?? t.zoneId ?? 0),
            estado: (t.estado ?? 'LIBRE') as TableStatus,
            activo: Boolean(t.activa ?? t.activo ?? true),
          })
        );

        return applyWaiterTableStatusOverlayMock(backendTables)
          .sort((a, b) => a.numero - b.numero)
          .map(cloneTable);
      }
    }
  } catch (error) {
    console.error('API fail, using mock data for tables', error);
  }

  await delay();
  return applyWaiterTableStatusOverlayMock(tables)
    .sort((a, b) => a.numero - b.numero)
    .map(cloneTable);
}


export async function createTableMock(
  payload: TableFormValues
): Promise<RestaurantTable> {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/mesas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero: payload.numero,
        capacidad: payload.capacidad,
        id_zona: payload.zoneId,
        activa: payload.activo,
        estado: 'LIBRE'
      })
    });
    if (res.ok) {
      const data = await res.json();
      return {
        id: data.id_mesa,
        numero: data.numero,
        capacidad: data.capacidad,
        zoneId: data.id_zona,
        estado: data.estado,
        activo: data.activa
      };
    }
  } catch (error) {
    console.error('API fail for createTable', error);
  }

  await delay();

  if (!payload.numero || payload.numero <= 0) {
    throw new Error('El número de mesa debe ser mayor a 0');
  }

  if (!payload.capacidad || payload.capacidad <= 0) {
    throw new Error('La capacidad debe ser mayor a 0');
  }

  if (!payload.zoneId) {
    throw new Error('Debes seleccionar una zona');
  }

  const foundZone = zones.find((zone) => zone.id === payload.zoneId);

  if (!foundZone) {
    throw new Error('La zona seleccionada no existe');
  }

  const alreadyExists = tables.some((table) => table.numero === payload.numero);

  if (alreadyExists) {
    throw new Error('Ya existe una mesa con ese número');
  }

  const newTable: RestaurantTable = {
    id: nextTableId++,
    numero: payload.numero,
    capacidad: payload.capacidad,
    zoneId: payload.zoneId,
    estado: 'LIBRE',
    activo: payload.activo,
  };

  tables = [...tables, newTable];
  persistTables();
  return cloneTable(newTable);
}

export async function updateTableMock(
  tableId: number,
  payload: TableFormValues
): Promise<RestaurantTable> {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/mesas/${tableId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero: payload.numero,
        capacidad: payload.capacidad,
        id_zona: payload.zoneId,
        activa: payload.activo
      })
    });
    if (res.ok) {
      const data = await res.json();
      return {
        id: data.id_mesa,
        numero: data.numero,
        capacidad: data.capacidad,
        zoneId: data.id_zona,
        estado: data.estado,
        activo: data.activa
      };
    }
  } catch (error) {
    console.error('API fail for updateTable', error);
  }

  await delay();

  const foundTable = tables.find((table) => table.id === tableId);

  if (!foundTable) {
    throw new Error('Mesa no encontrada');
  }

  if (!payload.numero || payload.numero <= 0) {
    throw new Error('El número de mesa debe ser mayor a 0');
  }

  if (!payload.capacidad || payload.capacidad <= 0) {
    throw new Error('La capacidad debe ser mayor a 0');
  }

  if (!payload.zoneId) {
    throw new Error('Debes seleccionar una zona');
  }

  const foundZone = zones.find((zone) => zone.id === payload.zoneId);

  if (!foundZone) {
    throw new Error('La zona seleccionada no existe');
  }

  const alreadyExists = tables.some(
    (table) => table.id !== tableId && table.numero === payload.numero
  );

  if (alreadyExists) {
    throw new Error('Ya existe una mesa con ese número');
  }

  const updatedTable: RestaurantTable = {
    ...foundTable,
    numero: payload.numero,
    capacidad: payload.capacidad,
    zoneId: payload.zoneId,
    activo: payload.activo,
  };

  tables = tables.map((table) => (table.id === tableId ? updatedTable : table));
  persistTables();

  return cloneTable(updatedTable);
}

export async function updateTableStatusMock(
  tableId: number,
  status: TableStatus
): Promise<RestaurantTable> {
  let backendTable: RestaurantTable | null = null;

  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/mesas/${tableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: status })
    });

    if (res.ok) {
      const updated = await res.json();
      backendTable = {
        id: Number(updated.id_mesa ?? updated.id ?? tableId),
        numero: Number(updated.numero ?? tableId),
        capacidad: Number(updated.capacidad ?? 4),
        zoneId: Number(updated.id_zona ?? updated.zoneId ?? 0),
        estado: (updated.estado ?? status) as TableStatus,
        activo: Boolean(updated.activa ?? updated.activo ?? true),
      };
    }
  } catch (error) {
    console.error('API fail, using mock data for updateTableStatus', error);
  }

  await delay();

  const foundTable = tables.find((table) => table.id === tableId);
  const updatedTable: RestaurantTable = backendTable ?? (foundTable
    ? { ...foundTable, estado: status }
    : {
        id: tableId,
        numero: tableId,
        capacidad: 4,
        zoneId: 0,
        estado: status,
        activo: true,
      });

  if (foundTable) {
    tables = tables.map((table) => (table.id === tableId ? updatedTable : table));
    persistTables();
  }

  if (!backendTable) {
    saveStatusOverlay(tableId, status);
  } else {
    const overlay = readStatusOverlay();
    if (overlay[String(tableId)]) {
      delete overlay[String(tableId)];
      writeStatusOverlay(overlay);
    }
  }
  
  emitRestaurantStateChanged();
  return cloneTable(updatedTable);
}


export async function deleteTableMock(tableId: number): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/mesas/${tableId}`, {
      method: 'DELETE'
    });
    if (res.ok) return;
  } catch (error) {
    console.error('API fail for deleteTable', error);
  }

  await delay();

  const foundTable = tables.find((table) => table.id === tableId);

  if (!foundTable) {
    throw new Error('Mesa no encontrada');
  }

  if (foundTable.estado !== 'LIBRE') {
    throw new Error('No se puede eliminar una mesa que no está libre');
  }

  tables = tables.filter((table) => table.id !== tableId);
  persistTables();
}

export async function getTableByIdMock(
  tableId: number
): Promise<RestaurantTable> {
  await delay();

  const listedTables = await listTablesMock();
  const foundFromList = listedTables.find((table) => table.id === tableId);
  if (foundFromList) return cloneTable(foundFromList);

  const overlay = readStatusOverlay();
  const foundTable = tables.find((table) => table.id === tableId);

  if (!foundTable) {
    return {
      id: tableId,
      numero: tableId,
      capacidad: 4,
      zoneId: 0,
      estado: overlay[String(tableId)] ?? 'LIBRE',
      activo: true,
    };
  }

  return {
    ...foundTable,
    estado: overlay[String(tableId)] ?? foundTable.estado,
  };
}
