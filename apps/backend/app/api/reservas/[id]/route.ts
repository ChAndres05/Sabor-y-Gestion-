import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

/**
 * PATCH /api/reservas/[id]
 * Updates the status of a reservation (e.g. CANCELADA, COMPLETADA).
 * If cancelling, also liberates the table if no other active reservations remain.
 *
 * Body: { estado: 'CANCELADA' | 'COMPLETADA' }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id_reserva = parseInt(idParam, 10);

    if (isNaN(id_reserva)) {
      return NextResponse.json({ error: 'ID de reserva inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { estado } = body as { estado: string };

    if (!estado) {
      return NextResponse.json({ error: 'Se requiere el campo estado' }, { status: 400 });
    }

    const reservaExistente = await prisma.reservas.findUnique({
      where: { id_reserva },
    });

    if (!reservaExistente) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    const reserva = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservas.update({
        where: { id_reserva },
        data: { estado },
        include: {
          mesa: {
            include: { zona: true },
          },
          usuarios_reservas_id_usuario_registroTousuarios: {
            select: {
              id_usuario: true,
              nombre: true,
              apellido: true,
              nombre_usuario: true,
            },
          },
          usuarios_reservas_id_usuario_clienteTousuarios: {
            select: {
              id_usuario: true,
              nombre: true,
              apellido: true,
              nombre_usuario: true,
            },
          },
        },
      });

      // If cancelling, check if the table should be freed
      if (estado === 'CANCELADA' || estado === 'COMPLETADA') {
        const otrasReservasActivas = await tx.reservas.count({
          where: {
            id_mesa: reservaExistente.id_mesa,
            estado: 'CONFIRMADA',
            id_reserva: { not: id_reserva },
          },
        });

        const pedidosActivos = await tx.pedidos.count({
          where: {
            id_mesa: reservaExistente.id_mesa,
            estado: { notIn: ['PAGADO', 'CANCELADO'] },
          },
        });

        if (otrasReservasActivas === 0 && pedidosActivos === 0) {
          await tx.mesas.update({
            where: { id_mesa: reservaExistente.id_mesa },
            data: { estado: 'LIBRE' },
          });

          await pusherServer.trigger('tables-channel', 'table-updated', {
            id_mesa: reservaExistente.id_mesa,
            estado: 'LIBRE',
          });
        }
      }

      return updated;
    });

    return NextResponse.json(reserva);
  } catch (error) {
    console.error('Error actualizando reserva:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al actualizar la reserva' },
      { status: 500 }
    );
  }
}
