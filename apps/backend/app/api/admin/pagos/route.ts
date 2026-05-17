import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id_mesa, metodo_pago, monto_pagado, monto_recibido, monto_cambio, referencia_pago, id_usuario_cajero } = body;

        // Validaciones básicas de entrada
        if (!id_mesa || !metodo_pago || !id_usuario_cajero) {
            return NextResponse.json({ error: 'Faltan campos obligatorios para procesar el pago.' }, { status: 400 });
        }

        const resultadoTransaccion = await prisma.$transaction(async (tx) => {
            // 1. Validar que la jornada de caja para este cajero esté ABIERTA
            const jornadaActiva = await tx.jornadas_caja.findFirst({
                where: {
                    id_usuario_apertura: id_usuario_cajero,
                    estado: 'ABIERTA'
                }
            });

            if (!jornadaActiva) {
                throw new Error("JORNADA_DE_CAJA_NO_ABIERTA");
            }

            // 2. Buscar el ID del método de pago por su nombre (convierte 'EFECTIVO' o 'TRANSFERENCIA')
            const metodo = await tx.metodos_pago.findFirst({
                where: { nombre: metodo_pago }
            });

            if (!metodo) {
                throw new Error("METODO_PAGO_INVALIDO");
            }

            // 3. Obtener todos los pedidos activos de la mesa seleccionada
            const pedidosActivos = await tx.pedidos.findMany({
                where: {
                    id_mesa: id_mesa,
                    estado: { notIn: ['PAGADO', 'CANCELADO'] }
                }
            });

            if (pedidosActivos.length === 0) {
                throw new Error("NO_HAY_PEDIDOS_ACTIVOS");
            }

            // 4. Registrar de forma normalizada un pago en la tabla "pagos" por cada pedido consolidado
            for (const pedido of pedidosActivos) {
                await tx.pagos.create({
                    data: {
                        id_pedido: pedido.id_pedido,
                        id_metodo_pago: metodo.id_metodo_pago,
                        id_jornada_caja: jornadaActiva.id_jornada_caja,
                        id_usuario_cajero: id_usuario_cajero,
                        monto_pagado: pedido.total, // Asignamos el valor exacto de este ticket
                        monto_recibido: metodo_pago === 'EFECTIVO' ? Number(monto_recibido) : null,
                        monto_cambio: metodo_pago === 'EFECTIVO' ? Number(monto_cambio) : 0,
                        referencia_pago: referencia_pago || null,
                        estado_pago: 'CONFIRMADO'
                    }
                });
            }

            // 5. Crear el registro contable global en la tabla "movimientos_caja" 
            const mesaContexto = await tx.mesas.findUnique({ where: { id_mesa } });
            await tx.movimientos_caja.create({
                data: {
                    id_jornada_caja: jornadaActiva.id_jornada_caja,
                    id_usuario: id_usuario_cajero,
                    tipo_movimiento: 'INGRESO',
                    monto: Number(monto_pagado),
                    descripcion: `Cobro Consolidado Mesa ${mesaContexto?.numero || id_mesa} - Método: ${metodo_pago}`
                }
            });

            // 6. Cambiar el estado de todos los pedidos a 'PAGADO' simultáneamente
            await tx.pedidos.updateMany({
                where: {
                    id_mesa: id_mesa,
                    estado: { notIn: ['PAGADO', 'CANCELADO'] }
                },
                data: { estado: 'PAGADO' }
            });

            // 7. Liberar físicamente la mesa en el salón
            const mesaActualizada = await tx.mesas.update({
                where: { id_mesa: id_mesa },
                data: { estado: 'LIBRE' }
            });

            return mesaActualizada;
        }, { maxWait: 5000, timeout: 10000 });

        // Emitimos los eventos por WebSockets (Pusher) para actualizar el salón y monitores en tiempo real
        await pusherServer.trigger('tables-channel', 'table-updated', resultadoTransaccion);

        // Simulación de actualización de pedidos para limpiar la vista de meseros
        await pusherServer.trigger('tables-channel', 'table-order-updated', { id_mesa, estado: 'PAGADO' });

        return NextResponse.json({ message: "PAGO_PROCESADO_EXITOSAMENTE", mesa: resultadoTransaccion });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        console.error("❌ Error transaccional en caja:", errorMessage);

        if (errorMessage === "JORNADA_DE_CAJA_NO_ABIERTA") {
            return NextResponse.json({ error: "El cajero no tiene ninguna jornada abierta en el sistema." }, { status: 400 });
        }
        if (errorMessage === "METODO_PAGO_INVALIDO") {
            return NextResponse.json({ error: "El método de pago especificado no está registrado." }, { status: 400 });
        }
        if (errorMessage === "NO_HAY_PEDIDOS_ACTIVOS") {
            return NextResponse.json({ error: "Esta mesa ya no tiene cuentas pendientes por cobrar." }, { status: 400 });
        }

        return NextResponse.json({ error: "Error interno del servidor al procesar el pago transaccional." }, { status: 500 });
    }
}