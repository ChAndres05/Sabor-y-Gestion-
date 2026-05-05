import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const mesas = await prisma.mesas.findMany({
      where: {
        activa: true
      },
      include: {
        zona: true,
        pedidos: {
          where: {
            estado: {
              notIn: ['PAGADO', 'CANCELADO']
            }
          },
          include: {
            usuario_mesero: true,
            usuarios_pedidos_id_usuario_clienteTousuarios: true
          }
        }
      },
      orderBy: {
        numero: 'asc'
      }
    });

    return NextResponse.json(mesas);
  } catch (error) {
    console.error('Error obteniendo mesas:', error);
    return NextResponse.json({ error: 'Error interno del servidor al obtener las mesas' }, { status: 500 });
  }
}
