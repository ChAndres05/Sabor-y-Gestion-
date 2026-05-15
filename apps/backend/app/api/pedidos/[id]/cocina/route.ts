import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const id_pedido = parseInt(idParam, 10);
    if (isNaN(id_pedido)) {
      return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { id_usuario } = body; 

    // Buscar un cocinero disponible (esto es simplificado, en un caso real se asigna al turno o área)
    let cocinero = await prisma.usuarios.findFirst({
      where: {
        rol: {
          nombre: { contains: 'COCINERO', mode: 'insensitive' }
        },
        activo: true
      }
    });

    // Fallback: Si no hay cocinero, usar el primer usuario activo (para evitar error en desarrollo)
    if (!cocinero) {
      cocinero = await prisma.usuarios.findFirst({ where: { activo: true } });
    }

    if (!cocinero) {
      return NextResponse.json({ error: 'No hay usuarios en el sistema para asignar a cocina' }, { status: 400 });
    }

    // Usar transacción para actualizar estado, crear asignación e historial
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Actualizar estado del pedido a EN_PREPARACION
      const pedidoActualizado = await tx.pedidos.update({
        where: { id_pedido },
        data: { estado: 'EN_PREPARACION' },
        include: {
          mesa: true,
          detalles_pedido: {
            include: {
              presentacion_producto: {
                include: { producto: true }
              }
            }
          }
        }
      });

      // 2. Crear asignación de cocina en asignaciones_cocina_pedido
      const asignacion = await tx.asignaciones_cocina_pedido.create({
        data: {
          id_pedido,
          id_usuario_cocinero: cocinero.id_usuario,
          estado_asignacion: 'ASIGNADO',
          observaciones: 'Enviado a cocina automáticamente'
        }
      });

      // 3. Crear historial si se proporcionó un usuario (mesero/admin)
      if (id_usuario) {
        await tx.historial_estados_pedido.create({
          data: {
            id_pedido,
            id_usuario,
            estado: 'EN_PREPARACION',
            observaciones: 'Pedido enviado a cocina'
          }
        });
      }

      return { pedido: pedidoActualizado, asignacion };
    });

    // Emitir evento Pusher al monitor de cocina (nuevo-pedido) y a mesas/meseros
    await pusherServer.trigger('cocina-channel', 'nuevo-pedido', resultado.pedido);
    await pusherServer.trigger('tables-channel', 'table-order-updated', resultado.pedido);

    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    console.error('Error enviando pedido a cocina:', error);
    return NextResponse.json({ error: 'Error interno del servidor al enviar a cocina' }, { status: 500 });
  }
}

