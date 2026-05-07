import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCategoryName } from './validation';

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
    const nombreRaw = typeof body?.nombre === 'string' ? body.nombre : '';
    const validation = await validateCategoryName(nombreRaw);

    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const existing = await prisma.categorias.findFirst({
      where: {
        nombre: {
          equals: validation.value,
          mode: 'insensitive',
        },
      },
      select: { id_categoria: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Nombre de categoría ya existe' },
        { status: 400 }
      );
    }

    const descripcion =
      typeof body?.descripcion === 'string' ? body.descripcion : undefined;
    const activo = typeof body?.activo === 'boolean' ? body.activo : true;

    const nueva = await prisma.categorias.create({
      data: {
        nombre: validation.value,
        descripcion,
        activo,
      },
    });
    return NextResponse.json(nueva, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 });
  }
}