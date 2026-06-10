import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RecetaIngredienteInput {
  id_insumo: string | number;
  cantidad: number;
}

const formatUnidad = (unidad: string): string => {
  const map: Record<string, string> = {
    KILOGRAMO: 'KG',
    LITRO: 'Litros',
    UNIDAD: 'Unidades',
    GRAMO: 'Gramos',
    MILILITRO: 'ml'
  };
  return map[unidad] || unidad;
};

export async function GET() {
  try {
    const productos = await prisma.productos.findMany({
      where: { activo: true },
      include: {
        presentaciones: {
          where: { activo: true },
          include: {
            recetas_presentaciones: {
              include: {
                insumo: true
              }
            }
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    const mappedRecetas = productos.map((prod) => {
      // Tomar la presentación predeterminada o la primera disponible
      const pres = prod.presentaciones.find(p => p.es_predeterminada) || prod.presentaciones[0];
      const ingredientes = pres?.recetas_presentaciones
        .filter(rp => rp.insumo && rp.insumo.activo)
        .map(rp => ({
          id_insumo: String(rp.id_insumo),
          nombre_insumo: rp.insumo.nombre,
          cantidad: Number(rp.cantidad_insumo),
          unidad: formatUnidad(rp.insumo.unidad_medida)
        })) || [];

      return {
        id_producto: String(prod.id_producto),
        nombre: prod.nombre,
        ingredientes
      };
    });

    return NextResponse.json(mappedRecetas);
  } catch (error) {
    console.error('Error al obtener recetas:', error);
    return NextResponse.json({ error: 'Error al obtener recetas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_producto, ingredientes } = body;

    if (!id_producto || !Array.isArray(ingredientes)) {
      return NextResponse.json({ error: 'Datos de receta inválidos' }, { status: 400 });
    }

    const prodId = Number(id_producto);

    // Buscar presentación predeterminada primero, si no hay, la primera activa
    let pres = await prisma.presentaciones_producto.findFirst({
      where: { id_producto: prodId, activo: true, es_predeterminada: true }
    });

    if (!pres) {
      pres = await prisma.presentaciones_producto.findFirst({
        where: { id_producto: prodId, activo: true }
      });
    }

    if (!pres) {
      const product = await prisma.productos.findUnique({
        where: { id_producto: prodId }
      });
      if (!product) {
        return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
      }

      // Crear presentación predeterminada
      pres = await prisma.presentaciones_producto.create({
        data: {
          id_producto: prodId,
          nombre: 'Normal',
          precio: product.precio || 0,
          tiempo_preparacion_minutos: product.tiempo_preparacion || 10,
          disponible: true,
          activo: true,
          es_predeterminada: true
        }
      });
    }

    const idPresentacion = pres.id_presentacion_producto;

    // Actualizar receta en una transacción
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar ingredientes anteriores de esta presentación
      await tx.recetas_presentaciones_producto.deleteMany({
        where: { id_presentacion_producto: idPresentacion }
      });

      // 2. Crear nuevos registros de receta
      if (ingredientes.length > 0) {
        await tx.recetas_presentaciones_producto.createMany({
          data: ingredientes.map((ing: RecetaIngredienteInput) => ({
            id_presentacion_producto: idPresentacion,
            id_insumo: Number(ing.id_insumo),
            cantidad_insumo: Number(ing.cantidad)
          }))
        });
      }
    });

    return NextResponse.json({ success: true, message: 'Receta actualizada correctamente' });
  } catch (error) {
    console.error('Error al guardar receta:', error);
    return NextResponse.json({ error: 'Error interno al guardar la receta' }, { status: 500 });
  }
}
