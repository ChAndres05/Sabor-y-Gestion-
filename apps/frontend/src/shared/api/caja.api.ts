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
    }
};