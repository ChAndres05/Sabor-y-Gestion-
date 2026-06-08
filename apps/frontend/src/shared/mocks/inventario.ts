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