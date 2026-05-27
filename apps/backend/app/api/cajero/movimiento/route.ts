import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_jornada_caja, id_usuario, tipo_movimiento, monto, descripcion } = body as {
      id_jornada_caja: number;
      id_usuario: number;
      tipo_movimiento: 'INGRESO_EXTRA' | 'EGRESO_EXTRA';
      monto: number;
      descripcion?: string;
    };

    if (!id_jornada_caja || !id_usuario || !tipo_movimiento || monto === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: id_jornada_caja, id_usuario, tipo_movimiento, monto' },
        { status: 400 }
      );
    }

    const nuevoMovimiento = await prisma.movimientos_caja.create({
      data: {
        id_jornada_caja: Number(id_jornada_caja),
        id_usuario: Number(id_usuario),
        tipo_movimiento,
        monto: Number(monto),
        descripcion: descripcion || null
      }
    });

    return NextResponse.json({
      message: 'MOVIMIENTO_REGISTRADO_EXITOSAMENTE',
      movimiento: nuevoMovimiento
    }, { status: 201 });

  } catch (error) {
    console.error('Error al registrar movimiento:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al registrar movimiento en caja' },
      { status: 500 }
    );
  }
}
