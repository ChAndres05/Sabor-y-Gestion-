import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

/**
 * POST /api/reservas/mesa/[tableId]/cancelar
 * Cancels all CONFIRMED reservations for a given table (used when table is freed).
 * Also updates the table status to LIBRE if no active orders remain.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId: tableIdParam } = await params;
    const id_mesa = parseInt(tableIdParam, 10);

    if (isNaN(id_mesa)) {
      return NextResponse.json({ error: 'ID de mesa inválido' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Cancel all CONFIRMED reservations for this table
      await tx.reservas.updateMany({
        where: {
          id_mesa,
          estado: 'CONFIRMADA',
        },
        data: { estado: 'CANCELADA' },
      });

      // Check for active orders
      const pedidosActivos = await tx.pedidos.count({
        where: {
          id_mesa,
          estado: { notIn: ['PAGADO', 'CANCELADO'] },
        },
      });

      if (pedidosActivos === 0) {
        await tx.mesas.update({
          where: { id_mesa },
          data: { estado: 'LIBRE' },
        });
      }
    });

    // Broadcast via Pusher
    await pusherServer.trigger('tables-channel', 'table-updated', {
      id_mesa,
      estado: 'LIBRE',
    });

    return NextResponse.json({ success: true, message: 'Reservas canceladas correctamente' });
  } catch (error) {
    console.error('Error cancelando reservas de la mesa:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al cancelar las reservas de la mesa' },
      { status: 500 }
    );
  }
}
