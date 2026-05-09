import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reservas/cliente/[userId]
 * Returns all reservations belonging to a specific client user,
 * ordered by reservation date descending.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: userIdParam } = await params;
    const id_usuario_cliente = parseInt(userIdParam, 10);

    if (isNaN(id_usuario_cliente)) {
      return NextResponse.json({ error: 'ID de usuario inválido' }, { status: 400 });
    }

    const reservas = await prisma.reservas.findMany({
      where: {
        id_usuario_cliente,
      },
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
      orderBy: {
        fecha_hora_reserva: 'desc',
      },
    });

    return NextResponse.json(reservas);
  } catch (error) {
    console.error('Error obteniendo reservas del cliente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener las reservas del cliente' },
      { status: 500 }
    );
  }
}
