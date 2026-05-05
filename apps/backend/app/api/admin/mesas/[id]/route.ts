import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { pusherServer } from "../../../../../lib/pusher";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const mesaId = parseInt(resolvedParams.id);
        const body = await req.json();
        const { numero, capacidad, id_zona, estado, forma, activa } = body;

        const mesaActualizada = await prisma.$transaction(async (tx) => {

            // 1. Obtenemos cómo estaba la mesa ANTES de este cambio
            const mesaActual = await tx.mesas.findUnique({
                where: { id_mesa: mesaId }
            });

            // 2. SINCRONIZACIÓN MÁGICA: Si la mesa pasa a CUENTA_SOLICITADA, el pedido también.
            if (estado === 'CUENTA_SOLICITADA') {
                const pedidoActivo = await tx.pedidos.findFirst({
                    where: { id_mesa: mesaId, estado: { notIn: ['PAGADO', 'CANCELADO'] } }
                });

                if (pedidoActivo && pedidoActivo.estado !== 'CUENTA_SOLICITADA') {
                    await tx.pedidos.update({
                        where: { id_pedido: pedidoActivo.id_pedido },
                        data: { estado: 'CUENTA_SOLICITADA' }
                    });
                }
            }

            // 3. RESTRICCIÓN AL LIBERAR: Validamos que haya pedido la cuenta
            if (estado === 'LIBRE') {
                const pedidoActivo = await tx.pedidos.findFirst({
                    where: {
                        id_mesa: mesaId,
                        estado: {
                            notIn: ['PAGADO', 'CANCELADO'], // Solo buscamos pedidos en curso
                        },
                    },
                });

                if (pedidoActivo) {
                    // Nos fijamos si el pedido o la mesa estaban en CUENTA_SOLICITADA
                    const cuentaSolicitada =
                        pedidoActivo.estado === 'CUENTA_SOLICITADA' ||
                        mesaActual?.estado === 'CUENTA_SOLICITADA';

                    if (!cuentaSolicitada) {
                        throw new Error("RESTRICCION_ESTADO_PEDIDO");
                    }

                    // Si pasó la validación, cerramos el pedido mandándolo al historial (PAGADO)
                    await tx.pedidos.update({
                        where: { id_pedido: pedidoActivo.id_pedido },
                        data: { estado: 'PAGADO' },
                    });
                }
            }

            // 4. Actualizamos la mesa finalmente
            const mesa = await tx.mesas.update({
                where: { id_mesa: mesaId },
                data: {
                    numero: numero ? Number(numero) : undefined,
                    capacidad: capacidad ? Number(capacidad) : undefined,
                    id_zona: id_zona !== undefined ? (id_zona ? Number(id_zona) : null) : undefined,
                    estado,
                    forma,
                    activa,
                },
            });

            return mesa;
        });

        // Emitir evento por Pusher para actualizar en tiempo real
        await pusherServer.trigger('tables-channel', 'table-updated', mesaActualizada);

        return NextResponse.json(mesaActualizada, { status: 200 });
    } catch (error) {
        console.error("Error al actualizar mesa:", error);

        // Manejo del error para devolverlo bonito al Frontend
        if (error instanceof Error && error.message === "RESTRICCION_ESTADO_PEDIDO") {
            return NextResponse.json(
                { error: "No puedes liberar la mesa. Primero debes solicitar la cuenta del pedido." },
                { status: 400 }
            );
        }

        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        return NextResponse.json({ error: "SERVER_ERROR", detalle: errorMessage }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const mesaId = parseInt(resolvedParams.id);

        const mesaBorrada = await prisma.mesas.delete({
            where: { id_mesa: mesaId },
        });

        await pusherServer.trigger('tables-channel', 'table-updated', { ...mesaBorrada, activa: false });

        return NextResponse.json({ message: "MESA_ELIMINADA" }, { status: 200 });
    } catch (error) {
        console.error("Error al eliminar mesa:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        return NextResponse.json({ error: "SERVER_ERROR", detalle: errorMessage }, { status: 500 });
    }
}