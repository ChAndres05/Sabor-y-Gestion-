import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateProductText } from './validation';

// OBTENER TODOS LOS PRODUCTOS (Reemplaza los mockups)
export async function GET() {
  try {
    const productos = await prisma.productos.findMany({
      include: { categoria: true } // Incluimos los datos de la categoría para mostrar el nombre
    });
    return NextResponse.json(productos);
  } catch {
    return NextResponse.json({ error: 'Error al obtener los productos' }, { status: 500 });
  }
}

// CREAR UN NUEVO PRODUCTO
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, descripcion, id_categoria, precio, imagen_url, tiempo_preparacion, disponible } = body;

    const nombreValidation = await validateProductText(nombre ?? '', 'El nombre');
    if (nombreValidation.error) {
      return NextResponse.json({ error: nombreValidation.error }, { status: 400 });
    }

    const descripcionValidation = await validateProductText(descripcion ?? '', 'La descripción');
    if (descripcionValidation.error) {
      return NextResponse.json({ error: descripcionValidation.error }, { status: 400 });
    }

    const existing = await prisma.productos.findFirst({
      where: {
        nombre: {
          equals: nombreValidation.value ?? nombre,
          mode: 'insensitive',
        },
      },
      select: { id_producto: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Nombre de producto ya existe' },
        { status: 400 }
      );
    }

    const nuevoProducto = await prisma.productos.create({
      data: {
        nombre: nombreValidation.value ?? nombre,
        descripcion: descripcionValidation.value ?? descripcion,
        id_categoria: Number(id_categoria),
        precio: precio ? Number(precio) : null,
        tiempo_preparacion: tiempo_preparacion ? Number(tiempo_preparacion) : null,
        imagen_url,
        disponible: disponible ?? true,
        activo: true,
        presentaciones: {
          create: {
            nombre: 'Normal',
            precio: precio ? Number(precio) : 0,
            tiempo_preparacion_minutos: tiempo_preparacion ? Number(tiempo_preparacion) : 10,
            disponible: disponible ?? true,
            activo: true,
            es_predeterminada: true
          }
        }
      }
    });
    return NextResponse.json(nuevoProducto);
  } catch {
    return NextResponse.json({ error: 'Error al crear el producto' }, { status: 500 });
  }
}