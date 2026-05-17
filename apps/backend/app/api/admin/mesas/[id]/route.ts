import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { pusherServer } from "../../../../../lib/pusher";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const numeroMesa = parseInt(id);
        const body = await req.json();
        const { estado } = body; // Recibimos el estado al que se quiere cambiar (ej. CUENTA_SOLICITADA o LIBRE)

        const mesaActualizada = await prisma.$transaction(async (tx) => {
            const mesaActual = await tx.mesas.findFirst({
                where: { numero: numeroMesa }
            });

            if (!mesaActual) throw new Error("MESA_NO_ENCONTRADA");

            // 🛑 1. NUEVA REGLA: Validar antes de pedir la cuenta
            if (estado === 'CUENTA_SOLICITADA') {
                // Buscamos si hay algún pedido de esta mesa que aún NO esté entregado o pagado
                const pedidosIncompletos = await tx.pedidos.findMany({
                    where: {
                        id_mesa: mesaActual.id_mesa,
                        estado: {
                            in: ['REGISTRADO', 'EN_PREPARACION', 'LISTO']
                        }
                    }
                });

                // Si encuentra al menos 1 pedido en cocina, bloqueamos la acción
                if (pedidosIncompletos.length > 0) {
                    throw new Error("PEDIDOS_INCOMPLETOS_PARA_CUENTA");
                }
            }
            // -------------------------------------------------------------

            // ✅ 2. REGLA EXISTENTE: Cerrar masivamente al liberar la mesa
            if (estado === 'LIBRE') {
                const pedidosActivos = await tx.pedidos.findMany({
                    where: {
                        id_mesa: mesaActual.id_mesa,
                        estado: { notIn: ['PAGADO', 'CANCELADO'] }
                    }
                });

                if (pedidosActivos.length > 0) {
                    if (mesaActual.estado !== 'CUENTA_SOLICITADA') {
                        throw new Error("RESTRICCION_ESTADO_PEDIDO");
                    }

                    await tx.pedidos.updateMany({
                        where: {
                            id_mesa: mesaActual.id_mesa,
                            estado: { notIn: ['PAGADO', 'CANCELADO'] }
                        },
                        data: { estado: 'PAGADO' }
                    });
                }
            }

            // 3. Actualizamos el estado final de la mesa
            return await tx.mesas.update({
                where: { id_mesa: mesaActual.id_mesa },
                data: { estado }
            });
        });

        await pusherServer.trigger('tables-channel', 'table-updated', mesaActualizada);
        return NextResponse.json(mesaActualizada);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";

        // Capturamos nuestro error personalizado y enviamos un mensaje claro al Frontend
        if (errorMessage === "PEDIDOS_INCOMPLETOS_PARA_CUENTA") {
            return NextResponse.json(
                { error: "No se puede solicitar la cuenta. Aún hay pedidos sin entregar en esta mesa." },
                { status: 400 }
            );
        }

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
    } catch (error: unknown) {
        console.error("Error al eliminar mesa:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        return NextResponse.json({ error: "SERVER_ERROR", detalle: errorMessage }, { status: 500 });
    }
}