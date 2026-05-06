import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id_pedido: string }> }
) {
    try {
        const { id_pedido: idParam } = await params;
        const id_pedido = parseInt(idParam, 10);

        const body = await request.json();
        const { armado } = body; // Recibimos true o false (isToggled)

        const pedidoActualizado = await prisma.pedidos.update({
            where: { id_pedido },
            data: { armado },
        });

        await pusherServer.trigger('cocina-channel', 'pedido-armado', pedidoActualizado);

        return NextResponse.json(pedidoActualizado);
    } catch (error) {
        console.error("Error al actualizar botón desplegable:", error);
        return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }
}