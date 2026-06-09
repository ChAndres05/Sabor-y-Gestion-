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

export interface MockProductoReceta {
  id_producto: string;
  nombre: string;
  ingredientes: Array<{
    id_insumo: string;
    nombre_insumo: string;
    cantidad: number;
    unidad: string;
  }>;
}

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

// Claves de LocalStorage
const LOCAL_STORAGE_INSUMOS_KEY = 'gestionysabor_mock_insumos';
const LOCAL_STORAGE_MOVIMIENTOS_KEY = 'gestionysabor_mock_movimientos';
const LOCAL_STORAGE_RECETAS_KEY = 'gestionysabor_mock_recetas';

const defaultInsumos: Insumo[] = [
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
    activo: true,
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

const defaultMovimientos: MovimientoStock[] = [
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

const defaultProductosRecetas: MockProductoReceta[] = [
  {
    id_producto: 'PROD-001',
    nombre: 'Pique Macho Especial',
    ingredientes: [
      { id_insumo: 'INS-004', nombre_insumo: 'Carne Molida Especial', cantidad: 0.35, unidad: 'KG' },
      { id_insumo: 'INS-003', nombre_insumo: 'Tomate Perita', cantidad: 0.15, unidad: 'KG' }
    ]
  },
  {
    id_producto: 'PROD-002',
    nombre: 'Hamburguesa clásica',
    ingredientes: [
      { id_insumo: 'INS-005', nombre_insumo: 'Pan de Hamburguesa Brioche', cantidad: 1.0, unidad: 'Unidades' },
      { id_insumo: 'INS-007', nombre_insumo: 'Queso Cheddar', cantidad: 0.05, unidad: 'KG' }
    ]
  },
  {
    id_producto: 'PROD-003',
    nombre: 'Pechuga a la Plancha',
    ingredientes: [
      { id_insumo: 'INS-001', nombre_insumo: 'Pechuga de Pollo', cantidad: 0.25, unidad: 'KG' }
    ]
  },
  {
    id_producto: 'PROD-004',
    nombre: 'Agua Mineral Helada',
    ingredientes: [
      { id_insumo: 'INS-002', nombre_insumo: 'Agua San Luis 2L', cantidad: 1.0, unidad: 'Litros' }
    ]
  }
];

// Inicializar cargando de localStorage o default
const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

export const mockInsumos: Insumo[] = loadFromStorage(LOCAL_STORAGE_INSUMOS_KEY, defaultInsumos);
export const mockMovimientos: MovimientoStock[] = loadFromStorage(LOCAL_STORAGE_MOVIMIENTOS_KEY, defaultMovimientos);
export const mockProductosRecetas: MockProductoReceta[] = loadFromStorage(LOCAL_STORAGE_RECETAS_KEY, defaultProductosRecetas);

export const saveInsumosToStorage = () => {
  try {
    localStorage.setItem(LOCAL_STORAGE_INSUMOS_KEY, JSON.stringify(mockInsumos));
  } catch (e) {
    console.error('Error saving insumos to local storage', e);
  }
};

export const saveMovimientosToStorage = () => {
  try {
    localStorage.setItem(LOCAL_STORAGE_MOVIMIENTOS_KEY, JSON.stringify(mockMovimientos));
  } catch (e) {
    console.error('Error saving movimientos to local storage', e);
  }
};

export const saveProductosRecetasToStorage = () => {
  try {
    localStorage.setItem(LOCAL_STORAGE_RECETAS_KEY, JSON.stringify(mockProductosRecetas));
  } catch (e) {
    console.error('Error saving recetas to local storage', e);
  }
};

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