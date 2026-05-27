const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ProcesarPagoPayload {
    id_mesa: number;
    metodo_pago: 'EFECTIVO' | 'TRANSFERENCIA';
    monto_pagado: number;
    monto_recibido?: number;
    monto_cambio: number;
    referencia_pago?: string;
    id_usuario_cajero: number;
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
    }
};