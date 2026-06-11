// Define de forma estricta los valores permitidos según la base de datos
export type UnidadMedida = 'UNIDAD' | 'GRAMO' | 'KILOGRAMO' | 'MILILITRO' | 'LITRO';

export interface CategoriaInsumo {
  id_categoria_insumo: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
}

export interface Insumo {
  id_insumo: string;
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

// Mapeos vacíos para compatibilidad con código legado que aún intente importar los mocks
export const mockInsumos: Insumo[] = [];
export const mockMovimientos: MovimientoStock[] = [];
export const mockProductosRecetas: MockProductoReceta[] = [];

export const saveInsumosToStorage = () => {};
export const saveMovimientosToStorage = () => {};
export const saveProductosRecetasToStorage = () => {};

// Helper para formatear las unidades de la DB a lo visual (Ej: KILOGRAMO -> KG)
export const formatUnidad = (unidad: UnidadMedida): string => {
  const map: Record<UnidadMedida, string> = {
    KILOGRAMO: 'KG',
    LITRO: 'Litros',
    UNIDAD: 'Unidades',
    GRAMO: 'Gramos',
    MILILITRO: 'ml'
  };
  return map[unidad] || unidad;
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