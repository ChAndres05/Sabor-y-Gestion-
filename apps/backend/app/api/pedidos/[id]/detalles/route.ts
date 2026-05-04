import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const id_pedido = parseInt(idParam, 10);
    if (isNaN(id_pedido)) {
      return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { id_presentacion_producto, cantidad, observaciones } = body;

    if (!id_presentacion_producto || !cantidad || cantidad <= 0) {
      return NextResponse.json({ error: 'Datos de detalle inválidos' }, { status: 400 });
    }

    // Obtener precio del producto
    const presentacion = await prisma.presentaciones_producto.findUnique({
      where: { id_presentacion_producto }
    });

    if (!presentacion) {
      return NextResponse.json({ error: 'Presentación de producto no encontrada' }, { status: 404 });
    }

    const precio_unitario = Number(presentacion.precio);
    const subtotal = precio_unitario * cantidad;

    // Crear el detalle y actualizar el total del pedido en una transacción
    const [nuevoDetalle, pedidoActualizado] = await prisma.$transaction(async (tx) => {
      const detalle = await tx.detalles_pedido.create({
        data: {
          id_pedido,
          id_presentacion_producto,
          cantidad,
          precio_unitario,
          subtotal,
          observaciones
        }
      });

      const pedido = await tx.pedidos.findUnique({ where: { id_pedido } });
      const nuevoTotal = Number(pedido?.total || 0) + subtotal;
      
      // Sumar tiempo estimado basico
      const nuevoTiempo = (pedido?.tiempo_estimado_minutos || 0) + (presentacion.tiempo_preparacion_minutos || 0);

      const actualizado = await tx.pedidos.update({
        where: { id_pedido },
        data: { 
          subtotal: nuevoTotal, 
          total: nuevoTotal,
          tiempo_estimado_minutos: nuevoTiempo
        }
      });

      return [detalle, actualizado];
    });

    return NextResponse.json({ detalle: nuevoDetalle, pedido: pedidoActualizado }, { status: 201 });
  } catch (error) {
    console.error('Error agregando detalle al pedido:', error);
    return NextResponse.json({ error: 'Error interno del servidor al agregar el detalle' }, { status: 500 });
  }
}
