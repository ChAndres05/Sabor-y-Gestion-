import type { Zone, RestaurantTable, TableStatus } from '../../modules/tables/types/table.types';

export interface BackendZoneResponse {
  id_zona: number;
  nombre: string;
  activo?: boolean;
  activa?: boolean;
}

export interface BackendTableResponse {
  id_mesa: number;
  numero: number;
  capacidad: number;
  id_zona: number;
  estado: TableStatus;
  activo?: boolean;
}

export function mapBackendZone(data: BackendZoneResponse): Zone {
  return {
    id: data.id_zona,
    nombre: data.nombre,
    activo: data.activo ?? data.activa ?? true,
  };
}

export function mapBackendTable(data: BackendTableResponse): RestaurantTable {
  return {
    id: data.id_mesa,
    numero: data.numero,
    capacidad: data.capacidad,
    zoneId: data.id_zona,
    estado: data.estado,
    activo: data.activo ?? true,
  };
}