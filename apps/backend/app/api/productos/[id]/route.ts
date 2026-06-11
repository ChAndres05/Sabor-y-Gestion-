import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateName, validateDescription } from '@/lib/validation';

// EDITAR O DESACTIVAR PRODUCTO
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    const body = await request.json();

    // Extraemos los datos. Si viene "disponible" o "activo", es que estamos desactivando/activando
    const { nombre, descripcion, id_categoria, precio, imagen_url, disponible, activo, tiempo_preparacion } = body;

    if (nombre !== undefined) {
      const validationError = validateName(nombre);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    if (descripcion !== undefined) {
      const validationError = validateDescription(descripcion);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    const productoActualizado = await prisma.$transaction(async (tx) => {
      const prod = await tx.productos.update({
        where: { id_producto: id },
        data: {
          ...(nombre && { nombre: nombre.trim() }),
          ...(descripcion !== undefined && { descripcion: descripcion ? descripcion.trim() : descripcion }),
          ...(id_categoria && { id_categoria: Number(id_categoria) }),
          ...(precio !== undefined && { precio: precio ? Number(precio) : null }),
          ...(tiempo_preparacion !== undefined && { tiempo_preparacion: tiempo_preparacion !== null ? Number(tiempo_preparacion) : null }),
          ...(imagen_url !== undefined && { imagen_url }),
          ...(disponible !== undefined && { disponible }),
          ...(activo !== undefined && { activo }) // Para la función "Desactivar" desde el frontend
        }
      });

      // Actualizar la presentación predeterminada si existe
      const pred = await tx.presentaciones_producto.findFirst({
        where: { id_producto: id, es_predeterminada: true }
      });

      if (pred) {
        await tx.presentaciones_producto.update({
          where: { id_presentacion_producto: pred.id_presentacion_producto },
          data: {
            ...(precio !== undefined && { precio: precio ? Number(precio) : 0 }),
            ...(tiempo_preparacion !== undefined && { tiempo_preparacion_minutos: tiempo_preparacion !== null ? Number(tiempo_preparacion) : 10 }),
            ...(disponible !== undefined && { disponible }),
            ...(activo !== undefined && { activo })
          }
        });
      }

      return prod;
    });
    return NextResponse.json(productoActualizado);
  } catch {
    return NextResponse.json({ error: 'Error al actualizar el producto' }, { status: 500 });
  }
}

// ELIMINAR PRODUCTO (Físico, o lógico si hay referencias)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);

    try {
      // Intentamos borrado físico primero para limpiar la base de datos
      await prisma.productos.delete({
        where: { id_producto: id }
      });
    } catch {
      // Si falla (probablemente por Foreign Key constraints en ventas), hacemos borrado lógico
      await prisma.productos.update({
        where: { id_producto: id },
        data: { activo: false, disponible: false }
      });
    }

    return NextResponse.json({ message: 'Producto eliminado correctamente' });
  } catch {
    return NextResponse.json({ error: 'Error al eliminar el producto' }, { status: 500 });
  }
}