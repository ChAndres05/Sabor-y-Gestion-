import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const meseroId = parseInt(id, 10);

    if (isNaN(meseroId)) {
      return NextResponse.json({ error: 'ID de mesero inválido' }, { status: 400 });
    }

    const pedidos = await prisma.pedidos.findMany({
      where: {
        id_usuario_mesero: meseroId,
        estado: {
          notIn: ['CANCELADO'] // Traemos todos menos los cancelados, para poder ver activos y completados (pagados/entregados)
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
      },
      take: 100 // Limitamos a 100 para no saturar si hay un historial muy grande
    });

    return NextResponse.json(pedidos);
  } catch (error) {
    console.error('Error listando pedidos del mesero:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
