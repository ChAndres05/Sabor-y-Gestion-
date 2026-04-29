import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nombre = searchParams.get('nombre') || '';
    const activoParam = searchParams.get('activo');

    const categorias = await prisma.categorias.findMany({
      where: {
        nombre: { contains: nombre, mode: 'insensitive' },
        ...(activoParam !== null && { activo: activoParam === 'true' }),
      },
      include: {
        _count: { select: { productos: true } } // Para validar borrado
      },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(categorias);
  } catch {
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nueva = await prisma.categorias.create({
      data: {
        nombre: body.nombre,
        descripcion: body.descripcion,
        activo: body.activo ?? true
      }
    });
    return NextResponse.json(nueva, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Nombre de categoría ya existe' }, { status: 400 });
  }
}