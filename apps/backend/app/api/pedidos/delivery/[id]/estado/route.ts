import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';
import { nowBolivia } from '@/lib/timezone';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id_pedido = parseInt(idParam, 10);

    if (isNaN(id_pedido)) {
      return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { estado, id_usuario, observaciones } = body;

    if (!estado) {
      return NextResponse.json({ error: 'El estado es requerido' }, { status: 400 });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const pedidoOriginal = await tx.pedidos.findUnique({
        where: { id_pedido },
        include: {
          pedido_delivery: true,
        },
      });

      if (!pedidoOriginal) {
        throw new Error('PEDIDO_NO_ENCONTRADO');
      }

      // Handle stock restoration on cancellation
      if (estado === 'CANCELADO' && pedidoOriginal.estado !== 'CANCELADO') {
        const detalles = await tx.detalles_pedido.findMany({
          where: { id_pedido }
        });

        for (const detalle of detalles) {
          const recetaIngredientes = await tx.recetas_presentaciones_producto.findMany({
            where: { id_presentacion_producto: detalle.id_presentacion_producto }
          });

          for (const ing of recetaIngredientes) {
            const cantRestore = Number(ing.cantidad_insumo) * detalle.cantidad;
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
                  motivo: `Restauración por cancelación de Pedido Delivery #${id_pedido}`,
                  fecha_registro: new Date()
                }
              });
            }
          }
        }
      }

      // Update main order
      const dataUpdate: any = { estado };
      if (estado === 'ENTREGADO') {
        dataUpdate.fecha_hora_entrega = nowBolivia();
      }

      const pedidoActualizado = await tx.pedidos.update({
        where: { id_pedido },
        data: dataUpdate,
        include: {
          mesa: true,
          pedido_delivery: true,
          detalles_pedido: {
            include: { presentacion_producto: { include: { producto: true } } }
          }
        }
      });

      // Update delivery record state
      if (pedidoActualizado.pedido_delivery) {
        await tx.pedidos_delivery.update({
          where: { id_pedido },
          data: {
            estado_delivery: estado,
            ...(estado === 'EN_CAMINO' ? { fecha_hora_salida: nowBolivia() } : {}),
            // Optionally link user if they are repartidor
            ...(estado === 'EN_CAMINO' && id_usuario ? { id_usuario_repartidor: id_usuario } : {}),
          },
        });
      }

      // Save history log
      if (id_usuario) {
        await tx.historial_estados_pedido.create({
          data: {
            id_pedido,
            id_usuario,
            estado,
            observaciones: observaciones || `Estado cambiado a ${estado}`,
            fecha_hora_cambio: nowBolivia(),
          }
        });
      }

      // Kitchen assignment handling if relevant
      if (estado === 'EN_PREPARACION' && id_usuario) {
        const existingAsignacion = await tx.asignaciones_cocina_pedido.findFirst({
          where: { id_pedido, es_asignacion_actual: true }
        });
        if (existingAsignacion) {
          await tx.asignaciones_cocina_pedido.update({
            where: { id_asignacion_cocina_pedido: existingAsignacion.id_asignacion_cocina_pedido },
            data: {
              fecha_hora_inicio_preparacion: nowBolivia(),
              id_usuario_cocinero: id_usuario
            }
          });
        } else {
          await tx.asignaciones_cocina_pedido.create({
            data: {
              id_pedido,
              id_usuario_cocinero: id_usuario,
              estado_asignacion: 'ASIGNADO',
              fecha_hora_inicio_preparacion: nowBolivia(),
              fecha_hora_asignacion: nowBolivia(),
            }
          });
        }
      } else if (estado === 'LISTO') {
        await tx.asignaciones_cocina_pedido.updateMany({
          where: { id_pedido, es_asignacion_actual: true },
          data: {
            estado_asignacion: 'LISTO',
            fecha_hora_listo: nowBolivia(),
            fecha_hora_finalizacion: nowBolivia(),
          }
        });
      }

      return pedidoActualizado;
    });

    // Pusher triggers
    try {
      await pusherServer.trigger('cocina-channel', 'pedido-actualizado', resultado);
      await pusherServer.trigger('tables-channel', 'table-order-updated', resultado);
      // Trigger update specifically for the order status
      await pusherServer.trigger(`order-channel-${id_pedido}`, 'status-updated', {
        id_pedido,
        estado,
      });
    } catch (pushErr) {
      console.error('Error triggering Pusher on status change:', pushErr);
    }

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('Error updating delivery status:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar el estado del pedido' },
      { status: 500 }
    );
  }
}
