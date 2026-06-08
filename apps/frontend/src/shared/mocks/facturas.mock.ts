// src/shared/mocks/facturas.mock.ts

export interface FacturaMock {
  id_factura: number;
  id_pedido: number;
  id_usuario_emision: number;
  nombre_usuario_emision: string;
  tipo_documento: string;
  numero_documento: string;
  subtotal: number;
  impuesto: number;
  descuento: number;
  total: number;
  fecha_emision: string;
  estado_documento: 'EMITIDA' | 'ANULADA';
  observaciones?: string;
  cliente_nombre: string;
  cliente_ci: string;
  items?: Array<{
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
}

export const MOCK_FACTURAS: FacturaMock[] = [
  {
    id_factura: 1,
    id_pedido: 101,
    id_usuario_emision: 2,
    nombre_usuario_emision: 'Carlos Gómez',
    tipo_documento: 'FACTURA',
    numero_documento: 'FAC-2026-0001',
    subtotal: 410.00,
    impuesto: 0.00,
    descuento: 0.00,
    total: 410.00,
    fecha_emision: '2026-05-30T14:32:00.000Z',
    estado_documento: 'EMITIDA',
    observaciones: 'Facturado a: Juan Perez, CI/NIT: 1234567',
    cliente_nombre: 'Juan Perez',
    cliente_ci: '1234567',
    items: [
      { nombre: 'Carpaccio de Res', cantidad: 1, precio_unitario: 120, subtotal: 120 },
      { nombre: 'Salmón al Horno', cantidad: 1, precio_unitario: 290, subtotal: 290 }
    ]
  },
  {
    id_factura: 2,
    id_pedido: 102,
    id_usuario_emision: 2,
    nombre_usuario_emision: 'Carlos Gómez',
    tipo_documento: 'FACTURA',
    numero_documento: 'FAC-2026-0002',
    subtotal: 440.00,
    impuesto: 0.00,
    descuento: 40.00,
    total: 400.00,
    fecha_emision: '2026-05-30T15:15:00.000Z',
    estado_documento: 'EMITIDA',
    observaciones: 'Facturado a: Maria Lopez, CI/NIT: 7654321 - Descuento promocional aplicado',
    cliente_nombre: 'Maria Lopez',
    cliente_ci: '7654321',
    items: [
      { nombre: 'Corte de Bife Angosto', cantidad: 2, precio_unitario: 220, subtotal: 440 }
    ]
  },
  {
    id_factura: 3,
    id_pedido: 103,
    id_usuario_emision: 3,
    nombre_usuario_emision: 'Ana Rodríguez',
    tipo_documento: 'FACTURA',
    numero_documento: 'FAC-2026-0003',
    subtotal: 60.00,
    impuesto: 0.00,
    descuento: 0.00,
    total: 60.00,
    fecha_emision: '2026-05-30T16:05:00.000Z',
    estado_documento: 'EMITIDA',
    observaciones: 'Facturado a: Carlos Gomez, CI/NIT: 4567890',
    cliente_nombre: 'Carlos Gomez',
    cliente_ci: '4567890',
    items: [
      { nombre: 'Hamburguesa Sabor', cantidad: 1, precio_unitario: 45, subtotal: 45 },
      { nombre: 'Refresco Mediano', cantidad: 1, precio_unitario: 15, subtotal: 15 }
    ]
  },
  {
    id_factura: 4,
    id_pedido: 104,
    id_usuario_emision: 2,
    nombre_usuario_emision: 'Carlos Gómez',
    tipo_documento: 'FACTURA',
    numero_documento: 'FAC-2026-0004',
    subtotal: 150.00,
    impuesto: 0.00,
    descuento: 15.00,
    total: 135.00,
    fecha_emision: '2026-05-30T17:40:00.000Z',
    estado_documento: 'ANULADA',
    observaciones: 'ANULADA - Error en NIT del cliente. Original a nombre de: Roberto Claros',
    cliente_nombre: 'Roberto Claros',
    cliente_ci: '9827361',
    items: [
      { nombre: 'Lasaña Boloñesa', cantidad: 1, precio_unitario: 90, subtotal: 90 },
      { nombre: 'Copa de Vino Tinto', cantidad: 2, precio_unitario: 30, subtotal: 60 }
    ]
  },
  {
    id_factura: 5,
    id_pedido: 105,
    id_usuario_emision: 3,
    nombre_usuario_emision: 'Ana Rodríguez',
    tipo_documento: 'FACTURA',
    numero_documento: 'FAC-2026-0005',
    subtotal: 320.00,
    impuesto: 0.00,
    descuento: 0.00,
    total: 320.00,
    fecha_emision: '2026-05-31T11:20:00.000Z',
    estado_documento: 'EMITIDA',
    observaciones: 'Facturado a: Sofia Rojas, CI/NIT: 8762341',
    cliente_nombre: 'Sofia Rojas',
    cliente_ci: '8762341',
    items: [
      { nombre: 'Fettuccine Alfredo', cantidad: 2, precio_unitario: 110, subtotal: 220 },
      { nombre: 'Limonada Jarra', cantidad: 1, precio_unitario: 100, subtotal: 100 }
    ]
  }
];
