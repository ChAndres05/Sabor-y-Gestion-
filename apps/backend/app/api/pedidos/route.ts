import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_mesa, id_usuario_mesero, id_usuario_cliente, observaciones } = body;

    if (!id_mesa || !id_usuario_mesero) {
      return NextResponse.json({ error: 'id_mesa y id_usuario_mesero son requeridos' }, { status: 400 });
    }

    // Buscar tipo de pedido 'LOCAL' o similar, o tomar el primero por defecto
    let tipoPedido = await prisma.tipos_pedido.findFirst({
      where: { nombre: { contains: 'LOCAL', mode: 'insensitive' } }
    });

    if (!tipoPedido) {
      tipoPedido = await prisma.tipos_pedido.findFirst();
    }

    if (!tipoPedido) {
      return NextResponse.json({ error: 'No hay tipos de pedido configurados en la BD' }, { status: 400 });
    }

    // Usar transacción para crear pedido y actualizar estado de la mesa
    const [nuevoPedido, mesaActualizada] = await prisma.$transaction([
      prisma.pedidos.create({
        data: {
          id_tipo_pedido: tipoPedido.id_tipo_pedido,
          id_mesa,
          id_usuario_mesero,
          id_usuario_cliente,
          estado: 'REGISTRADO',
          observaciones,
          subtotal: 0,
          impuesto: 0,
          descuento: 0,
          total: 0,
        }
      }),
      prisma.mesas.update({
        where: { id_mesa },
        data: { estado: 'OCUPADA' }
      })
    ]);

    return NextResponse.json(nuevoPedido, { status: 201 });
  } catch (error) {
    console.error('Error creando pedido:', error);
    return NextResponse.json({ error: 'Error interno del servidor al crear el pedido' }, { status: 500 });
  }
}
