import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nombre, descripcion } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID_REQUERIDO', message: 'El ID es obligatorio' }, { status: 400 });
    }

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'EL_NOMBRE_ES_OBLIGATORIO', message: 'El nombre es obligatorio' }, { status: 400 });
    }

    // Verificar si ya existe una categoría activa con el mismo nombre y diferente ID
    const existente = await prisma.categorias_insumos.findFirst({
      where: {
        nombre: { equals: nombre.trim(), mode: 'insensitive' },
        activo: true,
        NOT: {
          id_categoria_insumo: Number(id)
        }
      }
    });

    if (existente) {
      return NextResponse.json({ error: 'CATEGORIA_DUPLICADA', message: 'Ya existe otra categoría activa con este nombre' }, { status: 400 });
    }

    const categoriaActualizada = await prisma.categorias_insumos.update({
      where: { id_categoria_insumo: Number(id) },
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null
      }
    });

    return NextResponse.json(categoriaActualizada);
  } catch (error) {
    console.error('Error al actualizar la categoría de insumos:', error);
    return NextResponse.json({ error: 'Error interno al actualizar la categoría' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID_REQUERIDO', message: 'El ID es obligatorio' }, { status: 400 });
    }

    // Verificar si la categoría tiene insumos activos asociados
    const countInsumos = await prisma.insumos.count({
      where: {
        id_categoria_insumo: Number(id),
        activo: true
      }
    });

    if (countInsumos > 0) {
      return NextResponse.json({
        error: 'CATEGORIA_CON_INSUMOS',
        message: 'No se puede eliminar la categoría porque tiene insumos asociados activos'
      }, { status: 400 });
    }

    // Soft delete: desactivar categoría
    const categoriaEliminada = await prisma.categorias_insumos.update({
      where: { id_categoria_insumo: Number(id) },
      data: { activo: false }
    });

    return NextResponse.json(categoriaEliminada);
  } catch (error) {
    console.error('Error al eliminar la categoría de insumos:', error);
    return NextResponse.json({ error: 'Error interno al eliminar la categoría' }, { status: 500 });
  }
}
