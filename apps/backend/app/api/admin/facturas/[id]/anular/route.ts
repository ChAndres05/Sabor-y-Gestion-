import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nowBolivia } from '@/lib/timezone';
import { pusherServer } from '@/lib/pusher';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id_factura = parseInt(idParam, 10);

    if (isNaN(id_factura)) {
      return NextResponse.json({ error: 'ID de factura inválido' }, { status: 400 });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const factura = await tx.facturas.findUnique({
        where: { id_factura }
      });

      if (!factura) {
        throw new Error('FACTURA_NO_CONTRADA');
      }

      if (factura.estado_documento === 'ANULADA') {
        throw new Error('FACTURA_YA_ANULADA');
      }

      const fechaActualLocal = nowBolivia();
      const fechaFormateada = fechaActualLocal.toLocaleDateString('es-BO');
      const nuevasObservaciones = `ANULADA por Administrador - ${fechaFormateada} | ${factura.observaciones || ''}`;

      const facturaActualizada = await tx.facturas.update({
        where: { id_factura },
        data: {
          estado_documento: 'ANULADA',
          observaciones: nuevasObservaciones
        },
        include: {
          usuario_emision: {
            select: {
              nombre: true,
              apellido: true
            }
          },
          pedido: {
            include: {
              detalles_pedido: {
                include: {
                  presentacion_producto: {
                    include: {
                      producto: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      return facturaActualizada;
    }, { maxWait: 5000, timeout: 10000 });

    // Map the updated invoice to match frontend format
    let cliente_nombre = 'Cliente General';
    let cliente_ci = '0';
    
    if (resultado.observaciones) {
      const match = resultado.observaciones.match(/Facturado a:\s*(.*?),\s*CI\/NIT:\s*([^\s-]*)/);
      if (match) {
        cliente_nombre = match[1].trim();
        cliente_ci = match[2].trim();
      }
    }

    const items = resultado.pedido?.detalles_pedido?.map((detalle) => {
      const prodNombre = detalle.presentacion_producto?.producto?.nombre || 'Producto';
      const presNombre = detalle.presentacion_producto?.nombre;
      const nombre = (!presNombre || presNombre === 'Predeterminada') 
        ? prodNombre 
        : `${prodNombre} (${presNombre})`;

      return {
        nombre,
        cantidad: detalle.cantidad,
        precio_unitario: Number(detalle.precio_unitario),
        subtotal: Number(detalle.subtotal)
      };
    }) || [];

    const nombre_usuario_emision = resultado.usuario_emision 
      ? `${resultado.usuario_emision.nombre} ${resultado.usuario_emision.apellido || ''}`.trim()
      : 'Usuario';

    const mappedFactura = {
      id_factura: resultado.id_factura,
      id_pedido: resultado.id_pedido,
      id_usuario_emision: resultado.id_usuario_emision,
      nombre_usuario_emision,
      tipo_documento: resultado.tipo_documento,
      numero_documento: resultado.numero_documento,
      subtotal: Number(resultado.subtotal),
      impuesto: Number(resultado.impuesto),
      descuento: Number(resultado.descuento),
      total: Number(resultado.total),
      fecha_emision: resultado.fecha_emision.toISOString(),
      estado_documento: resultado.estado_documento,
      observaciones: resultado.observaciones,
      cliente_nombre,
      cliente_ci,
      items
    };

    // Trigger Pusher event for real-time updates
    await pusherServer.trigger('facturas-channel', 'factura-anulada', mappedFactura);

    return NextResponse.json(mappedFactura);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error al anular factura:", errorMessage);

    if (errorMessage === 'FACTURA_NO_CONTRADA') {
      return NextResponse.json({ error: 'La factura no existe en el sistema.' }, { status: 404 });
    }
    if (errorMessage === 'FACTURA_YA_ANULADA') {
      return NextResponse.json({ error: 'Esta factura ya se encuentra anulada.' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Error interno del servidor al anular la factura' }, { status: 500 });
  }
}
