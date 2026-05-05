import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string, itemId: string }> }) {
  try {
    const { id: idParam, itemId: itemIdParam } = await params;
    const id_pedido = parseInt(idParam, 10);
    const id_detalle = parseInt(itemIdParam, 10);
    
    if (isNaN(id_pedido) || isNaN(id_detalle)) {
      return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 });
    }

    // Usar transacción para recalcular totales
    const resultado = await prisma.$transaction(async (tx) => {
      // Eliminar el detalle
      const deletedItem = await tx.detalles_pedido.delete({
        where: { id_detalle_pedido: id_detalle }
      });

      // Recalcular subtotal
      const sumResult = await tx.detalles_pedido.aggregate({
        where: { id_pedido },
        _sum: { subtotal: true }
      });

      const nuevoSubtotal = sumResult._sum.subtotal || 0;
      
      // Actualizar el pedido
      const updatedPedido = await tx.pedidos.update({
        where: { id_pedido },
        data: {
          subtotal: nuevoSubtotal,
          total: nuevoSubtotal // Asumiendo que no hay impuestos o descuentos extras por ahora
        }
      });

      return { deletedItem, updatedPedido };
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Error eliminando detalle de pedido:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
