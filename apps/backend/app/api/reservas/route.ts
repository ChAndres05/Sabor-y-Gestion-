import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';
import { nowBolivia } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reservas
 * Returns all reservations with their associated table, zone and registrar user.
 */
export async function GET() {
  try {
    const reservas = await prisma.reservas.findMany({
      include: {
        mesa: {
          include: {
            zona: true,
          },
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
    console.error('Error obteniendo reservas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener las reservas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reservas
 * Creates a new reservation and marks the table as RESERVADA.
 *
 * Body:
 *   id_usuario_cliente?: number
 *   id_mesa: number
 *   id_usuario_registro: number
 *   fecha_hora_reserva: string  (ISO 8601, e.g. "2026-05-10T20:00:00")
 *   cantidad_personas: number
 *   observaciones?: string
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id_usuario_cliente,
      id_mesa,
      id_usuario_registro,
      fecha_hora_reserva,
      cantidad_personas,
      observaciones,
    } = body as {
      id_usuario_cliente?: number;
      id_mesa: number;
      id_usuario_registro: number;
      fecha_hora_reserva: string;
      cantidad_personas: number;
      observaciones?: string;
    };

    if (!id_mesa || !fecha_hora_reserva || !cantidad_personas) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: id_mesa, fecha_hora_reserva, cantidad_personas' },
        { status: 400 }
      );
    }

    // Resolve a valid registrar user (must exist in usuarios table)
    let registradorId: number | null = null;
    if (id_usuario_registro) {
      const usuarioExiste = await prisma.usuarios.findUnique({
        where: { id_usuario: id_usuario_registro },
        select: { id_usuario: true },
      });
      if (usuarioExiste) registradorId = usuarioExiste.id_usuario;
    }

    // If no valid registrar found, use the first ADMINISTRADOR in the system
    if (!registradorId) {
      const adminRol = await prisma.roles.findFirst({ where: { nombre: 'ADMINISTRADOR' } });
      if (adminRol) {
        const adminUser = await prisma.usuarios.findFirst({
          where: { id_rol: adminRol.id_rol, activo: true },
          select: { id_usuario: true },
        });
        if (adminUser) registradorId = adminUser.id_usuario;
      }
    }

    if (!registradorId) {
      return NextResponse.json(
        { error: 'No se encontró un usuario registrador válido en el sistema' },
        { status: 400 }
      );
    }

    // Check that the table exists and is active
    const mesa = await prisma.mesas.findFirst({
      where: { id_mesa, activa: true },
    });

    if (!mesa) {
      return NextResponse.json(
        { error: 'Mesa no encontrada o inactiva' },
        { status: 404 }
      );
    }

    // Force UTC parsing: "2026-05-14T18:00:00" without timezone is ambiguous —
    // Node.js treats it as LOCAL server time which shifts the stored value.
    // Appending 'Z' ensures the selected time is stored exactly as-is in the DB.
    const normalizedFecha = /[Z+]/.test(fecha_hora_reserva)
      ? fecha_hora_reserva
      : fecha_hora_reserva + 'Z';
    const reservaFecha = new Date(normalizedFecha);
    const conflicto = await prisma.reservas.findFirst({
      where: {
        id_mesa,
        estado: 'CONFIRMADA',
        fecha_hora_reserva: {
          gte: new Date(reservaFecha.getTime() - 60 * 60 * 1000), // -1h
          lte: new Date(reservaFecha.getTime() + 60 * 60 * 1000), // +1h
        },
      },
    });

    if (conflicto) {
      return NextResponse.json(
        { error: 'La mesa ya tiene una reserva confirmada para ese horario' },
        { status: 409 }
      );
    }

    // Create reservation and update table status in a transaction
    const reserva = await prisma.$transaction(async (tx) => {
      const nuevaReserva = await tx.reservas.create({
        data: {
          id_usuario_cliente: id_usuario_cliente ?? null,
          id_mesa,
          id_usuario_registro: registradorId,
          fecha_hora_reserva: reservaFecha,
          cantidad_personas,
          estado: 'CONFIRMADA',
          observaciones: observaciones ?? null,
          fecha_registro: nowBolivia(),
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
        },
      });

      // Mark table as RESERVADA
      await tx.mesas.update({
        where: { id_mesa },
        data: { estado: 'RESERVADA' },
      });

      return nuevaReserva;
    });

    // Broadcast table state change via Pusher
    await pusherServer.trigger('tables-channel', 'table-updated', {
      id_mesa,
      estado: 'RESERVADA',
    });

    return NextResponse.json(reserva, { status: 201 });
  } catch (error) {
    console.error('Error creando reserva (detalle):', error);
    // Surface the real Prisma error for debugging
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Error interno del servidor al crear la reserva', detalle: errMsg },
      { status: 500 }
    );
  }
}
