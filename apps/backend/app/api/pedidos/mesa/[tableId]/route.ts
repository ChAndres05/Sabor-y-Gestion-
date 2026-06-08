import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ tableId: string }> }) {
  try {
    const { tableId: idParam } = await params;
    const id_mesa = parseInt(idParam, 10);

    if (isNaN(id_mesa)) {
      return NextResponse.json({ error: 'ID de mesa inválido' }, { status: 400 });
    }

    // --- CAMBIO CLAVE: Usamos findMany para traer TODOS los pedidos activos de la mesa ---
    const pedidos = await prisma.pedidos.findMany({
      where: {
        id_mesa,
        estado: {
          notIn: ['PAGADO', 'CANCELADO']
        }
      },
      // --- MANTENEMOS TUS INCLUDES INTACTOS PARA NO ROMPER EL FRONTEND ---
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
      // Ordenamos ascendente para agrupar lógicamente: Pedido 1 primero, Pedido 2 después...
      orderBy: {
        fecha_hora_pedido: 'asc'
      }
    });

    // Si no hay pedidos en la mesa, devolvemos un arreglo vacío
    if (!pedidos || pedidos.length === 0) {
      return NextResponse.json([]);
    }

    // Devolvemos el arreglo completo de pedidos (El frontend ya lo sabe leer)
    return NextResponse.json(pedidos);
  } catch (error: unknown) { // <-- LINT FIX: Cambiado a unknown
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error('Error obteniendo pedidos por mesa:', errorMessage);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}