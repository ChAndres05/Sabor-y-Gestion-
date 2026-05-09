import type { TableOrderStatus } from '../../modules/tables/types/table-order.types';
import type { RestaurantTable, Zone } from '../../modules/tables/types/table.types';

export type ClientNavigationKey = 'menu' | 'reserve-table' | 'reservations' | 'orders';

export type ClientReservationStatus = 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA';

export interface ClientReservation {
  id: number;
  userId: number;
  tableId: number;
  tableNumber: number;
  zoneName: string;
  people: number;
  date: string;
  time: string;
  status: ClientReservationStatus;
  observations?: string;
  linkedOrderId?: number;
  createdAt: string;
}

export interface ClientReservationRequest {
  userId: number;
  table: RestaurantTable;
  zone?: Zone;
  people: number;
  date: string;
  time: string;
  observations?: string;
}

export type ClientOrderSource = 'MESA_MESERO' | 'RESERVA_PREPARADA';

export interface ClientOrderIngredient {
  name: string;
  included: boolean;
}

export interface ClientOrderItem {
  id: number;
  name: string;
  quantity: number;
  notes?: string;
  ingredients?: ClientOrderIngredient[];
  unitPrice: number;
  subtotal: number;
}

export interface ClientOrderStep {
  key: TableOrderStatus;
  label: string;
  completed: boolean;
}

export interface ClientOrder {
  id: number;
  orderNumber: string;
  userId: number | null;
  tableNumber: number | null;
  reservationId?: number;
  source: ClientOrderSource;
  status: TableOrderStatus;
  items: ClientOrderItem[];
  subtotal: number;
  total: number;
  estimatedMinutes: number;
  notes?: string;
  createdAt: string;
  reservationTime?: string;
  prepareFrom?: string;
}

export interface ClientPreparedOrderRequest {
  userId: number;
  reservationId: number;
  items: ClientOrderItem[];
  notes?: string;
}
