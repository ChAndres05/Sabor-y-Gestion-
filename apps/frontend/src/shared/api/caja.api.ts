const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ProcesarPagoPayload {
    id_mesa: number;
    metodo_pago: 'EFECTIVO' | 'TRANSFERENCIA';
    monto_pagado: number;
    monto_recibido?: number;
    monto_cambio: number;
    referencia_pago?: string;
    id_usuario_cajero: number;
    correo_cliente?: string;
    enviar_recibo?: boolean;
    ci_cliente?: string;
    nombre_cliente?: string;
    detalles_consumidos?: { cantidad: number; nombre: string; subtotal: number }[];
    codigo_cupon?: string;
}

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

export interface CashHistoryResponse {
  transactions: CashTransaction[];
  cajeros: { id: number; name: string }[];
}

export const cajaApi = {
    async registrarPagoReal(payload: ProcesarPagoPayload): Promise<void> {
        const res = await fetch(`${API_URL}/api/admin/pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'Error al procesar el pago contable');
        }
    },

    async getCashHistory(): Promise<CashHistoryResponse> {
        const res = await fetch(`${API_URL}/api/admin/historial-caja`);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'Error al obtener historial de caja');
        }
        return res.json() as Promise<CashHistoryResponse>;
    },

    async listCoupons(): Promise<Coupon[]> {
        const res = await fetch(`${API_URL}/api/admin/cupones`);
        if (!res.ok) throw new Error('Error al obtener cupones');
        return res.json() as Promise<Coupon[]>;
    },

    async createCoupon(coupon: Omit<Coupon, 'id' | 'usageCount' | 'status'>): Promise<Coupon> {
        const res = await fetch(`${API_URL}/api/admin/cupones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(coupon),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            if (err.error === 'CODIGO_DUPLICADO') throw new Error('El código de cupón ya está en uso.');
            throw new Error(err.error || 'Error al crear cupón');
        }
        return res.json() as Promise<Coupon>;
    },

    async updateCoupon(id: string, coupon: Partial<Coupon>): Promise<Coupon> {
        const res = await fetch(`${API_URL}/api/admin/cupones/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(coupon),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            if (err.error === 'CODIGO_DUPLICADO') throw new Error('El código de cupón ya está en uso.');
            throw new Error(err.error || 'Error al actualizar cupón');
        }
        return res.json() as Promise<Coupon>;
    },

    async deleteCoupon(id: string): Promise<void> {
        const res = await fetch(`${API_URL}/api/admin/cupones/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Error al eliminar cupón');
    },

    async validateCoupon(codigo: string, monto: number): Promise<{ valido: boolean; cupon?: any; error?: string }> {
        const res = await fetch(`${API_URL}/api/admin/cupones/validar?codigo=${encodeURIComponent(codigo)}&monto=${monto}`);
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            return { valido: false, error: data.error || 'Error al validar el cupón' };
        }
        return res.json() as Promise<{ valido: boolean; cupon?: any; error?: string }>;
    }
};