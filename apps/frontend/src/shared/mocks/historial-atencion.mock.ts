export interface ServiceHistoryEntry {
  id: number;
  meseroId: number;
  meseroName: string;
  tableNumber: number;
  startTime: string;
  endTime: string;
  totalAmount: number;
  customerCount: number;
  status: 'completed' | 'cancelled';
}

export const MOCK_SERVICE_HISTORY: ServiceHistoryEntry[] = [
  {
    id: 1,
    meseroId: 2,
    meseroName: 'María López',
    tableNumber: 5,
    startTime: '2026-05-15T12:30:00Z',
    endTime: '2026-05-15T13:45:00Z',
    totalAmount: 150.50,
    customerCount: 3,
    status: 'completed',
  },
  {
    id: 2,
    meseroId: 3,
    meseroName: 'Juan Pérez',
    tableNumber: 2,
    startTime: '2026-05-15T13:00:00Z',
    endTime: '2026-05-15T14:10:00Z',
    totalAmount: 85.00,
    customerCount: 2,
    status: 'completed',
  },
  {
    id: 3,
    meseroId: 2,
    meseroName: 'María López',
    tableNumber: 8,
    startTime: '2026-05-15T14:00:00Z',
    endTime: '2026-05-15T15:20:00Z',
    totalAmount: 210.00,
    customerCount: 4,
    status: 'completed',
  },
  {
    id: 4,
    meseroId: 3,
    meseroName: 'Juan Pérez',
    tableNumber: 1,
    startTime: '2026-05-15T14:30:00Z',
    endTime: '2026-05-15T15:00:00Z',
    totalAmount: 45.00,
    customerCount: 1,
    status: 'cancelled',
  },
  {
    id: 5,
    meseroId: 2,
    meseroName: 'María López',
    tableNumber: 12,
    startTime: '2026-05-16T18:00:00Z',
    endTime: '2026-05-16T19:30:00Z',
    totalAmount: 320.00,
    customerCount: 6,
    status: 'completed',
  },
  {
    id: 6,
    meseroId: 4,
    meseroName: 'Carlos Gómez',
    tableNumber: 3,
    startTime: '2026-05-16T19:00:00Z',
    endTime: '2026-05-16T20:15:00Z',
    totalAmount: 120.00,
    customerCount: 2,
    status: 'completed',
  }
];
