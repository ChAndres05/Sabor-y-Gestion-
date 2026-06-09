// Define de forma estricta los valores permitidos según la base de datos
export type UnidadMedida = 'UNIDAD' | 'GRAMO' | 'KILOGRAMO' | 'MILILITRO' | 'LITRO';

export interface Insumo {
  id_insumo: string; // En el frontend usaremos string temporalmente para simular "INS-001"
  nombre: string;
  categoria: string; 
  unidad_medida: UnidadMedida;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
}

export const mockInsumos: Insumo[] = [
  {
    id_insumo: 'INS-001',
    nombre: 'Pechuga de Pollo',
    categoria: 'Carnes y Aves',
    unidad_medida: 'KILOGRAMO',
    stock_actual: 32,
    stock_minimo: 10,
    activo: true,
  },
  {
    id_insumo: 'INS-002',
    nombre: 'Agua San Luis 2L',
    categoria: 'Bebidas',
    unidad_medida: 'LITRO',
    stock_actual: 27,
    stock_minimo: 30,
    activo: true,
  },
  {
    id_insumo: 'INS-003',
    nombre: 'Tomate Perita',
    categoria: 'Verduras',
    unidad_medida: 'KILOGRAMO',
    stock_actual: 2,
    stock_minimo: 15,
    activo: true,
  },
  {
    id_insumo: 'INS-004',
    nombre: 'Carne Molida Especial',
    categoria: 'Carnes y Aves',
    unidad_medida: 'KILOGRAMO',
    stock_actual: 15,
    stock_minimo: 15,
    activo: true,
  },
  {
    id_insumo: 'INS-005',
    nombre: 'Pan de Hamburguesa Brioche',
    categoria: 'Abarrotes / Secos',
    unidad_medida: 'UNIDAD',
    stock_actual: 120,
    stock_minimo: 40,
    activo: true,
  },
  {
    id_insumo: 'INS-006',
    nombre: 'Locoto',
    categoria: 'Verduras',
    unidad_medida: 'UNIDAD',
    stock_actual: 0,
    stock_minimo: 15,
    activo: true, // Se mantiene activo aunque el stock sea 0, para que dispare la alerta "Agotado"
  },
  {
    id_insumo: 'INS-007',
    nombre: 'Queso Cheddar',
    categoria: 'Lácteos',
    unidad_medida: 'KILOGRAMO',
    stock_actual: 4,
    stock_minimo: 5,
    activo: true,
  }
];

// Helper opcional para formatear las unidades de la DB a lo visual (Ej: KILOGRAMO -> KG)
export const formatUnidad = (unidad: UnidadMedida): string => {
  const map: Record<UnidadMedida, string> = {
    KILOGRAMO: 'KG',
    LITRO: 'Litros',
    UNIDAD: 'Unidades',
    GRAMO: 'Gramos',
    MILILITRO: 'ml'
  };
  return map[unidad];
};

export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'MERMA' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO';

export interface MovimientoStock {
  id_movimiento: string;
  id_insumo: string;
  nombre_insumo: string;
  tipo_movimiento: TipoMovimiento;
  cantidad: number;
  unidad_medida: UnidadMedida;
  stock_anterior: number;
  stock_actual: number;
  fecha_hora: string; // Formato ISO
  usuario: string;
}

export const mockMovimientos: MovimientoStock[] = [
  {
    id_movimiento: 'MOV-001',
    id_insumo: 'INS-002',
    nombre_insumo: 'Agua San Luis 2L',
    tipo_movimiento: 'SALIDA',
    cantidad: 2,
    unidad_medida: 'LITRO',
    stock_anterior: 29,
    stock_actual: 27,
    fecha_hora: '2026-02-17T10:45:00',
    usuario: 'Mesero (Juan P.)'
  },
  {
    id_movimiento: 'MOV-002',
    id_insumo: 'INS-001',
    nombre_insumo: 'Pechuga de Pollo',
    tipo_movimiento: 'ENTRADA',
    cantidad: 4,
    unidad_medida: 'KILOGRAMO',
    stock_anterior: 28,
    stock_actual: 32,
    fecha_hora: '2026-02-17T10:30:00',
    usuario: 'Cocinero (Carlos M.)'
  },
  {
    id_movimiento: 'MOV-003',
    id_insumo: 'INS-003',
    nombre_insumo: 'Tomate Perita',
    tipo_movimiento: 'MERMA',
    cantidad: 1,
    unidad_medida: 'KILOGRAMO',
    stock_anterior: 3,
    stock_actual: 2,
    fecha_hora: '2026-02-16T15:20:00',
    usuario: 'Admin (Heidy M.)'
  }

  
];

// Helper para formatear fechas
export const formatFecha = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString('es-BO', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};