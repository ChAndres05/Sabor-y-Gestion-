import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { pusherServer } from "../../../../../lib/pusher";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const mesaId = parseInt(resolvedParams.id);
        const body = await req.json();
        const { numero, capacidad, id_zona, estado, forma, activa } = body;

        const mesaActualizada = await prisma.mesas.update({
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

        // Emitir evento por Pusher para actualizar en tiempo real
        await pusherServer.trigger('tables-channel', 'table-updated', mesaActualizada);

        return NextResponse.json(mesaActualizada, { status: 200 });
    } catch (error) {
        console.error("Error al actualizar mesa:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        return NextResponse.json({ error: "SERVER_ERROR", detalle: errorMessage }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const mesaId = parseInt(resolvedParams.id);

        await prisma.mesas.delete({
            where: { id_mesa: mesaId },
        });

        return NextResponse.json({ message: "MESA_ELIMINADA" }, { status: 200 });
    } catch (error) {
        console.error("Error al eliminar mesa:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        return NextResponse.json({ error: "SERVER_ERROR", detalle: errorMessage }, { status: 500 });
    }
}