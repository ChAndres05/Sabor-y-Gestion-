import { getMockIngredientsForProduct } from '../mocks/menu-ingredients.mock';
import { mockProductosRecetas } from '../mocks/inventario';

type NumericValue = number | string | null | undefined;

export interface BackendProduct {
  id?: NumericValue;
  id_producto?: NumericValue;
  id_presentacion_producto?: NumericValue;
  categoryId?: NumericValue;
  id_categoria?: NumericValue;
  nombre: string;
  descripcion?: string | null;
  precio?: NumericValue;
  tiempo_preparacion?: NumericValue;
  tiempoPreparacion?: NumericValue;
  imagen_url?: string | null;
  imagen?: string | null;
  url_imagen?: string | null;
  foto?: string | null;
  activo?: boolean | null;
  disponible?: boolean | null;
  categoria?: {
    id_categoria?: NumericValue;
    id?: NumericValue;
    nombre?: string;
  } | null;
  categorias?: {
    id_categoria?: NumericValue;
    id?: NumericValue;
    nombre?: string;
  } | null;
  presentaciones?: Array<{
    id_presentacion_producto?: NumericValue;
    precio?: NumericValue;
    tiempo_preparacion_minutos?: NumericValue;
    disponible?: boolean | null;
    activo?: boolean | null;
    es_predeterminada?: boolean | null;
    // Agregamos la lectura de recetas aquí
    recetas_presentaciones?: Array<{
      insumo?: {
        id_insumo: number;
        nombre: string;
      };
    }> | null;
  }> | null;
}

function numberValue(val: NumericValue, fallback = 0): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function getDefaultPresentation(product: BackendProduct) {
  if (!product.presentaciones || product.presentaciones.length === 0) {
    return null;
  }
  const defaultPres = product.presentaciones.find((p) => p.es_predeterminada);
  return defaultPres || product.presentaciones[0];
}

export function mapProductFromBackend(product: BackendProduct) {
  const presentation = getDefaultPresentation(product);

  // Intentar primero obtener ingredientes del mock de recetas de inventario
  const recipe = mockProductosRecetas.find(
    (r) => r.nombre.toLowerCase() === product.nombre.toLowerCase()
  );

  let ingredientes = recipe
    ? recipe.ingredientes.map((ing, idx) => ({
        id: idx + 1000, // ID mock único
        nombre: ing.nombre_insumo,
        incluidoPorDefecto: true,
      }))
    : (presentation?.recetas_presentaciones
        ?.filter((receta) => receta.insumo)
        .map((receta) => ({
          id: numberValue(receta.insumo?.id_insumo),
          nombre: receta.insumo?.nombre ?? 'Insumo',
          incluidoPorDefecto: true,
        })) ?? []);

  if (ingredientes.length === 0 && product.nombre) {
    ingredientes = getMockIngredientsForProduct(product.nombre).map((ing) => ({
      id: ing.id,
      nombre: ing.nombre,
      incluidoPorDefecto: ing.incluidoPorDefecto,
    }));
  }

  const categoryFromRelation = product.categoria ?? product.categorias;

  return {
    id: numberValue(product.id_producto ?? product.id),
    presentacionId: numberValue(
      presentation?.id_presentacion_producto ?? product.id_presentacion_producto,
      0
    ),
    categoryId: numberValue(
      product.id_categoria ??
        product.categoryId ??
        categoryFromRelation?.id_categoria ??
        categoryFromRelation?.id
    ),
    nombre: product.nombre,
    descripcion: product.descripcion || '',
    precio: numberValue(product.precio ?? presentation?.precio),
    tiempoPreparacion: numberValue(
      product.tiempo_preparacion ??
        product.tiempoPreparacion ??
        presentation?.tiempo_preparacion_minutos
    ),
    imagen:
      product.imagen_url ||
      product.imagen ||
      product.url_imagen ||
      product.foto ||
      null,
    disponible: product.disponible ?? presentation?.disponible ?? true,
    activo: product.activo ?? presentation?.activo ?? true,
    ingredientes, 
  };
}
