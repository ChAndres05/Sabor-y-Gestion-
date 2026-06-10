const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

import type { FacturaMock } from '../mocks/facturas.mock';

export const facturasApi = {
  async getFacturas(): Promise<FacturaMock[]> {
    const res = await fetch(`${API_URL}/api/admin/facturas`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al obtener las facturas');
    }
    return res.json() as Promise<FacturaMock[]>;
  },

  async anularFactura(idFactura: number): Promise<FacturaMock> {
    const res = await fetch(`${API_URL}/api/admin/facturas/${idFactura}/anular`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al anular la factura');
    }
    return res.json() as Promise<FacturaMock>;
  }
};
