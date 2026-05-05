import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const id_pedido = parseInt(idParam, 10);
    
    if (isNaN(id_pedido)) {
      return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { estado } = body;

    if (!estado) {
      return NextResponse.json({ error: 'Estado es requerido' }, { status: 400 });
    }

    // Actualizar estado del pedido
    const pedidoActualizado = await prisma.pedidos.update({
      where: { id_pedido },
      data: { estado }
    });

    // Si el estado es PAGADO o CANCELADO, liberar la mesa (estado LIBRE)
    if (estado === 'PAGADO' || estado === 'CANCELADO') {
      if (pedidoActualizado.id_mesa) {
        await prisma.mesas.update({
          where: { id_mesa: pedidoActualizado.id_mesa },
          data: { estado: 'LIBRE' }
        });
      }
    }

    return NextResponse.json(pedidoActualizado);
  } catch (error) {
    console.error('Error actualizando estado del pedido:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
