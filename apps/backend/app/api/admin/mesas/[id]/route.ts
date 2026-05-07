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
                where: { numero: mesaId }
            });

            if (!mesaActual) {
                throw new Error("MESA_NO_ENCONTRADA");
            }

            // 2. RESTRICCIÓN AL LIBERAR: Validamos que la MESA haya pedido la cuenta
            if (estado === 'LIBRE') {
                const pedidoActivo = await tx.pedidos.findFirst({
                    where: {
                        id_mesa: mesaId,
                        estado: {
                            notIn: ['PAGADO', 'CANCELADO'], // Buscamos si hay pedido en curso
                        },
                    },
                });

                if (pedidoActivo) {
                    // Validamos que el estado ANTERIOR de la mesa haya sido CUENTA_SOLICITADA
                    if (mesaActual.estado !== 'CUENTA_SOLICITADA') {
                        throw new Error("RESTRICCION_ESTADO_PEDIDO");
                    }

                    // Si pasó la validación, cerramos el pedido mandándolo al historial (PAGADO)
                    // (PAGADO sí es un estado válido en tu base de datos)
                    await tx.pedidos.update({
                        where: { id_pedido: pedidoActivo.id_pedido },
                        data: { estado: 'PAGADO' },
                    });
                }
            }

            // 3. Actualizamos la mesa finalmente
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

        await pusherServer.trigger('tables-channel', 'table-updated', mesaActualizada);

        return NextResponse.json(mesaActualizada, { status: 200 });
    } catch (error) {
        console.error("Error al actualizar mesa:", error);

        if (error instanceof Error) {
            if (error.message === "MESA_NO_ENCONTRADA") {
                return NextResponse.json({ error: "La mesa especificada no existe." }, { status: 404 });
            }
            if (error.message === "RESTRICCION_ESTADO_PEDIDO") {
                return NextResponse.json(
                    { error: "No puedes liberar la mesa. Primero debes solicitar la cuenta." },
                    { status: 400 }
                );
            }
        }

        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        return NextResponse.json({ error: "SERVER_ERROR", detalle: errorMessage }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const mesaId = parseInt(resolvedParams.id);

        const mesaActual = await prisma.mesas.findUnique({
            where: { id_mesa: mesaId },
            select: { estado: true },
        });

        if (!mesaActual) {
            return NextResponse.json({ error: "La mesa especificada no existe." }, { status: 404 });
        }

        const pedidoActivo = await prisma.pedidos.findFirst({
            where: {
                id_mesa: mesaId,
                estado: {
                    notIn: ['PAGADO', 'CANCELADO'],
                },
            },
            select: { id_pedido: true },
        });

        if (pedidoActivo) {
            return NextResponse.json(
                { error: "No se puede eliminar la mesa porque tiene pedidos activos." },
                { status: 400 }
            );
        }

        const reservaActiva = await prisma.reservas.findFirst({
            where: {
                id_mesa: mesaId,
                estado: 'CONFIRMADA',
            },
            select: { id_reserva: true },
        });

        if (reservaActiva) {
            return NextResponse.json(
                { error: "No se puede eliminar la mesa porque tiene reservas activas." },
                { status: 400 }
            );
        }

        if (mesaActual.estado !== 'LIBRE') {
            return NextResponse.json(
                { error: `No se puede eliminar la mesa mientras esté ${mesaActual.estado}.` },
                { status: 400 }
            );
        }

        let mesaBorrada;

        try {
            mesaBorrada = await prisma.mesas.delete({
                where: { id_mesa: mesaId },
            });
        } catch {
            mesaBorrada = await prisma.mesas.update({
                where: { id_mesa: mesaId },
                data: { activa: false },
            });
        }

        await pusherServer.trigger('tables-channel', 'table-updated', { ...mesaBorrada, activa: false });

        return NextResponse.json({ message: "MESA_ELIMINADA" }, { status: 200 });
    } catch (error) {
        console.error("Error al eliminar mesa:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        return NextResponse.json({ error: "SERVER_ERROR", detalle: errorMessage }, { status: 500 });
    }
}
