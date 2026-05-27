import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id_usuario_cajero = searchParams.get('id_usuario_cajero');
    const clientDateStr = searchParams.get('fecha'); // e.g. "2026-05-26"
    const clientTimeStr = searchParams.get('hora_actual'); // e.g. "08:30"

    if (!id_usuario_cajero) {
      return NextResponse.json({ error: 'Falta el parámetro id_usuario_cajero' }, { status: 400 });
    }

    // 1. Check if there is an active open session (jornadas_caja) for this user first
    const jornadaActiva = await prisma.jornadas_caja.findFirst({
      where: {
        id_usuario_apertura: Number(id_usuario_cajero),
        estado: 'ABIERTA',
      },
      include: {
        asignacion_caja_turno: {
          include: {
            caja: true,
            turno: true,
          }
        }
      }
    });

    if (jornadaActiva) {
      return NextResponse.json({
        asignacion: {
          id_asignacion_caja_turno: jornadaActiva.asignacion_caja_turno.id_asignacion_caja_turno,
          id_caja: jornadaActiva.asignacion_caja_turno.id_caja,
          id_turno: jornadaActiva.asignacion_caja_turno.id_turno,
          id_usuario_cajero: jornadaActiva.asignacion_caja_turno.id_usuario_cajero,
          fecha_operacion: jornadaActiva.asignacion_caja_turno.fecha_operacion,
          estado: jornadaActiva.asignacion_caja_turno.estado,
          caja: jornadaActiva.asignacion_caja_turno.caja,
          turno: jornadaActiva.asignacion_caja_turno.turno,
        },
        jornada: {
          id_jornada_caja: jornadaActiva.id_jornada_caja,
          id_asignacion_caja_turno: jornadaActiva.id_asignacion_caja_turno,
          id_usuario_apertura: jornadaActiva.id_usuario_apertura,
          monto_inicial: Number(jornadaActiva.monto_inicial),
          estado: jornadaActiva.estado,
          fecha_hora_apertura: jornadaActiva.fecha_hora_apertura,
        }
      });
    }

    // Get today's date in local server time format YYYY-MM-DD
    const getLocalDateString = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const getUTCDateString = (d: Date) => {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const targetDateStr = clientDateStr || getLocalDateString(new Date());

    // Fetch all active assignments for this cashier
    const asignaciones = await prisma.asignaciones_caja_turno.findMany({
      where: {
        id_usuario_cajero: Number(id_usuario_cajero),
        estado: 'ASIGNADA',
      },
      include: {
        caja: true,
        turno: true,
        jornada_caja: true,
      },
      orderBy: {
        fecha_operacion: 'desc',
      },
    });

    // Filter assignments for today
    const asignacionesHoy = asignaciones.filter(a => {
      const localStr = getLocalDateString(a.fecha_operacion);
      const utcStr = getUTCDateString(a.fecha_operacion);
      return localStr === targetDateStr || utcStr === targetDateStr;
    });

    if (asignacionesHoy.length === 0) {
      return NextResponse.json({ asignacion: null, jornada: null });
    }

    let asignacionSeleccionada = asignacionesHoy[0];

    // If there are multiple assignments for today, we try to match the shift hours
    if (asignacionesHoy.length > 1) {
      let currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
      if (clientTimeStr) {
        const parts = clientTimeStr.split(':');
        if (parts.length >= 2) {
          currentMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        }
      }

      const parseTimeToMinutes = (d: Date) => {
        return d.getUTCHours() * 60 + d.getUTCMinutes();
      };

      const match = asignacionesHoy.find(a => {
        const start = parseTimeToMinutes(a.turno.hora_inicio);
        const end = parseTimeToMinutes(a.turno.hora_fin);

        // Add 60-minute tolerance before shift starts
        const startWithTolerance = (start - 60 + 1440) % 1440;
        const endWithTolerance = (end + 60) % 1440;

        if (startWithTolerance <= endWithTolerance) {
          return currentMinutes >= startWithTolerance && currentMinutes <= endWithTolerance;
        } else {
          return currentMinutes >= startWithTolerance || currentMinutes <= endWithTolerance;
        }
      });

      if (match) {
        asignacionSeleccionada = match;
      }
    }

    return NextResponse.json({
      asignacion: {
        id_asignacion_caja_turno: asignacionSeleccionada.id_asignacion_caja_turno,
        id_caja: asignacionSeleccionada.id_caja,
        id_turno: asignacionSeleccionada.id_turno,
        id_usuario_cajero: asignacionSeleccionada.id_usuario_cajero,
        fecha_operacion: asignacionSeleccionada.fecha_operacion,
        estado: asignacionSeleccionada.estado,
        caja: asignacionSeleccionada.caja,
        turno: asignacionSeleccionada.turno,
      },
      jornada: asignacionSeleccionada.jornada_caja || null,
    });

  } catch (error) {
    console.error('Error al obtener asignación activa:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al verificar asignación de caja' },
      { status: 500 }
    );
  }
}
