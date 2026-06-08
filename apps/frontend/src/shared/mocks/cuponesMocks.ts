// src/shared/mocks/cuponesMocks.ts

export interface CuponMock {
  codigo: string;
  descuento: number; // Porcentaje en decimal (ej. 0.10 para 10%)
}

export const MOCK_CUPONES: CuponMock[] = [
  { codigo: 'PROMO10', descuento: 0.10 },
  { codigo: 'SABOR20', descuento: 0.20 },
  { codigo: 'TIS2026', descuento: 0.15 }
];