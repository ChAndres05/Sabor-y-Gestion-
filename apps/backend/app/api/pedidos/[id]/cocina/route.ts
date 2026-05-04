import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const id_pedido = parseInt(idParam, 10);
    if (isNaN(id_pedido)) {
      return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 });
    }

    const body = await request.json();
    // Podría recibir el id del usuario que hace el envío (mesero) para el historial
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
      // 1. Actualizar estado del pedido
      const pedidoActualizado = await tx.pedidos.update({
        where: { id_pedido },
        data: { estado: 'COCINA' }
      });

      // 2. Crear asignación de cocina
      const asignacion = await tx.asignaciones_cocina_pedido.create({
        data: {
          id_pedido,
          id_usuario_cocinero: cocinero.id_usuario,
          estado_asignacion: 'ASIGNADO',
          observaciones: 'Enviado a cocina automáticamente'
        }
      });

      // 3. Crear historial si se proporcionó un usuario (mesero)
      if (id_usuario) {
        await tx.historial_estados_pedido.create({
          data: {
            id_pedido,
            id_usuario,
            estado: 'COCINA',
            observaciones: 'Pedido enviado a cocina'
          }
        });
      }

      return { pedido: pedidoActualizado, asignacion };
    });

    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    console.error('Error enviando pedido a cocina:', error);
    return NextResponse.json({ error: 'Error interno del servidor al enviar a cocina' }, { status: 500 });
  }
}
