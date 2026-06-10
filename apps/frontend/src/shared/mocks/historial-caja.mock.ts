export interface CashTransaction {
  id: number;
  cajeroId: number;
  cajeroName: string;
  date: string;
  amount: number;
  paymentMethod: 'Efectivo' | 'QR';
  type: 'Ingreso' | 'Egreso';
  description: string;
}

export const MOCK_CASH_HISTORY: CashTransaction[] = [
  {
    id: 1,
    cajeroId: 5,
    cajeroName: 'Pedro Cajero',
    date: '2026-05-15T12:45:00Z',
    amount: 150.50,
    paymentMethod: 'Efectivo',
    type: 'Ingreso',
    description: 'Pago Mesa 5',
  },
  {
    id: 2,
    cajeroId: 5,
    cajeroName: 'Pedro Cajero',
    date: '2026-05-15T13:10:00Z',
    amount: 85.00,
    paymentMethod: 'QR',
    type: 'Ingreso',
    description: 'Pago Mesa 2',
  },
  {
    id: 3,
    cajeroId: 6,
    cajeroName: 'Ana Finanzas',
    date: '2026-05-15T14:20:00Z',
    amount: 210.00,
    paymentMethod: 'QR',
    type: 'Ingreso',
    description: 'Pago Mesa 8',
  },
  {
    id: 4,
    cajeroId: 6,
    cajeroName: 'Ana Finanzas',
    date: '2026-05-15T15:00:00Z',
    amount: 50.00,
    paymentMethod: 'Efectivo',
    type: 'Egreso',
    description: 'Pago a proveedor de hielo',
  },
  {
    id: 5,
    cajeroId: 5,
    cajeroName: 'Pedro Cajero',
    date: '2026-05-16T18:30:00Z',
    amount: 320.00,
    paymentMethod: 'QR',
    type: 'Ingreso',
    description: 'Pago Mesa 12',
  },
  {
    id: 6,
    cajeroId: 6,
    cajeroName: 'Ana Finanzas',
    date: '2026-05-16T19:15:00Z',
    amount: 120.00,
    paymentMethod: 'Efectivo',
    type: 'Ingreso',
    description: 'Pago Mesa 3',
  },
  {
    id: 7,
    cajeroId: 5,
    cajeroName: 'Pedro Cajero',
    date: '2026-05-16T20:45:00Z',
    amount: 180.00,
    paymentMethod: 'Efectivo',
    type: 'Ingreso',
    description: 'Pago Mesa 7',
  },
  {
    id: 8,
    cajeroId: 6,
    cajeroName: 'Ana Finanzas',
    date: '2026-05-16T21:30:00Z',
    amount: 90.00,
    paymentMethod: 'QR',
    type: 'Ingreso',
    description: 'Pago Mesa 4',
  }
];
