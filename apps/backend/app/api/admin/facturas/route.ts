import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const facturasList = await prisma.facturas.findMany({
      include: {
        usuario_emision: {
          select: {
            nombre: true,
            apellido: true,
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
      },
      orderBy: {
        fecha_emision: 'desc'
      }
    });

    const mappedFacturas = facturasList.map((factura) => {
      // Parse client name and CI/NIT from observaciones
      let cliente_nombre = 'Cliente General';
      let cliente_ci = '0';
      
      if (factura.observaciones) {
        const match = factura.observaciones.match(/Facturado a:\s*(.*?),\s*CI\/NIT:\s*([^\s-]*)/);
        if (match) {
          cliente_nombre = match[1].trim();
          cliente_ci = match[2].trim();
        }
      }

      // Map order details to invoice items
      const items = factura.pedido?.detalles_pedido?.map((detalle) => {
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

      const nombre_usuario_emision = factura.usuario_emision 
        ? `${factura.usuario_emision.nombre} ${factura.usuario_emision.apellido || ''}`.trim()
        : 'Usuario';

      return {
        id_factura: factura.id_factura,
        id_pedido: factura.id_pedido,
        id_usuario_emision: factura.id_usuario_emision,
        nombre_usuario_emision,
        tipo_documento: factura.tipo_documento,
        numero_documento: factura.numero_documento,
        subtotal: Number(factura.subtotal),
        impuesto: Number(factura.impuesto),
        descuento: Number(factura.descuento),
        total: Number(factura.total),
        fecha_emision: factura.fecha_emision.toISOString(),
        estado_documento: factura.estado_documento,
        observaciones: factura.observaciones,
        cliente_nombre,
        cliente_ci,
        items
      };
    });

    return NextResponse.json(mappedFacturas);
  } catch (error) {
    console.error('Error al obtener facturas:', error);
    return NextResponse.json({ error: 'Error interno del servidor al obtener facturas' }, { status: 500 });
  }
}
