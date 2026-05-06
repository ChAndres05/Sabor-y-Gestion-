// apps/backend/app/api/cocina/detalles/[id_detalle]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

// Cambiamos la definición de params para que coincida con Next.js 16/15+
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id_detalle: string }> }
) {
  try {
    const resolvedParams = await params;
    const idParam = resolvedParams.id_detalle;
    const id_detalle_pedido = parseInt(idParam, 10);

    if (isNaN(id_detalle_pedido)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { preparado } = body;

    const detalleActualizado = await prisma.detalles_pedido.update({
      where: { id_detalle_pedido },
      data: { preparado },
    });

    await pusherServer.trigger('cocina-channel', 'detalle-actualizado', detalleActualizado);

    return NextResponse.json(detalleActualizado);
  } catch (error) {
    console.error("Error al actualizar plato:", error);
    return NextResponse.json({ error: 'Error al marcar el plato' }, { status: 500 });
  }
}

// IMPORTANTE: Asegúrate de borrar cualquier "export default" si existía.