import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const resolvedParams = await params; // CRÍTICO: Desempaquetar params
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const body = await request.json();
    const dataToUpdate: {
      nombre?: string;
      descripcion?: string;
      activo?: boolean;
    } = {};
    if (body.nombre !== undefined) dataToUpdate.nombre = body.nombre;
    if (body.descripcion !== undefined) dataToUpdate.descripcion = body.descripcion;
    if (body.activo !== undefined) dataToUpdate.activo = body.activo;

    const actualizada = await prisma.categorias.update({
      where: { id_categoria: id },
      data: dataToUpdate,
    });

    return NextResponse.json(actualizada);
  } catch {
    return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    // Validar si tiene productos (Integridad de la DB de Bolivia)
    const categoria = await prisma.categorias.findUnique({
      where: { id_categoria: id },
      include: { _count: { select: { productos: true } } }
    });

    if (categoria?._count.productos && categoria._count.productos > 0) {
      return NextResponse.json({ error: 'Categoría con productos asociados' }, { status: 400 });
    }

    await prisma.categorias.delete({ where: { id_categoria: id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}