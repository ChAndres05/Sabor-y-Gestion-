import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categorias = await prisma.categorias_insumos.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });
    return NextResponse.json(categorias);
  } catch (error) {
    console.error('Error al obtener categorías de insumos:', error);
    return NextResponse.json({ error: 'Error al obtener categorías de insumos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, descripcion } = body;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'EL_NOMBRE_ES_OBLIGATORIO', message: 'El nombre es obligatorio' }, { status: 400 });
    }

    // Verificar si ya existe una categoría activa con el mismo nombre (insensible a mayúsculas)
    const existente = await prisma.categorias_insumos.findFirst({
      where: {
        nombre: { equals: nombre.trim(), mode: 'insensitive' },
        activo: true
      }
    });

    if (existente) {
      return NextResponse.json({ error: 'CATEGORIA_DUPLICADA', message: 'Ya existe una categoría activa con este nombre' }, { status: 400 });
    }

    const nuevaCategoria = await prisma.categorias_insumos.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        activo: true
      }
    });

    return NextResponse.json(nuevaCategoria, { status: 201 });
  } catch (error) {
    console.error('Error al crear categoría de insumos:', error);
    return NextResponse.json({ error: 'Error interno del servidor al crear la categoría' }, { status: 500 });
  }
}
