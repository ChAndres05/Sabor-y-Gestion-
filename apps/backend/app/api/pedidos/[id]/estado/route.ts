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

      const pedidoOriginal = await tx.pedidos.findUnique({ where: { id_pedido } });
      if (!pedidoOriginal) throw new Error("PEDIDO_NO_ENCONTRADO");

      if (estado === 'CANCELADO') {
        if (pedidoOriginal.estado !== 'REGISTRADO') {
          throw new Error("SOLO_REGISTRADOS_PUEDEN_CANCELARSE");
        }
      }

      // 🛑 OPTIMIZACIÓN DE VELOCIDAD: Cálculo Nativo en Base de Datos
      if (estado === 'CUENTA_SOLICITADA' && pedidoOriginal.id_mesa) {

        // Hacemos que la BD cuente (SQL COUNT) directamente, es 10x más rápido que descargar los datos
        const cantidadIncompletos = await tx.pedidos.count({
          where: {
            id_mesa: pedidoOriginal.id_mesa,
            estado: {
              notIn: ['ENTREGADO', 'CUENTA_SOLICITADA', 'PAGADO', 'CANCELADO']
            }
          }
        });

        // Si la BD responde que hay 1 o más platos en cocina, aborta inmediatamente
        if (cantidadIncompletos > 0) {
          throw new Error("PEDIDOS_INCOMPLETOS_PARA_CUENTA");
        }

        // Si llega aquí, todo está entregado. Actualizamos masivamente.
        await tx.pedidos.updateMany({
          where: {
            id_mesa: pedidoOriginal.id_mesa,
            estado: { notIn: ['PAGADO', 'CANCELADO'] }
          },
          data: { estado: 'CUENTA_SOLICITADA' }
        });

        await tx.mesas.update({
          where: { id_mesa: pedidoOriginal.id_mesa },
          data: { estado: 'CUENTA_SOLICITADA' }
        });
      }
      // -------------------------------------------------------------

      // A. Actualizar el estado general del pedido
      const pedidoActualizado = await tx.pedidos.update({
        where: { id_pedido },
        data: { 
          estado,
          ...(estado === 'ENTREGADO' ? { fecha_hora_entrega: nowBolivia() } : {})
        },
        include: {
          mesa: true,
          detalles_pedido: {
            include: { presentacion_producto: { include: { producto: true } } }
          }
        }
      });

      // B. Guardar en el historial
      if (id_usuario) {
        await tx.historial_estados_pedido.create({
          data: {
            id_pedido,
            id_usuario,
            estado,
            observaciones: observaciones || null,
            fecha_hora_cambio: nowBolivia(),
          }
        });
      }

      // C. Lógica de la COCINA
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
          where: {
            id_pedido,
            es_asignacion_actual: true
          },
          data: {
            estado_asignacion: 'LISTO',
            fecha_hora_listo: nowBolivia(),
            fecha_hora_finalizacion: nowBolivia(),
          }
        });
      }

      // D. Lógica de MESAS
      if ((estado === 'PAGADO' || estado === 'CANCELADO') && pedidoActualizado.id_mesa) {
        const pedidosActivosEnMesa = await tx.pedidos.count({
          where: {
            id_mesa: pedidoActualizado.id_mesa,
            estado: {
              notIn: ['PAGADO', 'CANCELADO']
            }
          }
        });

        if (pedidosActivosEnMesa === 0) {
          await tx.mesas.update({
            where: { id_mesa: pedidoActualizado.id_mesa },
            data: { estado: 'LIBRE' }
          });
        }
      }

      // E. Lógica de RESERVAS
      if ((estado === 'ENTREGADO' || estado === 'PAGADO') && pedidoActualizado.id_mesa) {
        const reservasActivas = await tx.reservas.findMany({
          where: {
            id_mesa: pedidoActualizado.id_mesa,
            estado: 'CONFIRMADA'
          }
        });

        for (const r of reservasActivas) {
          await tx.reservas.update({
            where: { id_reserva: r.id_reserva },
            data: { estado: 'COMPLETADA' }
          });
        }
      }

      return pedidoActualizado;
    },
      {
        maxWait: 5000,
        timeout: 10000
      });

    // 2. Eventos Pusher
    await pusherServer.trigger('cocina-channel', 'pedido-actualizado', resultado);

    if (['LISTO', 'PAGADO', 'CANCELADO', 'ENTREGADO', 'CUENTA_SOLICITADA'].includes(estado)) {
      await pusherServer.trigger('tables-channel', 'table-order-updated', resultado);

      if (estado === 'CUENTA_SOLICITADA' && resultado.mesa) {
        await pusherServer.trigger('tables-channel', 'table-updated', resultado.mesa);
      }
    }

    return NextResponse.json(resultado);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error al actualizar estado del pedido:", errorMessage);

    // 🛑 Retorno ultra-rápido del error 400
    if (errorMessage === "PEDIDOS_INCOMPLETOS_PARA_CUENTA") {
      return NextResponse.json(
        { error: "No se puede solicitar la cuenta. Aún hay pedidos sin entregar en esta mesa." },
        { status: 400 }
      );
    }

    if (errorMessage === "SOLO_REGISTRADOS_PUEDEN_CANCELARSE") {
      return NextResponse.json(
        { error: "Solo se pueden cancelar pedidos recién registrados. Si ya está en cocina u otro estado, no se puede cancelar." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'No se pudo actualizar el estado del pedido' },
      { status: 500 }
    );
  }
}