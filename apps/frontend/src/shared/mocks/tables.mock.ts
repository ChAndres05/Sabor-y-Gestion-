import type {
  RestaurantTable,
  TableFormValues,
  TableStatus,
  Zone,
  ZoneFormValues,
} from '../../modules/tables/types/table.types';

let nextZoneId = 5;
let nextTableId = 13;

const delay = (ms = 250) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

let zones: Zone[] = [
  { id: 1, nombre: 'Interior', activo: true },
  { id: 2, nombre: 'Terraza', activo: true },
  { id: 3, nombre: 'VIP', activo: true },
  { id: 4, nombre: 'General', activo: true },
];

let tables: RestaurantTable[] = [
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

export async function listZonesMock(): Promise<Zone[]> {
  await delay();
  return [...zones].sort((a, b) => a.id - b.id);
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
  return newZone;
}

export async function listTablesMock(): Promise<RestaurantTable[]> {
  await delay();
  return [...tables].sort((a, b) => a.numero - b.numero);
}

export async function createTableMock(
  payload: TableFormValues
): Promise<RestaurantTable> {
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
  return newTable;
}

export async function updateTableMock(
  tableId: number,
  payload: TableFormValues
): Promise<RestaurantTable> {
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

  return updatedTable;
}

export async function updateTableStatusMock(
  tableId: number,
  status: TableStatus
): Promise<RestaurantTable> {
  await delay();

  const foundTable = tables.find((table) => table.id === tableId);

  if (!foundTable) {
    throw new Error('Mesa no encontrada');
  }

  const updatedTable: RestaurantTable = {
    ...foundTable,
    estado: status,
  };

  tables = tables.map((table) => (table.id === tableId ? updatedTable : table));

  return updatedTable;
}

export async function deleteTableMock(tableId: number): Promise<void> {
  await delay();

  const foundTable = tables.find((table) => table.id === tableId);

  if (!foundTable) {
    throw new Error('Mesa no encontrada');
  }

  if (foundTable.estado !== 'LIBRE') {
    throw new Error('No se puede eliminar una mesa que no está libre');
  }

  tables = tables.filter((table) => table.id !== tableId);
}