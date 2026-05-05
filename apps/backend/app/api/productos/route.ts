import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// OBTENER TODOS LOS PRODUCTOS (Reemplaza los mockups)
export async function GET() {
  try {
    const productos = await prisma.productos.findMany({
      where: { activo: true }, // Solo traemos los que no han sido "eliminados"
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

    const nuevoProducto = await prisma.productos.create({
      data: {
        nombre,
        descripcion,
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