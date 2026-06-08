import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id_jornada_caja = searchParams.get('id_jornada_caja');

    if (!id_jornada_caja) {
      return NextResponse.json({ error: 'Falta el parámetro id_jornada_caja' }, { status: 400 });
    }

    const movimientos = await prisma.movimientos_caja.findMany({
      where: {
        id_jornada_caja: Number(id_jornada_caja)
      },
      orderBy: {
        fecha_hora_movimiento: 'desc'
      }
    });

    const totalGeneralVentas = await prisma.pagos.aggregate({
      _sum: {
        monto_pagado: true
      },
      where: {
        estado_pago: 'CONFIRMADO'
      }
    });
    const ventasTotalesGlobales = Number(totalGeneralVentas._sum.monto_pagado || 0);

    return NextResponse.json({ 
      movimientos, 
      ventas_totales_globales: ventasTotalesGlobales 
    });

  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener movimientos' },
      { status: 500 }
    );
  }
}
