import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';
import { nowBolivia } from '@/lib/timezone';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_usuario_cliente, id_reserva, observaciones, detalles } = body;

    if (!id_reserva || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return NextResponse.json({ error: 'Faltan datos obligatorios: id_reserva o detalles del pedido' }, { status: 400 });
    }

    // Buscar la reserva para obtener el id_mesa
    const reserva = await prisma.reservas.findUnique({
      where: { id_reserva },
      include: { mesa: true }
    });

    if (!reserva) {
      return NextResponse.json({ error: 'No se encontró la reserva solicitada' }, { status: 404 });
    }

    const id_mesa = reserva.id_mesa;

    // Obtener tipo de pedido
    let tipoPedido = await prisma.tipos_pedido.findFirst({
      where: { nombre: { contains: 'LOCAL', mode: 'insensitive' } }
    });
    if (!tipoPedido) {
      tipoPedido = await prisma.tipos_pedido.findFirst();
    }
    if (!tipoPedido) {
      return NextResponse.json({ error: 'No hay tipos de pedido configurados en la BD' }, { status: 400 });
    }

    // El cliente está haciendo el pedido, le asignamos el primer mesero o admin disponible como responsable genérico (opcional si la base de datos permite null, pero en el modelo general se acostumbra a tener un responsable)
    let mesero = await prisma.usuarios.findFirst({
      where: { rol: { nombre: { contains: 'MESERO', mode: 'insensitive' } } }
    });
    if (!mesero) {
      mesero = await prisma.usuarios.findFirst();
    }
    if (!mesero) {
      return NextResponse.json({ error: 'No hay usuarios disponibles' }, { status: 400 });
    }

    let clienteId = id_usuario_cliente;
    if (clienteId) {
      const cliente = await prisma.usuarios.findUnique({ where: { id_usuario: clienteId } });
      if (!cliente) clienteId = null;
    }

    // Calcular el total a partir de los detalles
    let total = 0;
    type DetalleInput = { id_presentacion_producto: number; cantidad: number; precio_unitario: number; observaciones?: string | null; ingredientes?: unknown; };
    const detallesData = detalles.map((d: DetalleInput) => {
      const cantidad = Number(d.cantidad);
      const precioUnitario = Number(d.precio_unitario);
      const subtotal = cantidad * precioUnitario;
      total += subtotal;
      return {
        id_presentacion_producto: d.id_presentacion_producto,
        cantidad: cantidad,
        precio_unitario: precioUnitario,
        subtotal: subtotal,
        observaciones: d.observaciones || null,
        ingredientes: d.ingredientes || undefined
      };
    });

    // Usar transacción para crear el pedido, detalles, y actualizar la mesa
    const [nuevoPedido] = await prisma.$transaction([
      prisma.pedidos.create({
        data: {
          id_tipo_pedido: tipoPedido.id_tipo_pedido,
          id_mesa,
          id_usuario_mesero: mesero.id_usuario,
          id_usuario_cliente: clienteId,
          estado: 'REGISTRADO',
          observaciones: observaciones || null,
          subtotal: total,
          impuesto: 0,
          descuento: 0,
          total: total,
          fecha_hora_pedido: nowBolivia(),
          detalles_pedido: {
            create: detallesData
          }
        },
        include: {
          mesa: true,
          detalles_pedido: true
        }
      }),
      prisma.mesas.update({
        where: { id_mesa },
        data: { estado: 'OCUPADA' }
      })
    ]);

    // Emitir eventos en tiempo real
    await Promise.all([
      // Para la cocina
      pusherServer.trigger('cocina-channel', 'nuevo-pedido', nuevoPedido),
      // Para las mesas (mesero / admin)
      pusherServer.trigger('tables-channel', 'table-order-updated', { id_mesa, estado: 'OCUPADA' }),
      pusherServer.trigger('tables-channel', 'table-updated', { id_mesa, estado: 'OCUPADA' }),
      // Para la vista de pedidos del cliente
      pusherServer.trigger('orders-channel', 'order-updated', { pedido_id: nuevoPedido.id_pedido })
    ]);

    return NextResponse.json(nuevoPedido, { status: 201 });
  } catch (error) {
    console.error('Error creando pedido desde reserva:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error interno del servidor al crear el pedido desde la reserva', detalle: message }, { status: 500 });
  }
}
