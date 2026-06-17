import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nowBolivia } from '@/lib/timezone';
import { pusherServer } from '@/lib/pusher';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const id_pedido = parseInt(id, 10);
    if (isNaN(id_pedido)) {
      return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { nit, razonSocial, email, userId } = body;

    if (!nit || !razonSocial || !userId) {
      return NextResponse.json({ error: 'NIT/CI, Razón Social y ID de usuario son obligatorios.' }, { status: 400 });
    }

    // Buscar el pedido en la base de datos
    const pedido = await prisma.pedidos.findUnique({
      where: { id_pedido },
    });

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Verificar si ya existe una factura o solicitud para este pedido
    const facturaExistente = await prisma.facturas.findFirst({
      where: { id_pedido },
    });

    if (facturaExistente) {
      return NextResponse.json(
        { error: 'Ya existe un registro de factura o solicitud para este pedido.' },
        { status: 400 }
      );
    }

    // Crear la factura con estado "SOLICITADA"
    const fechaActualLocal = nowBolivia();
    const nuevaFactura = await prisma.facturas.create({
      data: {
        id_pedido,
        id_usuario_emision: Number(userId),
        tipo_documento: 'FACTURA',
        numero_documento: `REQ-${Date.now()}-${id_pedido}`,
        subtotal: pedido.subtotal,
        impuesto: 0,
        descuento: pedido.descuento,
        total: pedido.total,
        estado_documento: 'SOLICITADA',
        observaciones: `Facturado a: ${razonSocial}, CI/NIT: ${nit}${email ? ` - Correo: ${email}` : ''}`,
        fecha_emision: fechaActualLocal,
      },
    });

    // Notificar en tiempo real a los canales de Caja y Atención Delivery
    try {
      await pusherServer.trigger('tables-channel', 'table-order-updated', { id_pedido });
      await pusherServer.trigger('orders-channel', 'order-updated', { id_pedido });
    } catch (pushErr) {
      console.error('Error triggering Pusher on invoice request:', pushErr);
    }

    return NextResponse.json(nuevaFactura, { status: 201 });
  } catch (error) {
    console.error('Error al solicitar factura:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar la solicitud de factura' },
      { status: 500 }
    );
  }
}
