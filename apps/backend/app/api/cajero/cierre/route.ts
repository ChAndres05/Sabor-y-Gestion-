import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';
import { nowBolivia } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_usuario_cierre, monto_contado_cierre, monto_teorico_cierre } = body as {
      id_usuario_cierre: number;
      monto_contado_cierre: number;
      monto_teorico_cierre: number;
    };

    if (!id_usuario_cierre || monto_contado_cierre === undefined || monto_teorico_cierre === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: id_usuario_cierre, monto_contado_cierre, monto_teorico_cierre' },
        { status: 400 }
      );
    }

    // 1. Find the active open session (jornada) for this user
    const jornadaActiva = await prisma.jornadas_caja.findFirst({
      where: {
        id_usuario_apertura: Number(id_usuario_cierre),
        estado: 'ABIERTA'
      }
    });

    if (!jornadaActiva) {
      return NextResponse.json(
        { error: 'No se encontró ninguna jornada abierta para este usuario' },
        { status: 404 }
      );
    }

    const diferencia = Number(monto_contado_cierre) - Number(monto_teorico_cierre);

    // 2. Update the session with closing details
    const jornadaCerrada = await prisma.jornadas_caja.update({
      where: { id_jornada_caja: jornadaActiva.id_jornada_caja },
      data: {
        id_usuario_cierre: Number(id_usuario_cierre),
        fecha_hora_cierre: nowBolivia(),
        monto_teorico_cierre: Number(monto_teorico_cierre),
        monto_contado_cierre: Number(monto_contado_cierre),
        diferencia_cierre: diferencia,
        estado: 'CERRADA'
      }
    });

    try {
      await pusherServer.trigger('caja-channel', 'caja-updated', { tipo: 'JORNADA_CERRADA', jornada: jornadaCerrada });
    } catch (pushErr) {
      console.error('Error triggering Pusher for cash closing:', pushErr);
    }

    return NextResponse.json({
      message: 'JORNADA_CERRADA_EXITOSAMENTE',
      jornada: {
        id_jornada_caja: jornadaCerrada.id_jornada_caja,
        id_usuario_cierre: jornadaCerrada.id_usuario_cierre,
        fecha_hora_cierre: jornadaCerrada.fecha_hora_cierre,
        monto_teorico_cierre: Number(jornadaCerrada.monto_teorico_cierre),
        monto_contado_cierre: Number(jornadaCerrada.monto_contado_cierre),
        diferencia_cierre: Number(jornadaCerrada.diferencia_cierre),
        estado: jornadaCerrada.estado
      }
    });

  } catch (error) {
    console.error('Error al cerrar caja:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al realizar el cierre de caja' },
      { status: 500 }
    );
  }
}
