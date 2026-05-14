// src/shared/mocks/cajaMocks.ts
import type { JornadaCaja, MesaCajero } from "../../modules/cajero/types";

// Simulamos que NO hay caja abierta para probar el flujo de apertura
export const mockJornadaActiva: JornadaCaja | null = null; 

export const mockMesasFacturacion: MesaCajero[] = [
  { id_mesa: 5, numero: 5, estado: 'CUENTA_SOLICITADA', total_acumulado: 410.00 },
  { id_mesa: 7, numero: 7, estado: 'CUENTA_SOLICITADA', total_acumulado: 440.00 }
];