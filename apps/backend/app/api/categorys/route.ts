import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma'; // Asegúrate de que esta ruta apunte a tu cliente de prisma


export async function GET() {
  try {
    const categorias = await prisma.categorias.findMany({
      orderBy: { id_categoria: 'asc' },
    });
    return NextResponse.json(categorias);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, descripcion, activo } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    const nuevaCategoria = await prisma.categorias.create({
      data: {
        nombre,
        descripcion,
        activo: activo ?? true,
      },
    });

    return NextResponse.json(nuevaCategoria, { status: 201 });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 });
  }
}