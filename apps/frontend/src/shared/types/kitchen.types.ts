export interface KitchenOrderItem {
  name: string;
  quantity: number;
  checked: boolean;
  ingredientes?: Array<{ nombre: string; incluido: boolean }>;
}

export interface KitchenOrder {
  id: number;
  orderNumber: number;
  items: KitchenOrderItem[];
  status: 'pending' | 'preparing' | 'ready';
  isToggled: boolean;
  source?: 'mesa' | 'reserva';
  tableNumber?: number;
  customerName?: string;
  reservationTime?: string;
  prepareFrom?: string;
}
