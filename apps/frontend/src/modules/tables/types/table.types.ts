export type TableStatus =
  | 'LIBRE'
  | 'OCUPADA'
  | 'RESERVADA'
  | 'CUENTA_SOLICITADA'
  | 'FUERA_DE_SERVICIO';

export interface Zone {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface RestaurantTable {
  id: number;
  numero: number;
  capacidad: number;
  zoneId: number;
  estado: TableStatus;
  activo: boolean;
}

export interface ZoneFormValues {
  nombre: string;
  activo: boolean;
}

export interface TableFormValues {
  numero: number;
  capacidad: number;
  zoneId: number;
  activo: boolean;
}

export type ZoneFilter = 'ALL' | number;
