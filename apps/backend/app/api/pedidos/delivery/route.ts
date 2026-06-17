import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';
import { nowBolivia } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const orders = await prisma.pedidos.findMany({
      where: {
        pedido_delivery: {
          isNot: null,
        },
      },
      include: {
        pedido_delivery: {
          include: {
            usuario_repartidor: {
              select: {
                id_usuario: true,
                nombre: true,
                apellido: true,
                telefono: true,
              },
            },
          },
        },
        detalles_pedido: {
          include: {
            presentacion_producto: {
              include: {
                producto: true,
              },
            },
          },
        },
        usuarios_pedidos_id_usuario_clienteTousuarios: {
          select: {
            id_usuario: true,
            nombre: true,
            apellido: true,
            correo_electronico: true,
            telefono: true,
          },
        },
        facturas: true,
      },
      orderBy: {
        fecha_hora_pedido: 'desc',
      },
    });

    // Format output to match frontend ClientOrder structure
    const mapped = orders.map((order) => {
      const delivery = order.pedido_delivery!;
      const client = order.usuarios_pedidos_id_usuario_clienteTousuarios;

      return {
        id: order.id_pedido,
        orderNumber: String(order.id_pedido).padStart(4, '0'),
        userId: order.id_usuario_cliente,
        customerName: delivery.nombre_contacto || (client ? `${client.nombre} ${client.apellido || ''}`.trim() : 'Cliente de Aplicativo'),
        source: 'DELIVERY',
        status: order.estado,
        items: order.detalles_pedido.map((item) => ({
          id: item.id_detalle_pedido,
          productoId: item.presentacion_producto?.id_producto,
          presentacionId: item.id_presentacion_producto,
          name: item.presentacion_producto?.producto?.nombre || 'Producto',
          quantity: item.cantidad,
          notes: item.observaciones,
          unitPrice: Number(item.precio_unitario),
          subtotal: Number(item.subtotal),
          ingredients: item.ingredientes ? (item.ingredientes as unknown as Record<string, unknown>[]) : [],
        })),
        subtotal: Number(order.subtotal),
        total: Number(order.total),
        estimatedMinutes: order.tiempo_estimado_minutos,
        notes: order.observaciones,
        createdAt: order.fecha_hora_pedido.toISOString(),
        deliveryAddress: delivery.direccion_entrega,
        deliveryPhone: delivery.telefono_contacto,
        deliveryFee: Number(delivery.costo_entrega),
        deliveryLat: delivery.latitud_entrega ? Number(delivery.latitud_entrega) : null,
        deliveryLng: delivery.longitud_entrega ? Number(delivery.longitud_entrega) : null,
        repartidor: delivery.usuario_repartidor,
        estado_delivery: delivery.estado_delivery,
        facturas: order.facturas.map(f => ({
          id_factura: f.id_factura,
          estado_documento: f.estado_documento,
          observaciones: f.observaciones
        })),
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching delivery orders:', error);
    return NextResponse.json(
      { error: 'Error al obtener pedidos de delivery' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      customerName,
      phone,
      address,
      observations,
      items,
      subtotal,
      deliveryFee,
      total,
      deliveryLat,
      deliveryLng,
    } = body;

    if (!address || !phone || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Dirección, teléfono y productos son obligatorios.' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find or create the DELIVERY order type
      let tipoPedido = await tx.tipos_pedido.findFirst({
        where: { nombre: { contains: 'DELIVERY', mode: 'insensitive' } },
      });
      if (!tipoPedido) {
        tipoPedido = await tx.tipos_pedido.findFirst({
          where: { nombre: { contains: 'DOMICILIO', mode: 'insensitive' } },
        });
      }
      if (!tipoPedido) {
        try {
          tipoPedido = await tx.tipos_pedido.create({
            data: { nombre: 'DELIVERY' },
          });
        } catch {
          tipoPedido = await tx.tipos_pedido.findFirst();
        }
      }
      if (!tipoPedido) {
        throw new Error('No hay tipos de pedido configurados.');
      }

      // Create main order
      const orderDate = nowBolivia();
      const newOrder = await tx.pedidos.create({
        data: {
          id_tipo_pedido: tipoPedido.id_tipo_pedido,
          id_usuario_cliente: userId || null,
          estado: 'REGISTRADO',
          observaciones: observations || null,
          subtotal: subtotal || 0,
          impuesto: 0,
          descuento: 0,
          total: total || 0,
          fecha_hora_pedido: orderDate,
        },
      });

      // Create details and deduct stocks
      const detallesCreados = [];
      let maxPrepTime = 15; // default 15 minutes preparation

      for (const item of items) {
        // Retrieve presentacion to check details and price
        let presentacion = null;
        if (item.presentacionId) {
          presentacion = await tx.presentaciones_producto.findUnique({
            where: { id_presentacion_producto: item.presentacionId },
          });
        } else {
          presentacion = await tx.presentaciones_producto.findFirst({
            where: { id_producto: item.productoId, activo: true },
          });
        }

        if (!presentacion) {
          throw new Error(`Presentación para el producto ${item.nombre || item.productoId} no encontrada`);
        }

        const precioUnitario = Number(presentacion.precio);
        const subtotalItem = precioUnitario * item.cantidad;
        const prepTime = presentacion.tiempo_preparacion_minutos || 10;
        const totalPrepTime = prepTime + (item.cantidad > 2 ? 5 : 0);
        if (totalPrepTime > maxPrepTime) {
          maxPrepTime = totalPrepTime;
        }

        // Create detail
        const detail = await tx.detalles_pedido.create({
          data: {
            id_pedido: newOrder.id_pedido,
            id_presentacion_producto: presentacion.id_presentacion_producto,
            cantidad: item.cantidad,
            precio_unitario: precioUnitario,
            subtotal: subtotalItem,
            observaciones: item.observacion || null,
            ingredientes: item.ingredientes || undefined,
          },
        });
        detallesCreados.push(detail);

        // Deduct stocks from recipe
        const recetaIngredientes = await tx.recetas_presentaciones_producto.findMany({
          where: { id_presentacion_producto: presentacion.id_presentacion_producto },
        });

        for (const ing of recetaIngredientes) {
          const cantInsumo = Number(ing.cantidad_insumo) * item.cantidad;
          const insumo = await tx.insumos.findUnique({
            where: { id_insumo: ing.id_insumo },
          });

          if (insumo) {
            await tx.insumos.update({
              where: { id_insumo: ing.id_insumo },
              data: {
                stock_actual: {
                  decrement: cantInsumo,
                },
              },
            });

            // Stock movement registry
            await tx.movimientos_stock.create({
              data: {
                id_insumo: ing.id_insumo,
                tipo_movimiento: 'SALIDA',
                cantidad: cantInsumo,
                motivo: `Consumo por Pedido Delivery #${newOrder.id_pedido}`,
                fecha_registro: new Date(),
              },
            });
          }
        }
      }

      // Calculate final estimated prep time
      const estimatedMinutes = maxPrepTime + (items.length > 2 ? 5 : 0) + 15; // +15 mins delivery time

      // Update estimated time in main order
      const updatedOrder = await tx.pedidos.update({
        where: { id_pedido: newOrder.id_pedido },
        data: {
          tiempo_estimado_minutos: estimatedMinutes,
        },
        include: {
          mesa: true,
          detalles_pedido: {
            include: {
              presentacion_producto: {
                include: {
                  producto: true,
                },
              },
            },
          },
        },
      });

      // Create delivery record
      const delivery = await tx.pedidos_delivery.create({
        data: {
          id_pedido: updatedOrder.id_pedido,
          nombre_contacto: customerName || 'Cliente Delivery',
          telefono_contacto: phone,
          direccion_entrega: address,
          latitud_entrega: deliveryLat ? Number(deliveryLat) : null,
          longitud_entrega: deliveryLng ? Number(deliveryLng) : null,
          costo_entrega: deliveryFee || 0,
          estado_delivery: 'PENDIENTE',
        },
      });
      


      // Optional: Add history record
      if (userId) {
        await tx.historial_estados_pedido.create({
          data: {
            id_pedido: updatedOrder.id_pedido,
            id_usuario: userId,
            estado: 'REGISTRADO',
            observaciones: 'Pedido creado desde carrito cliente (Delivery)',
            fecha_hora_cambio: orderDate,
          },
        });
      }

      return { updatedOrder, delivery };
    });

    // Map result to frontend structure
    const mapped = {
      id: result.updatedOrder.id_pedido,
      orderNumber: String(result.updatedOrder.id_pedido).padStart(4, '0'),
      userId: result.updatedOrder.id_usuario_cliente,
      customerName: result.delivery.nombre_contacto,
      source: 'DELIVERY',
      status: result.updatedOrder.estado,
      items: result.updatedOrder.detalles_pedido.map((item) => ({
        id: item.id_detalle_pedido,
        productoId: item.presentacion_producto?.id_producto,
        presentacionId: item.id_presentacion_producto,
        name: item.presentacion_producto?.producto?.nombre || 'Producto',
        quantity: item.cantidad,
        notes: item.observaciones,
        unitPrice: Number(item.precio_unitario),
        subtotal: Number(item.subtotal),
        ingredients: item.ingredientes ? (item.ingredientes as unknown as Record<string, unknown>[]) : [],
      })),
      subtotal: Number(result.updatedOrder.subtotal),
      total: Number(result.updatedOrder.total),
      estimatedMinutes: result.updatedOrder.tiempo_estimado_minutos,
      notes: result.updatedOrder.observaciones,
      createdAt: result.updatedOrder.fecha_hora_pedido.toISOString(),
      deliveryAddress: result.delivery.direccion_entrega,
      deliveryPhone: result.delivery.telefono_contacto,
      deliveryFee: Number(result.delivery.costo_entrega),
      deliveryLat: result.delivery.latitud_entrega ? Number(result.delivery.latitud_entrega) : null,
      deliveryLng: result.delivery.longitud_entrega ? Number(result.delivery.longitud_entrega) : null,
      repartidor: null,
      estado_delivery: result.delivery.estado_delivery,
    };

    // Trigger Pusher events to update Cajeros/Admins
    try {
      await pusherServer.trigger('tables-channel', 'table-order-updated', result.updatedOrder);
    } catch (pushErr) {
      console.error('Error triggering Pusher for new delivery order:', pushErr);
    }

    return NextResponse.json(mapped, { status: 201 });
  } catch (error) {
    const err = error as Error;
    console.error('Error creating delivery order:', err);
    let errMsg = err.message || 'Error interno del servidor al crear pedido';
    if (errMsg.includes('insumos_stock_actual_check') || (errMsg.includes('insumos') && errMsg.includes('check constraint'))) {
      errMsg = 'No hay suficiente stock en inventario para alguno de los productos seleccionados.';
    }
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
