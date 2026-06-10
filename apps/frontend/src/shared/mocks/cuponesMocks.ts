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

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase: number;
  expirationDate: string;
  status: 'active' | 'inactive' | 'expired';
  usageLimit: number;
  usageCount: number;
  description: string;
}

export const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'coupon-1',
    code: 'BIENVENIDA10',
    discountType: 'percentage',
    discountValue: 10,
    minPurchase: 50,
    expirationDate: '2026-12-31',
    status: 'active',
    usageLimit: 100,
    usageCount: 15,
    description: '10% de descuento en tu primera compra mayor a Bs. 50',
  },
  {
    id: 'coupon-2',
    code: 'SABOR20',
    discountType: 'fixed',
    discountValue: 20,
    minPurchase: 100,
    expirationDate: '2026-08-15',
    status: 'active',
    usageLimit: 50,
    usageCount: 8,
    description: 'Bs. 20 de descuento para compras de mínimo Bs. 100',
  },
  {
    id: 'coupon-3',
    code: 'DOMINGOCOMPLETO',
    discountType: 'fixed',
    discountValue: 15,
    minPurchase: 80,
    expirationDate: '2026-10-10',
    status: 'inactive',
    usageLimit: 30,
    usageCount: 0,
    description: 'Bs. 15 de descuento los días domingos',
  },
  {
    id: 'coupon-4',
    code: 'PROMOEXPRESS',
    discountType: 'percentage',
    discountValue: 15,
    minPurchase: 30,
    expirationDate: '2026-05-01',
    status: 'expired',
    usageLimit: 200,
    usageCount: 200,
    description: '15% de descuento express de fin de semana',
  }
];