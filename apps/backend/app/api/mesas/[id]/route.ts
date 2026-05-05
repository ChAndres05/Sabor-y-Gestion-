import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const id_mesa = parseInt(idParam, 10);
    if (isNaN(id_mesa)) {
      return NextResponse.json({ error: 'ID de mesa inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { estado } = body;

    if (!estado) {
      return NextResponse.json({ error: 'Se requiere el campo estado' }, { status: 400 });
    }

    const [mesa] = await prisma.$transaction(async (tx) => {
      const updatedMesa = await tx.mesas.update({
        where: { id_mesa },
        data: { estado }
      });

      if (estado === 'LIBRE') {
        // Cancelar pedidos activos de esta mesa
        await tx.pedidos.updateMany({
          where: {
            id_mesa,
            estado: {
              notIn: ['PAGADO', 'CANCELADO']
            }
          },
          data: {
            estado: 'CANCELADO'
          }
        });
      }

      return [updatedMesa];
    });

    return NextResponse.json(mesa);
  } catch (error) {
    console.error('Error actualizando estado de mesa:', error);
    return NextResponse.json({ error: 'Error interno del servidor al actualizar la mesa' }, { status: 500 });
  }
}
