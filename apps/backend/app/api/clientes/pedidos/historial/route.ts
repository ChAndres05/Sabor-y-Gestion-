import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const idUsuario = searchParams.get("id_usuario");

        if (!idUsuario) {
            return NextResponse.json(
                { error: "Se requiere el id_usuario en la URL (?id_usuario=...)" },
                { status: 400 }
            );
        }

        const historialBruto = await prisma.pedidos.findMany({
            where: {
                id_usuario_cliente: parseInt(idUsuario)
            },
            include: {
                detalles_pedido: {
                    include: {
                        presentacion_producto: {
                            include: {
                                producto: true
                            }
                        }
                    }
                },
                mesa: true
            },
            orderBy: {
                fecha_hora_pedido: 'desc'
            }
        });

        const historialLimpio = historialBruto.map(pedido => ({
            id_pedido: pedido.id_pedido,
            numero_pedido: String(pedido.id_pedido).padStart(4, '0'),
            estado: pedido.estado,
            total: Number(pedido.total),
            tiempo_estimado_minutos: pedido.tiempo_estimado_minutos,
            fecha_hora_pedido: pedido.fecha_hora_pedido,
            numero_mesa: pedido.mesa ? pedido.mesa.numero : null,
            origen: pedido.mesa ? 'MESA' : 'RESERVA',
            productos: pedido.detalles_pedido.map(detalle => ({
                id_detalle: detalle.id_detalle_pedido,
                cantidad: detalle.cantidad,
                nombre: detalle.presentacion_producto?.producto?.nombre || 'Producto sin nombre',
                observaciones: detalle.observaciones || '',
                subtotal: Number(detalle.subtotal)
            }))
        }));

        return NextResponse.json(historialLimpio, { status: 200 });

    } catch (error: unknown) { // Cambiado de any a unknown
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        console.error("Error en el historial:", error);
        return NextResponse.json(
            { error: "SERVER_ERROR", detalle: errorMessage },
            { status: 500 }
        );
    }
}