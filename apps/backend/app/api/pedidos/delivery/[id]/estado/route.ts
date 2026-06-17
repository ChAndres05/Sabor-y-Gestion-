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
      const dataUpdate: { estado: string; fecha_hora_entrega?: Date } = { estado };
      if (estado === 'ENTREGADO') {
        // Verificar que el cliente haya solicitado la factura (existencia de factura SOLICITADA o EMITIDA)
        const factura = await tx.facturas.findFirst({
          where: {
            id_pedido,
            estado_documento: { in: ['SOLICITADA', 'EMITIDA'] }
          }
        });

        if (!factura) {
          throw new Error('FACTURA_REQUERIDA');
        }

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

      // Update delivery record state (using ENTREGADO if state is PAGADO to satisfy DB check constraint)
      if (pedidoActualizado.pedido_delivery) {
        const nextDeliveryEstado = estado === 'PAGADO' ? 'ENTREGADO' : estado;
        await tx.pedidos_delivery.update({
          where: { id_pedido },
          data: {
            estado_delivery: nextDeliveryEstado,
            ...(estado === 'EN_CAMINO' ? { fecha_hora_salida: nowBolivia() } : {}),
            // Optionally link user if they are repartidor
            ...(estado === 'EN_CAMINO' && id_usuario ? { id_usuario_repartidor: id_usuario } : {}),
          },
        });
      }

      // Si el estado es PAGADO, registrar el cobro en caja y emitir/cerrar la factura
      if (estado === 'PAGADO') {
        const jornadaActiva = await tx.jornadas_caja.findFirst({
          where: { estado: 'ABIERTA' }
        });

        if (!jornadaActiva) {
          throw new Error('JORNADA_DE_CAJA_NO_ABIERTA');
        }

        const metodo = await tx.metodos_pago.findFirst({
          where: { nombre: { equals: 'EFECTIVO', mode: 'insensitive' } }
        });
        const id_metodo_pago = metodo ? metodo.id_metodo_pago : 1;

        // Registrar el pago en la tabla "pagos"
        await tx.pagos.create({
          data: {
            id_pedido,
            id_metodo_pago,
            id_jornada_caja: jornadaActiva.id_jornada_caja,
            id_usuario_cajero: id_usuario || jornadaActiva.id_usuario_apertura,
            monto_pagado: pedidoOriginal.total,
            monto_recibido: pedidoOriginal.total,
            monto_cambio: 0,
            referencia_pago: 'PAGO_DELIVERY',
            estado_pago: 'CONFIRMADO',
            fecha_hora_pago: nowBolivia()
          }
        });

        // Registrar el movimiento contable en caja (ingreso contable)
        let repartidorName = 'Repartidor';
        if (pedidoOriginal.pedido_delivery?.id_usuario_repartidor) {
          const rep = await tx.usuarios.findUnique({
            where: { id_usuario: pedidoOriginal.pedido_delivery.id_usuario_repartidor }
          });
          if (rep) {
            repartidorName = `${rep.nombre} ${rep.apellido || ''}`.trim();
          }
        }

        await tx.movimientos_caja.create({
          data: {
            id_jornada_caja: jornadaActiva.id_jornada_caja,
            id_usuario: id_usuario || jornadaActiva.id_usuario_apertura,
            tipo_movimiento: 'INGRESO_EXTRA',
            monto: pedidoOriginal.total,
            descripcion: `Dinero entregado a Caja de Delivery Pedido #${id_pedido} - Repartidor: ${repartidorName}`,
            fecha_hora_movimiento: nowBolivia()
          }
        });

        // Emitir / cerrar la factura
        const facturaSolicitada = await tx.facturas.findFirst({
          where: {
            id_pedido,
            estado_documento: 'SOLICITADA'
          }
        });

        const fechaActualLocal = nowBolivia();
        if (facturaSolicitada) {
          await tx.facturas.update({
            where: { id_factura: facturaSolicitada.id_factura },
            data: {
              id_usuario_emision: id_usuario || jornadaActiva.id_usuario_apertura,
              numero_documento: `FAC-${Date.now()}-${id_pedido}`,
              estado_documento: 'EMITIDA',
              fecha_emision: fechaActualLocal
            }
          });
        } else {
          await tx.facturas.create({
            data: {
              id_pedido,
              id_usuario_emision: id_usuario || jornadaActiva.id_usuario_apertura,
              tipo_documento: 'FACTURA',
              numero_documento: `FAC-${Date.now()}-${id_pedido}`,
              subtotal: pedidoOriginal.subtotal,
              impuesto: 0,
              descuento: pedidoOriginal.descuento,
              total: pedidoOriginal.total,
              estado_documento: 'EMITIDA',
              observaciones: `Facturado a: ${pedidoOriginal.pedido_delivery?.nombre_contacto || 'Cliente Genérico'}, CI/NIT: 0`,
              fecha_emision: fechaActualLocal
            }
          });
        }
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
    }, {
      maxWait: 15000,
      timeout: 30000
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
  } catch (error) {
    const err = error as Error;
    console.error('Error updating delivery status:', err);
    if (err.message === 'FACTURA_REQUERIDA') {
      return NextResponse.json(
        { error: 'El cliente debe solicitar la factura antes de que puedas confirmar la entrega.' },
        { status: 400 }
      );
    }
    if (err.message === 'JORNADA_DE_CAJA_NO_ABIERTA') {
      return NextResponse.json(
        { error: 'No hay ninguna jornada de caja abierta. Debe abrir caja antes de registrar el pago.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: err.message || 'Error al actualizar el estado del pedido' },
      { status: 500 }
    );
  }
}
