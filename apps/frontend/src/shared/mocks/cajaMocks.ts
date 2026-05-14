// src/shared/mocks/cajaMocks.ts
import type { MesaCajero } from "../../modules/cajero/types";

export const mockMesasFacturacion: MesaCajero[] = [
  { 
    id_mesa: 5, 
    numero: 5, 
    estado: 'CUENTA_SOLICITADA', 
    total_acumulado: 410.00 
  },
  { 
    id_mesa: 7, 
    numero: 7, 
    estado: 'CUENTA_SOLICITADA', 
    total_acumulado: 440.00 
  },
  { 
    id_mesa: 13, 
    numero: 13, 
    estado: 'CUENTA_SOLICITADA', 
    total_acumulado: 60.00 
  },
  { 
    id_mesa: 20, 
    numero: 20, 
    estado: 'CUENTA_SOLICITADA', 
    total_acumulado: 70.00 
  }
];

export interface DetallePedidoMock {
  id_detalle_pedido: number;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export const mockDetallesMesa5: DetallePedidoMock[] = [
  { id_detalle_pedido: 101, nombre_producto: 'Carpaccio de Res', cantidad: 1, precio_unitario: 120, subtotal: 120 },
  { id_detalle_pedido: 102, nombre_producto: 'Salmón al Horno', cantidad: 1, precio_unitario: 290, subtotal: 290 }
];
export interface MovimientoDia {
  id: string;
  referencia: string;
  tipo: 'efectivo' | 'transferencia';
  monto: number;
  hora: string;
}

export const mockMovimientosDia: MovimientoDia[] = [
  { id: 'TRX-001', referencia: 'Mesa 2 - ORD-001', tipo: 'efectivo', monto: 600, hora: '14:32' },
  { id: 'TRX-002', referencia: 'Mesa 7 - ORD-002', tipo: 'transferencia', monto: 755, hora: '14:15' },
  { id: 'TRX-003', referencia: 'Delivery - DEL-001', tipo: 'efectivo', monto: 475, hora: '13:50' },
  { id: 'TRX-005', referencia: 'Compra de Insumos', tipo: 'efectivo', monto: -350, hora: '12:00' },
];