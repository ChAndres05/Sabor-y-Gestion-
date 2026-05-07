import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { pusherServer } from "../../../../../lib/pusher";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const numeroMesa = parseInt(id);
        const body = await req.json();
        const { estado } = body;

        const mesaActualizada = await prisma.$transaction(async (tx) => {
            const mesaActual = await tx.mesas.findFirst({
                where: { numero: numeroMesa }
            });

            if (!mesaActual) throw new Error("MESA_NO_ENCONTRADA");

            if (estado === 'LIBRE') {
                const pedidoActivo = await tx.pedidos.findFirst({
                    where: {
                        id_mesa: mesaActual.id_mesa,
                        estado: { notIn: ['PAGADO', 'CANCELADO'] }
                    }
                });

                if (pedidoActivo) {
                    if (mesaActual.estado !== 'CUENTA_SOLICITADA') {
                        throw new Error("RESTRICCION_ESTADO_PEDIDO");
                    }
                    await tx.pedidos.update({
                        where: { id_pedido: pedidoActivo.id_pedido },
                        data: { estado: 'PAGADO' }
                    });
                }
            }

            return await tx.mesas.update({
                where: { id_mesa: mesaActual.id_mesa },
                data: { estado }
            });
        });

        await pusherServer.trigger('tables-channel', 'table-updated', mesaActualizada);
        return NextResponse.json(mesaActualizada);
    } catch (error: unknown) { // Cambiado de any a unknown
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const parametroNumeroUrl = parseInt(resolvedParams.id);

        const mesaActual = await prisma.mesas.findFirst({
            where: { numero: parametroNumeroUrl }
        });

        if (!mesaActual) {
            return NextResponse.json({ error: "La mesa especificada no existe." }, { status: 404 });
        }

        const mesaBorrada = await prisma.mesas.delete({
            where: { id_mesa: mesaActual.id_mesa },
        });

        await pusherServer.trigger('tables-channel', 'table-updated', { ...mesaBorrada, activa: false });

        return NextResponse.json({ message: "MESA_ELIMINADA" }, { status: 200 });
    } catch (error: unknown) { // Cambiado a unknown para consistencia
        console.error("Error al eliminar mesa:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        return NextResponse.json({ error: "SERVER_ERROR", detalle: errorMessage }, { status: 500 });
    }
}