import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const pedidos = await prisma.pedidos.findMany({
      where: {
        estado: {
          notIn: ['PAGADO', 'CANCELADO']
        }
      },
      include: {
        usuarios_pedidos_id_usuario_clienteTousuarios: true,
        usuario_mesero: true,
        mesa: true,
        detalles_pedido: {
          include: {
            presentacion_producto: {
              include: {
                producto: {
                  include: {
                    categoria: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        fecha_hora_pedido: 'desc'
      }
    });

    return NextResponse.json(pedidos);
  } catch (error) {
    console.error('Error listando pedidos activos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
