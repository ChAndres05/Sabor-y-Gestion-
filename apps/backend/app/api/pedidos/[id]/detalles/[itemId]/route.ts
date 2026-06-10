import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string, itemId: string }> }) {
  try {
    const { id: idParam, itemId: itemIdParam } = await params;
    const id_pedido = parseInt(idParam, 10);
    const id_detalle = parseInt(itemIdParam, 10);
    
    if (isNaN(id_pedido) || isNaN(id_detalle)) {
      return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 });
    }

    const body = await request.json();
    const { cantidad, observaciones } = body;

    if (cantidad !== undefined && (isNaN(Number(cantidad)) || Number(cantidad) <= 0)) {
      return NextResponse.json({ error: 'La cantidad debe ser mayor a 0' }, { status: 400 });
    }

    // Usar transacción para actualizar el detalle, ajustar stock y recalcular totales
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Obtener el detalle actual para conocer el precio unitario si no se envía de nuevo
      const detalleExistente = await tx.detalles_pedido.findUnique({
        where: { id_detalle_pedido: id_detalle }
      });

      if (!detalleExistente) {
        throw new Error('DETALLE_NO_ENCONTRADO');
      }

      const nuevaCantidad = cantidad !== undefined ? Number(cantidad) : detalleExistente.cantidad;
      const nuevoSubtotalDetalle = nuevaCantidad * Number(detalleExistente.precio_unitario);

      // Calcular diferencia en cantidad para ajustar el stock
      const diff = nuevaCantidad - detalleExistente.cantidad;

      if (diff !== 0) {
        const recetaIngredientes = await tx.recetas_presentaciones_producto.findMany({
          where: { id_presentacion_producto: detalleExistente.id_presentacion_producto }
        });

        for (const ing of recetaIngredientes) {
          const cantDiff = Number(ing.cantidad_insumo) * diff;

          const insumo = await tx.insumos.findUnique({
            where: { id_insumo: ing.id_insumo }
          });

          if (insumo) {
            if (cantDiff > 0) {
              // Deducir más insumos
              await tx.insumos.update({
                where: { id_insumo: ing.id_insumo },
                data: { stock_actual: { decrement: cantDiff } }
              });

              await tx.movimientos_stock.create({
                data: {
                  id_insumo: ing.id_insumo,
                  tipo_movimiento: 'SALIDA',
                  cantidad: cantDiff,
                  motivo: `Edición Incrementar - Pedido #${id_pedido}`,
                  fecha_registro: new Date()
                }
              });
            } else if (cantDiff < 0) {
              // Restaurar insumos sobrantes
              const cantRestore = Math.abs(cantDiff);
              await tx.insumos.update({
                where: { id_insumo: ing.id_insumo },
                data: { stock_actual: { increment: cantRestore } }
              });

              await tx.movimientos_stock.create({
                data: {
                  id_insumo: ing.id_insumo,
                  tipo_movimiento: 'ENTRADA',
                  cantidad: cantRestore,
                  motivo: `Edición Reducir - Pedido #${id_pedido}`,
                  fecha_registro: new Date()
                }
              });
            }
          }
        }
      }

      // 2. Actualizar el detalle
      const updatedItem = await tx.detalles_pedido.update({
        where: { id_detalle_pedido: id_detalle },
        data: {
          cantidad: nuevaCantidad,
          subtotal: nuevoSubtotalDetalle,
          observaciones: observaciones !== undefined ? observaciones : detalleExistente.observaciones
        }
      });

      // 3. Recalcular subtotal del pedido entero
      const sumResult = await tx.detalles_pedido.aggregate({
        where: { id_pedido },
        _sum: { subtotal: true }
      });

      const nuevoSubtotalPedido = sumResult._sum.subtotal || 0;
      
      // 4. Actualizar el pedido
      const updatedPedido = await tx.pedidos.update({
        where: { id_pedido },
        data: {
          subtotal: nuevoSubtotalPedido,
          total: nuevoSubtotalPedido // Asumiendo que no hay impuestos o descuentos extras por ahora
        }
      });

      return { updatedItem, updatedPedido };
    });

    // Notify clients via Pusher
    await pusherServer.trigger('tables-channel', 'table-order-updated', { id_pedido });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Error al actualizar detalle de pedido:', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    if (msg === 'DETALLE_NO_ENCONTRADO') {
      return NextResponse.json({ error: 'El producto del pedido no existe' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string, itemId: string }> }) {
  try {
    const { id: idParam, itemId: itemIdParam } = await params;
    const id_pedido = parseInt(idParam, 10);
    const id_detalle = parseInt(itemIdParam, 10);
    
    if (isNaN(id_pedido) || isNaN(id_detalle)) {
      return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 });
    }

    // Usar transacción para restaurar stock y recalcular totales
    const resultado = await prisma.$transaction(async (tx) => {
      // Eliminar el detalle
      const deletedItem = await tx.detalles_pedido.delete({
        where: { id_detalle_pedido: id_detalle }
      });

      // Restaurar stock de los insumos asociados al plato eliminado
      const recetaIngredientes = await tx.recetas_presentaciones_producto.findMany({
        where: { id_presentacion_producto: deletedItem.id_presentacion_producto }
      });

      for (const ing of recetaIngredientes) {
        const cantRestore = Number(ing.cantidad_insumo) * deletedItem.cantidad;

        const insumo = await tx.insumos.findUnique({
          where: { id_insumo: ing.id_insumo }
        });

        if (insumo) {
          await tx.insumos.update({
            where: { id_insumo: ing.id_insumo },
            data: { stock_actual: { increment: cantRestore } }
          });

          await tx.movimientos_stock.create({
            data: {
              id_insumo: ing.id_insumo,
              tipo_movimiento: 'ENTRADA',
              cantidad: cantRestore,
              motivo: `Restauración por plato eliminado de Pedido #${id_pedido}`,
              fecha_registro: new Date()
            }
          });
        }
      }

      // Recalcular subtotal
      const sumResult = await tx.detalles_pedido.aggregate({
        where: { id_pedido },
        _sum: { subtotal: true }
      });

      const nuevoSubtotal = sumResult._sum.subtotal || 0;
      
      // Actualizar el pedido
      const updatedPedido = await tx.pedidos.update({
        where: { id_pedido },
        data: {
          subtotal: nuevoSubtotal,
          total: nuevoSubtotal // Asumiendo que no hay impuestos o descuentos extras por ahora
        }
      });

      return { deletedItem, updatedPedido };
    });

    // Notify clients via Pusher
    await pusherServer.trigger('tables-channel', 'table-order-updated', { id_pedido });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Error eliminando detalle de pedido:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
