export interface JornadaCaja {
  id_jornada_caja: number; //
  id_asignacion_caja_turno: number; //
  id_usuario_apertura: number; //
  monto_inicial: number; //
  estado: 'ABIERTA' | 'CERRADA'; //
  fecha_hora_apertura: string; // ISO String
}

export interface MesaCajero {
  id_mesa: number; //
  numero: number; //
  estado: 'LIBRE' | 'OCUPADA' | 'RESERVADA' | 'CUENTA_SOLICITADA' | 'FUERA_DE_SERVICIO'; //
  total_acumulado?: number; // Calculado desde el pedido activo
}

export interface PagoConfirmacion {
  monto_pagado: number; //
  metodo_pago: 'EFECTIVO' | 'TRANSFERENCIA'; // Nombre del método
  monto_recibido?: number; //
  monto_cambio?: number; //
  descuento_aplicado?: number; //
  codigo_cupon?: string;
  referencia_pago?: string;
}