import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const id_pedido = parseInt(idParam, 10);
    if (isNaN(id_pedido)) {
      return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { id_presentacion_producto, cantidad, observaciones, ingredientes } = body;

    if (!id_presentacion_producto || !cantidad || cantidad <= 0) {
      return NextResponse.json({ error: 'Datos de detalle inválidos' }, { status: 400 });
    }

    // Obtener precio del producto
    const presentacion = await prisma.presentaciones_producto.findUnique({
      where: { id_presentacion_producto }
    });

    if (!presentacion) {
      return NextResponse.json({ error: 'Presentación de producto no encontrada' }, { status: 404 });
    }

    const precio_unitario = Number(presentacion.precio);
    const subtotal = precio_unitario * cantidad;

    // Crear el detalle, deducir stock y actualizar el total del pedido en una transacción
    const [nuevoDetalle, pedidoActualizado] = await prisma.$transaction(async (tx) => {
      const detalle = await tx.detalles_pedido.create({
        data: {
          id_pedido,
          id_presentacion_producto,
          cantidad,
          precio_unitario,
          subtotal,
          observaciones,
          ingredientes: ingredientes || undefined
        }
      });

      // Deducir stock para cada insumo en la receta de esta presentación
      const recetaIngredientes = await tx.recetas_presentaciones_producto.findMany({
        where: { id_presentacion_producto }
      });

      for (const ing of recetaIngredientes) {
        const cantInsumo = Number(ing.cantidad_insumo) * cantidad;
        
        const insumo = await tx.insumos.findUnique({
          where: { id_insumo: ing.id_insumo }
        });

        if (insumo) {
          // Check if this ingredient has been excluded/disabled in custom ingredients
          const isExcluded = Array.isArray(ingredientes) && ingredientes.some(
            (custIng: any) => 
              custIng && 
              custIng.nombre && 
              custIng.nombre.toLowerCase().trim() === insumo.nombre.toLowerCase().trim() && 
              custIng.incluido === false
          );

          if (isExcluded) {
            continue;
          }

          // Check stock first
          const stockActual = Number(insumo.stock_actual);
          if (stockActual < cantInsumo) {
            throw new Error(`Stock insuficiente para "${insumo.nombre}". Disponible: ${stockActual}, Requerido: ${cantInsumo}`);
          }

          await tx.insumos.update({
            where: { id_insumo: ing.id_insumo },
            data: {
              stock_actual: {
                decrement: cantInsumo
              }
            }
          });

          // Registrar movimiento de salida
          await tx.movimientos_stock.create({
            data: {
              id_insumo: ing.id_insumo,
              tipo_movimiento: 'SALIDA',
              cantidad: cantInsumo,
              motivo: `Consumo por Pedido #${id_pedido}`,
              fecha_registro: new Date()
            }
          });
        }
      }

      const pedido = await tx.pedidos.findUnique({ where: { id_pedido } });
      const nuevoTotal = Number(pedido?.total || 0) + subtotal;
      
      // Recalcular el tiempo estimado del pedido entero basándose en el tiempo de preparación máximo y cantidad de items
      const todosDetalles = await tx.detalles_pedido.findMany({
        where: { id_pedido },
        include: {
          presentacion_producto: true
        }
      });

      const maxTime = todosDetalles.reduce((max, d) => {
        const prepTime = Number(d.presentacion_producto.tiempo_preparacion_minutos || 0);
        const itemTime = prepTime + (d.cantidad > 2 ? 5 : 0);
        return itemTime > max ? itemTime : max;
      }, 0);
      const nuevoTiempo = maxTime + (todosDetalles.length > 2 ? 5 : 0);

      const actualizado = await tx.pedidos.update({
        where: { id_pedido },
        data: { 
          subtotal: nuevoTotal, 
          total: nuevoTotal,
          tiempo_estimado_minutos: nuevoTiempo
        }
      });

      return [detalle, actualizado];
    }, {
      maxWait: 10000,
      timeout: 20000
    });

    // Notify clients via Pusher
    await pusherServer.trigger('tables-channel', 'table-order-updated', { id_pedido });

    return NextResponse.json({ detalle: nuevoDetalle, pedido: pedidoActualizado }, { status: 201 });
  } catch (error) {
    console.error('Error agregando detalle al pedido:', error);
    const err = error as Error;
    let errMsg = 'Error interno del servidor al agregar el detalle';
    if (err.message?.includes('insumos_stock_actual_check') || (err.message?.includes('insumos') && err.message?.includes('check constraint'))) {
      errMsg = 'No hay suficiente stock en inventario para preparar este producto.';
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
