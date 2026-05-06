import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function PATCH(
  request: Request,
  // Usamos el formato moderno de Next.js para params (Promise)
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id_pedido = parseInt(idParam, 10);

    if (isNaN(id_pedido)) {
      return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 });
    }

    const body = await request.json();
    // Unificamos las variables. 'id_usuario' puede ser el cocinero, cajero o mesero.
    const { estado, id_usuario, observaciones } = body;

    if (!estado) {
      return NextResponse.json({ error: 'El estado es requerido' }, { status: 400 });
    }

    // 1. Iniciar una transacción para asegurar consistencia
    const resultado = await prisma.$transaction(async (tx) => {

      // A. Actualizar el estado general del pedido
      const pedidoActualizado = await tx.pedidos.update({
        where: { id_pedido },
        data: { estado },
        include: {
          mesa: true,
          detalles_pedido: {
            include: { presentacion_producto: { include: { producto: true } } }
          }
        }
      });

      // B. Si nos envían el id_usuario, guardamos el historial
      if (id_usuario) {
        await tx.historial_estados_pedido.create({
          data: {
            id_pedido,
            id_usuario,
            estado,
            observaciones: observaciones || null,
          }
        });
      }

      // C. Lógica específica de la COCINA (Asignaciones)
      if (estado === 'EN_PREPARACION' && id_usuario) {
        await tx.asignaciones_cocina_pedido.create({
          data: {
            id_pedido,
            id_usuario_cocinero: id_usuario,
            // 👇 ¡AQUÍ ESTÁ EL CAMBIO! Usamos 'ASIGNADO' en lugar de 'PREPARANDO'
            estado_asignacion: 'ASIGNADO',
            fecha_hora_inicio_preparacion: new Date(),
          }
        });
      } else if (estado === 'LISTO') {
        await tx.asignaciones_cocina_pedido.updateMany({
          where: {
            id_pedido,
            es_asignacion_actual: true
          },
          data: {
            estado_asignacion: 'LISTO',
            fecha_hora_listo: new Date(),
            fecha_hora_finalizacion: new Date(),
          }
        });
      }

      // D. Lógica de MESAS (Liberar si se paga o cancela)
      if ((estado === 'PAGADO' || estado === 'CANCELADO') && pedidoActualizado.id_mesa) {
        await tx.mesas.update({
          where: { id_mesa: pedidoActualizado.id_mesa },
          data: { estado: 'LIBRE' }
        });
      }

      return pedidoActualizado;
    },
      // 👇 Solución al error de timeout P2028 en Supabase
      {
        maxWait: 5000, // Espera hasta 5 segundos para conseguir una conexión
        timeout: 10000 // Permite que la transacción completa dure hasta 10 segundos
      });

    // 2. Emitir el evento de Pusher tras la actualización exitosa en BD
    // Enviamos 'resultado' que contiene la data completa (con mesa y productos)
    await pusherServer.trigger('cocina-channel', 'pedido-actualizado', resultado);

    // NUEVO: Avisar a los meseros/cajeros si el estado les incumbe
    if (estado === 'LISTO' || estado === 'PAGADO' || estado === 'CANCELADO' || estado === 'ENTREGADO') {
      await pusherServer.trigger('tables-channel', 'table-order-updated', resultado);
    }

    return NextResponse.json(resultado);

  } catch (error) {
    console.error("Error al actualizar estado del pedido:", error);
    return NextResponse.json(
      { error: 'No se pudo actualizar el estado del pedido' },
      { status: 500 }
    );
  }
}