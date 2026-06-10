import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Verificamos si hay categorías de insumos. Si no hay, las creamos.
    const countCategorias = await prisma.categorias_insumos.count();
    if (countCategorias === 0) {
      const defaultCats = [
        'Carnes y Aves',
        'Verduras',
        'Bebidas',
        'Lácteos',
        'Abarrotes / Secos'
      ];
      for (const cat of defaultCats) {
        await prisma.categorias_insumos.create({
          data: { nombre: cat, activo: true }
        });
      }
    }

    const insumosList = await prisma.insumos.findMany({
      where: { activo: true },
      include: {
        categorias_insumos: true,
        recetas_presentaciones_producto: {
          include: {
            presentacion_producto: {
              include: {
                producto: true
              }
            }
          }
        }
      },
      orderBy: {
        id_insumo: 'asc'
      }
    });

    const mappedInsumos = insumosList.map((insumo) => {
      // Filtrar y mapear productos asociados
      const productosAsociados = insumo.recetas_presentaciones_producto
        .map(rp => rp.presentacion_producto?.producto)
        .filter((p): p is NonNullable<typeof p> => Boolean(p && p.activo));

      return {
        id_insumo: String(insumo.id_insumo),
        nombre: insumo.nombre,
        categoria: insumo.categorias_insumos?.nombre || 'Sin Categoría',
        unidad_medida: insumo.unidad_medida,
        stock_actual: Number(insumo.stock_actual),
        stock_minimo: Number(insumo.stock_minimo),
        activo: insumo.activo,
        productos: productosAsociados.map(p => ({
          id_producto: String(p.id_producto),
          nombre: p.nombre
        }))
      };
    });

    return NextResponse.json(mappedInsumos);
  } catch (error) {
    console.error('Error al obtener insumos:', error);
    return NextResponse.json({ error: 'Error al obtener los insumos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, categoria, unidad_medida, stock_inicial, stock_minimo } = body;

    if (!nombre || !categoria || !unidad_medida) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    // Buscar o crear la categoría de insumo
    let catRecord = await prisma.categorias_insumos.findFirst({
      where: { nombre: { equals: categoria, mode: 'insensitive' } }
    });

    if (!catRecord) {
      catRecord = await prisma.categorias_insumos.create({
        data: { nombre: categoria, activo: true }
      });
    }

    const stInicial = stock_inicial !== undefined && stock_inicial !== '' ? Number(stock_inicial) : 0;
    const stMinimo = stock_minimo !== undefined && stock_minimo !== '' ? Number(stock_minimo) : 0;

    // Verificar unicidad de nombre de insumo activo
    const insumoExistente = await prisma.insumos.findFirst({
      where: { nombre: { equals: nombre.trim(), mode: 'insensitive' }, activo: true }
    });

    if (insumoExistente) {
      return NextResponse.json({ error: 'Ya existe un insumo activo con ese nombre' }, { status: 400 });
    }

    // Crear el insumo
    const nuevoInsumo = await prisma.insumos.create({
      data: {
        nombre: nombre.trim(),
        unidad_medida,
        stock_actual: stInicial,
        stock_minimo: stMinimo,
        activo: true,
        id_categoria_insumo: catRecord.id_categoria_insumo
      },
      include: {
        categorias_insumos: true
      }
    });

    // Si tiene stock inicial, registrar movimiento de stock inicial
    if (stInicial > 0) {
      await prisma.movimientos_stock.create({
        data: {
          id_insumo: nuevoInsumo.id_insumo,
          tipo_movimiento: 'ENTRADA',
          cantidad: stInicial,
          motivo: 'Stock inicial',
          fecha_registro: new Date()
        }
      });
    }

    return NextResponse.json({
      id_insumo: String(nuevoInsumo.id_insumo),
      nombre: nuevoInsumo.nombre,
      categoria: nuevoInsumo.categorias_insumos?.nombre || 'Sin Categoría',
      unidad_medida: nuevoInsumo.unidad_medida,
      stock_actual: Number(nuevoInsumo.stock_actual),
      stock_minimo: Number(nuevoInsumo.stock_minimo),
      activo: nuevoInsumo.activo
    });
  } catch (error) {
    console.error('Error al crear insumo:', error);
    return NextResponse.json({ error: 'Error interno al crear el insumo' }, { status: 500 });
  }
}
