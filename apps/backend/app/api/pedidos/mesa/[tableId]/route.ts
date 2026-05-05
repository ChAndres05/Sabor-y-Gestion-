import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ tableId: string }> }) {
  try {
    const { tableId: idParam } = await params;
    const id_mesa = parseInt(idParam, 10);
    
    if (isNaN(id_mesa)) {
      return NextResponse.json({ error: 'ID de mesa inválido' }, { status: 400 });
    }

    const pedido = await prisma.pedidos.findFirst({
      where: {
        id_mesa,
        estado: {
          notIn: ['PAGADO', 'CANCELADO']
        }
      },
      include: {
        usuarios_pedidos_id_usuario_clienteTousuarios: true,
        usuario_mesero: true,
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

    if (!pedido) {
      return NextResponse.json(null);
    }

    return NextResponse.json(pedido);
  } catch (error) {
    console.error('Error obteniendo pedido por mesa:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
