import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id_mesa, monto_pagado, monto_recibido, monto_cambio, referencia_pago, id_usuario_cajero, correo_cliente, enviar_recibo, ci_cliente, nombre_cliente, detalles_consumidos } = body;
        let { metodo_pago } = body;

        // Normalizar TRANSFERENCIA a QR para backend y facturación
        if (metodo_pago === 'TRANSFERENCIA') {
            metodo_pago = 'QR';
        }

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

            // 2. Buscar el ID del método de pago por su nombre
            const metodo = await tx.metodos_pago.findFirst({
                where: { nombre: { equals: metodo_pago, mode: 'insensitive' } }
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
                const total_sin_iva = Number(pedido.subtotal) - Number(pedido.descuento);
                
                await tx.pagos.create({
                    data: {
                        id_pedido: pedido.id_pedido,
                        id_metodo_pago: metodo.id_metodo_pago,
                        id_jornada_caja: jornadaActiva.id_jornada_caja,
                        id_usuario_cajero: id_usuario_cajero,
                        monto_pagado: total_sin_iva, 
                        monto_recibido: metodo_pago === 'EFECTIVO' ? Number(monto_recibido) : total_sin_iva,
                        monto_cambio: metodo_pago === 'EFECTIVO' ? Number(monto_cambio) : 0,
                        referencia_pago: referencia_pago || null,
                        estado_pago: 'CONFIRMADO'
                    }
                });

                // Registrar la factura electrónica o recibo correspondiente al pedido
                await tx.facturas.create({
                    data: {
                        id_pedido: pedido.id_pedido,
                        id_usuario_emision: id_usuario_cajero,
                        tipo_documento: "FACTURA",
                        numero_documento: `FAC-${Date.now()}-${pedido.id_pedido}`,
                        subtotal: pedido.subtotal,
                        impuesto: 0,
                        descuento: pedido.descuento,
                        total: Number(pedido.subtotal) - Number(pedido.descuento),
                        estado_documento: "EMITIDA",
                        observaciones: `Facturado a: ${nombre_cliente || 'S/N'}, CI/NIT: ${ci_cliente || '0'}${(enviar_recibo && correo_cliente) ? ` - Enviado a: ${correo_cliente}` : ''}`
                    }
                });
            }

            // 5. Crear el registro contable global en la tabla "movimientos_caja" 
            const mesaContexto = await tx.mesas.findUnique({ where: { id_mesa } });
            await tx.movimientos_caja.create({
                data: {
                    id_jornada_caja: jornadaActiva.id_jornada_caja,
                    id_usuario: id_usuario_cajero,
                    tipo_movimiento: 'INGRESO_EXTRA',
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

        // Notificar actualización de caja en tiempo real
        await pusherServer.trigger('caja-channel', 'caja-updated', { tipo: 'PAGO_PROCESADO' });

        if (enviar_recibo && correo_cliente) {
            try {
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                });

                await transporter.sendMail({
                    from: '"Sabor y Gestión" <noreply@saborygestion.com>',
                    to: correo_cliente,
                    subject: "Comprobante de Pago - Sabor y Gestión",
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #ea580c; text-align: center;">¡Gracias por tu visita!</h2>
                            <p>Hola,</p>
                            <p>Adjuntamos el detalle de tu pago reciente en <strong>Sabor y Gestión</strong>.</p>
                            
                            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <h3 style="margin-top: 0; color: #374151;">Datos del Cliente</h3>
                                <p style="margin: 5px 0;"><strong>Nombre:</strong> ${nombre_cliente || 'Cliente General'}</p>
                                <p style="margin: 5px 0;"><strong>CI/NIT:</strong> ${ci_cliente || '0'}</p>
                                
                                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 15px 0;">
                                
                                <h3 style="margin-top: 0; color: #374151;">Detalle del Consumo (Mesa ${resultadoTransaccion.numero || id_mesa})</h3>
                                ${detalles_consumidos && detalles_consumidos.length > 0 ? 
                                    `<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 14px;">
                                        <thead>
                                            <tr style="border-bottom: 2px solid #e5e7eb; text-align: left;">
                                                <th style="padding: 8px 0; color: #6b7280; width: 15%;">Cant.</th>
                                                <th style="padding: 8px 0; color: #6b7280; width: 60%;">Producto</th>
                                                <th style="padding: 8px 0; text-align: right; color: #6b7280; width: 25%;">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${detalles_consumidos.map((d: { cantidad: number; nombre: string; subtotal: number }) => `
                                                <tr>
                                                    <td style="padding: 8px 0; border-bottom: 1px dashed #eee;">${d.cantidad}x</td>
                                                    <td style="padding: 8px 0; border-bottom: 1px dashed #eee; color: #374151;">${d.nombre}</td>
                                                    <td style="padding: 8px 0; text-align: right; border-bottom: 1px dashed #eee; font-weight: bold;">Bs. ${Number(d.subtotal).toFixed(2)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>`
                                : '<p style="color: #6b7280;">Detalle no disponible.</p>'}

                                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 15px 0;">
                                
                                <p style="margin: 5px 0;"><strong>Método de Pago:</strong> ${metodo_pago}</p>
                                ${referencia_pago ? `<p style="margin: 5px 0;"><strong>Referencia:</strong> ${referencia_pago}</p>` : ''}
                                
                                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 15px 0;">
                                <h3 style="margin: 0; color: #111827; display: flex; justify-content: space-between;">
                                    <span>Total Pagado:</span>
                                    <span>Bs. ${Number(monto_pagado).toFixed(2)}</span>
                                </h3>
                            </div>
                            
                            <p style="color: #6b7280; font-size: 12px; text-align: center;">
                                Este es un comprobante electrónico informativo.
                            </p>
                        </div>
                    `,
                });
                console.log(`Recibo enviado a ${correo_cliente}`);
            } catch (emailError) {
                console.error("Error al enviar el recibo por correo:", emailError);
            }
        }

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